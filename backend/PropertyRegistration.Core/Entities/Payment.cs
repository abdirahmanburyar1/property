using System.Text.Json;

namespace PropertyRegistration.Core.Entities;

public class Payment : BaseEntity
{
    public virtual Guid PropertyId { get; set; }
    public virtual Guid CreatedBy { get; set; }
    public virtual Guid? CollectorId { get; set; } // User who collects the fee
    public virtual Guid PaymentMethodId { get; set; }
    public virtual Guid StatusId { get; set; }

    public virtual decimal Amount { get; set; }
    public virtual string Currency { get; set; } = "USD";
    public virtual string TransactionReference { get; set; } = string.Empty;
    public virtual string? ExternalReference { get; set; }
    public virtual string? Notes { get; set; }
    public virtual JsonDocument? PaymentMetadata { get; set; }

    // Discount fields
    public virtual decimal DiscountAmount { get; set; } = 0;
    public virtual string? DiscountReason { get; set; }

    // Exemption fields
    public virtual bool IsExempt { get; set; } = false;
    public virtual string? ExemptionReason { get; set; }

    public virtual DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public virtual DateTime? CompletedAt { get; set; }

    // Navigation properties
    public virtual Property Property { get; set; } = null!;
    public virtual User CreatedByUser { get; set; } = null!;
    public virtual User? Collector { get; set; } // Collector assigned to collect this payment
    public virtual PaymentMethod PaymentMethod { get; set; } = null!;
    public virtual PaymentStatus Status { get; set; } = null!;
    public virtual ICollection<PaymentTransaction> Transactions { get; set; } = new List<PaymentTransaction>();
    public virtual Receipt? Receipt { get; set; }
}
