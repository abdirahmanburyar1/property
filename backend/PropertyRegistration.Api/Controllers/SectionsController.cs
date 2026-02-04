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
public class SectionsController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public SectionsController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    public async Task<IActionResult> GetSections()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var sections = await session.Query<Section>()
            .Where(s => s.IsActive)
            .OrderBy(s => s.DisplayOrder)
            .ThenBy(s => s.Name)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.Description,
                s.IsActive,
                s.DisplayOrder,
                SubSectionCount = s.SubSections.Count(ss => ss.IsActive),
                s.CreatedAt,
                s.UpdatedAt
            })
            .ToListAsync();

        return Ok(sections);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSection(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var section = await session.Query<Section>()
            .Where(s => s.Id == id)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.Description,
                s.IsActive,
                s.DisplayOrder,
                SubSectionCount = s.SubSections.Count,
                s.CreatedAt,
                s.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (section == null)
        {
            return NotFound(new { message = "Section not found" });
        }

        return Ok(section);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateSection([FromBody] CreateSectionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Section name is required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Check if section with same name already exists
            var existingSection = await session.Query<Section>()
                .FirstOrDefaultAsync(s => s.Name == request.Name.Trim());

            if (existingSection != null)
            {
                return Conflict(new { message = "Section with this name already exists" });
            }

            var section = new Section
            {
                Name = request.Name.Trim(),
                Description = null,
                IsActive = request.IsActive ?? true,
                DisplayOrder = 0
            };

            await session.SaveAsync(section);
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetSection), new { id = section.Id }, new
            {
                section.Id,
                section.Name,
                section.Description,
                section.IsActive,
                section.DisplayOrder,
                section.CreatedAt,
                section.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while creating the section", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateSection(Guid id, [FromBody] UpdateSectionRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var section = await session.GetAsync<Section>(id);
            if (section == null)
            {
                return NotFound(new { message = "Section not found" });
            }

            // Check if name is being changed and if new name already exists
            if (!string.IsNullOrWhiteSpace(request.Name) && request.Name.Trim() != section.Name)
            {
                var existingSection = await session.Query<Section>()
                    .FirstOrDefaultAsync(s => s.Name == request.Name.Trim() && s.Id != id);

                if (existingSection != null)
                {
                    return Conflict(new { message = "Section with this name already exists" });
                }
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                section.Name = request.Name.Trim();
            }

            if (request.IsActive.HasValue)
            {
                section.IsActive = request.IsActive.Value;
            }

            section.UpdatedAt = DateTime.UtcNow;

            await session.UpdateAsync(section);
            await transaction.CommitAsync();

            return Ok(new
            {
                section.Id,
                section.Name,
                section.Description,
                section.IsActive,
                section.DisplayOrder,
                section.CreatedAt,
                section.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while updating the section", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteSection(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var section = await session.GetAsync<Section>(id);
            if (section == null)
            {
                return NotFound(new { message = "Section not found" });
            }

            // Check if section has active subsections
            var hasActiveSubSections = await session.Query<SubSection>()
                .AnyAsync(ss => ss.SectionId == id && ss.IsActive);

            if (hasActiveSubSections)
            {
                return BadRequest(new { message = "Cannot delete section with active subsections. Please deactivate or delete subsections first." });
            }

            // Soft delete by setting IsActive to false
            section.IsActive = false;
            section.UpdatedAt = DateTime.UtcNow;

            await session.UpdateAsync(section);
            await transaction.CommitAsync();

            return Ok(new { message = "Section deleted successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while deleting the section", error = ex.Message });
        }
    }
}

public class CreateSectionRequest
{
    public string Name { get; set; } = string.Empty;
    public bool? IsActive { get; set; }
}

public class UpdateSectionRequest
{
    public string? Name { get; set; }
    public bool? IsActive { get; set; }
}
