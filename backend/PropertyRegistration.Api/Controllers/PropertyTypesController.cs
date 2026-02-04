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
public class PropertyTypesController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public PropertyTypesController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    public async Task<IActionResult> GetPropertyTypes()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        // First, ensure all PropertyTypes have Unit and Price set (migration)
        try
        {
            var updateSql = @"UPDATE ""PropertyTypes"" 
                             SET ""Unit"" = COALESCE(""Unit"", 'm'), 
                                 ""Price"" = COALESCE(""Price"", 0) 
                             WHERE ""Unit"" IS NULL OR ""Price"" IS NULL";
            session.CreateSQLQuery(updateSql).ExecuteUpdate();
            session.Flush();
        }
        catch
        {
            // Ignore if columns don't exist or already updated
        }

        // Load PropertyTypes and get property counts separately to avoid null reference issues
        var typesList = await session.Query<PropertyType>()
            .OrderBy(t => t.Name)
            .ToListAsync();

        var typeIds = typesList.Select(t => t.Id).ToList();
        var propertyCounts = await session.Query<Property>()
            .Where(p => typeIds.Contains(p.PropertyTypeId))
            .GroupBy(p => p.PropertyTypeId)
            .Select(g => new { PropertyTypeId = g.Key, Count = g.Count() })
            .ToListAsync();

        var countDict = propertyCounts.ToDictionary(pc => pc.PropertyTypeId, pc => pc.Count);

        var types = typesList.Select(t => new
        {
            t.Id,
            t.Name,
            t.Price,
            t.Unit,
            PropertyCount = countDict.GetValueOrDefault(t.Id, 0),
            t.CreatedAt,
            t.UpdatedAt
        }).ToList();

        return Ok(types);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPropertyType(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        // Ensure PropertyType has Unit and Price set (migration)
        try
        {
            var updateSql = @"UPDATE ""PropertyTypes"" 
                             SET ""Unit"" = COALESCE(""Unit"", 'USD'), 
                                 ""Price"" = COALESCE(""Price"", 0) 
                             WHERE ""Id"" = :id AND (""Unit"" IS NULL OR ""Price"" IS NULL)";
            session.CreateSQLQuery(updateSql)
                .SetParameter("id", id)
                .ExecuteUpdate();
            session.Flush();
        }
        catch
        {
            // Ignore if columns don't exist or already updated
        }

        var typeEntity = await session.GetAsync<PropertyType>(id);
        if (typeEntity == null)
        {
            return NotFound(new { message = "Property type not found" });
        }

        var propertyCount = await session.Query<Property>()
            .CountAsync(p => p.PropertyTypeId == id);

        var type = new
        {
            typeEntity.Id,
            typeEntity.Name,
            typeEntity.Price,
            typeEntity.Unit,
            PropertyCount = propertyCount,
            typeEntity.CreatedAt,
            typeEntity.UpdatedAt
        };

        if (type == null)
        {
            return NotFound(new { message = "Property type not found" });
        }

        return Ok(type);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreatePropertyType([FromBody] CreatePropertyTypeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Property type name is required" });
        }

        if (request.Price < 0)
        {
            return BadRequest(new { message = "Price must be greater than or equal to zero" });
        }

        if (string.IsNullOrWhiteSpace(request.Unit))
        {
            return BadRequest(new { message = "Unit is required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Check if name already exists
            var existing = await session.Query<PropertyType>()
                .FirstOrDefaultAsync(t => t.Name.ToLower() == request.Name.ToLower());

            if (existing != null)
            {
                return Conflict(new { message = "Property type with this name already exists" });
            }

            var propertyType = new PropertyType
            {
                Name = request.Name.Trim(),
                Price = request.Price,
                Unit = request.Unit.Trim()
            };

            session.Save(propertyType);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetPropertyType), new { id = propertyType.Id }, new
            {
                propertyType.Id,
                propertyType.Name,
                propertyType.Price,
                propertyType.Unit,
                PropertyCount = 0,
                propertyType.CreatedAt,
                propertyType.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while creating the property type", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePropertyType(Guid id, [FromBody] UpdatePropertyTypeRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var propertyType = await session.GetAsync<PropertyType>(id);
            if (propertyType == null)
            {
                return NotFound(new { message = "Property type not found" });
            }

            // Ensure Unit has a value (for old records that might have null Unit)
            if (string.IsNullOrWhiteSpace(propertyType.Unit))
            {
                propertyType.Unit = "m";
            }

            // Update name if provided
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                var trimmedName = request.Name.Trim();
                // Check if name already exists (excluding current type)
                var existing = await session.Query<PropertyType>()
                    .FirstOrDefaultAsync(t => t.Name.ToLower() == trimmedName.ToLower() && t.Id != id);

                if (existing != null)
                {
                    return Conflict(new { message = "Property type with this name already exists" });
                }

                propertyType.Name = trimmedName;
            }

            // Update price if provided
            if (request.Price.HasValue)
            {
                if (request.Price.Value < 0)
                {
                    return BadRequest(new { message = "Price must be greater than or equal to zero" });
                }
                propertyType.Price = request.Price.Value;
            }

            // Update unit - always ensure it has a value
            if (!string.IsNullOrWhiteSpace(request.Unit))
            {
                propertyType.Unit = request.Unit.Trim();
            }
            // Ensure unit always has a default value (for old records or if not provided)
            if (string.IsNullOrWhiteSpace(propertyType.Unit))
            {
                propertyType.Unit = "m";
            }

            propertyType.UpdatedAt = DateTime.UtcNow;

            // Entity is already attached from GetAsync, just flush changes
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Property type updated successfully" });
        }
        catch (Exception ex)
        {
            try { await transaction.RollbackAsync(); } catch { }
            // Log the full exception for debugging
            Console.WriteLine($"Error updating property type: {ex}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                Console.WriteLine($"Inner stack trace: {ex.InnerException.StackTrace}");
            }
            return StatusCode(500, new { message = "An error occurred while updating the property type", error = ex.Message, details = ex.InnerException?.Message ?? ex.ToString() });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeletePropertyType(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var propertyType = await session.GetAsync<PropertyType>(id);
            if (propertyType == null)
            {
                return NotFound(new { message = "Property type not found" });
            }

            // Check if property type is being used
            var propertyCount = await session.Query<Property>()
                .CountAsync(p => p.PropertyTypeId == id);

            if (propertyCount > 0)
            {
                return BadRequest(new { message = $"Cannot delete property type. It is being used by {propertyCount} property(ies)." });
            }

            session.Delete(propertyType);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Property type deleted successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while deleting the property type", error = ex.Message });
        }
    }
}

public class CreatePropertyTypeRequest
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Unit { get; set; } = "m"; // Land measurement unit (m, hectare, acre, sqft, etc.)
}

public class UpdatePropertyTypeRequest
{
    public string? Name { get; set; }
    public decimal? Price { get; set; }
    public string? Unit { get; set; }
}
