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
public class RegionsController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public RegionsController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    public async Task<IActionResult> GetRegions()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var regions = await session.Query<Region>()
            .OrderBy(r => r.Name)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Code,
                r.Description,
                r.IsActive,
                CityCount = r.Cities.Count,
                r.CreatedAt,
                r.UpdatedAt
            })
            .ToListAsync();

        return Ok(regions);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetRegion(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

            var region = await session.Query<Region>()
            .Where(r => r.Id == id)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Code,
                r.Description,
                r.IsActive,
                CityCount = r.Cities.Count,
                r.CreatedAt,
                r.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (region == null)
        {
            return NotFound(new { message = "Region not found" });
        }

        return Ok(region);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateRegion([FromBody] CreateRegionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Region name is required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var existing = await session.Query<Region>()
                .FirstOrDefaultAsync(r => r.Name.ToLower() == request.Name.ToLower());

            if (existing != null)
            {
                return Conflict(new { message = "Region with this name already exists" });
            }

            var region = new Region
            {
                Name = request.Name.Trim(),
                Code = request.Code?.Trim(),
                Description = request.Description?.Trim(),
                IsActive = request.IsActive ?? true
            };

            session.Save(region);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetRegion), new { id = region.Id }, new
            {
                region.Id,
                region.Name,
                region.Code,
                region.Description,
                region.IsActive,
                CityCount = 0,
                region.CreatedAt,
                region.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while creating the region", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateRegion(Guid id, [FromBody] UpdateRegionRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var region = await session.GetAsync<Region>(id);
            if (region == null)
            {
                return NotFound(new { message = "Region not found" });
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                var existing = await session.Query<Region>()
                    .FirstOrDefaultAsync(r => r.Name.ToLower() == request.Name.ToLower() && r.Id != id);

                if (existing != null)
                {
                    return Conflict(new { message = "Region with this name already exists" });
                }

                region.Name = request.Name.Trim();
            }

            if (request.Code != null) region.Code = request.Code.Trim();
            if (request.Description != null) region.Description = request.Description.Trim();
            if (request.IsActive.HasValue) region.IsActive = request.IsActive.Value;

            region.UpdatedAt = DateTime.UtcNow;

            session.Update(region);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Region updated successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while updating the region", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteRegion(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var region = await session.GetAsync<Region>(id);
            if (region == null)
            {
                return NotFound(new { message = "Region not found" });
            }

            var cityCount = await session.Query<City>()
                .CountAsync(c => c.RegionId == id);

            if (cityCount > 0)
            {
                return BadRequest(new { message = $"Cannot delete region. It has {cityCount} city(ies) associated with it." });
            }

            session.Delete(region);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Region deleted successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while deleting the region", error = ex.Message });
        }
    }
}

public class CreateRegionRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateRegionRequest
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}
