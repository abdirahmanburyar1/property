using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Data;
using System.Security.Claims;
using System.Text.Json;

namespace PropertyRegistration.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public PaymentsController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    public async Task<IActionResult> GetPayments(
        [FromQuery] Guid? propertyId = null,
        [FromQuery] Guid? collectorId = null,
        [FromQuery] Guid? statusId = null,
        [FromQuery] bool? isExempt = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        Console.WriteLine("=== GET PAYMENTS REQUEST ===");
        Console.WriteLine($"PropertyId: {propertyId}");
        Console.WriteLine($"CollectorId: {collectorId}");
        Console.WriteLine($"StatusId: {statusId}");
        Console.WriteLine($"IsExempt: {isExempt}");
        Console.WriteLine($"StartDate: {startDate}, EndDate: {endDate}");
        Console.WriteLine($"Page: {page}, PageSize: {pageSize}");

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var query = session.Query<Payment>();

        // Apply filters
        if (propertyId.HasValue)
        {
            query = query.Where(p => p.PropertyId == propertyId.Value);
            Console.WriteLine($"Applied propertyId filter: {propertyId.Value}");
        }

        if (collectorId.HasValue)
        {
            query = query.Where(p => p.CollectorId == collectorId.Value);
            Console.WriteLine($"Applied collectorId filter: {collectorId.Value}");
        }

        if (statusId.HasValue)
        {
            query = query.Where(p => p.StatusId == statusId.Value);
            Console.WriteLine($"Applied statusId filter: {statusId.Value}");
        }

        if (isExempt.HasValue)
        {
            query = query.Where(p => p.IsExempt == isExempt.Value);
            Console.WriteLine($"Applied isExempt filter: {isExempt.Value}");
        }

        if (startDate.HasValue)
        {
            var from = startDate.Value.Date;
            query = query.Where(p => p.PaymentDate >= from);
            Console.WriteLine($"Applied startDate filter: {from}");
        }

        if (endDate.HasValue)
        {
            var to = endDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(p => p.PaymentDate <= to);
            Console.WriteLine($"Applied endDate filter: {endDate.Value.Date}");
        }

        var totalCount = await query.CountAsync();
        Console.WriteLine($"Total matching payments: {totalCount}");

        // Step 1: Get filtered and paginated payments (IDs only)
        var paymentsBasic = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        Console.WriteLine($"Retrieved {paymentsBasic.Count} payments for page {page}");

        if (!paymentsBasic.Any())
        {
            return Ok(new
            {
                data = new List<object>(),
                totalCount,
                page,
                pageSize,
                totalPages = 0
            });
        }

        // Step 2: Get payment IDs and eager load related entities
        var paymentIds = paymentsBasic.Select(p => p.Id).ToList();

        var enrichedPayments = await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.Property)
            .ThenFetch(p => p.PropertyType)
            .ToListAsync();

        // Separate queries to avoid cartesian product
        await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.Property)
            .ThenFetch(p => p.Owner)
            .ToListAsync();

        await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.CreatedByUser)
            .ToListAsync();

        await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.Collector)
            .ToListAsync();

        await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.PaymentMethod)
            .ToListAsync();

        await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.Status)
            .ToListAsync();

        // Step 3: Project to result
        var payments = enrichedPayments
            .Select(p => new
            {
                p.Id,
                p.PropertyId,
                Property = new
                {
                    p.Property.Id,
                    p.Property.StreetAddress,
                    p.Property.City,
                    p.Property.PlateNumber,
                    PropertyType = p.Property.PropertyType != null ? new { p.Property.PropertyType.Id, p.Property.PropertyType.Name } : null,
                    Owner = p.Property.Owner != null ? new { p.Property.Owner.Id, p.Property.Owner.Name, p.Property.Owner.Phone, p.Property.Owner.Email } : null
                },
                p.Amount,
                p.Currency,
                p.TransactionReference,
                p.ExternalReference,
                p.Notes,
                p.DiscountAmount,
                p.DiscountReason,
                p.IsExempt,
                p.ExemptionReason,
                p.PaymentDate,
                p.CompletedAt,
                CreatedBy = p.CreatedByUser != null ? new { p.CreatedByUser.Id, p.CreatedByUser.FirstName, p.CreatedByUser.LastName, p.CreatedByUser.Email } : null,
                Collector = p.Collector != null ? new { p.Collector.Id, p.Collector.FirstName, p.Collector.LastName, p.Collector.Email } : null,
                PaymentMethod = p.PaymentMethod != null ? new { p.PaymentMethod.Id, p.PaymentMethod.Name, p.PaymentMethod.Code } : null,
                Status = p.Status != null ? new { p.Status.Id, p.Status.Name, p.Status.ColorCode } : null,
                p.PaymentMetadata,
                p.CreatedAt,
                p.UpdatedAt
            })
            .OrderByDescending(p => p.CreatedAt)
            .ToList();

        Console.WriteLine($"✓ Returning {payments.Count} payments");

        return Ok(new
        {
            data = payments,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingPayments(
        [FromQuery] Guid? kontontriyeId = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        Console.WriteLine("=== GET PENDING PAYMENTS REQUEST ===");
        Console.WriteLine($"Kontontriye ID: {kontontriyeId}");
        Console.WriteLine($"Search Query: {search}");
        Console.WriteLine($"Page: {page}, PageSize: {pageSize}");

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var query = session.Query<Payment>();

        // Filter by properties where user is kontontriye
        if (kontontriyeId.HasValue)
        {
            query = query.Where(p => p.Property.KontontriyeId == kontontriyeId.Value);
            Console.WriteLine($"✓ Applied kontontriye filter: {kontontriyeId.Value}");
        }

        // Only get pending payments
        var pendingStatus = await session.Query<PaymentStatus>()
            .Where(s => s.Name == "Pending" || s.Name == "Draft" || s.Name == "Due")
            .Select(s => s.Id)
            .ToListAsync();

        if (pendingStatus.Any())
        {
            query = query.Where(p => pendingStatus.Contains(p.StatusId));
            Console.WriteLine($"✓ Applied pending status filter ({pendingStatus.Count} status IDs)");
        }

        // For search, we need to fetch the data first and filter in memory
        // because NHibernate has trouble with complex nested property queries
        IList<Payment> allPayments;
        
        if (!string.IsNullOrWhiteSpace(search))
        {
            Console.WriteLine($"✓ Search filter will be applied in-memory: '{search}'");
            
            // Get all matching payments (without pagination) with eager loading
            allPayments = await query
                .Fetch(p => p.Property)
                .ThenFetch(prop => prop.Owner)
                .ToListAsync();
            
            // Also load ResponsiblePerson
            var propertyIds = allPayments.Select(p => p.PropertyId).Distinct().ToList();
            if (propertyIds.Any())
            {
                var properties = await session.Query<Property>()
                    .Where(prop => propertyIds.Contains(prop.Id))
                    .Fetch(prop => prop.ResponsiblePerson)
                    .ToListAsync();
                
                // NHibernate will update the payment objects with loaded ResponsiblePerson
            }
            
            // Apply search filter in memory
            var searchLower = search.ToLower();
            allPayments = allPayments.Where(p =>
                (p.Property?.PlateNumber?.ToLower().Contains(searchLower) ?? false) ||
                (p.Property?.Owner?.Name?.ToLower().Contains(searchLower) ?? false) ||
                (p.Property?.Owner?.Phone?.ToLower().Contains(searchLower) ?? false) ||
                (p.Property?.ResponsiblePerson?.Name?.ToLower().Contains(searchLower) ?? false) ||
                (p.Property?.ResponsiblePerson?.Phone?.ToLower().Contains(searchLower) ?? false)
            ).ToList();
            
            Console.WriteLine($"✓ After search filter: {allPayments.Count} payments match");
        }
        else
        {
            // No search - get all payments with Property loaded
            allPayments = await query
                .Fetch(p => p.Property)
                .ToListAsync();
        }

        // Filter out payments where property is fully paid (PaymentStatus = "Paid")
        var beforeFullyPaidFilter = allPayments.Count;
        allPayments = allPayments.Where(p => 
            p.Property?.PaymentStatus != "Paid"
        ).ToList();
        
        if (beforeFullyPaidFilter != allPayments.Count)
        {
            Console.WriteLine($"✓ Filtered out {beforeFullyPaidFilter - allPayments.Count} fully paid properties");
        }

        var totalCount = allPayments.Count;
        Console.WriteLine($"Total pending payments: {totalCount}");

        // Get paginated results
        var paymentsBasic = allPayments
            .OrderBy(p => p.PaymentDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        if (!paymentsBasic.Any())
        {
            return Ok(new
            {
                data = new List<object>(),
                totalCount,
                page,
                pageSize,
                totalPages = 0
            });
        }

        var paymentIds = paymentsBasic.Select(p => p.Id).ToList();

        // Eager load related entities
        var enrichedPayments = await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.Property)
            .ThenFetch(p => p.PropertyType)
            .ToListAsync();

        await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.Property)
            .ThenFetch(p => p.Owner)
            .ToListAsync();

        await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.Property)
            .ThenFetch(p => p.ResponsiblePerson)
            .ToListAsync();

        await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.PaymentMethod)
            .ToListAsync();

        await session.Query<Payment>()
            .Where(p => paymentIds.Contains(p.Id))
            .Fetch(p => p.Status)
            .ToListAsync();

        var payments = enrichedPayments
            .Select(p => new
            {
                p.Id,
                p.PropertyId,
                Property = new
                {
                    p.Property.Id,
                    p.Property.StreetAddress,
                    p.Property.City,
                    p.Property.PlateNumber,
                    p.Property.AreaSize,
                    PropertyType = p.Property.PropertyType != null ? new { 
                        p.Property.PropertyType.Id, 
                        p.Property.PropertyType.Name,
                        p.Property.PropertyType.Price,
                        p.Property.PropertyType.Unit
                    } : null,
                    Owner = p.Property.Owner != null ? new { p.Property.Owner.Id, p.Property.Owner.Name, p.Property.Owner.Phone } : null,
                    ResponsiblePerson = p.Property.ResponsiblePerson != null ? new { p.Property.ResponsiblePerson.Id, p.Property.ResponsiblePerson.Name, p.Property.ResponsiblePerson.Phone } : null,
                    // Payment tracking fields
                    p.Property.PaidAmount,
                    p.Property.PaymentStatus
                },
                p.Amount,
                p.Currency,
                p.TransactionReference,
                p.Notes,
                p.DiscountAmount,
                p.DiscountReason,
                p.IsExempt,
                p.ExemptionReason,
                p.PaymentDate,
                PaymentMethod = p.PaymentMethod != null ? new { p.PaymentMethod.Id, p.PaymentMethod.Name, p.PaymentMethod.Code } : null,
                Status = p.Status != null ? new { p.Status.Id, p.Status.Name, p.Status.ColorCode } : null,
                p.CreatedAt,
            })
            .OrderBy(p => p.PaymentDate)
            .ToList();

        Console.WriteLine($"✓ Returning {payments.Count} pending payments");

        return Ok(new
        {
            data = payments,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("collected-amount")]
    public async Task<IActionResult> GetCollectedAmount(
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null,
        [FromQuery] Guid? kontontriyeId = null)
    {
        Console.WriteLine("=== GET COLLECTED AMOUNT REQUEST (UPDATED TO USE PAYMENT DETAILS) ===");
        Console.WriteLine($"Start Date: {startDate}");
        Console.WriteLine($"End Date: {endDate}");
        Console.WriteLine($"Collector ID: {kontontriyeId}");

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        // Get current user ID from claims if kontontriyeId not provided
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? collectorId = kontontriyeId;
        
        if (!collectorId.HasValue && !string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var currentUserId))
        {
            collectorId = currentUserId;
            Console.WriteLine($"✓ Using current user ID from claims: {collectorId}");
        }

        if (!collectorId.HasValue)
        {
            Console.WriteLine("⚠ WARNING: No collector ID provided - returning zero");
            return Ok(new
            {
                totalAmount = 0m,
                currency = "USD",
                count = 0,
                startDate,
                endDate
            });
        }

        // Query PaymentDetails instead of Payments - these are the actual collected payments
        var query = session.Query<PaymentDetail>()
            .Where(pd => pd.CollectedBy == collectorId.Value);
        
        Console.WriteLine($"✓ Filtering by collector: {collectorId.Value}");

        // Filter by date range
        if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var start))
        {
            query = query.Where(pd => pd.PaymentDate >= start);
            Console.WriteLine($"✓ Applied start date filter: {start:yyyy-MM-dd}");
        }

        if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var end))
        {
            // Add one day to include the entire end date
            var endOfDay = end.AddDays(1);
            query = query.Where(pd => pd.PaymentDate < endOfDay);
            Console.WriteLine($"✓ Applied end date filter: {endOfDay:yyyy-MM-dd}");
        }

        // Get all payment details collected by this user
        var paymentDetails = await query.ToListAsync();
        var totalAmount = paymentDetails.Sum(pd => pd.Amount);
        var currency = paymentDetails.FirstOrDefault()?.Currency ?? "USD";
        var count = paymentDetails.Count;

        Console.WriteLine($"📊 RESULT: {currency} {totalAmount:N2} from {count} payment detail(s)");

        // Get current commission policy for collector commission
        var commissionPolicy = await session.Query<CommissionPolicy>()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.UpdatedAt)
            .FirstOrDefaultAsync();

        decimal commissionRatePercent = commissionPolicy?.RatePercent ?? 0;
        decimal commissionAmount = totalAmount * (commissionRatePercent / 100);

        if (count > 0)
        {
            Console.WriteLine($"   Sample payments:");
            foreach (var pd in paymentDetails.Take(3))
            {
                Console.WriteLine($"   - {pd.Currency} {pd.Amount:N2} on {pd.PaymentDate:yyyy-MM-dd}");
            }
        }

        return Ok(new
        {
            totalAmount,
            currency,
            count,
            startDate,
            endDate,
            collectorId = collectorId.Value,
            commissionRatePercent,
            commissionAmount
        });
    }

    [HttpPost("{id}/collect")]
    public async Task<IActionResult> CollectPayment(Guid id)
    {
        // Get current user ID from token
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Invalid user token" });
        }

        Console.WriteLine("=== COLLECT PAYMENT REQUEST ===");
        Console.WriteLine($"Payment ID: {id}");
        Console.WriteLine($"Collector ID (current user): {userId}");

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Get the payment
            var payment = await session.GetAsync<Payment>(id);
            if (payment == null)
            {
                return NotFound(new { message = "Payment not found" });
            }

            // Get the completed status
            var completedStatus = await session.Query<PaymentStatus>()
                .FirstOrDefaultAsync(s => s.Name == "Completed" || s.Name == "Paid");
            
            if (completedStatus == null)
            {
                return BadRequest(new { message = "Completed status not found in system" });
            }

            // Update payment
            payment.StatusId = completedStatus.Id;
            payment.CollectorId = userId;
            payment.PaymentDate = DateTime.UtcNow;
            payment.CompletedAt = DateTime.UtcNow;

            await session.UpdateAsync(payment);
            await session.FlushAsync();
            await transaction.CommitAsync();

            Console.WriteLine($"✓ Payment collected successfully");
            Console.WriteLine($"  Payment ID: {payment.Id}");
            Console.WriteLine($"  Amount: {payment.Currency} {payment.Amount}");
            Console.WriteLine($"  Collector: {userId}");

            return Ok(new
            {
                id = payment.Id,
                amount = payment.Amount,
                currency = payment.Currency,
                transactionReference = payment.TransactionReference,
                paymentDate = payment.PaymentDate,
                status = new { completedStatus.Id, completedStatus.Name },
                message = "Payment collected successfully"
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($"❌ ERROR collecting payment: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while collecting the payment", error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Get current user ID from token
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Invalid user token" });
        }

        Console.WriteLine("=== CREATE PAYMENT REQUEST ===");
        Console.WriteLine($"Property ID: {request.PropertyId}");
        Console.WriteLine($"Amount: {request.Amount} {request.Currency}");
        Console.WriteLine($"Collector ID (current user): {userId}");
        Console.WriteLine($"Payment Method: {request.PaymentMethod}");
        Console.WriteLine($"Payment Date: {request.PaymentDate}");

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Verify property exists
            var property = await session.GetAsync<Property>(request.PropertyId);
            if (property == null)
            {
                return NotFound(new { message = "Property not found" });
            }

            // Get payment method
            var paymentMethod = await session.Query<PaymentMethod>()
                .FirstOrDefaultAsync(pm => pm.Code == request.PaymentMethod);
            
            if (paymentMethod == null)
            {
                return BadRequest(new { message = $"Payment method '{request.PaymentMethod}' not found" });
            }

            // Get payment status
            var status = await session.Query<PaymentStatus>()
                .FirstOrDefaultAsync(ps => ps.Name == request.Status);
            
            if (status == null)
            {
                // Default to Completed status
                status = await session.Query<PaymentStatus>()
                    .FirstOrDefaultAsync(ps => ps.Name == "Completed");
            }

            if (status == null)
            {
                return BadRequest(new { message = "Payment status not found" });
            }

            // Get user for navigation properties
            var user = await session.GetAsync<User>(userId);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            // Generate transaction reference
            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var propertyIdShort = request.PropertyId.ToString("N")[..8].ToUpper();
            var transactionRef = $"PAY-{propertyIdShort}-{timestamp}";

            // Ensure unique transaction reference
            var existingRef = await session.Query<Payment>()
                .Where(p => p.TransactionReference == transactionRef)
                .AnyAsync();
            
            if (existingRef)
            {
                transactionRef = $"{transactionRef}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
            }

            // Validate discount cannot exceed payment amount
            var discountAmount = request.DiscountAmount ?? 0;
            if (discountAmount < 0)
            {
                return BadRequest(new { message = "Discount amount cannot be negative." });
            }
            if (discountAmount > request.Amount)
            {
                return BadRequest(new
                {
                    message = "The total discount amount cannot exceed the total payment amount.",
                    paymentAmount = request.Amount
                });
            }

            // Create payment with collector set to current user
            var payment = new Payment
            {
                PropertyId = request.PropertyId,
                CreatedBy = userId,
                CollectorId = userId, // IMPORTANT: Set collector to current user
                PaymentMethodId = paymentMethod.Id,
                StatusId = status.Id,
                Amount = request.Amount,
                Currency = request.Currency ?? "USD",
                TransactionReference = transactionRef,
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
                PaymentDate = request.PaymentDate ?? DateTime.UtcNow,
                DiscountAmount = request.DiscountAmount ?? 0,
                DiscountReason = string.IsNullOrWhiteSpace(request.DiscountReason) ? null : request.DiscountReason.Trim(),
                IsExempt = request.IsExempt ?? false,
                ExemptionReason = string.IsNullOrWhiteSpace(request.ExemptionReason) ? null : request.ExemptionReason.Trim(),
                Property = property,
                CreatedByUser = user,
                Collector = user, // Set navigation property
                PaymentMethod = paymentMethod,
                Status = status
            };

            await session.SaveAsync(payment);
            await session.FlushAsync();
            await transaction.CommitAsync();

            Console.WriteLine($"✓ Payment created successfully");
            Console.WriteLine($"  ID: {payment.Id}");
            Console.WriteLine($"  Transaction Reference: {transactionRef}");
            Console.WriteLine($"  Collector: {user.FirstName} {user.LastName}");

            // Return payment with details
            return Ok(new
            {
                id = payment.Id,
                propertyId = payment.PropertyId,
                amount = payment.Amount,
                currency = payment.Currency,
                transactionReference = transactionRef,
                paymentDate = payment.PaymentDate,
                status = new { status.Id, status.Name },
                collector = new { user.Id, user.FirstName, user.LastName },
                message = "Payment recorded successfully"
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($"❌ ERROR creating payment: {ex.Message}");
            Console.WriteLine($"   Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "An error occurred while recording the payment", error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPayment(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var payment = await session.Query<Payment>()
            .Where(p => p.Id == id)
            .Fetch(p => p.Property)
            .ThenFetch(p => p.PropertyType)
            .Fetch(p => p.Property)
            .ThenFetch(p => p.Owner)
            .Fetch(p => p.CreatedByUser)
            .Fetch(p => p.Collector)
            .Fetch(p => p.PaymentMethod)
            .Fetch(p => p.Status)
            .Select(p => new
            {
                p.Id,
                p.PropertyId,
                Property = new
                {
                    p.Property.Id,
                    p.Property.StreetAddress,
                    p.Property.City,
                    p.Property.PlateNumber,
                    p.Property.RegionId,
                    p.Property.CityId,
                    PropertyType = new { p.Property.PropertyType.Id, p.Property.PropertyType.Name, p.Property.PropertyType.Price, p.Property.PropertyType.Unit },
                    Owner = p.Property.Owner != null ? new { p.Property.Owner.Id, p.Property.Owner.Name, p.Property.Owner.Phone, p.Property.Owner.Email, p.Property.Owner.Address } : null
                },
                p.Amount,
                p.Currency,
                p.TransactionReference,
                p.ExternalReference,
                p.Notes,
                p.DiscountAmount,
                p.DiscountReason,
                p.IsExempt,
                p.ExemptionReason,
                p.PaymentDate,
                p.CompletedAt,
                CreatedBy = new { p.CreatedByUser.Id, p.CreatedByUser.FirstName, p.CreatedByUser.LastName, p.CreatedByUser.Email },
                Collector = p.Collector != null ? new { p.Collector.Id, p.Collector.FirstName, p.Collector.LastName, p.Collector.Email } : null,
                CollectorId = p.CollectorId,
                PaymentMethod = new { p.PaymentMethod.Id, p.PaymentMethod.Name, p.PaymentMethod.Code },
                Status = new { p.Status.Id, p.Status.Name, p.Status.ColorCode },
                StatusId = p.StatusId,
                PaymentMethodId = p.PaymentMethodId,
                p.PaymentMetadata,
                p.CreatedAt,
                p.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (payment == null)
        {
            return NotFound(new { message = "Payment not found" });
        }

        return Ok(payment);
    }

    [HttpGet("property/{propertyId}")]
    public async Task<IActionResult> GetPaymentsByProperty(Guid propertyId)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var payments = await session.Query<Payment>()
            .Where(p => p.PropertyId == propertyId)
            .Fetch(p => p.PaymentMethod)
            .Fetch(p => p.Status)
            .Fetch(p => p.Collector)
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new
            {
                p.Id,
                p.Amount,
                p.Currency,
                p.TransactionReference,
                p.DiscountAmount,
                p.DiscountReason,
                p.IsExempt,
                p.ExemptionReason,
                p.PaymentDate,
                p.CompletedAt,
                Collector = p.Collector != null ? new { p.Collector.Id, p.Collector.FirstName, p.Collector.LastName } : null,
                PaymentMethod = new { p.PaymentMethod.Id, p.PaymentMethod.Name },
                Status = new { p.Status.Id, p.Status.Name, p.Status.ColorCode },
                p.PaymentMetadata,
                p.CreatedAt
            })
            .ToListAsync();

        return Ok(payments);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePayment(Guid id, [FromBody] UpdatePaymentRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var payment = await session.GetAsync<Payment>(id);
            if (payment == null)
            {
                return NotFound(new { message = "Payment not found" });
            }

            // Update status if provided
            if (request.StatusId.HasValue)
            {
                var status = await session.GetAsync<PaymentStatus>(request.StatusId.Value);
                if (status != null)
                {
                    payment.StatusId = request.StatusId.Value;
                    payment.Status = status;

                    // If status is being set to Completed, set CompletedAt
                    if (status.Name == "Completed" && payment.CompletedAt == null)
                    {
                        payment.CompletedAt = DateTime.UtcNow;
                    }
                }
            }

            // Update collector if provided
            if (request.CollectorId.HasValue)
            {
                var collector = await session.GetAsync<User>(request.CollectorId.Value);
                if (collector != null)
                {
                    payment.CollectorId = request.CollectorId.Value;
                    payment.Collector = collector;
                }
            }
            else if (request.CollectorId == null && request.ClearCollector == true)
            {
                payment.CollectorId = null;
                payment.Collector = null;
            }

            // Update discount fields (discount cannot exceed remaining balance)
            if (request.DiscountAmount.HasValue)
            {
                var discountValue = request.DiscountAmount.Value;
                if (discountValue < 0)
                {
                    return BadRequest(new { message = "Discount amount cannot be negative." });
                }
                // Load property with type to get expected amount and remaining balance
                var propertyForDiscount = await session.Query<Property>()
                    .Where(p => p.Id == payment.PropertyId)
                    .Fetch(p => p.PropertyType)
                    .FirstOrDefaultAsync();
                if (propertyForDiscount?.PropertyType != null)
                {
                    var expectedAmount = propertyForDiscount.PropertyType.Price * propertyForDiscount.AreaSize;
                    var remainingAmount = expectedAmount - propertyForDiscount.PaidAmount;
                    if (remainingAmount < 0) remainingAmount = 0;
                    if (discountValue > remainingAmount)
                    {
                        return BadRequest(new
                        {
                            message = "The total discount amount cannot exceed the total payment amount (remaining balance).",
                            remainingBalance = remainingAmount
                        });
                    }
                }
                payment.DiscountAmount = discountValue;
            }

            if (request.DiscountReason != null)
            {
                payment.DiscountReason = string.IsNullOrWhiteSpace(request.DiscountReason) ? null : request.DiscountReason.Trim();
            }

            // Update exemption fields
            if (request.IsExempt.HasValue)
            {
                payment.IsExempt = request.IsExempt.Value;
            }

            if (request.ExemptionReason != null)
            {
                payment.ExemptionReason = string.IsNullOrWhiteSpace(request.ExemptionReason) ? null : request.ExemptionReason.Trim();
            }

            // Update notes
            if (request.Notes != null)
            {
                payment.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
            }

            // Update external reference
            if (request.ExternalReference != null)
            {
                payment.ExternalReference = string.IsNullOrWhiteSpace(request.ExternalReference) ? null : request.ExternalReference.Trim();
            }

            payment.UpdatedAt = DateTime.UtcNow;

            await session.FlushAsync();
            await transaction.CommitAsync();

            // Reload payment with relationships
            session.Clear();
            var updatedPayment = await session.Query<Payment>()
                .Where(p => p.Id == payment.Id)
                .Fetch(p => p.Property)
                .ThenFetch(p => p.PropertyType)
                .Fetch(p => p.Property)
                .ThenFetch(p => p.Owner)
                .Fetch(p => p.CreatedByUser)
                .Fetch(p => p.Collector)
                .Fetch(p => p.PaymentMethod)
                .Fetch(p => p.Status)
                .Select(p => new
                {
                    p.Id,
                    p.PropertyId,
                    Property = new
                    {
                        p.Property.Id,
                        p.Property.StreetAddress,
                        p.Property.City,
                        p.Property.PlateNumber,
                        PropertyType = new { p.Property.PropertyType.Id, p.Property.PropertyType.Name },
                        Owner = p.Property.Owner != null ? new { p.Property.Owner.Id, p.Property.Owner.Name, p.Property.Owner.Phone, p.Property.Owner.Email } : null
                    },
                    p.Amount,
                    p.Currency,
                    p.TransactionReference,
                    p.ExternalReference,
                    p.Notes,
                    p.DiscountAmount,
                    p.DiscountReason,
                    p.IsExempt,
                    p.ExemptionReason,
                    p.PaymentDate,
                    p.CompletedAt,
                    CreatedBy = new { p.CreatedByUser.Id, p.CreatedByUser.FirstName, p.CreatedByUser.LastName },
                    Collector = p.Collector != null ? new { p.Collector.Id, p.Collector.FirstName, p.Collector.LastName } : null,
                    PaymentMethod = new { p.PaymentMethod.Id, p.PaymentMethod.Name },
                    Status = new { p.Status.Id, p.Status.Name, p.Status.ColorCode },
                    p.PaymentMetadata,
                    p.CreatedAt,
                    p.UpdatedAt
                })
                .FirstOrDefaultAsync();

            return Ok(updatedPayment);
        }
        catch (Exception ex)
        {
            try { await transaction.RollbackAsync(); } catch { }
            Console.WriteLine($"Error updating payment: {ex}");
            return StatusCode(500, new { message = "An error occurred while updating the payment", error = ex.Message });
        }
    }

    [HttpGet("statuses")]
    public async Task<IActionResult> GetPaymentStatuses()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var statuses = await session.Query<PaymentStatus>()
            .Where(s => s.IsActive)
            .OrderBy(s => s.DisplayOrder)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.Description,
                s.ColorCode,
                s.DisplayOrder
            })
            .ToListAsync();

        return Ok(statuses);
    }

    [HttpGet("methods")]
    public async Task<IActionResult> GetPaymentMethods()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var methods = await session.Query<PaymentMethod>()
            .Where(m => m.IsActive)
            .OrderBy(m => m.DisplayOrder)
            .Select(m => new
            {
                m.Id,
                m.Name,
                m.Code,
                m.Description,
                m.DisplayOrder
            })
            .ToListAsync();

        return Ok(methods);
    }

    [HttpPost("create-for-approved-properties")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreatePaymentsForApprovedProperties()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Get all approved properties that don't have payments for current year
            var currentYear = DateTime.UtcNow.Year;
            var approvedStatus = await session.Query<PropertyStatus>()
                .FirstOrDefaultAsync(ps => ps.Name == "Approved");

            if (approvedStatus == null)
            {
                return BadRequest(new { message = "Approved status not found" });
            }

            var approvedProperties = await session.Query<Property>()
                .Where(p => p.StatusId == approvedStatus.Id)
                .Fetch(p => p.PropertyType)
                .ToListAsync();

            var createdPayments = new List<object>();
            var errors = new List<string>();

            foreach (var property in approvedProperties)
            {
                try
                {
                    // Check if payment already exists for this year
                    var existingPayments = await session.Query<Payment>()
                        .Where(p => p.PropertyId == property.Id)
                        .ToListAsync();

                    bool hasPaymentForYear = false;
                    foreach (var existingPayment in existingPayments)
                    {
                        if (existingPayment.PaymentMetadata != null && 
                            existingPayment.PaymentMetadata.RootElement.TryGetProperty("year", out var yearElement))
                        {
                            if (yearElement.GetInt32() == currentYear)
                            {
                                hasPaymentForYear = true;
                                break;
                            }
                        }
                    }

                    if (hasPaymentForYear)
                    {
                        continue; // Skip if payment already exists
                    }

                    // Get required entities
                    var paymentMethod = await session.Query<PaymentMethod>()
                        .FirstOrDefaultAsync(pm => pm.Code == "BANK") 
                        ?? await session.Query<PaymentMethod>().FirstOrDefaultAsync();

                    var pendingStatus = await session.Query<PaymentStatus>()
                        .FirstOrDefaultAsync(ps => ps.Name == "Pending");

                    if (paymentMethod == null || pendingStatus == null || property.PropertyType == null)
                    {
                        errors.Add($"Property {property.Id}: Missing required data (PaymentMethod, PaymentStatus, or PropertyType)");
                        continue;
                    }

                    // Calculate amount
                    var amount = property.PropertyType.Price * property.AreaSize;

                    // Generate transaction reference
                    var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
                    var propertyIdShort = property.Id.ToString("N")[..8].ToUpper();
                    var transactionRef = $"PROP-{propertyIdShort}-{currentYear}-{timestamp}";

                    // Create metadata
                    var metadata = new
                    {
                        isRecurring = true,
                        frequency = "yearly",
                        year = currentYear,
                        period = 1,
                        propertyType = property.PropertyType.Name,
                        areaSize = property.AreaSize,
                        unitPrice = property.PropertyType.Price
                    };

                    var metadataJson = System.Text.Json.JsonSerializer.Serialize(metadata);
                    var metadataDoc = System.Text.Json.JsonDocument.Parse(metadataJson);

                    // Get created by (use ApprovedBy if available, otherwise CreatedBy)
                    var createdBy = property.ApprovedBy.HasValue && property.ApprovedBy.Value != Guid.Empty 
                        ? property.ApprovedBy.Value 
                        : property.CreatedBy;
                    var createdByUser = await session.GetAsync<User>(createdBy);

                    if (createdByUser == null)
                    {
                        errors.Add($"Property {property.Id}: CreatedBy user not found");
                        continue;
                    }

                    // Create payment
                    var payment = new Payment
                    {
                        PropertyId = property.Id,
                        CreatedBy = createdBy,
                        CollectorId = property.CollectorId,
                        PaymentMethodId = paymentMethod.Id,
                        StatusId = pendingStatus.Id,
                        Amount = amount,
                        Currency = property.Currency ?? "USD",
                        TransactionReference = transactionRef,
                        Notes = $"Yearly permit fee for {property.PropertyType.Name} property ({property.AreaSize} {property.AreaUnit}) - Year {currentYear}",
                        PaymentMetadata = metadataDoc,
                        IsExempt = false,
                        PaymentDate = DateTime.UtcNow,
                        Property = property,
                        CreatedByUser = createdByUser,
                        Collector = property.CollectorId.HasValue ? await session.GetAsync<User>(property.CollectorId.Value) : null,
                        PaymentMethod = paymentMethod,
                        Status = pendingStatus
                    };

                    await session.SaveAsync(payment);
                    createdPayments.Add(new { payment.Id, propertyId = property.Id, amount, currency = payment.Currency });
                }
                catch (Exception ex)
                {
                    errors.Add($"Property {property.Id}: {ex.Message}");
                }
            }

            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                message = $"Processed {approvedProperties.Count} approved properties",
                created = createdPayments.Count,
                skipped = approvedProperties.Count - createdPayments.Count - errors.Count,
                errors = errors,
                payments = createdPayments
            });
        }
        catch (Exception ex)
        {
            try { await transaction.RollbackAsync(); } catch { }
            return StatusCode(500, new { message = "Error creating payments", error = ex.Message });
        }
    }
}

public class CreatePaymentRequest
{
    public Guid PropertyId { get; set; }
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string? Status { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string? Notes { get; set; }
    public decimal? DiscountAmount { get; set; }
    public string? DiscountReason { get; set; }
    public bool? IsExempt { get; set; }
    public string? ExemptionReason { get; set; }
}

public class UpdatePaymentRequest
{
    public Guid? StatusId { get; set; }
    public Guid? CollectorId { get; set; }
    public bool? ClearCollector { get; set; }
    public decimal? DiscountAmount { get; set; }
    public string? DiscountReason { get; set; }
    public bool? IsExempt { get; set; }
    public string? ExemptionReason { get; set; }
    public string? Notes { get; set; }
    public string? ExternalReference { get; set; }
}
