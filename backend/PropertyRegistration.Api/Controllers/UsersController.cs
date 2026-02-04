using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Data;
using System.Security.Claims;
using BCrypt.Net;

namespace PropertyRegistration.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public UsersController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] Guid? roleId = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var query = session.Query<User>();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u => 
                u.Username.Contains(search) || 
                u.Email.Contains(search) || 
                u.FirstName.Contains(search) || 
                u.LastName.Contains(search));
        }

        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        if (roleId.HasValue)
        {
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Id == roleId.Value));
        }

        var totalCount = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.Username,
                u.FirstName,
                u.LastName,
                u.PhoneNumber,
                u.IsActive,
                u.CurrentPropertyCount,
                u.LastLoginAt,
                u.RegionId,
                u.CityId,
                Roles = u.UserRoles.Select(ur => new { ur.Role.Id, ur.Role.Name, ur.Role.Code }).ToList(),
                u.CreatedAt,
                u.UpdatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            data = users,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var user = await session.Query<User>()
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.Username,
                u.FirstName,
                u.LastName,
                u.PhoneNumber,
                u.IsActive,
                u.CurrentPropertyCount,
                u.LastLoginAt,
                u.RegionId,
                u.CityId,
                Roles = u.UserRoles.Select(ur => new { ur.Role.Id, ur.Role.Name, ur.Role.Code }).ToList(),
                u.CreatedAt,
                u.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        return Ok(user);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || 
            string.IsNullOrWhiteSpace(request.Email) || 
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username, email, and password are required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var existing = await session.Query<User>()
                .FirstOrDefaultAsync(u => u.Username == request.Username || u.Email == request.Email);

            if (existing != null)
            {
                return Conflict(new { message = "Username or email already exists" });
            }

            var user = new User
            {
                Email = request.Email.Trim(),
                Username = request.Username.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FirstName = request.FirstName?.Trim() ?? string.Empty,
                LastName = request.LastName?.Trim() ?? string.Empty,
                PhoneNumber = request.PhoneNumber?.Trim(),
                IsActive = request.IsActive ?? true,
                CurrentPropertyCount = 0
            };

            // Region and City (validate before save)
            if (request.RegionId.HasValue)
            {
                var region = await session.GetAsync<Region>(request.RegionId.Value);
                if (region == null)
                {
                    return BadRequest(new { message = "Invalid region" });
                }
                user.RegionId = request.RegionId.Value;
            }

            if (request.CityId.HasValue)
            {
                var city = await session.GetAsync<City>(request.CityId.Value);
                if (city == null)
                {
                    return BadRequest(new { message = "Invalid city" });
                }
                if (user.RegionId.HasValue && city.RegionId != user.RegionId.Value)
                {
                    return BadRequest(new { message = "City does not belong to the selected region" });
                }
                user.CityId = request.CityId.Value;
            }

            session.Save(user);
            await session.FlushAsync();
            session.Clear();

            var savedUser = await session.Query<User>()
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (savedUser == null)
            {
                return StatusCode(500, new { message = "Failed to create user" });
            }

            // Assign roles
            if (request.RoleIds != null && request.RoleIds.Any())
            {
                var roles = await session.Query<Role>()
                    .Where(r => request.RoleIds.Contains(r.Id))
                    .ToListAsync();

                foreach (var role in roles)
                {
                    var userRole = new UserRole
                    {
                        User = savedUser,
                        Role = role,
                        AssignedAt = DateTime.UtcNow
                    };
                    session.Save(userRole);
                }
            }

            await session.FlushAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetUser), new { id = savedUser.Id }, new
            {
                savedUser.Id,
                savedUser.Email,
                savedUser.Username,
                savedUser.FirstName,
                savedUser.LastName,
                savedUser.PhoneNumber,
                savedUser.IsActive,
                savedUser.CurrentPropertyCount
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while creating the user", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var user = await session.GetAsync<User>(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var existing = await session.Query<User>()
                    .FirstOrDefaultAsync(u => u.Email == request.Email && u.Id != id);

                if (existing != null)
                {
                    return Conflict(new { message = "Email already exists" });
                }

                user.Email = request.Email.Trim();
            }

            if (!string.IsNullOrWhiteSpace(request.Username))
            {
                var existing = await session.Query<User>()
                    .FirstOrDefaultAsync(u => u.Username == request.Username && u.Id != id);

                if (existing != null)
                {
                    return Conflict(new { message = "Username already exists" });
                }

                user.Username = request.Username.Trim();
            }

            if (request.FirstName != null) user.FirstName = request.FirstName.Trim();
            if (request.LastName != null) user.LastName = request.LastName.Trim();
            if (request.PhoneNumber != null) user.PhoneNumber = request.PhoneNumber.Trim();
            if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;

            if (request.RegionId.HasValue)
            {
                var region = await session.GetAsync<Region>(request.RegionId.Value);
                if (region == null)
                {
                    return BadRequest(new { message = "Invalid region" });
                }
                user.RegionId = request.RegionId.Value;
            }

            if (request.CityId.HasValue)
            {
                var city = await session.GetAsync<City>(request.CityId.Value);
                if (city == null)
                {
                    return BadRequest(new { message = "Invalid city" });
                }
                if (user.RegionId.HasValue && city.RegionId != user.RegionId.Value)
                {
                    return BadRequest(new { message = "City does not belong to the user's region" });
                }
                user.CityId = request.CityId.Value;
            }

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            }

            // Update roles
            if (request.RoleIds != null)
            {
                // Remove existing roles
                var existingRoles = await session.Query<UserRole>()
                    .Where(ur => ur.User.Id == id)
                    .ToListAsync();

                foreach (var userRole in existingRoles)
                {
                    session.Delete(userRole);
                }

                // Add new roles
                if (request.RoleIds.Any())
                {
                    var roles = await session.Query<Role>()
                        .Where(r => request.RoleIds.Contains(r.Id))
                        .ToListAsync();

                    var reloadedUser = await session.GetAsync<User>(id);
                    foreach (var role in roles)
                    {
                        var userRole = new UserRole
                        {
                            User = reloadedUser!,
                            Role = role,
                            AssignedAt = DateTime.UtcNow
                        };
                        session.Save(userRole);
                    }
                }
            }

            user.UpdatedAt = DateTime.UtcNow;

            session.Update(user);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "User updated successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while updating the user", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if (id == currentUserId)
        {
            return BadRequest(new { message = "You cannot delete your own account" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var user = await session.GetAsync<User>(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Check if user has created properties
            var propertyCount = await session.Query<Property>()
                .CountAsync(p => p.CreatedBy == id);

            if (propertyCount > 0)
            {
                return BadRequest(new { message = $"Cannot delete user. They have created {propertyCount} property(ies)." });
            }

            // Delete user roles first
            var userRoles = await session.Query<UserRole>()
                .Where(ur => ur.User.Id == id)
                .ToListAsync();

            foreach (var userRole in userRoles)
            {
                session.Delete(userRole);
            }

            session.Delete(user);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "User deleted successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while deleting the user", error = ex.Message });
        }
    }

    [HttpGet("lookups/roles")]
    public async Task<IActionResult> GetRoles()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var roles = await session.Query<Role>()
            .Where(r => r.IsActive)
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name, r.Code, r.Description })
            .ToListAsync();

        return Ok(roles);
    }
}

public class CreateUserRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public bool? IsActive { get; set; }
    public List<Guid>? RoleIds { get; set; }
    public Guid? RegionId { get; set; }
    public Guid? CityId { get; set; }
}

public class UpdateUserRequest
{
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public bool? IsActive { get; set; }
    public List<Guid>? RoleIds { get; set; }
    public Guid? RegionId { get; set; }
    public Guid? CityId { get; set; }
}
