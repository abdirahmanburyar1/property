namespace PropertyRegistration.Core.Entities;

public class PaymentDetail : BaseEntity
{
    // Foreign keys
    public virtual Guid PropertyId { get; set; }
    public virtual Guid? PaymentId { get; set; } // Link to main Payment record if exists
    public virtual Guid CollectedBy { get; set; } // User who collected this payment
    public virtual Guid PaymentMethodId { get; set; }

    // Payment information
    public virtual decimal Amount { get; set; }
    public virtual string Currency { get; set; } = "USD";
    public virtual DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public virtual string TransactionReference { get; set; } = string.Empty;
    public virtual string? ReceiptNumber { get; set; }
    
    // Additional details
    public virtual string? Notes { get; set; }
    public virtual int InstallmentNumber { get; set; } = 1; // Track which installment this is (1st, 2nd, 3rd payment)
    
    // Navigation properties
    public virtual Property Property { get; set; } = null!;
    public virtual Payment? Payment { get; set; } // Optional link to main payment
    public virtual User CollectedByUser { get; set; } = null!;
    public virtual PaymentMethod PaymentMethod { get; set; } = null!;
}
