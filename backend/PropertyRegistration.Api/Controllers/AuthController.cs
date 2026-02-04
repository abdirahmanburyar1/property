using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Core.Interfaces;
using PropertyRegistration.Infrastructure.Data;
using BCrypt.Net;

namespace PropertyRegistration.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;
    private readonly IJwtService _jwtService;

    public AuthController(ISessionFactoryProvider sessionFactoryProvider, IJwtService jwtService)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
        _jwtService = jwtService;
    }

    /// <summary>
    /// Returns the current user from the JWT. Used by the frontend to restore user data on page reload.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Invalid token" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var user = await session.Query<User>()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { message = "User not found or inactive" });
        }

        var roles = await session.Query<UserRole>()
            .Where(ur => ur.User.Id == user.Id)
            .Select(ur => ur.Role.Code)
            .ToListAsync();

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            username = user.Username,
            firstName = user.FirstName,
            lastName = user.LastName,
            phoneNumber = user.PhoneNumber,
            regionId = user.RegionId,
            cityId = user.CityId,
            roles = roles
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        Console.WriteLine("=================================");
        Console.WriteLine("=== LOGIN REQUEST RECEIVED ===");
        Console.WriteLine($"Timestamp: {DateTime.Now}");
        Console.WriteLine($"Remote IP: {HttpContext.Connection.RemoteIpAddress}");
        Console.WriteLine($"Username: {request.Username}");
        Console.WriteLine($"Password Length: {request.Password?.Length ?? 0}");
        Console.WriteLine("=================================");
        
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            Console.WriteLine("ERROR: Username or password is empty");
            return BadRequest(new { message = "Username and password are required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        
        Console.WriteLine($"Looking up user: {request.Username}");
        
        // Find user by username or email
        var user = await session.Query<User>()
            .FirstOrDefaultAsync(u => u.Username == request.Username || u.Email == request.Username);

        if (user == null)
        {
            Console.WriteLine($"ERROR: User not found: {request.Username}");
            return Unauthorized(new { message = "Invalid username or password" });
        }

        Console.WriteLine($"User found: {user.Username} (ID: {user.Id})");

        if (!user.IsActive)
        {
            Console.WriteLine($"ERROR: User account is inactive: {user.Username}");
            return Unauthorized(new { message = "Account is inactive" });
        }

        // Verify password
        Console.WriteLine("Verifying password...");
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            Console.WriteLine("ERROR: Password verification failed");
            return Unauthorized(new { message = "Invalid username or password" });
        }

        Console.WriteLine("Password verified successfully");

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        session.Update(user);
        await session.FlushAsync();

        Console.WriteLine("Fetching user roles...");
        
        // Get user roles
        var roles = await session.Query<UserRole>()
            .Where(ur => ur.User.Id == user.Id)
            .Select(ur => ur.Role.Code)
            .ToListAsync();

        Console.WriteLine($"User roles: {string.Join(", ", roles)}");

        // Generate JWT token
        Console.WriteLine("Generating JWT token...");
        var token = _jwtService.GenerateToken(user, roles);
        Console.WriteLine($"Token generated (length: {token.Length})");

        // Return user info (without password hash)
        var userDto = new
        {
            id = user.Id,
            email = user.Email,
            username = user.Username,
            firstName = user.FirstName,
            lastName = user.LastName,
            phoneNumber = user.PhoneNumber,
            regionId = user.RegionId,
            cityId = user.CityId,
            roles = roles
        };

        Console.WriteLine("=== LOGIN SUCCESSFUL ===");
        Console.WriteLine($"User: {user.Username}");
        Console.WriteLine($"Roles: {string.Join(", ", roles)}");
        Console.WriteLine("=================================");

        return Ok(new
        {
            token,
            user = userDto
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
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
            // Check if username or email already exists
            var existingUser = await session.Query<User>()
                .FirstOrDefaultAsync(u => u.Username == request.Username || u.Email == request.Email);

            if (existingUser != null)
            {
                return BadRequest(new { message = "Username or email already exists" });
            }

            // Get default User role
            var userRole = await session.Query<Role>()
                .FirstOrDefaultAsync(r => r.Code == "USER");

            if (userRole == null)
            {
                return StatusCode(500, new { message = "Default user role not found" });
            }

            // Create new user
            var newUser = new User
            {
                Email = request.Email,
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FirstName = request.FirstName ?? string.Empty,
                LastName = request.LastName ?? string.Empty,
                PhoneNumber = request.PhoneNumber,
                IsActive = true,
                CurrentPropertyCount = 0
            };

            session.Save(newUser);
            await session.FlushAsync();
            session.Clear();

            // Reload user to ensure it's a managed entity
            var reloadedUser = await session.Query<User>()
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (reloadedUser == null)
            {
                return StatusCode(500, new { message = "Failed to create user" });
            }

            // Reload role to ensure it's a managed entity
            var reloadedRole = session.Get<Role>(userRole.Id);
            if (reloadedRole == null)
            {
                return StatusCode(500, new { message = "Failed to reload role" });
            }

            // Assign default User role
            var userRoleAssignment = new UserRole
            {
                User = reloadedUser,
                Role = reloadedRole,
                AssignedAt = DateTime.UtcNow
            };

            session.Save(userRoleAssignment);
            await session.FlushAsync();

            await transaction.CommitAsync();

            // Generate JWT token
            var token = _jwtService.GenerateToken(reloadedUser, new[] { "USER" });

            var userDto = new
            {
                id = reloadedUser.Id,
                email = reloadedUser.Email,
                username = reloadedUser.Username,
                firstName = reloadedUser.FirstName,
                lastName = reloadedUser.LastName,
                phoneNumber = reloadedUser.PhoneNumber,
                roles = new[] { "USER" }
            };

            return Ok(new
            {
                token,
                user = userDto
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred during registration", error = ex.Message });
        }
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
}
