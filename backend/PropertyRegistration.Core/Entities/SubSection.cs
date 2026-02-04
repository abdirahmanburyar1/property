namespace PropertyRegistration.Core.Entities;

public class SubSection : BaseEntity
{
    public virtual Guid SectionId { get; set; }
    public virtual string Name { get; set; } = string.Empty;
    public virtual string? Description { get; set; }
    public virtual bool IsActive { get; set; } = true;
    public virtual int DisplayOrder { get; set; }
    
    // Navigation properties
    public virtual Section Section { get; set; } = null!;
    public virtual ICollection<Property> Properties { get; set; } = new List<Property>();
}
