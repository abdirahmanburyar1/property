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
public class RevenueSplitController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public RevenueSplitController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    /// <summary>
    /// Get the current revenue split policy (company % vs municipality %).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCurrent()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var policy = await session.Query<RevenueSplitPolicy>()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.UpdatedAt)
            .FirstOrDefaultAsync();

        if (policy == null)
        {
            return Ok(new
            {
                companySharePercent = (decimal?)null,
                municipalitySharePercent = (decimal?)null,
                description = (string?)null,
                updatedAt = (DateTime?)null
            });
        }

        return Ok(new
        {
            companySharePercent = policy.CompanySharePercent,
            municipalitySharePercent = policy.MunicipalitySharePercent,
            description = policy.Description,
            updatedAt = policy.UpdatedAt
        });
    }

    /// <summary>
    /// Update the revenue split policy. Admin only.
    /// </summary>
    [HttpPut]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Update([FromBody] UpdateRevenueSplitRequest request)
    {
        if (request.CompanySharePercent < 0 || request.CompanySharePercent > 100 ||
            request.MunicipalitySharePercent < 0 || request.MunicipalitySharePercent > 100)
        {
            return BadRequest(new { message = "Shares must be between 0 and 100." });
        }

        var sum = request.CompanySharePercent + request.MunicipalitySharePercent;
        if (Math.Abs(sum - 100) > 0.01m)
        {
            return BadRequest(new { message = "Company and municipality shares must sum to 100." });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var policy = await session.Query<RevenueSplitPolicy>()
                .Where(p => p.IsActive)
                .OrderByDescending(p => p.UpdatedAt)
                .FirstOrDefaultAsync();

            if (policy == null)
            {
                policy = new RevenueSplitPolicy
                {
                    IsActive = true,
                    CompanySharePercent = request.CompanySharePercent,
                    MunicipalitySharePercent = request.MunicipalitySharePercent,
                    Description = request.Description
                };
                await session.SaveAsync(policy);
            }
            else
            {
                policy.CompanySharePercent = request.CompanySharePercent;
                policy.MunicipalitySharePercent = request.MunicipalitySharePercent;
                policy.UpdatedAt = DateTime.UtcNow;
                if (request.Description != null)
                    policy.Description = request.Description;
                await session.UpdateAsync(policy);
            }
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                companySharePercent = policy.CompanySharePercent,
                municipalitySharePercent = policy.MunicipalitySharePercent,
                description = policy.Description,
                updatedAt = policy.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Failed to update revenue split policy", error = ex.Message });
        }
    }

    /// <summary>
    /// Get daily settlement (xisaab xir) for a given date: total collected that day, commission, net, company share, municipality share.
    /// </summary>
    [HttpGet("daily-settlement")]
    public async Task<IActionResult> GetDailySettlement([FromQuery] DateTime? date = null)
    {
        var targetDate = date?.Date ?? DateTime.UtcNow.Date.AddDays(-1);
        var startOfDay = targetDate.Date;
        var endOfDay = startOfDay.AddDays(1);

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var paymentDetails = await session.Query<PaymentDetail>()
            .Where(pd => pd.PaymentDate >= startOfDay && pd.PaymentDate < endOfDay)
            .ToListAsync();

        var totalCollected = paymentDetails.Sum(pd => pd.Amount);
        var currency = paymentDetails.FirstOrDefault()?.Currency ?? "USD";
        var paymentCount = paymentDetails.Count;

        var commissionPolicy = await session.Query<CommissionPolicy>()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.UpdatedAt)
            .FirstOrDefaultAsync();
        var commissionRatePercent = commissionPolicy?.RatePercent ?? 0;
        var commissionAmount = totalCollected * (commissionRatePercent / 100);
        var netAfterCommission = totalCollected - commissionAmount;

        var splitPolicy = await session.Query<RevenueSplitPolicy>()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.UpdatedAt)
            .FirstOrDefaultAsync();
        var companyPercent = splitPolicy?.CompanySharePercent ?? 0;
        var municipalityPercent = splitPolicy?.MunicipalitySharePercent ?? 0;
        var companyShare = netAfterCommission * (companyPercent / 100);
        var municipalityShare = netAfterCommission * (municipalityPercent / 100);

        return Ok(new
        {
            date = startOfDay.ToString("yyyy-MM-dd"),
            totalCollected,
            currency,
            paymentCount,
            commissionRatePercent,
            commissionAmount,
            netAfterCommission,
            split = new
            {
                companySharePercent = companyPercent,
                municipalitySharePercent = municipalityPercent,
                companyShare,
                municipalityShare
            }
        });
    }

    public class UpdateRevenueSplitRequest
    {
        public decimal CompanySharePercent { get; set; }
        public decimal MunicipalitySharePercent { get; set; }
        public string? Description { get; set; }
    }
}
