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
public class OwnersController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public OwnersController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchOwners([FromQuery] string? query = null, [FromQuery] int limit = 20)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var ownersQuery = session.Query<Owner>().Where(o => o.IsActive);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var searchTerm = query.Trim().ToLower();
            ownersQuery = ownersQuery.Where(o =>
                o.Name.ToLower().Contains(searchTerm) ||
                (o.Phone != null && o.Phone.Contains(searchTerm)) ||
                (o.Email != null && o.Email.ToLower().Contains(searchTerm)) ||
                (o.IdNumber != null && o.IdNumber.Contains(searchTerm)));
        }

        var owners = await ownersQuery
            .OrderBy(o => o.Name)
            .Take(limit)
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.Phone,
                o.Email,
                o.Address,
                o.IdNumber,
                PropertyCount = o.Properties.Count,
                o.CreatedAt,
                o.UpdatedAt
            })
            .ToListAsync();

        return Ok(owners);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOwner(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var owner = await session.Query<Owner>()
            .Where(o => o.Id == id)
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.Phone,
                o.Email,
                o.Address,
                o.IdNumber,
                PropertyCount = o.Properties.Count,
                o.CreatedAt,
                o.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (owner == null)
        {
            return NotFound(new { message = "Owner not found" });
        }

        return Ok(owner);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOwner([FromBody] CreateOwnerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Owner name is required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Check if owner with same phone or email already exists
            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                var existingByPhone = await session.Query<Owner>()
                    .Where(o => o.Phone == request.Phone.Trim() && o.IsActive)
                    .FirstOrDefaultAsync();

                if (existingByPhone != null)
                {
                    return Conflict(new { message = "An owner with this phone number already exists", ownerId = existingByPhone.Id });
                }
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var existingByEmail = await session.Query<Owner>()
                    .Where(o => o.Email != null && o.Email.ToLower() == request.Email.Trim().ToLower() && o.IsActive)
                    .FirstOrDefaultAsync();

                if (existingByEmail != null)
                {
                    return Conflict(new { message = "An owner with this email already exists", ownerId = existingByEmail.Id });
                }
            }

            var owner = new Owner
            {
                Name = request.Name.Trim(),
                Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
                Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLower(),
                Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
                IdNumber = string.IsNullOrWhiteSpace(request.IdNumber) ? null : request.IdNumber.Trim(),
                IsActive = true
            };

            await session.SaveAsync(owner);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                id = owner.Id,
                name = owner.Name,
                phone = owner.Phone,
                email = owner.Email,
                address = owner.Address,
                idNumber = owner.IdNumber
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

            return StatusCode(500, new { message = "An error occurred while creating the owner", error = ex.Message });
        }
    }
}

public class CreateOwnerRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? IdNumber { get; set; }
}
