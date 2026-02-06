using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Core.Enums;
using PropertyRegistration.Core.Interfaces;
using PropertyRegistration.Infrastructure.Data;
using PropertyRegistration.Api.Services;
using System.Security.Claims;
using System.Text.Json;

namespace PropertyRegistration.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PropertiesController : ControllerBase
{
    private readonly ISessionFactoryProvider _sessionFactoryProvider;
    private readonly IRabbitMQService _rabbitMQService;
    private readonly IBackblazeStorageService _storageService;

    public PropertiesController(
        ISessionFactoryProvider sessionFactoryProvider,
        IRabbitMQService rabbitMQService,
        IBackblazeStorageService storageService)
    {
        _sessionFactoryProvider = sessionFactoryProvider;
        _rabbitMQService = rabbitMQService;
        _storageService = storageService;
    }

    [HttpGet("statuses")]
    public async Task<IActionResult> GetPropertyStatuses()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var statuses = await session.Query<PropertyRegistration.Core.Entities.PropertyStatus>()
            .Where(s => s.IsActive)
            .OrderBy(s => s.DisplayOrder)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.Description,
                s.ColorCode,
                s.DisplayOrder
            })
            .ToListAsync();

        return Ok(statuses);
    }

    /// <summary>
    /// Creates an automatic yearly payment for an approved property
    /// </summary>
    private async Task CreateYearlyPayment(NHibernate.ISession session, Property property, Guid createdByUserId)
    {
        try
        {
            Console.WriteLine($"=== Starting payment creation for property {property.Id} ===");
            
            // Ensure property has PropertyTypeId
            if (property.PropertyTypeId == Guid.Empty)
            {
                Console.WriteLine($"ERROR: Property {property.Id} has no PropertyTypeId");
                return;
            }

            // Check if a payment already exists for this property for the current year
            var currentYear = DateTime.UtcNow.Year;
            var existingPayments = await session.Query<Payment>()
                .Where(p => p.Property.Id == property.Id)
                .ToListAsync();

            Console.WriteLine($"Found {existingPayments.Count} existing payments for property {property.Id}");

            // Check metadata to see if payment for current year exists
            bool paymentExistsForYear = false;
            foreach (var existingPayment in existingPayments)
            {
                if (existingPayment.PaymentMetadata != null && existingPayment.PaymentMetadata.RootElement.TryGetProperty("year", out var yearElement))
                {
                    if (yearElement.GetInt32() == currentYear)
                    {
                        paymentExistsForYear = true;
                        break;
                    }
                }
            }

            if (paymentExistsForYear)
            {
                // Payment for this year already exists, skip creation
                Console.WriteLine($"Payment for year {currentYear} already exists for property {property.Id}");
                return;
            }

            // Get required entities - reload property type to ensure we have Price
            var propertyType = await session.GetAsync<PropertyType>(property.PropertyTypeId);
            if (propertyType == null)
            {
                Console.WriteLine($"ERROR: PropertyType {property.PropertyTypeId} not found for property {property.Id}");
                return;
            }

            Console.WriteLine($"PropertyType loaded: {propertyType.Name}, Price: {propertyType.Price}, Unit: {propertyType.Unit}");
            
            // Verify property has AreaSize
            if (property.AreaSize <= 0)
            {
                Console.WriteLine($"ERROR: Property {property.Id} has invalid AreaSize: {property.AreaSize}");
                return;
            }

            Console.WriteLine($"Property AreaSize: {property.AreaSize}, AreaUnit: {property.AreaUnit}");

            // Get default payment method (Bank Transfer)
            var paymentMethod = await session.Query<PaymentMethod>()
                .FirstOrDefaultAsync(pm => pm.Code == "BANK");
            
            if (paymentMethod == null)
            {
                // Fallback to first available payment method
                paymentMethod = await session.Query<PaymentMethod>()
                    .FirstOrDefaultAsync();
            }

            if (paymentMethod == null)
            {
                Console.WriteLine($"Warning: No payment method found. Cannot create payment for property {property.Id}");
                return;
            }

            // Get Pending payment status
            var pendingStatus = await session.Query<PropertyRegistration.Core.Entities.PaymentStatus>()
                .FirstOrDefaultAsync(ps => ps.Name == "Pending");

            if (pendingStatus == null)
            {
                Console.WriteLine($"Warning: Pending payment status not found. Cannot create payment for property {property.Id}");
                return;
            }

            // Calculate payment amount: PropertyType.Price × AreaSize
            var paymentAmount = propertyType.Price * property.AreaSize;

            // Generate unique transaction reference: PROP-{PropertyId}-{Year}-{Timestamp}
            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var propertyIdShort = property.Id.ToString("N")[..8].ToUpper();
            var transactionRef = $"PROP-{propertyIdShort}-{currentYear}-{timestamp}";

            // Ensure transaction reference is unique
            var existingRef = await session.Query<Payment>()
                .Where(p => p.TransactionReference == transactionRef)
                .AnyAsync();
            
            if (existingRef)
            {
                // Append random suffix if duplicate
                transactionRef = $"{transactionRef}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
            }

            // Create payment metadata for recurring yearly payment
            var metadata = new
            {
                isRecurring = true,
                frequency = "yearly",
                year = currentYear,
                period = 1, // First year
                propertyType = propertyType.Name,
                areaSize = property.AreaSize,
                unitPrice = propertyType.Price
            };

            var metadataJson = System.Text.Json.JsonSerializer.Serialize(metadata);
            var metadataDoc = System.Text.Json.JsonDocument.Parse(metadataJson);

            // Get created by user
            var createdByUser = await session.GetAsync<User>(createdByUserId);
            if (createdByUser == null)
            {
                Console.WriteLine($"Warning: User {createdByUserId} not found. Cannot create payment for property {property.Id}");
                return;
            }

            // Get collector from property (if assigned)
            User? collector = null;
            if (property.CollectorId.HasValue)
            {
                collector = await session.GetAsync<User>(property.CollectorId.Value);
            }

            // Create the payment
            var payment = new Payment
            {
                PropertyId = property.Id,
                CreatedBy = createdByUserId,
                CollectorId = property.CollectorId, // Assign collector from property
                PaymentMethodId = paymentMethod.Id,
                StatusId = pendingStatus.Id,
                Amount = paymentAmount,
                Currency = property.Currency ?? "USD",
                TransactionReference = transactionRef,
                Notes = $"Yearly permit fee for {propertyType.Name} property ({property.AreaSize} {property.AreaUnit}) - Year {currentYear}",
                PaymentMetadata = metadataDoc,
                IsExempt = false, // Default to not exempt
                ExemptionReason = null,
                PaymentDate = DateTime.UtcNow,
                Property = property,
                CreatedByUser = createdByUser,
                Collector = collector, // Set navigation property
                PaymentMethod = paymentMethod,
                Status = pendingStatus
            };

            await session.SaveAsync(payment);
            // Don't flush here - let the transaction in UpdateProperty handle it
            // This ensures payment creation is part of the same transaction as property approval

            Console.WriteLine($"✓ Successfully created yearly payment for property {property.Id}");
            Console.WriteLine($"  Amount: {payment.Currency} {paymentAmount}");
            Console.WriteLine($"  Transaction Reference: {transactionRef}");
            Console.WriteLine($"  Collector: {(collector != null ? $"{collector.FirstName} {collector.LastName}" : "Not assigned")}");
            Console.WriteLine($"=== Payment creation completed (will be committed with property update) ===");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ ERROR creating yearly payment for property {property.Id}:");
            Console.WriteLine($"   Message: {ex.Message}");
            Console.WriteLine($"   Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"   Inner exception: {ex.InnerException.Message}");
            }
            // Don't throw - we don't want payment creation failure to prevent property approval
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetProperties(
        [FromQuery] string? city = null,
        [FromQuery] Guid? statusId = null,
        [FromQuery] Guid? propertyTypeId = null,
        [FromQuery] string? ownerName = null,
        [FromQuery] string? plateNumber = null,
        [FromQuery] string? ownerPhone = null,
        [FromQuery] string? responsiblePhone = null,
        [FromQuery] Guid? sectionId = null,
        [FromQuery] Guid? subSectionId = null,
        [FromQuery] Guid? kontontriyeId = null,
        [FromQuery] bool? hasOutstandingOnly = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        Console.WriteLine("=== GET PROPERTIES REQUEST ===");
        Console.WriteLine($"Filters - City: {city}, StatusId: {statusId}, PropertyTypeId: {propertyTypeId}");
        Console.WriteLine($"Filters - SectionId: {sectionId}, SubSectionId: {subSectionId}, KontontriyeId: {kontontriyeId}, HasOutstandingOnly: {hasOutstandingOnly}");
        Console.WriteLine($"Filters - OwnerName: {ownerName}, PlateNumber: {plateNumber}");
        Console.WriteLine($"Filters - OwnerPhone: {ownerPhone}, ResponsiblePhone: {responsiblePhone}");
        
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var query = session.Query<Property>();

        if (sectionId.HasValue)
        {
            query = query.Where(p => p.SectionId == sectionId.Value);
            Console.WriteLine($"Applied sectionId filter: {sectionId.Value}");
        }

        if (subSectionId.HasValue)
        {
            query = query.Where(p => p.SubSectionId == subSectionId.Value);
            Console.WriteLine($"Applied subSectionId filter: {subSectionId.Value}");
        }

        if (kontontriyeId.HasValue)
        {
            query = query.Where(p => p.KontontriyeId == kontontriyeId.Value);
            Console.WriteLine($"Applied kontontriyeId (collector) filter: {kontontriyeId.Value}");
        }

        // Only properties with outstanding amount (expected - paid > 0); for tax notices
        if (hasOutstandingOnly == true)
        {
            query = query.Where(p => p.PropertyType != null &&
                (p.PropertyType.Price * p.AreaSize - (p.PaidAmount)) > 0 &&
                p.PaymentStatus != "Paid");
            Console.WriteLine("Applied hasOutstandingOnly filter (notice-relevant properties only)");
        }

        // Apply filters
        if (!string.IsNullOrWhiteSpace(city))
        {
            query = query.Where(p => p.City.Contains(city));
            Console.WriteLine($"Applied city filter: {city}");
        }

        if (statusId.HasValue)
        {
            query = query.Where(p => p.StatusId == statusId.Value);
            Console.WriteLine($"Applied statusId filter: {statusId.Value}");
        }

        if (propertyTypeId.HasValue)
        {
            query = query.Where(p => p.PropertyTypeId == propertyTypeId.Value);
            Console.WriteLine($"Applied propertyTypeId filter: {propertyTypeId.Value}");
        }

        if (!string.IsNullOrWhiteSpace(ownerName))
        {
            query = query.Where(p => p.OwnerName.Contains(ownerName));
            Console.WriteLine($"Applied ownerName filter: {ownerName}");
        }

        // New filters for mobile app - case-insensitive search
        if (!string.IsNullOrWhiteSpace(plateNumber))
        {
            var trimmedPlate = plateNumber!.Trim().ToLower();
            query = query.Where(p => p.PlateNumber != null && p.PlateNumber.ToLower().Contains(trimmedPlate));
            Console.WriteLine($"Applied plateNumber filter (case-insensitive): {trimmedPlate}");
        }

        if (!string.IsNullOrWhiteSpace(ownerPhone))
        {
            var trimmedPhone = ownerPhone!.Trim();
            query = query.Where(p => p.Owner != null && p.Owner.Phone != null && p.Owner.Phone.Contains(trimmedPhone));
            Console.WriteLine($"Applied ownerPhone filter: {trimmedPhone}");
        }

        if (!string.IsNullOrWhiteSpace(responsiblePhone))
        {
            var trimmedPhone = responsiblePhone!.Trim();
            query = query.Where(p => p.ResponsiblePerson != null 
                                     && p.ResponsiblePerson.Phone != null 
                                     && p.ResponsiblePerson.Phone.Contains(trimmedPhone));
            Console.WriteLine($"Applied responsiblePhone filter: {trimmedPhone}");
        }

        var totalCount = await query.CountAsync();
        
        Console.WriteLine($"Total matching properties: {totalCount}");
        
        // Apply eager loading first, then re-apply order and pagination
        // Note: We need to maintain the filters by using the same query variable
        var properties = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        Console.WriteLine($"Returning {properties.Count} properties (page {page} of {(int)Math.Ceiling(totalCount / (double)pageSize)})");
        
        // Debug: Log first few properties' plate numbers
        if (properties.Any())
        {
            Console.WriteLine("Sample properties returned:");
            foreach (var prop in properties.Take(3))
            {
                Console.WriteLine($"  - ID: {prop.Id}, PlateNumber: {prop.PlateNumber ?? "NULL"}");
            }
        }
        
        // Now fetch the related entities and project to anonymous type
        var propertyIds = properties.Select(p => p.Id).ToList();
        var enrichedProperties = await session.Query<Property>()
            .Where(p => propertyIds.Contains(p.Id))
            .Fetch(p => p.Owner)
            .Fetch(p => p.ResponsiblePerson)
            .Fetch(p => p.PropertyType)
            .Fetch(p => p.Status)
            .Fetch(p => p.Region)
            .Fetch(p => p.CityNavigation)
            .Fetch(p => p.Section)
            .Fetch(p => p.SubSection)
            .Fetch(p => p.Collector)
            .Fetch(p => p.Kontontriye)
            .Select(p => new
            {
                p.Id,
                p.Latitude,
                p.Longitude,
                p.StreetAddress,
                p.City,
                p.State,
                p.RegionId,
                p.CityId,
                p.PropertyTypeId,
                Owner = p.Owner != null ? new { p.Owner.Id, p.Owner.Name, p.Owner.Phone, p.Owner.Email, p.Owner.Address, p.Owner.IdNumber } : null,
                ResponsiblePerson = p.ResponsiblePerson != null ? new { p.ResponsiblePerson.Id, p.ResponsiblePerson.Name, p.ResponsiblePerson.Phone, p.ResponsiblePerson.Email, p.ResponsiblePerson.Address, p.ResponsiblePerson.IdNumber, p.ResponsiblePerson.Relationship } : null,
                p.OwnerName,
                p.OwnerPhone,
                p.OwnerEmail,
                p.Height,
                p.Width,
                p.AreaSize,
                p.AreaUnit,
                p.EstimatedValue,
                p.Currency,
                p.Description,
                p.PlateNumber,
                p.SectionId,
                p.SubSectionId,
                p.KontontriyeId,
                p.PaidAmount,
                p.PaymentStatus,
                p.ImageUrl,
                PropertyType = new { p.PropertyType.Id, p.PropertyType.Name, p.PropertyType.Price, p.PropertyType.Unit },
                Status = new { p.Status.Id, p.Status.Name, p.Status.ColorCode },
                Region = p.Region != null ? new { p.Region.Id, p.Region.Name } : null,
                CityNavigation = p.CityNavigation != null ? new { p.CityNavigation.Id, p.CityNavigation.Name } : null,
                Section = p.Section != null ? new { p.Section.Id, p.Section.Name } : null,
                SubSection = p.SubSection != null ? new { p.SubSection.Id, p.SubSection.Name } : null,
                Collector = p.Collector != null ? new { p.Collector.Id, p.Collector.FirstName, p.Collector.LastName } : null,
                Kontontriye = p.Kontontriye != null ? new { p.Kontontriye.Id, p.Kontontriye.FirstName, p.Kontontriye.LastName } : null,
                p.CreatedAt,
                p.UpdatedAt,
                p.ApprovedAt
            })
            .ToListAsync();
        
        // Sort to maintain original order
        var orderedResults = enrichedProperties
            .OrderByDescending(p => p.CreatedAt)
            .ToList();

        return Ok(new
        {
            data = orderedResults,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProperty(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var property = await session.Query<Property>()
            .Where(p => p.Id == id)
            .Fetch(p => p.Owner)
            .Fetch(p => p.ResponsiblePerson)
            .Fetch(p => p.PropertyType)
            .Fetch(p => p.Status)
            .Fetch(p => p.Region)
            .Fetch(p => p.CityNavigation)
            .Fetch(p => p.Section)
            .Fetch(p => p.SubSection)
            .Select(p => new
            {
                p.Id,
                p.Latitude,
                p.Longitude,
                p.StreetAddress,
                p.City,
                p.State,
                p.RegionId,
                p.CityId,
                p.PropertyTypeId, // Include PropertyTypeId directly
                Owner = p.Owner != null ? new { p.Owner.Id, p.Owner.Name, p.Owner.Phone, p.Owner.Email, p.Owner.Address, p.Owner.IdNumber } : null,
                ResponsiblePerson = p.ResponsiblePerson != null ? new { p.ResponsiblePerson.Id, p.ResponsiblePerson.Name, p.ResponsiblePerson.Phone, p.ResponsiblePerson.Email, p.ResponsiblePerson.Address, p.ResponsiblePerson.IdNumber, p.ResponsiblePerson.Relationship } : null,
                // Legacy fields
                p.OwnerName,
                p.OwnerPhone,
                p.OwnerEmail,
                p.Height,
                p.Width,
                p.AreaSize,
                p.AreaUnit,
                p.EstimatedValue,
                p.Currency,
                p.Description,
                p.PlateNumber,
                p.SectionId,
                p.SubSectionId,
                p.KontontriyeId,
                p.PaidAmount,
                p.PaymentStatus,
                p.ImageUrl,
                PropertyType = new { p.PropertyType.Id, p.PropertyType.Name, p.PropertyType.Price, p.PropertyType.Unit },
                Status = new { p.Status.Id, p.Status.Name, p.Status.ColorCode },
                Region = p.Region != null ? new { p.Region.Id, p.Region.Name } : null,
                CityNavigation = p.CityNavigation != null ? new { p.CityNavigation.Id, p.CityNavigation.Name } : null,
                Section = p.Section != null ? new { p.Section.Id, p.Section.Name } : null,
                SubSection = p.SubSection != null ? new { p.SubSection.Id, p.SubSection.Name } : null,
                Collector = p.Collector != null ? new { p.Collector.Id, p.Collector.FirstName, p.Collector.LastName } : null,
                Kontontriye = p.Kontontriye != null ? new { p.Kontontriye.Id, p.Kontontriye.FirstName, p.Kontontriye.LastName } : null,
                CreatedBy = new { p.CreatedByUser.Id, p.CreatedByUser.FirstName, p.CreatedByUser.LastName },
                ApprovedBy = p.ApprovedByUser != null ? new { p.ApprovedByUser.Id, p.ApprovedByUser.FirstName, p.ApprovedByUser.LastName } : null,
                ApprovedById = p.ApprovedBy, // Include ApprovedBy ID for reference
                p.CreatedAt,
                p.UpdatedAt,
                p.ApprovedAt
            })
            .FirstOrDefaultAsync();

        if (property == null)
        {
            return NotFound(new { message = "Property not found" });
        }

        return Ok(property);
    }

    [HttpPost("{id}/images")]
    public async Task<IActionResult> UploadPropertyImage(Guid id, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        // Validate file type
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(fileExtension))
        {
            return BadRequest(new { message = "Invalid file type. Only image files are allowed." });
        }

        // Validate file size (max 10MB)
        const long maxFileSize = 10 * 1024 * 1024; // 10MB
        if (file.Length > maxFileSize)
        {
            return BadRequest(new { message = "File size exceeds 10MB limit" });
        }

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Verify property exists
            var property = await session.GetAsync<Property>(id);
            if (property == null)
            {
                return NotFound(new { message = "Property not found" });
            }

            // Upload to Backblaze
            string filePath;
            try
            {
                filePath = await _storageService.UploadFileAsync(
                    file.OpenReadStream(),
                    file.FileName,
                    file.ContentType,
                    "properties"
                );
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("not configured"))
            {
                return BadRequest(new { message = "Backblaze storage is not configured. Please configure Backblaze credentials in appsettings.json" });
            }

            // Get file URL
            var fileUrl = _storageService.GetFileUrl(filePath);

            // Check if this should be the primary image
            var existingPrimary = await session.Query<PropertyDocument>()
                .Where(d => d.PropertyId == id && d.IsPrimary && d.DocumentType == DocumentType.Photo)
                .FirstOrDefaultAsync();

            var isPrimary = existingPrimary == null; // First image becomes primary

            // Create PropertyDocument record
            var document = new PropertyDocument
            {
                PropertyId = id,
                UploadedBy = userId,
                FileName = Path.GetFileName(filePath),
                OriginalFileName = file.FileName,
                FilePath = filePath,
                FileType = fileExtension,
                FileSize = file.Length,
                MimeType = file.ContentType,
                DocumentType = DocumentType.Photo,
                IsPrimary = isPrimary,
                Property = property,
                UploadedByUser = await session.GetAsync<User>(userId) ?? throw new InvalidOperationException("User not found")
            };

            await session.SaveAsync(document);

            // If this is the primary image, update the Property table with the image URL
            if (isPrimary)
            {
                property.ImageUrl = fileUrl;
                await session.UpdateAsync(property);
            }

            await session.FlushAsync();
            await transaction.CommitAsync();

            // Return minimal info - frontend should fetch full details including URL from GetPropertyImages endpoint
            return Ok(new
            {
                id = document.Id,
                message = "Image uploaded successfully",
                isPrimary = document.IsPrimary
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($"Error uploading property image: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while uploading the image", error = ex.Message });
        }
    }

    [HttpGet("{id}/images")]
    public async Task<IActionResult> GetPropertyImages(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        // Verify property exists
        var propertyExists = await session.Query<Property>()
            .Where(p => p.Id == id)
            .AnyAsync();

        if (!propertyExists)
        {
            return NotFound(new { message = "Property not found" });
        }

        var imagesData = await session.Query<PropertyDocument>()
            .Where(d => d.PropertyId == id && d.DocumentType == DocumentType.Photo)
            .OrderByDescending(d => d.IsPrimary)
            .ThenByDescending(d => d.UploadedAt)
            .Select(d => new
            {
                d.Id,
                d.FileName,
                d.OriginalFileName,
                d.FilePath,
                d.FileSize,
                d.MimeType,
                d.IsPrimary,
                d.UploadedAt,
                UploadedBy = new { d.UploadedByUser.Id, d.UploadedByUser.FirstName, d.UploadedByUser.LastName }
            })
            .ToListAsync();

        // Generate proxy URLs (can't use Url.Action in LINQ query)
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var images = imagesData.Select(d => new
        {
            d.Id,
            d.FileName,
            d.OriginalFileName,
            d.FilePath,
            // Use backend proxy URL instead of direct Backblaze URL (handles authentication)
            // Note: Route is "api/[controller]" which becomes "api/Properties" (capital P)
            FileUrl = $"{baseUrl}/api/Properties/{id}/images/{d.Id}/download",
            d.FileSize,
            d.MimeType,
            d.IsPrimary,
            d.UploadedAt,
            d.UploadedBy
        }).ToList();

        return Ok(images);
    }

    [HttpGet("{id}/images/{imageId}/download")]
    public async Task<IActionResult> DownloadPropertyImage(Guid id, Guid imageId)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var document = await session.Query<PropertyDocument>()
            .Where(d => d.Id == imageId && d.PropertyId == id && d.DocumentType == DocumentType.Photo)
            .FirstOrDefaultAsync();

        if (document == null)
        {
            return NotFound(new { message = "Image not found" });
        }

        try
        {
            var fileStream = await _storageService.DownloadFileAsync(document.FilePath);
            // Return file with proper headers for image display
            return File(fileStream, document.MimeType, document.OriginalFileName, enableRangeProcessing: true);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error downloading property image: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while downloading the image", error = ex.Message });
        }
    }

    [HttpDelete("{id}/images/{imageId}")]
    public async Task<IActionResult> DeletePropertyImage(Guid id, Guid imageId)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var document = await session.GetAsync<PropertyDocument>(imageId);
            if (document == null || document.PropertyId != id)
            {
                return NotFound(new { message = "Image not found" });
            }

            // Delete from Backblaze
            await _storageService.DeleteFileAsync(document.FilePath);

            // If this was the primary image, set the next image as primary
            if (document.IsPrimary)
            {
                var nextImage = await session.Query<PropertyDocument>()
                    .Where(d => d.PropertyId == id && d.Id != imageId && d.DocumentType == DocumentType.Photo)
                    .OrderByDescending(d => d.UploadedAt)
                    .FirstOrDefaultAsync();

                if (nextImage != null)
                {
                    nextImage.IsPrimary = true;
                    await session.UpdateAsync(nextImage);

                    // Update Property.ImageUrl with the new primary image URL
                    var property = await session.GetAsync<Property>(id);
                    if (property != null)
                    {
                        var imageUrl = _storageService.GetFileUrl(nextImage.FilePath);
                        property.ImageUrl = imageUrl;
                        await session.UpdateAsync(property);
                    }
                }
                else
                {
                    // No more images, clear Property.ImageUrl
                    var property = await session.GetAsync<Property>(id);
                    if (property != null)
                    {
                        property.ImageUrl = null;
                        await session.UpdateAsync(property);
                    }
                }
            }

            // Delete from database
            await session.DeleteAsync(document);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Image deleted successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($"Error deleting property image: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while deleting the image", error = ex.Message });
        }
    }

    [HttpPut("{id}/images/{imageId}/set-primary")]
    public async Task<IActionResult> SetPrimaryImage(Guid id, Guid imageId)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var document = await session.GetAsync<PropertyDocument>(imageId);
            if (document == null || document.PropertyId != id || document.DocumentType != DocumentType.Photo)
            {
                return NotFound(new { message = "Image not found" });
            }

            // Unset all other primary images for this property
            var otherPrimaryImages = await session.Query<PropertyDocument>()
                .Where(d => d.PropertyId == id && d.IsPrimary && d.Id != imageId && d.DocumentType == DocumentType.Photo)
                .ToListAsync();

            foreach (var img in otherPrimaryImages)
            {
                img.IsPrimary = false;
                await session.UpdateAsync(img);
            }

            // Set this image as primary
            document.IsPrimary = true;
            await session.UpdateAsync(document);

            // Update Property.ImageUrl with the primary image URL
            var property = await session.GetAsync<Property>(id);
            if (property != null)
            {
                var imageUrl = _storageService.GetFileUrl(document.FilePath);
                property.ImageUrl = imageUrl;
                await session.UpdateAsync(property);
            }

            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Primary image updated successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($"Error setting primary image: {ex.Message}");
            return StatusCode(500, new { message = "An error occurred while setting primary image", error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateProperty([FromBody] CreatePropertyRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            // Get default status (Draft)
            var draftStatus = await session.Query<PropertyRegistration.Core.Entities.PropertyStatus>()
                .FirstOrDefaultAsync(s => s.Name == "Draft");

            if (draftStatus == null)
            {
                return StatusCode(500, new { message = "Default property status not found" });
            }

            // Get property type
            var propertyType = await session.GetAsync<PropertyType>(request.PropertyTypeId);
            if (propertyType == null)
            {
                return BadRequest(new { message = "Invalid property type" });
            }

            // Get creator user with region and city
            var createdByUser = await session.Query<User>()
                .Where(u => u.Id == userId)
                .Fetch(u => u.Region)
                .Fetch(u => u.City)
                .FirstOrDefaultAsync();
            
            if (createdByUser == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            // Resolve region: use user's region if assigned, else request.RegionId if provided and valid
            Region? region = null;
            if (createdByUser.RegionId.HasValue)
            {
                region = createdByUser.Region ?? await session.GetAsync<Region>(createdByUser.RegionId.Value);
            }
            if (region == null && request.RegionId.HasValue)
            {
                region = await session.GetAsync<Region>(request.RegionId.Value);
            }
            if (region == null)
            {
                return BadRequest(new { message = "User is not assigned to a region and no region was selected. Please select a region or contact administrator to assign a region." });
            }

            // Resolve city: use user's city if assigned, else request.CityId if provided and valid
            City? city = null;
            if (createdByUser.CityId.HasValue)
            {
                city = createdByUser.City ?? await session.GetAsync<City>(createdByUser.CityId.Value);
            }
            if (city == null && request.CityId.HasValue)
            {
                city = await session.GetAsync<City>(request.CityId.Value);
                if (city != null && city.RegionId != region.Id)
                {
                    return BadRequest(new { message = "Selected city does not belong to the selected region." });
                }
            }
            if (city == null)
            {
                return BadRequest(new { message = "User is not assigned to a city and no city was selected. Please select a city or contact administrator to assign a city." });
            }

            // Property must have either owner or responsible person (alternative to each other)
            var hasOwnerPath = request.OwnerId.HasValue || request.NewOwner != null || !string.IsNullOrWhiteSpace(request.OwnerName);
            var hasResponsiblePath = request.ResponsiblePersonId.HasValue || request.NewResponsiblePerson != null;
            if (!hasOwnerPath && !hasResponsiblePath)
            {
                return BadRequest(new { message = "Provide either an owner or a responsible person for the property." });
            }

            // Handle Owner: use existing or create new (only when owner path is provided)
            Owner? owner = null;
            if (hasOwnerPath)
            {
                if (request.OwnerId.HasValue)
                {
                    owner = await session.GetAsync<Owner>(request.OwnerId.Value);
                    if (owner == null)
                    {
                        return BadRequest(new { message = "Owner not found" });
                    }
                }
                else if (request.NewOwner != null)
                {
                    // Check if owner with same phone or email already exists
                    if (!string.IsNullOrWhiteSpace(request.NewOwner.Phone))
                    {
                        var existingByPhone = await session.Query<Owner>()
                            .Where(o => o.Phone == request.NewOwner.Phone.Trim() && o.IsActive)
                            .FirstOrDefaultAsync();

                        if (existingByPhone != null)
                        {
                            owner = existingByPhone;
                        }
                        else
                        {
                            owner = new Owner
                            {
                                Name = request.NewOwner.Name.Trim(),
                                Phone = string.IsNullOrWhiteSpace(request.NewOwner.Phone) ? null : request.NewOwner.Phone.Trim(),
                                Email = string.IsNullOrWhiteSpace(request.NewOwner.Email) ? null : request.NewOwner.Email.Trim().ToLower(),
                                Address = string.IsNullOrWhiteSpace(request.NewOwner.Address) ? null : request.NewOwner.Address.Trim(),
                                IdNumber = string.IsNullOrWhiteSpace(request.NewOwner.IdNumber) ? null : request.NewOwner.IdNumber.Trim(),
                                IsActive = true
                            };
                            await session.SaveAsync(owner);
                            await session.FlushAsync(); // Flush to get the ID
                        }
                    }
                    else
                    {
                        owner = new Owner
                        {
                            Name = request.NewOwner.Name.Trim(),
                            Phone = string.IsNullOrWhiteSpace(request.NewOwner.Phone) ? null : request.NewOwner.Phone.Trim(),
                            Email = string.IsNullOrWhiteSpace(request.NewOwner.Email) ? null : request.NewOwner.Email.Trim().ToLower(),
                            Address = string.IsNullOrWhiteSpace(request.NewOwner.Address) ? null : request.NewOwner.Address.Trim(),
                            IdNumber = string.IsNullOrWhiteSpace(request.NewOwner.IdNumber) ? null : request.NewOwner.IdNumber.Trim(),
                            IsActive = true
                        };
                        await session.SaveAsync(owner);
                        await session.FlushAsync(); // Flush to get the ID
                    }
                }
                else if (!string.IsNullOrWhiteSpace(request.OwnerName))
                {
                    // Fallback to legacy fields for backward compatibility
                    var existingOwner = await session.Query<Owner>()
                        .Where(o => o.Name == request.OwnerName.Trim() && o.IsActive)
                        .FirstOrDefaultAsync();

                    if (existingOwner != null)
                    {
                        owner = existingOwner;
                    }
                    else
                    {
                        owner = new Owner
                        {
                            Name = request.OwnerName.Trim(),
                            Phone = string.IsNullOrWhiteSpace(request.OwnerPhone) ? null : request.OwnerPhone.Trim(),
                            Email = string.IsNullOrWhiteSpace(request.OwnerEmail) ? null : request.OwnerEmail.Trim().ToLower(),
                            IsActive = true
                        };
                        await session.SaveAsync(owner);
                        await session.FlushAsync(); // Flush to get the ID
                    }
                }
            }

            // Handle Responsible Person: use existing or create new
            ResponsiblePerson? responsiblePerson = null;
            if (request.ResponsiblePersonId.HasValue)
            {
                responsiblePerson = await session.GetAsync<ResponsiblePerson>(request.ResponsiblePersonId.Value);
                if (responsiblePerson == null)
                {
                    return BadRequest(new { message = "Responsible person not found" });
                }
            }
            else if (request.NewResponsiblePerson != null)
            {
                // Check if responsible person with same phone or email already exists
                if (!string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Phone))
                {
                    var existingByPhone = await session.Query<ResponsiblePerson>()
                        .Where(r => r.Phone == request.NewResponsiblePerson.Phone.Trim() && r.IsActive)
                        .FirstOrDefaultAsync();

                    if (existingByPhone != null)
                    {
                        responsiblePerson = existingByPhone;
                    }
                    else
                    {
                        responsiblePerson = new ResponsiblePerson
                        {
                            Name = request.NewResponsiblePerson.Name.Trim(),
                            Phone = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Phone) ? null : request.NewResponsiblePerson.Phone.Trim(),
                            Email = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Email) ? null : request.NewResponsiblePerson.Email.Trim().ToLower(),
                            Address = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Address) ? null : request.NewResponsiblePerson.Address.Trim(),
                            IdNumber = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.IdNumber) ? null : request.NewResponsiblePerson.IdNumber.Trim(),
                            Relationship = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Relationship) ? null : request.NewResponsiblePerson.Relationship.Trim(),
                            IsActive = true
                        };
                        await session.SaveAsync(responsiblePerson);
                        await session.FlushAsync(); // Flush to get the ID
                    }
                }
                else
                {
                    responsiblePerson = new ResponsiblePerson
                    {
                        Name = request.NewResponsiblePerson.Name.Trim(),
                        Phone = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Phone) ? null : request.NewResponsiblePerson.Phone.Trim(),
                        Email = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Email) ? null : request.NewResponsiblePerson.Email.Trim().ToLower(),
                        Address = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Address) ? null : request.NewResponsiblePerson.Address.Trim(),
                        IdNumber = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.IdNumber) ? null : request.NewResponsiblePerson.IdNumber.Trim(),
                        Relationship = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Relationship) ? null : request.NewResponsiblePerson.Relationship.Trim(),
                        IsActive = true
                    };
                    await session.SaveAsync(responsiblePerson);
                    await session.FlushAsync(); // Flush to get the ID
                }
            }

            // Assign collector (logic: every 50 properties gets a collector)
            User? collector = null;
            var collectorRole = await session.Query<Role>()
                .FirstOrDefaultAsync(r => r.Code == "COLLECTOR");

            if (collectorRole != null)
            {
                var collectors = await session.Query<UserRole>()
                    .Where(ur => ur.Role.Id == collectorRole.Id)
                    .Select(ur => ur.User)
                    .ToListAsync();

                if (collectors.Any())
                {
                    // Get total property count
                    var totalProperties = await session.Query<Property>().CountAsync();

                    // Calculate which collector should handle this property (every 50 properties)
                    var collectorIndex = (totalProperties / 50) % collectors.Count;
                    collector = collectors[collectorIndex];

                    // Update collector's property count
                    collector.CurrentPropertyCount++;
                    session.Update(collector);
                }
            }

            // Ensure all entities are flushed and have IDs before creating property
            await session.FlushAsync();

            if (owner == null && responsiblePerson == null)
            {
                return BadRequest(new { message = "Provide either an owner or a responsible person for the property." });
            }

            string cityName = city?.Name ?? request.City.Trim();
            // Legacy display fields: from owner or responsible person
            var displayName = owner?.Name ?? responsiblePerson?.Name ?? string.Empty;
            var displayPhone = owner?.Phone ?? responsiblePerson?.Phone;
            var displayEmail = owner?.Email ?? responsiblePerson?.Email;

            // Validate KontontriyeId if provided
            User? kontontriye = null;
            if (request.KontontriyeId.HasValue)
            {
                kontontriye = await session.GetAsync<User>(request.KontontriyeId.Value);
                if (kontontriye == null)
                {
                    return BadRequest(new { message = "Kontontriye user not found" });
                }
            }

            // Validate PlateNumber uniqueness if provided
            if (!string.IsNullOrWhiteSpace(request.PlateNumber))
            {
                var existingProperty = await session.Query<Property>()
                    .FirstOrDefaultAsync(p => p.PlateNumber == request.PlateNumber.Trim());
                
                if (existingProperty != null)
                {
                    return BadRequest(new { message = "A property with this plate number already exists" });
                }
            }

            // Validate SectionId if provided
            Section? section = null;
            if (request.SectionId.HasValue)
            {
                section = await session.GetAsync<Section>(request.SectionId.Value);
                if (section == null)
                {
                    return BadRequest(new { message = "Section not found" });
                }
            }

            // Validate SubSectionId if provided
            SubSection? subSection = null;
            if (request.SubSectionId.HasValue)
            {
                subSection = await session.GetAsync<SubSection>(request.SubSectionId.Value);
                if (subSection == null)
                {
                    return BadRequest(new { message = "SubSection not found" });
                }
                // Verify that SubSection belongs to the selected Section
                if (request.SectionId.HasValue && subSection.SectionId != request.SectionId.Value)
                {
                    return BadRequest(new { message = "SubSection does not belong to the selected Section" });
                }
            }

            // Create property - set FK properties and navigation properties (NHibernate will ignore nav props due to Not.Insert())
            var property = new Property
            {
                // Foreign keys
                CreatedBy = userId,
                CollectorId = collector?.Id,
                PropertyTypeId = request.PropertyTypeId,
                StatusId = draftStatus.Id,
                OwnerId = owner?.Id,
                ResponsiblePersonId = responsiblePerson?.Id,
                RegionId = region.Id, // Use region from current user
                CityId = city.Id, // Use city from current user
                
                // Location
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                
                // Address
                StreetAddress = request.StreetAddress.Trim(),
                City = cityName, // Denormalized city name for backward compatibility
                State = string.IsNullOrWhiteSpace(request.State) ? null : request.State.Trim(),
                
                // Legacy fields (from owner or responsible person for display)
                OwnerName = displayName,
                OwnerPhone = displayPhone,
                OwnerEmail = displayEmail,
                
                // Property details (height, width and areaSize stored as written)
                Height = request.Height,
                Width = request.Width,
                AreaSize = request.AreaSize,
                AreaUnit = request.AreaUnit ?? "m",
                EstimatedValue = request.EstimatedValue,
                Currency = request.Currency ?? "USD", // Default to USD
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                
                // Additional property information
                PlateNumber = string.IsNullOrWhiteSpace(request.PlateNumber) ? null : request.PlateNumber.Trim(),
                SectionId = request.SectionId,
                SubSectionId = request.SubSectionId,
                KontontriyeId = request.KontontriyeId,
                
                // Navigation properties (set but NHibernate will ignore due to Not.Insert() in mapping)
                CreatedByUser = createdByUser,
                PropertyType = propertyType,
                Status = draftStatus,
                Collector = collector,
                Owner = owner,
                ResponsiblePerson = responsiblePerson,
                Region = region,
                CityNavigation = city,
                Section = section,
                SubSection = subSection,
                Kontontriye = kontontriye
            };

            await session.SaveAsync(property);
            await session.FlushAsync();

            await transaction.CommitAsync();

            // Reload property with relationships
            session.Clear();
            var savedProperty = await session.Query<Property>()
                .Where(p => p.Id == property.Id)
                .Select(p => new
                {
                    p.Id,
                    p.Latitude,
                    p.Longitude,
                    p.StreetAddress,
                    p.City,
                    p.State,
                    p.RegionId,
                    p.CityId,
                    p.OwnerName,
                    p.OwnerPhone,
                    p.OwnerEmail,
                    p.Height,
                    p.Width,
                    p.AreaSize,
                    p.AreaUnit,
                    p.EstimatedValue,
                    p.Currency,
                    p.Description,
                    p.PlateNumber,
                    p.SectionId,
                    p.SubSectionId,
                    p.KontontriyeId,
                    PropertyType = new { p.PropertyType.Id, p.PropertyType.Name },
                    Status = new { p.Status.Id, p.Status.Name, p.Status.ColorCode },
                    Section = p.Section != null ? new { p.Section.Id, p.Section.Name } : null,
                    SubSection = p.SubSection != null ? new { p.SubSection.Id, p.SubSection.Name } : null,
                    Kontontriye = p.Kontontriye != null ? new { p.Kontontriye.Id, p.Kontontriye.FirstName, p.Kontontriye.LastName } : null,
                    Collector = p.Collector != null ? new { p.Collector.Id, p.Collector.FirstName, p.Collector.LastName } : null,
                    p.CreatedAt,
                    p.UpdatedAt
                })
                .FirstOrDefaultAsync();

            return CreatedAtAction(nameof(GetProperty), new { id = property.Id }, savedProperty);
        }
        catch (Exception ex)
        {
            try { await transaction.RollbackAsync(); } catch { }
            // Log the full exception for debugging
            Console.WriteLine($"Error creating property: {ex}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                Console.WriteLine($"Inner stack trace: {ex.InnerException.StackTrace}");
            }
            return StatusCode(500, new { message = "An error occurred while creating the property", error = ex.Message, details = ex.InnerException?.Message ?? ex.ToString() });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProperty(Guid id, [FromBody] UpdatePropertyRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            Console.WriteLine($"=== UPDATING PROPERTY (Full Update) ===");
            Console.WriteLine($"Property ID: {id}");
            Console.WriteLine($"Latitude: {request.Latitude}");
            Console.WriteLine($"Longitude: {request.Longitude}");
            Console.WriteLine($"StreetAddress: {request.StreetAddress}");
            Console.WriteLine($"Has OwnerId: {request.OwnerId.HasValue}");
            Console.WriteLine($"Has NewOwner: {request.NewOwner != null}");

            var property = await session.GetAsync<Property>(id);
            if (property == null)
            {
                return NotFound(new { message = "Property not found" });
            }

            // Handle Owner: use existing or create new (property can have owner or responsible or both)
            Owner? owner = property.Owner;
            if (request.OwnerId.HasValue)
            {
                owner = await session.GetAsync<Owner>(request.OwnerId.Value);
                if (owner == null)
                {
                    return BadRequest(new { message = "Owner not found" });
                }
            }
            else if (request.NewOwner != null)
            {
                // Check if owner with same phone or email already exists
                if (!string.IsNullOrWhiteSpace(request.NewOwner.Phone))
                {
                    var existingByPhone = await session.Query<Owner>()
                        .Where(o => o.Phone == request.NewOwner.Phone.Trim() && o.IsActive)
                        .FirstOrDefaultAsync();

                    if (existingByPhone != null)
                    {
                        owner = existingByPhone;
                    }
                    else
                    {
                        owner = new Owner
                        {
                            Name = request.NewOwner.Name.Trim(),
                            Phone = string.IsNullOrWhiteSpace(request.NewOwner.Phone) ? null : request.NewOwner.Phone.Trim(),
                            Email = string.IsNullOrWhiteSpace(request.NewOwner.Email) ? null : request.NewOwner.Email.Trim().ToLower(),
                            Address = string.IsNullOrWhiteSpace(request.NewOwner.Address) ? null : request.NewOwner.Address.Trim(),
                            IdNumber = string.IsNullOrWhiteSpace(request.NewOwner.IdNumber) ? null : request.NewOwner.IdNumber.Trim(),
                            IsActive = true
                        };
                        await session.SaveAsync(owner);
                        await session.FlushAsync();
                    }
                }
                else
                {
                    owner = new Owner
                    {
                        Name = request.NewOwner.Name.Trim(),
                        Phone = string.IsNullOrWhiteSpace(request.NewOwner.Phone) ? null : request.NewOwner.Phone.Trim(),
                        Email = string.IsNullOrWhiteSpace(request.NewOwner.Email) ? null : request.NewOwner.Email.Trim().ToLower(),
                        Address = string.IsNullOrWhiteSpace(request.NewOwner.Address) ? null : request.NewOwner.Address.Trim(),
                        IdNumber = string.IsNullOrWhiteSpace(request.NewOwner.IdNumber) ? null : request.NewOwner.IdNumber.Trim(),
                        IsActive = true
                    };
                    await session.SaveAsync(owner);
                    await session.FlushAsync();
                }
            }

            // Handle Responsible Person: use existing or create new
            ResponsiblePerson? responsiblePerson = property.ResponsiblePerson;
            if (request.ResponsiblePersonId.HasValue)
            {
                responsiblePerson = await session.GetAsync<ResponsiblePerson>(request.ResponsiblePersonId.Value);
            }
            else if (request.NewResponsiblePerson != null)
            {
                if (!string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Phone))
                {
                    var existingByPhone = await session.Query<ResponsiblePerson>()
                        .Where(r => r.Phone == request.NewResponsiblePerson.Phone.Trim() && r.IsActive)
                        .FirstOrDefaultAsync();

                    if (existingByPhone != null)
                    {
                        responsiblePerson = existingByPhone;
                    }
                    else
                    {
                        responsiblePerson = new ResponsiblePerson
                        {
                            Name = request.NewResponsiblePerson.Name.Trim(),
                            Phone = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Phone) ? null : request.NewResponsiblePerson.Phone.Trim(),
                            Email = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Email) ? null : request.NewResponsiblePerson.Email.Trim().ToLower(),
                            Address = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Address) ? null : request.NewResponsiblePerson.Address.Trim(),
                            IdNumber = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.IdNumber) ? null : request.NewResponsiblePerson.IdNumber.Trim(),
                            Relationship = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Relationship) ? null : request.NewResponsiblePerson.Relationship.Trim(),
                            IsActive = true
                        };
                        await session.SaveAsync(responsiblePerson);
                        await session.FlushAsync();
                    }
                }
                else
                {
                    responsiblePerson = new ResponsiblePerson
                    {
                        Name = request.NewResponsiblePerson.Name.Trim(),
                        Phone = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Phone) ? null : request.NewResponsiblePerson.Phone.Trim(),
                        Email = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Email) ? null : request.NewResponsiblePerson.Email.Trim().ToLower(),
                        Address = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Address) ? null : request.NewResponsiblePerson.Address.Trim(),
                        IdNumber = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.IdNumber) ? null : request.NewResponsiblePerson.IdNumber.Trim(),
                        Relationship = string.IsNullOrWhiteSpace(request.NewResponsiblePerson.Relationship) ? null : request.NewResponsiblePerson.Relationship.Trim(),
                        IsActive = true
                    };
                    await session.SaveAsync(responsiblePerson);
                    await session.FlushAsync();
                }
            }

            // Ensure owner has an ID
            if (owner != null && owner.Id == Guid.Empty)
            {
                await session.FlushAsync();
            }

            // Update properties
            if (request.Latitude.HasValue) property.Latitude = request.Latitude.Value;
            if (request.Longitude.HasValue) property.Longitude = request.Longitude.Value;
            if (!string.IsNullOrWhiteSpace(request.StreetAddress)) property.StreetAddress = request.StreetAddress.Trim();
            if (request.State != null) property.State = string.IsNullOrWhiteSpace(request.State) ? null : request.State.Trim();
            
            // Update owner (property must keep at least owner or responsible)
            if (owner != null)
            {
                property.OwnerId = owner.Id;
                property.Owner = owner;
                property.OwnerName = owner.Name;
                property.OwnerPhone = owner.Phone;
                property.OwnerEmail = owner.Email;
            }
            else
            {
                property.OwnerId = null;
                property.Owner = null;
                property.OwnerName = responsiblePerson?.Name ?? string.Empty;
                property.OwnerPhone = responsiblePerson?.Phone;
                property.OwnerEmail = responsiblePerson?.Email;
            }
            
            // Update responsible person
            if (responsiblePerson != null)
            {
                property.ResponsiblePersonId = responsiblePerson.Id;
                property.ResponsiblePerson = responsiblePerson;
            }
            else if (request.ResponsiblePersonId == null && request.NewResponsiblePerson == null)
            {
                // Clear responsible person if not provided
                property.ResponsiblePersonId = null;
                property.ResponsiblePerson = null;
            }
            
            if (request.Height.HasValue) property.Height = request.Height.Value;
            if (request.Width.HasValue) property.Width = request.Width.Value;
            if (request.AreaSize.HasValue) property.AreaSize = request.AreaSize.Value;
            if (!string.IsNullOrWhiteSpace(request.AreaUnit)) property.AreaUnit = request.AreaUnit;
            if (request.EstimatedValue.HasValue) property.EstimatedValue = request.EstimatedValue;
            if (!string.IsNullOrWhiteSpace(request.Currency)) property.Currency = request.Currency;
            if (request.Description != null) property.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            
            // Update additional property information
            if (request.PlateNumber != null)
            {
                var plateNumber = string.IsNullOrWhiteSpace(request.PlateNumber) ? null : request.PlateNumber.Trim();
                // Check uniqueness if plate number is being changed
                if (plateNumber != null && plateNumber != property.PlateNumber)
                {
                    var existingProperty = await session.Query<Property>()
                        .FirstOrDefaultAsync(p => p.PlateNumber == plateNumber && p.Id != id);
                    
                    if (existingProperty != null)
                    {
                        return BadRequest(new { message = "A property with this plate number already exists" });
                    }
                }
                property.PlateNumber = plateNumber;
            }

            // Update SectionId if provided
            if (request.SectionId.HasValue)
            {
                var section = await session.GetAsync<Section>(request.SectionId.Value);
                if (section == null)
                {
                    return BadRequest(new { message = "Section not found" });
                }
                property.SectionId = request.SectionId.Value;
                property.Section = section;
            }
            else if (request.SectionId == null && request.SectionId.HasValue == false)
            {
                // Allow clearing Section by explicitly setting to null
                property.SectionId = null;
                property.Section = null;
            }

            // Update SubSectionId if provided
            if (request.SubSectionId.HasValue)
            {
                var subSection = await session.GetAsync<SubSection>(request.SubSectionId.Value);
                if (subSection == null)
                {
                    return BadRequest(new { message = "SubSection not found" });
                }
                // Verify that SubSection belongs to the selected Section
                if (property.SectionId.HasValue && subSection.SectionId != property.SectionId.Value)
                {
                    return BadRequest(new { message = "SubSection does not belong to the selected Section" });
                }
                property.SubSectionId = request.SubSectionId.Value;
                property.SubSection = subSection;
            }
            else if (request.SubSectionId == null && request.SubSectionId.HasValue == false)
            {
                // Allow clearing SubSection by explicitly setting to null
                property.SubSectionId = null;
                property.SubSection = null;
            }
            
            // Update Kontontriye (responsible user who collects fees)
            if (request.KontontriyeId.HasValue)
            {
                var kontontriye = await session.GetAsync<User>(request.KontontriyeId.Value);
                if (kontontriye == null)
                {
                    return BadRequest(new { message = "Kontontriye user not found" });
                }
                property.KontontriyeId = request.KontontriyeId.Value;
                property.Kontontriye = kontontriye;
            }
            else if (request.KontontriyeId == null && request.KontontriyeId.HasValue == false)
            {
                // Allow clearing Kontontriye by explicitly setting to null (if request has KontontriyeId: null)
                // This is handled by the nullable Guid? type - if not provided, don't update
            }
            
            // Update Region and City
            if (request.RegionId.HasValue)
            {
                var region = await session.GetAsync<Region>(request.RegionId.Value);
                if (region != null)
                {
                    property.RegionId = request.RegionId.Value;
                    property.Region = region;
                }
            }
            
            if (request.CityId.HasValue)
            {
                var city = await session.GetAsync<City>(request.CityId.Value);
                if (city != null)
                {
                    property.CityId = request.CityId.Value;
                    property.CityNavigation = city;
                    // Update denormalized City name
                    property.City = city.Name;
                }
            }
            else if (!string.IsNullOrWhiteSpace(request.City))
            {
                // Fallback: use City string if CityId not provided
                property.City = request.City.Trim();
            }
            
            if (request.PropertyTypeId.HasValue)
            {
                var propertyType = await session.GetAsync<PropertyType>(request.PropertyTypeId.Value);
                if (propertyType != null)
                {
                    property.PropertyTypeId = request.PropertyTypeId.Value;
                    property.PropertyType = propertyType;
                }
            }
            if (request.StatusId.HasValue)
            {
                var status = await session.GetAsync<PropertyRegistration.Core.Entities.PropertyStatus>(request.StatusId.Value);
                if (status != null)
                {
                    property.StatusId = request.StatusId.Value;
                    property.Status = status;
                    
                    // If status is being set to Approved, set ApprovedBy and ApprovedAt, and create yearly payment
                    if (status.Name == "Approved" || status.Name == "approved")
                    {
                        Console.WriteLine($"=== Property {property.Id} is being approved ===");
                        Console.WriteLine($"Status Name: {status.Name}");
                        
                        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                        if (Guid.TryParse(userIdClaim, out var userId))
                        {
                            property.ApprovedBy = userId;
                            property.ApprovedAt = DateTime.UtcNow;
                            Console.WriteLine($"Property approved by user {userId}");

                            // Ensure property has all required data before creating payment
                            // Reload property with PropertyType to ensure we have Price
                            if (property.PropertyType == null || property.PropertyType.Price == 0)
                            {
                                Console.WriteLine("Reloading property with PropertyType to get Price...");
                                var reloadedProperty = await session.Query<Property>()
                                    .Where(p => p.Id == property.Id)
                                    .Fetch(p => p.PropertyType)
                                    .FirstOrDefaultAsync();
                                
                                if (reloadedProperty != null && reloadedProperty.PropertyType != null)
                                {
                                    property.PropertyTypeId = reloadedProperty.PropertyTypeId;
                                    property.AreaSize = reloadedProperty.AreaSize;
                                    property.AreaUnit = reloadedProperty.AreaUnit ?? "m";
                                    property.Currency = reloadedProperty.Currency ?? "USD";
                                    property.CollectorId = reloadedProperty.CollectorId;
                                    Console.WriteLine($"Property data reloaded - PropertyTypeId: {property.PropertyTypeId}, Price: {reloadedProperty.PropertyType.Price}, AreaSize: {property.AreaSize}");
                                }
                            }

                            // Verify we have all required data
                            if (property.PropertyTypeId == Guid.Empty)
                            {
                                Console.WriteLine($"ERROR: Property {property.Id} has no PropertyTypeId. Cannot create payment.");
                            }
                            else if (property.AreaSize <= 0)
                            {
                                Console.WriteLine($"ERROR: Property {property.Id} has invalid AreaSize: {property.AreaSize}. Cannot create payment.");
                            }
                            else
                            {
                                // Create automatic yearly payment for approved property
                                await CreateYearlyPayment(session, property, userId);
                            }
                        }
                        else
                        {
                            Console.WriteLine($"WARNING: Could not parse userId from claim: {userIdClaim}");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"Property status changed to '{status.Name}' (not Approved), skipping payment creation");
                    }
                }
            }

            property.UpdatedAt = DateTime.UtcNow;

            await session.FlushAsync();
            await transaction.CommitAsync();

            // Reload property with relationships
            session.Clear();
            var updatedProperty = await session.Query<Property>()
                .Where(p => p.Id == property.Id)
                .Select(p => new
                {
                    p.Id,
                    p.Latitude,
                    p.Longitude,
                    p.StreetAddress,
                    p.City,
                    p.State,
                    p.RegionId,
                    p.CityId,
                    Owner = p.Owner != null ? new { p.Owner.Id, p.Owner.Name, p.Owner.Phone, p.Owner.Email, p.Owner.Address, p.Owner.IdNumber } : null,
                    ResponsiblePerson = p.ResponsiblePerson != null ? new { p.ResponsiblePerson.Id, p.ResponsiblePerson.Name, p.ResponsiblePerson.Phone, p.ResponsiblePerson.Email, p.ResponsiblePerson.Address, p.ResponsiblePerson.IdNumber, p.ResponsiblePerson.Relationship } : null,
                    p.OwnerName,
                    p.OwnerPhone,
                    p.OwnerEmail,
                    p.Height,
                    p.Width,
                    p.AreaSize,
                    p.AreaUnit,
                    p.EstimatedValue,
                    p.Currency,
                    p.Description,
                    PropertyType = new { p.PropertyType.Id, p.PropertyType.Name, p.PropertyType.Price, p.PropertyType.Unit },
                    Status = new { p.Status.Id, p.Status.Name, p.Status.ColorCode },
                    Region = p.Region != null ? new { p.Region.Id, p.Region.Name } : null,
                    CityNavigation = p.CityNavigation != null ? new { p.CityNavigation.Id, p.CityNavigation.Name } : null,
                    p.CreatedAt,
                    p.UpdatedAt
                })
                .FirstOrDefaultAsync();

            return Ok(updatedProperty);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while updating the property", error = ex.Message });
        }
    }

    [HttpPatch("{id}/coordinates")]
    public async Task<IActionResult> UpdatePropertyCoordinates(Guid id, [FromBody] UpdateCoordinatesRequest request)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            Console.WriteLine($"=== UPDATING PROPERTY COORDINATES ===");
            Console.WriteLine($"Property ID: {id}");
            Console.WriteLine($"Latitude: {request.Latitude}");
            Console.WriteLine($"Longitude: {request.Longitude}");

            var property = await session.GetAsync<Property>(id);
            if (property == null)
            {
                return NotFound(new { message = "Property not found" });
            }

            // Update only coordinates
            property.Latitude = request.Latitude;
            property.Longitude = request.Longitude;
            property.UpdatedAt = DateTime.UtcNow;

            await session.FlushAsync();
            await transaction.CommitAsync();

            Console.WriteLine($"=== COORDINATES UPDATED SUCCESSFULLY ===");

            // Publish update to RabbitMQ for real-time notifications
            try
            {
                _rabbitMQService.PublishPropertyUpdate(new PropertyUpdateMessage
                {
                    PropertyId = property.Id.ToString(),
                    UpdateType = "coordinates",
                    Timestamp = DateTime.UtcNow,
                    Data = new
                    {
                        latitude = property.Latitude,
                        longitude = property.Longitude
                    }
                });
                Console.WriteLine($"=== PUBLISHED COORDINATES UPDATE TO RABBITMQ ===");
            }
            catch (Exception rabbitEx)
            {
                Console.WriteLine($"Warning: Failed to publish to RabbitMQ: {rabbitEx.Message}");
                // Don't fail the request if RabbitMQ publish fails
            }

            return Ok(new
            {
                id = property.Id,
                latitude = property.Latitude,
                longitude = property.Longitude,
                updatedAt = property.UpdatedAt,
                message = "Coordinates updated successfully"
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== ERROR UPDATING COORDINATES ===");
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while updating coordinates", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteProperty(Guid id)
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();
        using var transaction = session.BeginTransaction();

        try
        {
            var property = await session.GetAsync<Property>(id);
            if (property == null)
            {
                return NotFound(new { message = "Property not found" });
            }

            var statusName = property.Status?.Name?.Trim();
            if (string.Equals(statusName, "Approved", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Approved properties cannot be deleted." });
            }

            session.Delete(property);
            await session.FlushAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Property deleted successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "An error occurred while deleting the property", error = ex.Message });
        }
    }

    [HttpGet("lookups/types")]
    public async Task<IActionResult> GetPropertyTypes()
    {
        using var session = _sessionFactoryProvider.SessionFactory.OpenSession();

        var types = await session.Query<PropertyType>()
            .OrderBy(t => t.Name)
            .Select(t => new { t.Id, t.Name, t.Price, t.Unit })
            .ToListAsync();

        return Ok(types);
    }

}

public class CreatePropertyRequest
{
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string StreetAddress { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty; // Legacy field, will be populated from CityId if provided
    public string? State { get; set; }
    
    // Region and City foreign keys
    public Guid? RegionId { get; set; }
    public Guid? CityId { get; set; }
    
    // Owner: either provide OwnerId to use existing, or NewOwner to create new
    public Guid? OwnerId { get; set; }
    public NewOwnerRequest? NewOwner { get; set; }
    
    // Responsible Person: either provide ResponsiblePersonId to use existing, or NewResponsiblePerson to create new
    public Guid? ResponsiblePersonId { get; set; }
    public NewResponsiblePersonRequest? NewResponsiblePerson { get; set; }
    
    // Legacy fields (kept for backward compatibility)
    public string OwnerName { get; set; } = string.Empty;
    public string? OwnerPhone { get; set; }
    public string? OwnerEmail { get; set; }
    
    public decimal? Height { get; set; }
    public decimal? Width { get; set; }
    public decimal AreaSize { get; set; }
    public string? AreaUnit { get; set; }
    public decimal? EstimatedValue { get; set; }
    public string? Currency { get; set; }
    public string? Description { get; set; }
    public Guid PropertyTypeId { get; set; }
    
    // Additional property information
    public string? PlateNumber { get; set; }
    public Guid? SectionId { get; set; }
    public Guid? SubSectionId { get; set; }
    public Guid? KontontriyeId { get; set; } // Responsible user who collects fees
}

public class NewOwnerRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? IdNumber { get; set; }
}

public class NewResponsiblePersonRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? IdNumber { get; set; }
    public string? Relationship { get; set; }
}

public class UpdatePropertyRequest
{
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? StreetAddress { get; set; }
    public string? City { get; set; } // Legacy field, will be populated from CityId if provided
    public string? State { get; set; }
    
    // Region and City foreign keys
    public Guid? RegionId { get; set; }
    public Guid? CityId { get; set; }
    
    // Owner: either provide OwnerId to use existing, or NewOwner to create new
    public Guid? OwnerId { get; set; }
    public NewOwnerRequest? NewOwner { get; set; }
    
    // Responsible Person: either provide ResponsiblePersonId to use existing, or NewResponsiblePerson to create new
    public Guid? ResponsiblePersonId { get; set; }
    public NewResponsiblePersonRequest? NewResponsiblePerson { get; set; }
    
    // Legacy fields (kept for backward compatibility)
    public string? OwnerName { get; set; }
    public string? OwnerPhone { get; set; }
    public string? OwnerEmail { get; set; }
    
    public decimal? Height { get; set; }
    public decimal? Width { get; set; }
    public decimal? AreaSize { get; set; }
    public string? AreaUnit { get; set; }
    public decimal? EstimatedValue { get; set; }
    public string? Currency { get; set; }
    public string? Description { get; set; }
    public Guid? PropertyTypeId { get; set; }
    public Guid? StatusId { get; set; }
    
    // Additional property information
    public string? PlateNumber { get; set; }
    public Guid? SectionId { get; set; }
    public Guid? SubSectionId { get; set; }
    public Guid? KontontriyeId { get; set; } // Responsible user who collects fees
}

public class UpdateCoordinatesRequest
{
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
}
