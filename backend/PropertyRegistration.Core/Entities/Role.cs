namespace PropertyRegistration.Core.Entities;

public class Role : BaseEntity
{
    public virtual string Name { get; set; } = string.Empty; // e.g., "Admin", "User", "Collector"
    public virtual string Code { get; set; } = string.Empty; // e.g., "ADMIN", "USER", "COLLECTOR"
    public virtual string? Description { get; set; }
    public virtual bool IsActive { get; set; } = true;
    public virtual bool IsSystemRole { get; set; } = false; // System roles cannot be deleted

    // Navigation properties
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
