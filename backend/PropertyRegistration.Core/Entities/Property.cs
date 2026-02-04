using System.Text.Json;
using PropertyRegistration.Core.Enums;

namespace PropertyRegistration.Core.Entities;

public class Property : BaseEntity
{
    // Foreign keys
    public virtual Guid CreatedBy { get; set; }
    public virtual Guid? CollectorId { get; set; }
    public virtual Guid PropertyTypeId { get; set; }
    public virtual Guid StatusId { get; set; }
    public virtual Guid? ApprovedBy { get; set; }
    /// <summary>Either OwnerId or ResponsiblePersonId must be set (property under owner or responsible).</summary>
    public virtual Guid? OwnerId { get; set; }
    public virtual Guid? ResponsiblePersonId { get; set; }
    public virtual Guid? RegionId { get; set; }
    public virtual Guid? CityId { get; set; }

    // Location
    public virtual decimal Latitude { get; set; }
    public virtual decimal Longitude { get; set; }

    // Address
    public virtual string StreetAddress { get; set; } = string.Empty;
    public virtual string City { get; set; } = string.Empty; // Denormalized for backward compatibility
    public virtual string? State { get; set; }

    // Owner information (kept for backward compatibility, will be deprecated)
    public virtual string OwnerName { get; set; } = string.Empty;
    public virtual string? OwnerPhone { get; set; }
    public virtual string? OwnerEmail { get; set; }

    // Property details (height, width and areaSize stored separately as written)
    public virtual decimal? Height { get; set; }
    public virtual decimal? Width { get; set; }
    public virtual decimal AreaSize { get; set; }
    public virtual string AreaUnit { get; set; } = "sqm";
    public virtual decimal? EstimatedValue { get; set; }
    public virtual string Currency { get; set; } = "USD";
    public virtual string? Description { get; set; }
    public virtual JsonDocument? Metadata { get; set; }
    
    // Payment tracking
    public virtual decimal PaidAmount { get; set; } = 0;
    public virtual string PaymentStatus { get; set; } = "Pending"; // Pending, Paid, Paid_partially, Exemption
    
    // Additional property information
    public virtual string? PlateNumber { get; set; }
    public virtual Guid? SectionId { get; set; }
    public virtual Guid? SubSectionId { get; set; }
    public virtual Guid? KontontriyeId { get; set; } // Responsible user who collects fees
    public virtual string? ImageUrl { get; set; } // URL of the primary property image

    // Timestamps
    public virtual DateTime? ApprovedAt { get; set; }

    // Navigation properties
    public virtual User CreatedByUser { get; set; } = null!;
    public virtual User? Collector { get; set; }
    public virtual PropertyType PropertyType { get; set; } = null!;
    public virtual PropertyStatus Status { get; set; } = null!;
    public virtual User? ApprovedByUser { get; set; }
    public virtual Owner? Owner { get; set; }
    public virtual ResponsiblePerson? ResponsiblePerson { get; set; }
    public virtual Region? Region { get; set; }
    public virtual City? CityNavigation { get; set; }
    public virtual Section? Section { get; set; }
    public virtual SubSection? SubSection { get; set; }
    public virtual User? Kontontriye { get; set; } // Responsible user who collects fees
    public virtual ICollection<PropertyDocument> Documents { get; set; } = new List<PropertyDocument>();
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public virtual ICollection<PaymentDetail> PaymentDetails { get; set; } = new List<PaymentDetail>();
}
