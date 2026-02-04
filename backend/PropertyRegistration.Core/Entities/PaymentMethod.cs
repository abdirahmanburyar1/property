namespace PropertyRegistration.Core.Entities;

public class PaymentMethod : BaseEntity
{
    public virtual string Name { get; set; } = string.Empty;
    public virtual string Code { get; set; } = string.Empty;
    public virtual string? Description { get; set; }
    public virtual bool IsActive { get; set; } = true;
    public virtual int DisplayOrder { get; set; } = 0;

    // Navigation properties
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
