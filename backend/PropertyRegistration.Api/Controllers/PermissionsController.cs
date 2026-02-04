using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Data;

namespace PropertyRegistration.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN")]
public class PermissionsController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public PermissionsController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    public async Task<IActionResult> GetPermissions([FromQuery] string? category = null)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var query = session.Query<Permission>();

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(p => p.Category == category);
        }

        var permissions = await query
            .Where(p => p.IsActive)
            .OrderBy(p => p.Category)
            .ThenBy(p => p.Name)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Code,
                p.Description,
                p.Category,
                RoleCount = p.RolePermissions.Count,
                p.CreatedAt,
                p.UpdatedAt
            })
            .ToListAsync();

        return Ok(permissions);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        try
        {
            using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

            var permissions = await session.Query<Permission>()
                .Where(p => p.IsActive)
                .Select(p => p.Category)
                .ToListAsync();

            var categories = permissions
                .Distinct()
                .OrderBy(c => c)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .ToList();

            return Ok(categories);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while loading categories", error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPermission(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var permission = await session.Query<Permission>()
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Code,
                p.Description,
                p.Category,
                Roles = p.RolePermissions.Select(rp => new
                {
                    rp.Role.Id,
                    rp.Role.Name,
                    rp.Role.Code
                }).ToList(),
                p.CreatedAt,
                p.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (permission == null)
        {
            return NotFound(new { message = "Permission not found" });
        }

        return Ok(permission);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePermission([FromBody] CreatePermissionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { message = "Permission name and code are required" });
        }

        // Auto-extract category from name (e.g., "Properties.Create" -> "Properties")
        var category = "General";
        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            var categoryMatch = System.Text.RegularExpressions.Regex.Match(request.Name.Trim(), @"^([^.]+)");
            if (categoryMatch.Success)
            {
                category = categoryMatch.Groups[1].Value;
            }
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var existing = await session.Query<Permission>()
                .FirstOrDefaultAsync(p => p.Name.ToLower() == request.Name.ToLower() || p.Code.ToUpper() == request.Code.ToUpper());

            if (existing != null)
            {
                return Conflict(new { message = "Permission with this name or code already exists" });
            }

            var permission = new Permission
            {
                Name = request.Name.Trim(),
                Code = request.Code.Trim().ToUpper(),
                Description = request.Description?.Trim(),
                Category = category,
                IsActive = request.IsActive ?? true
            };

            await session.SaveAsync(permission);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetPermission), new { id = permission.Id }, new
            {
                permission.Id,
                permission.Name,
                permission.Code,
                permission.Description,
                permission.Category,
                RoleCount = 0,
                permission.CreatedAt,
                permission.UpdatedAt
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
            catch { }

            return StatusCode(500, new { message = "An error occurred while creating the permission", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePermission(Guid id, [FromBody] UpdatePermissionRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var permission = await session.GetAsync<Permission>(id);
            if (permission == null)
            {
                return NotFound(new { message = "Permission not found" });
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                var existing = await session.Query<Permission>()
                    .FirstOrDefaultAsync(p => p.Name.ToLower() == request.Name.ToLower() && p.Id != id);

                if (existing != null)
                {
                    return Conflict(new { message = "Permission with this name already exists" });
                }

                permission.Name = request.Name.Trim();
            }

            if (!string.IsNullOrWhiteSpace(request.Code))
            {
                var existing = await session.Query<Permission>()
                    .FirstOrDefaultAsync(p => p.Code.ToUpper() == request.Code.ToUpper() && p.Id != id);

                if (existing != null)
                {
                    return Conflict(new { message = "Permission with this code already exists" });
                }

                permission.Code = request.Code.Trim().ToUpper();
            }

            if (request.Description != null) permission.Description = request.Description.Trim();
            // Auto-update category from name if name changed
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                var categoryMatch = System.Text.RegularExpressions.Regex.Match(request.Name.Trim(), @"^([^.]+)");
                if (categoryMatch.Success)
                {
                    permission.Category = categoryMatch.Groups[1].Value;
                }
            }
            if (request.IsActive.HasValue) permission.IsActive = request.IsActive.Value;

            permission.UpdatedAt = DateTime.UtcNow;

            session.Update(permission);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Permission updated successfully" });
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
            catch { }

            return StatusCode(500, new { message = "An error occurred while updating the permission", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePermission(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var permission = await session.GetAsync<Permission>(id);
            if (permission == null)
            {
                return NotFound(new { message = "Permission not found" });
            }

            var roleCount = await session.Query<RolePermission>()
                .CountAsync(rp => rp.Permission.Id == id);

            if (roleCount > 0)
            {
                return BadRequest(new { message = $"Cannot delete permission. It is assigned to {roleCount} role(s)." });
            }

            session.Delete(permission);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Permission deleted successfully" });
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
            catch { }

            return StatusCode(500, new { message = "An error occurred while deleting the permission", error = ex.Message });
        }
    }
}

public class CreatePermissionRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdatePermissionRequest
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}
