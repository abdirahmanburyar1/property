namespace PropertyRegistration.Core.Entities;

public class Permission : BaseEntity
{
    public virtual string Name { get; set; } = string.Empty; // e.g., "Properties.Create", "Properties.Read"
    public virtual string Code { get; set; } = string.Empty; // e.g., "PROPERTIES_CREATE", "PROPERTIES_READ"
    public virtual string? Description { get; set; }
    public virtual string Category { get; set; } = string.Empty; // e.g., "Properties", "Payments", "Users"
    public virtual bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
