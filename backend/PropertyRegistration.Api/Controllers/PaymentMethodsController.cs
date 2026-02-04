using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Data;

namespace PropertyRegistration.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentMethodsController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public PaymentMethodsController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaymentMethods()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var methods = await session.Query<PaymentMethod>()
            .Where(pm => pm.IsActive)
            .OrderBy(pm => pm.DisplayOrder)
            .ThenBy(pm => pm.Name)
            .Select(pm => new
            {
                pm.Id,
                pm.Name,
                pm.Code,
                pm.Description,
                pm.IsActive,
                pm.DisplayOrder,
                pm.CreatedAt,
                pm.UpdatedAt
            })
            .ToListAsync();

        return Ok(methods);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPaymentMethod(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var method = await session.GetAsync<PaymentMethod>(id);
        if (method == null)
        {
            return NotFound(new { message = "Payment method not found" });
        }

        var result = new
        {
            method.Id,
            method.Name,
            method.Code,
            method.Description,
            method.IsActive,
            method.DisplayOrder,
            method.CreatedAt,
            method.UpdatedAt
        };

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreatePaymentMethod([FromBody] CreatePaymentMethodRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Payment method name is required" });
        }

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { message = "Payment method code is required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Check if code already exists
            var existing = await session.Query<PaymentMethod>()
                .FirstOrDefaultAsync(pm => pm.Code.ToLower() == request.Code.ToLower());

            if (existing != null)
            {
                return Conflict(new { message = "Payment method with this code already exists" });
            }

            var paymentMethod = new PaymentMethod
            {
                Name = request.Name.Trim(),
                Code = request.Code.Trim().ToUpper(),
                Description = request.Description?.Trim(),
                IsActive = request.IsActive ?? true,
                DisplayOrder = request.DisplayOrder ?? 0
            };

            await session.SaveAsync(paymentMethod);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetPaymentMethod), new { id = paymentMethod.Id }, new
            {
                paymentMethod.Id,
                paymentMethod.Name,
                paymentMethod.Code,
                paymentMethod.Description,
                paymentMethod.IsActive,
                paymentMethod.DisplayOrder,
                paymentMethod.CreatedAt,
                paymentMethod.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while creating the payment method", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdatePaymentMethod(Guid id, [FromBody] UpdatePaymentMethodRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var paymentMethod = await session.GetAsync<PaymentMethod>(id);
            if (paymentMethod == null)
            {
                return NotFound(new { message = "Payment method not found" });
            }

            // Update name if provided
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                paymentMethod.Name = request.Name.Trim();
            }

            // Update code if provided
            if (!string.IsNullOrWhiteSpace(request.Code))
            {
                var trimmedCode = request.Code.Trim().ToUpper();
                // Check if code already exists (excluding current method)
                var existing = await session.Query<PaymentMethod>()
                    .FirstOrDefaultAsync(pm => pm.Code.ToLower() == trimmedCode.ToLower() && pm.Id != id);

                if (existing != null)
                {
                    return Conflict(new { message = "Payment method with this code already exists" });
                }

                paymentMethod.Code = trimmedCode;
            }

            // Update description if provided
            if (request.Description != null)
            {
                paymentMethod.Description = request.Description.Trim();
            }

            // Update IsActive if provided
            if (request.IsActive.HasValue)
            {
                paymentMethod.IsActive = request.IsActive.Value;
            }

            // Update DisplayOrder if provided
            if (request.DisplayOrder.HasValue)
            {
                paymentMethod.DisplayOrder = request.DisplayOrder.Value;
            }

            paymentMethod.UpdatedAt = DateTime.UtcNow;

            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Payment method updated successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while updating the payment method", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeletePaymentMethod(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var paymentMethod = await session.GetAsync<PaymentMethod>(id);
            if (paymentMethod == null)
            {
                return NotFound(new { message = "Payment method not found" });
            }

            // Check if payment method is being used
            var paymentCount = await session.Query<Payment>()
                .CountAsync(p => p.PaymentMethodId == id);

            if (paymentCount > 0)
            {
                return BadRequest(new { message = $"Cannot delete payment method. It is being used by {paymentCount} payment(s)." });
            }

            await session.DeleteAsync(paymentMethod);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Payment method deleted successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while deleting the payment method", error = ex.Message });
        }
    }
}

public class CreatePaymentMethodRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public int? DisplayOrder { get; set; }
}

public class UpdatePaymentMethodRequest
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public int? DisplayOrder { get; set; }
}
