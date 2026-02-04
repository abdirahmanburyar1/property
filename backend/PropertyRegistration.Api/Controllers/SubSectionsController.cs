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
public class SubSectionsController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;

    public SubSectionsController(ISessionFactoryProvider sessionFactoryProvider)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
    }

    [HttpGet]
    public async Task<IActionResult> GetSubSections([FromQuery] Guid? sectionId = null)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var query = session.Query<SubSection>();

        if (sectionId.HasValue)
        {
            query = query.Where(ss => ss.SectionId == sectionId.Value);
        }

        var subSections = await query
            .Where(ss => ss.IsActive)
            .OrderBy(ss => ss.DisplayOrder)
            .ThenBy(ss => ss.Name)
            .Select(ss => new
            {
                ss.Id,
                ss.SectionId,
                ss.Name,
                ss.Description,
                ss.IsActive,
                ss.DisplayOrder,
                Section = new { ss.Section.Id, ss.Section.Name },
                ss.CreatedAt,
                ss.UpdatedAt
            })
            .ToListAsync();

        return Ok(subSections);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSubSection(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var subSection = await session.Query<SubSection>()
            .Where(ss => ss.Id == id)
            .Select(ss => new
            {
                ss.Id,
                ss.SectionId,
                ss.Name,
                ss.Description,
                ss.IsActive,
                ss.DisplayOrder,
                Section = new { ss.Section.Id, ss.Section.Name },
                ss.CreatedAt,
                ss.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (subSection == null)
        {
            return NotFound(new { message = "SubSection not found" });
        }

        return Ok(subSection);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateSubSection([FromBody] CreateSubSectionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "SubSection name is required" });
        }

        if (request.SectionId == Guid.Empty)
        {
            return BadRequest(new { message = "Section ID is required" });
        }

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Verify section exists
            var section = await session.GetAsync<Section>(request.SectionId);
            if (section == null)
            {
                return BadRequest(new { message = "Section not found" });
            }

            // Check if subsection with same name already exists in this section
            var existingSubSection = await session.Query<SubSection>()
                .FirstOrDefaultAsync(ss => ss.SectionId == request.SectionId && ss.Name == request.Name.Trim());

            if (existingSubSection != null)
            {
                return Conflict(new { message = "SubSection with this name already exists in this section" });
            }

            var subSection = new SubSection
            {
                SectionId = request.SectionId,
                Name = request.Name.Trim(),
                Description = null,
                IsActive = request.IsActive ?? true,
                DisplayOrder = 0,
                Section = section
            };

            await session.SaveAsync(subSection);
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetSubSection), new { id = subSection.Id }, new
            {
                subSection.Id,
                subSection.SectionId,
                subSection.Name,
                subSection.Description,
                subSection.IsActive,
                subSection.DisplayOrder,
                Section = new { section.Id, section.Name },
                subSection.CreatedAt,
                subSection.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while creating the subsection", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateSubSection(Guid id, [FromBody] UpdateSubSectionRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var subSection = await session.GetAsync<SubSection>(id);
            if (subSection == null)
            {
                return NotFound(new { message = "SubSection not found" });
            }

            // If SectionId is being changed, verify new section exists
            if (request.SectionId.HasValue && request.SectionId.Value != subSection.SectionId)
            {
                var section = await session.GetAsync<Section>(request.SectionId.Value);
                if (section == null)
                {
                    return BadRequest(new { message = "Section not found" });
                }
                subSection.SectionId = request.SectionId.Value;
                subSection.Section = section;
            }

            // Check if name is being changed and if new name already exists in the section
            if (!string.IsNullOrWhiteSpace(request.Name) && request.Name.Trim() != subSection.Name)
            {
                var sectionIdToCheck = request.SectionId ?? subSection.SectionId;
                var existingSubSection = await session.Query<SubSection>()
                    .FirstOrDefaultAsync(ss => ss.SectionId == sectionIdToCheck && ss.Name == request.Name.Trim() && ss.Id != id);

                if (existingSubSection != null)
                {
                    return Conflict(new { message = "SubSection with this name already exists in this section" });
                }
            }

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                subSection.Name = request.Name.Trim();
            }

            if (request.IsActive.HasValue)
            {
                subSection.IsActive = request.IsActive.Value;
            }

            subSection.UpdatedAt = DateTime.UtcNow;

            await session.UpdateAsync(subSection);
            await transaction.CommitAsync();

            return Ok(new
            {
                subSection.Id,
                subSection.SectionId,
                subSection.Name,
                subSection.Description,
                subSection.IsActive,
                subSection.DisplayOrder,
                Section = new { subSection.Section.Id, subSection.Section.Name },
                subSection.CreatedAt,
                subSection.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while updating the subsection", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteSubSection(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var subSection = await session.GetAsync<SubSection>(id);
            if (subSection == null)
            {
                return NotFound(new { message = "SubSection not found" });
            }

            // Soft delete by setting IsActive to false
            subSection.IsActive = false;
            subSection.UpdatedAt = DateTime.UtcNow;

            await session.UpdateAsync(subSection);
            await transaction.CommitAsync();

            return Ok(new { message = "SubSection deleted successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while deleting the subsection", error = ex.Message });
        }
    }
}

public class CreateSubSectionRequest
{
    public Guid SectionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public int? DisplayOrder { get; set; }
}

public class UpdateSubSectionRequest
{
    public Guid? SectionId { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public int? DisplayOrder { get; set; }
}
