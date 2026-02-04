namespace PropertyRegistration.Core.Entities;

public class Section : BaseEntity
{
    public virtual string Name { get; set; } = string.Empty;
    public virtual string? Description { get; set; }
    public virtual bool IsActive { get; set; } = true;
    public virtual int DisplayOrder { get; set; }
    
    // Navigation properties
    public virtual ICollection<SubSection> SubSections { get; set; } = new List<SubSection>();
    public virtual ICollection<Property> Properties { get; set; } = new List<Property>();
}
