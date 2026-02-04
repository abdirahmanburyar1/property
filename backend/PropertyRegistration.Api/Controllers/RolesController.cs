using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Data;
using System.Security.Claims;

namespace PropertyRegistration.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN")]
public class RolesController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public RolesController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoles()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var roles = await session.Query<Role>()
            .OrderBy(r => r.Name)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Code,
                r.Description,
                r.IsActive,
                r.IsSystemRole,
                UserCount = r.UserRoles.Count,
                PermissionCount = r.RolePermissions.Count,
                r.CreatedAt,
                r.UpdatedAt
            })
            .ToListAsync();

        return Ok(roles);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetRole(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var role = await session.Query<Role>()
            .Where(r => r.Id == id)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Code,
                r.Description,
                r.IsActive,
                r.IsSystemRole,
                UserCount = r.UserRoles.Count,
                Permissions = r.RolePermissions.Select(rp => new
                {
                    rp.Permission.Id,
                    rp.Permission.Name,
                    rp.Permission.Code,
                    rp.Permission.Category,
                    rp.Permission.Description
                }).ToList(),
                r.CreatedAt,
                r.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (role == null)
        {
            return NotFound(new { message = "Role not found" });
        }

        return Ok(role);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { message = "Role name and code are required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var existing = await session.Query<Role>()
                .FirstOrDefaultAsync(r => r.Name.ToLower() == request.Name.ToLower() || r.Code.ToUpper() == request.Code.ToUpper());

            if (existing != null)
            {
                return Conflict(new { message = "Role with this name or code already exists" });
            }

            var role = new Role
            {
                Name = request.Name.Trim(),
                Code = request.Code.Trim().ToUpper(),
                Description = request.Description?.Trim(),
                IsActive = request.IsActive ?? true,
                IsSystemRole = false // Only seeded roles can be system roles
            };

            await session.SaveAsync(role);
            await session.FlushAsync();

            // Assign permissions if provided
            if (request.PermissionIds != null && request.PermissionIds.Any())
            {
                var permissions = await session.Query<Permission>()
                    .Where(p => request.PermissionIds.Contains(p.Id) && p.IsActive)
                    .ToListAsync();

                var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

                foreach (var permission in permissions)
                {
                    var rolePermission = new RolePermission
                    {
                        Role = role,
                        Permission = permission,
                        GrantedAt = DateTime.UtcNow,
                        GrantedBy = currentUserId
                    };
                    await session.SaveAsync(rolePermission);
                }
            }

            await session.FlushAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetRole), new { id = role.Id }, new
            {
                role.Id,
                role.Name,
                role.Code,
                role.Description,
                role.IsActive,
                role.IsSystemRole,
                UserCount = 0,
                PermissionCount = request.PermissionIds?.Count ?? 0,
                role.CreatedAt,
                role.UpdatedAt
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

            return StatusCode(500, new { message = "An error occurred while creating the role", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var role = await session.GetAsync<Role>(id);
            if (role == null)
            {
                return NotFound(new { message = "Role not found" });
            }

            if (role.IsSystemRole)
            {
                return BadRequest(new { message = "System roles cannot be modified" });
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                var existing = await session.Query<Role>()
                    .FirstOrDefaultAsync(r => r.Name.ToLower() == request.Name.ToLower() && r.Id != id);

                if (existing != null)
                {
                    return Conflict(new { message = "Role with this name already exists" });
                }

                role.Name = request.Name.Trim();
            }

            if (!string.IsNullOrWhiteSpace(request.Code))
            {
                var existing = await session.Query<Role>()
                    .FirstOrDefaultAsync(r => r.Code.ToUpper() == request.Code.ToUpper() && r.Id != id);

                if (existing != null)
                {
                    return Conflict(new { message = "Role with this code already exists" });
                }

                role.Code = request.Code.Trim().ToUpper();
            }

            if (request.Description != null) role.Description = request.Description.Trim();
            if (request.IsActive.HasValue) role.IsActive = request.IsActive.Value;

            // Update permissions if provided
            if (request.PermissionIds != null)
            {
                // Remove existing permissions
                var existingPermissions = await session.Query<RolePermission>()
                    .Where(rp => rp.Role.Id == id)
                    .ToListAsync();

                foreach (var rp in existingPermissions)
                {
                    session.Delete(rp);
                }

                // Add new permissions
                if (request.PermissionIds.Any())
                {
                    var permissions = await session.Query<Permission>()
                        .Where(p => request.PermissionIds.Contains(p.Id) && p.IsActive)
                        .ToListAsync();

                    var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

                    foreach (var permission in permissions)
                    {
                        var rolePermission = new RolePermission
                        {
                            Role = role,
                            Permission = permission,
                            GrantedAt = DateTime.UtcNow,
                            GrantedBy = currentUserId
                        };
                        await session.SaveAsync(rolePermission);
                    }
                }
            }

            role.UpdatedAt = DateTime.UtcNow;

            session.Update(role);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Role updated successfully" });
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

            return StatusCode(500, new { message = "An error occurred while updating the role", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRole(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var role = await session.GetAsync<Role>(id);
            if (role == null)
            {
                return NotFound(new { message = "Role not found" });
            }

            if (role.IsSystemRole)
            {
                return BadRequest(new { message = "System roles cannot be deleted" });
            }

            var userCount = await session.Query<UserRole>()
                .CountAsync(ur => ur.Role.Id == id);

            if (userCount > 0)
            {
                return BadRequest(new { message = $"Cannot delete role. It is assigned to {userCount} user(s)." });
            }

            // Delete role permissions
            var rolePermissions = await session.Query<RolePermission>()
                .Where(rp => rp.RoleId == id)
                .ToListAsync();

            foreach (var rp in rolePermissions)
            {
                session.Delete(rp);
            }

            session.Delete(role);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Role deleted successfully" });
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

            return StatusCode(500, new { message = "An error occurred while deleting the role", error = ex.Message });
        }
    }
}

public class CreateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public List<Guid>? PermissionIds { get; set; }
}

public class UpdateRoleRequest
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public List<Guid>? PermissionIds { get; set; }
}
