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
public class DashboardController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public DashboardController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    public async Task<IActionResult> GetDashboardStats()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var now = DateTime.UtcNow;
        var startOfThisMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startOfLastMonth = startOfThisMonth.AddMonths(-1);
        var endOfLastMonth = startOfThisMonth.AddTicks(-1);

        // Total properties
        var totalProperties = await session.Query<Property>().CountAsync();
        var totalPropertiesLastMonth = await session.Query<Property>()
            .Where(p => p.CreatedAt < startOfThisMonth)
            .CountAsync();

        // Total payments (count and sum of completed/paid)
        var completedStatusNames = new[] { "Completed", "Paid" };
        var completedStatusIds = await session.Query<PaymentStatus>()
            .Where(s => completedStatusNames.Contains(s.Name))
            .Select(s => s.Id)
            .ToListAsync();

        var paymentsQuery = session.Query<Payment>().Where(p => completedStatusIds.Contains(p.StatusId));
        var totalPaymentsCount = await paymentsQuery.CountAsync();
        var totalPaymentsAmount = await paymentsQuery.SumAsync(p => p.Amount);

        var paymentsLastMonthQuery = session.Query<Payment>()
            .Where(p => completedStatusIds.Contains(p.StatusId) && p.PaymentDate >= startOfLastMonth && p.PaymentDate <= endOfLastMonth);
        var totalPaymentsAmountLastMonth = await paymentsLastMonthQuery.SumAsync(p => p.Amount);

        var paymentsThisMonthQuery = session.Query<Payment>()
            .Where(p => completedStatusIds.Contains(p.StatusId) && p.PaymentDate >= startOfThisMonth);
        var totalPaymentsAmountThisMonth = await paymentsThisMonthQuery.SumAsync(p => p.Amount);

        // Active users
        var activeUsers = await session.Query<User>().Where(u => u.IsActive).CountAsync();

        // Pending approvals (properties with Pending status)
        var pendingStatusId = await session.Query<PropertyStatus>()
            .Where(s => s.Name == "Pending")
            .Select(s => s.Id)
            .FirstOrDefaultAsync();
        var pendingApprovals = pendingStatusId != default
            ? await session.Query<Property>().Where(p => p.StatusId == pendingStatusId).CountAsync()
            : 0;

        // Registration trends: count of properties created per month (last 12 months)
        var trends = new List<object>();
        for (var i = 11; i >= 0; i--)
        {
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
            var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
            var count = await session.Query<Property>()
                .Where(p => p.CreatedAt >= monthStart && p.CreatedAt <= monthEnd)
                .CountAsync();
            trends.Add(new
            {
                month = monthStart.Month,
                year = monthStart.Year,
                label = monthStart.ToString("MMM yyyy"),
                count
            });
        }

        // Recent activity: latest properties and payments
        var recentProperties = await session.Query<Property>()
            .OrderByDescending(p => p.CreatedAt)
            .Take(5)
            .Select(p => new { p.Id, p.PlateNumber, p.StreetAddress, p.CreatedAt })
            .ToListAsync();

        var recentPaymentsData = await session.Query<Payment>()
            .Where(p => completedStatusIds.Contains(p.StatusId))
            .OrderByDescending(p => p.PaymentDate)
            .Take(5)
            .Select(p => new { p.Id, p.Amount, p.Currency, p.PaymentDate, p.PropertyId })
            .ToListAsync();

        var propertyIds = recentPaymentsData.Select(p => p.PropertyId).Distinct().ToList();
        var plateByPropId = new Dictionary<Guid, string?>();
        if (propertyIds.Count > 0)
        {
            var plateList = await session.Query<Property>()
                .Where(prop => propertyIds.Contains(prop.Id))
                .Select(prop => new { prop.Id, prop.PlateNumber })
                .ToListAsync();
            foreach (var x in plateList)
                plateByPropId[x.Id] = x.PlateNumber;
        }

        var activitiesList = new List<(DateTime time, string type, string description)>();
        foreach (var p in recentProperties)
        {
            activitiesList.Add((p.CreatedAt, "property", $"Property registered: {p.PlateNumber ?? p.StreetAddress ?? "N/A"}"));
        }
        foreach (var p in recentPaymentsData)
        {
            var plate = plateByPropId.TryGetValue(p.PropertyId, out var pl) ? pl : null;
            activitiesList.Add((p.PaymentDate, "payment", $"Payment received: {p.Currency} {p.Amount:N0}" + (plate != null ? $" (Plate: {plate})" : "")));
        }
        var activities = activitiesList
            .OrderByDescending(a => a.time)
            .Take(10)
            .Select(a => new { type = a.type, description = a.description, time = a.time })
            .ToList();

        // Percent changes (vs last month)
        var propertiesChange = totalPropertiesLastMonth > 0
            ? (int)Math.Round((totalProperties - totalPropertiesLastMonth) * 100.0 / totalPropertiesLastMonth)
            : (totalProperties > 0 ? 100 : 0);
        var paymentsChange = totalPaymentsAmountLastMonth > 0
            ? (int)Math.Round((double)((totalPaymentsAmountThisMonth - totalPaymentsAmountLastMonth) * 100 / totalPaymentsAmountLastMonth))
            : (totalPaymentsAmountThisMonth > 0 ? 100 : 0);

        return Ok(new
        {
            totalProperties,
            totalPropertiesLastMonth,
            propertiesChangePercent = propertiesChange,
            totalPaymentsCount,
            totalPaymentsAmount,
            totalPaymentsAmountLastMonth,
            paymentsChangePercent = paymentsChange,
            activeUsers,
            pendingApprovals,
            registrationTrends = trends,
            recentActivity = activities
        });
    }
}
