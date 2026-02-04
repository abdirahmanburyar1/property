namespace PropertyRegistration.Core.Entities;

public class RolePermission : BaseEntity
{
    public virtual Guid RoleId { get; set; }
    public virtual Guid PermissionId { get; set; }
    public virtual DateTime GrantedAt { get; set; } = DateTime.UtcNow;
    public virtual Guid? GrantedBy { get; set; }

    // Navigation properties
    public virtual Role Role { get; set; } = null!;
    public virtual Permission Permission { get; set; } = null!;
    public virtual User? GrantedByUser { get; set; }
}
