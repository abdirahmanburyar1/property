namespace PropertyRegistration.Core.Entities;

public class Owner : BaseEntity
{
    public virtual string Name { get; set; } = string.Empty;
    public virtual string? Phone { get; set; }
    public virtual string? Email { get; set; }
    public virtual string? Address { get; set; }
    public virtual string? IdNumber { get; set; } // National ID or Tax ID
    public virtual bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual ICollection<Property> Properties { get; set; } = new List<Property>();
}
