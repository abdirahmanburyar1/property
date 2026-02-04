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
public class CitiesController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public CitiesController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    public async Task<IActionResult> GetCities([FromQuery] Guid? regionId = null)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var query = session.Query<City>();

        if (regionId.HasValue)
        {
            query = query.Where(c => c.RegionId == regionId.Value);
        }

        var cities = await query
            .OrderBy(c => c.Name)
            .Fetch(c => c.Region)
            .ToListAsync();

        // Get property counts separately since Property.City is a string, not a navigation property
        var cityNames = cities.Select(c => c.Name).ToList();
        var propertyCounts = await session.Query<Property>()
            .Where(p => cityNames.Contains(p.City))
            .GroupBy(p => p.City)
            .Select(g => new { CityName = g.Key, Count = g.Count() })
            .ToListAsync();

        var propertyCountDict = propertyCounts.ToDictionary(pc => pc.CityName, pc => pc.Count);

        var result = cities.Select(c => new
        {
            c.Id,
            c.RegionId,
            RegionName = c.Region.Name,
            c.Name,
            c.Code,
            c.Description,
            c.IsActive,
            PropertyCount = propertyCountDict.GetValueOrDefault(c.Name, 0),
            c.CreatedAt,
            c.UpdatedAt
        }).ToList();

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCity(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var city = await session.Query<City>()
            .Where(c => c.Id == id)
            .Fetch(c => c.Region)
            .FirstOrDefaultAsync();

        if (city == null)
        {
            return NotFound(new { message = "City not found" });
        }

        var propertyCount = await session.Query<Property>()
            .CountAsync(p => p.City.ToLower() == city.Name.ToLower());

        var result = new
        {
            city.Id,
            city.RegionId,
            RegionName = city.Region.Name,
            city.Name,
            city.Code,
            city.Description,
            city.IsActive,
            PropertyCount = propertyCount,
            city.CreatedAt,
            city.UpdatedAt
        };

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateCity([FromBody] CreateCityRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "City name is required" });
        }

        if (request.RegionId == Guid.Empty)
        {
            return BadRequest(new { message = "Region is required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var region = await session.GetAsync<Region>(request.RegionId);
            if (region == null)
            {
                return BadRequest(new { message = "Invalid region" });
            }

            var existing = await session.Query<City>()
                .FirstOrDefaultAsync(c => c.Name.ToLower() == request.Name.ToLower() && c.RegionId == request.RegionId);

            if (existing != null)
            {
                return Conflict(new { message = "City with this name already exists in this region" });
            }

            var city = new City
            {
                RegionId = request.RegionId,
                Name = request.Name.Trim(),
                Code = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                IsActive = request.IsActive ?? true,
                Region = region
            };

            await session.SaveAsync(city);
            await session.FlushAsync();
            await transaction.CommitAsync();

            // Return the created city data directly since we already have the region loaded
            return CreatedAtAction(nameof(GetCity), new { id = city.Id }, new
            {
                city.Id,
                city.RegionId,
                RegionName = region.Name,
                city.Name,
                city.Code,
                city.Description,
                city.IsActive,
                PropertyCount = 0,
                city.CreatedAt,
                city.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            try
            {
                if (transaction.IsActive)
                {
                    await transaction.RollbackAsync();
                }
            }
            catch (Exception rollbackEx)
            {
                Console.WriteLine($"Error during rollback: {rollbackEx.Message}");
            }
            
            // Log the full exception for debugging
            Console.WriteLine($"Error creating city: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                Console.WriteLine($"Inner stack trace: {ex.InnerException.StackTrace}");
            }
            
            return StatusCode(500, new { 
                message = "An error occurred while creating the city", 
                error = ex.Message,
                details = ex.InnerException?.Message 
            });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateCity(Guid id, [FromBody] UpdateCityRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var city = await session.GetAsync<City>(id);
            if (city == null)
            {
                return NotFound(new { message = "City not found" });
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                var existing = await session.Query<City>()
                    .FirstOrDefaultAsync(c => c.Name.ToLower() == request.Name.ToLower() 
                        && c.RegionId == (request.RegionId ?? city.RegionId) 
                        && c.Id != id);

                if (existing != null)
                {
                    return Conflict(new { message = "City with this name already exists in this region" });
                }

                city.Name = request.Name.Trim();
            }

            if (request.RegionId.HasValue && request.RegionId.Value != city.RegionId)
            {
                var region = await session.GetAsync<Region>(request.RegionId.Value);
                if (region == null)
                {
                    return BadRequest(new { message = "Invalid region" });
                }
                city.Region = region;
                city.RegionId = request.RegionId.Value;
            }

            if (request.Code != null) city.Code = request.Code.Trim();
            if (request.Description != null) city.Description = request.Description.Trim();
            if (request.IsActive.HasValue) city.IsActive = request.IsActive.Value;

            city.UpdatedAt = DateTime.UtcNow;

            session.Update(city);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "City updated successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while updating the city", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteCity(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var city = await session.GetAsync<City>(id);
            if (city == null)
            {
                return NotFound(new { message = "City not found" });
            }

            var propertyCount = await session.Query<Property>()
                .CountAsync(p => p.City == city.Name);

            if (propertyCount > 0)
            {
                return BadRequest(new { message = $"Cannot delete city. It is being used by {propertyCount} property(ies)." });
            }

            session.Delete(city);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "City deleted successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while deleting the city", error = ex.Message });
        }
    }
}

public class CreateCityRequest
{
    public Guid RegionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateCityRequest
{
    public Guid? RegionId { get; set; }
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}
