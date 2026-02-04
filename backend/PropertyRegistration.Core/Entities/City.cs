namespace PropertyRegistration.Core.Entities;

public class City : BaseEntity
{
    public virtual Guid RegionId { get; set; }
    public virtual string Name { get; set; } = string.Empty;
    public virtual string? Code { get; set; }
    public virtual string? Description { get; set; }
    public virtual bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual Region Region { get; set; } = null!;
}
