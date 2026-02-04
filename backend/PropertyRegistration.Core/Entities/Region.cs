namespace PropertyRegistration.Core.Entities;

public class Region : BaseEntity
{
    public virtual string Name { get; set; } = string.Empty;
    public virtual string? Code { get; set; }
    public virtual string? Description { get; set; }
    public virtual bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual ICollection<City> Cities { get; set; } = new List<City>();
}
