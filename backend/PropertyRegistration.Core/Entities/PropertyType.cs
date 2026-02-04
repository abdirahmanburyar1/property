namespace PropertyRegistration.Core.Entities;

public class PropertyType : BaseEntity
{
    public virtual string Name { get; set; } = string.Empty;
    public virtual decimal Price { get; set; } // Price in USD
    public virtual string Unit { get; set; } = "m"; // Land measurement unit (m, hectare, acre, sqft, etc.)

    // Navigation properties
    public virtual ICollection<Property> Properties { get; set; } = new List<Property>();
}
