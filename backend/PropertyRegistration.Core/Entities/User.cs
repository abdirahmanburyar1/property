namespace PropertyRegistration.Core.Entities;

public class User : BaseEntity
{
    public virtual string Email { get; set; } = string.Empty;
    public virtual string Username { get; set; } = string.Empty;
    public virtual string PasswordHash { get; set; } = string.Empty;
    public virtual string FirstName { get; set; } = string.Empty;
    public virtual string LastName { get; set; } = string.Empty;
    public virtual string? PhoneNumber { get; set; }
    public virtual int CurrentPropertyCount { get; set; } = 0; // For collectors
    public virtual bool IsActive { get; set; } = true;
    public virtual DateTime? LastLoginAt { get; set; }
    
    // Region and City assignment
    public virtual Guid? RegionId { get; set; }
    public virtual Guid? CityId { get; set; }

    // Navigation properties
    public virtual Region? Region { get; set; }
    public virtual City? City { get; set; }
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public virtual ICollection<Property> CreatedProperties { get; set; } = new List<Property>();
    public virtual ICollection<Property> CollectedProperties { get; set; } = new List<Property>();
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public virtual ICollection<PropertyDocument> UploadedDocuments { get; set; } = new List<PropertyDocument>();
    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public virtual ICollection<UserRole> AssignedRoles { get; set; } = new List<UserRole>(); // Roles assigned by this user
    public virtual ICollection<RolePermission> GrantedPermissions { get; set; } = new List<RolePermission>(); // Permissions granted by this user
}
