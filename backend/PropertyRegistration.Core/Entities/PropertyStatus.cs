namespace PropertyRegistration.Core.Entities;

public class PropertyStatus : BaseEntity
{
    public virtual string Name { get; set; } = string.Empty;
    public virtual string? Description { get; set; }
    public virtual string? ColorCode { get; set; }
    public virtual bool IsActive { get; set; } = true;
    public virtual int DisplayOrder { get; set; } = 0;

    // Navigation properties
    public virtual ICollection<Property> Properties { get; set; } = new List<Property>();
}
