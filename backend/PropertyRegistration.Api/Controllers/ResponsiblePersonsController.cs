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
public class ResponsiblePersonsController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public ResponsiblePersonsController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchResponsiblePersons([FromQuery] string? query = null, [FromQuery] int limit = 20)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var responsibleQuery = session.Query<ResponsiblePerson>().Where(r => r.IsActive);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var searchTerm = query.Trim().ToLower();
            responsibleQuery = responsibleQuery.Where(r =>
                r.Name.ToLower().Contains(searchTerm) ||
                (r.Phone != null && r.Phone.Contains(searchTerm)) ||
                (r.Email != null && r.Email.ToLower().Contains(searchTerm)) ||
                (r.IdNumber != null && r.IdNumber.Contains(searchTerm)));
        }

        var responsiblePersons = await responsibleQuery
            .OrderBy(r => r.Name)
            .Take(limit)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Phone,
                r.Email,
                r.Address,
                r.IdNumber,
                r.Relationship,
                PropertyCount = r.Properties.Count,
                r.CreatedAt,
                r.UpdatedAt
            })
            .ToListAsync();

        return Ok(responsiblePersons);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetResponsiblePerson(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var responsiblePerson = await session.Query<ResponsiblePerson>()
            .Where(r => r.Id == id)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Phone,
                r.Email,
                r.Address,
                r.IdNumber,
                r.Relationship,
                PropertyCount = r.Properties.Count,
                r.CreatedAt,
                r.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (responsiblePerson == null)
        {
            return NotFound(new { message = "Responsible person not found" });
        }

        return Ok(responsiblePerson);
    }

    [HttpPost]
    public async Task<IActionResult> CreateResponsiblePerson([FromBody] CreateResponsiblePersonRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Responsible person name is required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Check if responsible person with same phone or email already exists
            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                var existingByPhone = await session.Query<ResponsiblePerson>()
                    .Where(r => r.Phone == request.Phone.Trim() && r.IsActive)
                    .FirstOrDefaultAsync();

                if (existingByPhone != null)
                {
                    return Conflict(new { message = "A responsible person with this phone number already exists", responsiblePersonId = existingByPhone.Id });
                }
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var existingByEmail = await session.Query<ResponsiblePerson>()
                    .Where(r => r.Email != null && r.Email.ToLower() == request.Email.Trim().ToLower() && r.IsActive)
                    .FirstOrDefaultAsync();

                if (existingByEmail != null)
                {
                    return Conflict(new { message = "A responsible person with this email already exists", responsiblePersonId = existingByEmail.Id });
                }
            }

            var responsiblePerson = new ResponsiblePerson
            {
                Name = request.Name.Trim(),
                Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
                Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLower(),
                Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
                IdNumber = string.IsNullOrWhiteSpace(request.IdNumber) ? null : request.IdNumber.Trim(),
                Relationship = string.IsNullOrWhiteSpace(request.Relationship) ? null : request.Relationship.Trim(),
                IsActive = true
            };

            await session.SaveAsync(responsiblePerson);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                id = responsiblePerson.Id,
                name = responsiblePerson.Name,
                phone = responsiblePerson.Phone,
                email = responsiblePerson.Email,
                address = responsiblePerson.Address,
                idNumber = responsiblePerson.IdNumber,
                relationship = responsiblePerson.Relationship
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

            return StatusCode(500, new { message = "An error occurred while creating the responsible person", error = ex.Message });
        }
    }
}

public class CreateResponsiblePersonRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? IdNumber { get; set; }
    public string? Relationship { get; set; }
}
