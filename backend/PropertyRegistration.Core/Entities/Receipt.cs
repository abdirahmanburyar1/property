namespace PropertyRegistration.Core.Entities;

public class Receipt : BaseEntity
{
    public virtual Guid PaymentId { get; set; }

    public virtual string ReceiptNumber { get; set; } = string.Empty;
    public virtual string ReceiptContent { get; set; } = string.Empty;
    public virtual string? FilePath { get; set; }
    public virtual bool IsPrinted { get; set; } = false;
    public virtual DateTime? PrintedAt { get; set; }

    // Navigation properties
    public virtual Payment Payment { get; set; } = null!;
}
