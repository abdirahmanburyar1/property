namespace PropertyRegistration.Core.Entities;

public class UserRole : BaseEntity
{
    public virtual Guid UserId { get; set; }
    public virtual Guid RoleId { get; set; }
    public virtual DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public virtual Guid? AssignedBy { get; set; }

    // Navigation properties
    public virtual User User { get; set; } = null!;
    public virtual Role Role { get; set; } = null!;
    public virtual User? AssignedByUser { get; set; }
}
