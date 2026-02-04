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
public class CommissionController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public CommissionController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    /// <summary>
    /// Get the current active collector commission rate (e.g. 2 for 2%).
    /// Used by admin settings and by mobile to display commission policy.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCurrent()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var policy = await session.Query<CommissionPolicy>()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.UpdatedAt)
            .FirstOrDefaultAsync();

        if (policy == null)
        {
            return Ok(new { ratePercent = (decimal?)null, description = (string?)null, updatedAt = (DateTime?)null });
        }

        return Ok(new
        {
            ratePercent = policy.RatePercent,
            description = policy.Description,
            updatedAt = policy.UpdatedAt
        });
    }

    /// <summary>
    /// Update the collector commission rate. Admin only (or users with COMMISSION_MANAGE permission).
    /// </summary>
    [HttpPut]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Update([FromBody] UpdateCommissionRequest request)
    {
        if (request.RatePercent < 0 || request.RatePercent > 100)
        {
            return BadRequest(new { message = "Commission rate must be between 0 and 100." });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var policy = await session.Query<CommissionPolicy>()
                .Where(p => p.IsActive)
                .OrderByDescending(p => p.UpdatedAt)
                .FirstOrDefaultAsync();

            if (policy == null)
            {
                policy = new CommissionPolicy { RatePercent = request.RatePercent, IsActive = true };
                if (!string.IsNullOrWhiteSpace(request.Description))
                    policy.Description = request.Description;
                await session.SaveAsync(policy);
            }
            else
            {
                policy.RatePercent = request.RatePercent;
                policy.UpdatedAt = DateTime.UtcNow;
                if (request.Description != null)
                    policy.Description = request.Description;
                await session.UpdateAsync(policy);
            }

            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                ratePercent = policy.RatePercent,
                description = policy.Description,
                updatedAt = policy.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Failed to update commission policy", error = ex.Message });
        }
    }

    public class UpdateCommissionRequest
    {
        public decimal RatePercent { get; set; }
        public string? Description { get; set; }
    }
}
