using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Core.Interfaces;
using PropertyRegistration.Infrastructure.Data;
using System.Security.Claims;

namespace PropertyRegistration.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentDetailsController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public PaymentDetailsController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    /// <summary>
    /// Get payment details for a property
    /// </summary>
    [HttpGet("property/{propertyId}")]
    public async Task<IActionResult> GetPropertyPaymentDetails(Guid propertyId)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var paymentDetails = await session.Query<PaymentDetail>()
            .Where(pd => pd.PropertyId == propertyId)
            .OrderBy(pd => pd.PaymentDate)
            .Select(pd => new
            {
                pd.Id,
                pd.PropertyId,
                pd.PaymentId,
                pd.Amount,
                pd.Currency,
                pd.PaymentDate,
                pd.TransactionReference,
                pd.ReceiptNumber,
                pd.InstallmentNumber,
                pd.Notes,
                CollectedBy = new
                {
                    pd.CollectedByUser.Id,
                    pd.CollectedByUser.FirstName,
                    pd.CollectedByUser.LastName,
                    pd.CollectedByUser.Username
                },
                PaymentMethod = new
                {
                    pd.PaymentMethod.Id,
                    pd.PaymentMethod.Name,
                    pd.PaymentMethod.Code
                },
                pd.CreatedAt
            })
            .ToListAsync();

        return Ok(paymentDetails);
    }

    /// <summary>
    /// Record a new payment detail
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreatePaymentDetail([FromBody] CreatePaymentDetailRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Get current user ID
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var currentUserId))
            {
                return Unauthorized(new { message = "Invalid user credentials" });
            }

            // Verify property exists
            var property = await session.GetAsync<Property>(request.PropertyId);
            if (property == null)
            {
                return NotFound(new { message = "Property not found" });
            }

            // Verify payment method exists
            var paymentMethod = await session.GetAsync<PaymentMethod>(request.PaymentMethodId);
            if (paymentMethod == null)
            {
                return BadRequest(new { message = "Invalid payment method" });
            }

            // Validate amount
            if (request.Amount <= 0)
            {
                return BadRequest(new { message = "Payment amount must be greater than zero" });
            }

            // Calculate expected amount and current total paid BEFORE saving
            var expectedAmount = property.PropertyType?.Price * property.AreaSize ?? 0;
            var currentTotalPaid = await session.Query<PaymentDetail>()
                .Where(pd => pd.PropertyId == request.PropertyId)
                .SumAsync(pd => (decimal?)pd.Amount) ?? 0;
            
            var remainingBalance = expectedAmount - currentTotalPaid;

            // Validate that payment amount doesn't exceed remaining balance
            if (request.Amount > remainingBalance && remainingBalance > 0)
            {
                return BadRequest(new { 
                    message = $"Payment amount (${request.Amount:F2}) cannot exceed remaining balance (${remainingBalance:F2})",
                    remainingBalance = remainingBalance,
                    requestedAmount = request.Amount
                });
            }

            // Get next installment number
            var lastInstallmentNumber = await session.Query<PaymentDetail>()
                .Where(pd => pd.PropertyId == request.PropertyId)
                .OrderByDescending(pd => pd.InstallmentNumber)
                .Select(pd => pd.InstallmentNumber)
                .FirstOrDefaultAsync();

            var nextInstallmentNumber = lastInstallmentNumber + 1;

            // Generate transaction reference
            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var propertyIdShort = request.PropertyId.ToString("N")[..8].ToUpper();
            var transactionRef = $"PD-{propertyIdShort}-{nextInstallmentNumber}-{timestamp}";

            // Create payment detail
            var paymentDetail = new PaymentDetail
            {
                Id = Guid.NewGuid(),
                PropertyId = request.PropertyId,
                PaymentId = request.PaymentId,
                CollectedBy = currentUserId,
                PaymentMethodId = request.PaymentMethodId,
                Amount = request.Amount,
                Currency = request.Currency ?? "USD",
                PaymentDate = request.PaymentDate ?? DateTime.UtcNow,
                TransactionReference = transactionRef,
                ReceiptNumber = request.ReceiptNumber,
                Notes = request.Notes,
                InstallmentNumber = nextInstallmentNumber,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await session.SaveAsync(paymentDetail);

            // Update property's PaidAmount and PaymentStatus
            // NOTE: Query AFTER saving, so it includes the new payment automatically
            var totalPaid = await session.Query<PaymentDetail>()
                .Where(pd => pd.PropertyId == request.PropertyId)
                .SumAsync(pd => (decimal?)pd.Amount) ?? 0;

            // FIXED: Removed double-counting - totalPaid already includes the new payment
            property.PaidAmount = totalPaid;

            // Determine property payment status: consider full expected amount
            bool isFullyPaid = totalPaid >= expectedAmount && expectedAmount > 0;
            if (isFullyPaid)
                property.PaymentStatus = "Paid";
            else if (totalPaid > 0)
                property.PaymentStatus = "Paid_partially";
            else
                property.PaymentStatus = "Pending";

            await session.UpdateAsync(property);

            // Update Payment entity status based on remaining balance (considering discount and exemption)
            if (request.PaymentId.HasValue)
            {
                var payment = await session.GetAsync<Payment>(request.PaymentId.Value);
                if (payment != null)
                {
                    var discountAmount = payment.DiscountAmount;
                    var effectiveExpected = Math.Max(0, expectedAmount - discountAmount);
                    // No remaining balance when: paid >= effective expected, or payment is exempt
                    bool noRemainingBalance = payment.IsExempt || (totalPaid >= effectiveExpected && effectiveExpected >= 0);

                    if (noRemainingBalance)
                    {
                        var completedStatus = await session.Query<PaymentStatus>()
                            .Where(ps => ps.Name.ToLower() == "completed" && ps.IsActive)
                            .FirstOrDefaultAsync();
                        if (completedStatus != null)
                        {
                            payment.StatusId = completedStatus.Id;
                            payment.CompletedAt = DateTime.UtcNow;
                            await session.UpdateAsync(payment);
                            Console.WriteLine($"✓ Updated Payment {payment.Id} status to Completed (no remaining balance)");
                        }
                    }
                    else if (totalPaid > 0)
                    {
                        // Paid partially: set to Partially Paid if that status exists, else leave as is
                        var partiallyPaidStatus = await session.Query<PaymentStatus>()
                            .Where(ps => (ps.Name.ToLower() == "partially paid" || ps.Name.ToLower() == "paid_partially") && ps.IsActive)
                            .FirstOrDefaultAsync();
                        if (partiallyPaidStatus != null)
                        {
                            payment.StatusId = partiallyPaidStatus.Id;
                            await session.UpdateAsync(payment);
                            Console.WriteLine($"✓ Updated Payment {payment.Id} status to Partially Paid");
                        }
                    }
                }
            }

            await transaction.CommitAsync();

            // Return created payment detail
            var createdDetail = await session.Query<PaymentDetail>()
                .Where(pd => pd.Id == paymentDetail.Id)
                .Select(pd => new
                {
                    pd.Id,
                    pd.PropertyId,
                    pd.Amount,
                    pd.Currency,
                    pd.PaymentDate,
                    pd.TransactionReference,
                    pd.ReceiptNumber,
                    pd.InstallmentNumber,
                    CollectedBy = new
                    {
                        pd.CollectedByUser.Id,
                        pd.CollectedByUser.FirstName,
                        pd.CollectedByUser.LastName
                    },
                    PaymentMethod = new
                    {
                        pd.PaymentMethod.Id,
                        pd.PaymentMethod.Name
                    },
                    Property = new
                    {
                        property.Id,
                        property.PaidAmount,
                        property.PaymentStatus
                    }
                })
                .FirstOrDefaultAsync();

            return Ok(createdDetail);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($"Error creating payment detail: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while creating payment detail", error = ex.Message });
        }
    }

    /// <summary>
    /// Get payment details by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPaymentDetail(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var paymentDetail = await session.Query<PaymentDetail>()
            .Where(pd => pd.Id == id)
            .Select(pd => new
            {
                pd.Id,
                pd.PropertyId,
                pd.PaymentId,
                pd.Amount,
                pd.Currency,
                pd.PaymentDate,
                pd.TransactionReference,
                pd.ReceiptNumber,
                pd.InstallmentNumber,
                pd.Notes,
                Property = new
                {
                    pd.Property.Id,
                    pd.Property.PlateNumber,
                    pd.Property.StreetAddress,
                    pd.Property.PaidAmount,
                    pd.Property.PaymentStatus
                },
                CollectedBy = new
                {
                    pd.CollectedByUser.Id,
                    pd.CollectedByUser.FirstName,
                    pd.CollectedByUser.LastName,
                    pd.CollectedByUser.Username
                },
                PaymentMethod = new
                {
                    pd.PaymentMethod.Id,
                    pd.PaymentMethod.Name,
                    pd.PaymentMethod.Code
                },
                pd.CreatedAt,
                pd.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (paymentDetail == null)
        {
            return NotFound(new { message = "Payment detail not found" });
        }

        return Ok(paymentDetail);
    }
}

public class CreatePaymentDetailRequest
{
    public Guid PropertyId { get; set; }
    public Guid? PaymentId { get; set; }
    public Guid PaymentMethodId { get; set; }
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? Notes { get; set; }
}
