using System.Text.Json;

namespace PropertyRegistration.Core.Entities;

public class PaymentTransaction : BaseEntity
{
    public virtual Guid PaymentId { get; set; }

    public virtual string TransactionType { get; set; } = string.Empty; // Payment, Refund, Adjustment
    public virtual decimal Amount { get; set; }
    public virtual string Currency { get; set; } = "USD";
    public virtual string? Reference { get; set; }
    public virtual string? Description { get; set; }
    public virtual JsonDocument? TransactionData { get; set; }

    public virtual DateTime TransactionDate { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual Payment Payment { get; set; } = null!;
}
