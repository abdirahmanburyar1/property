using System.Text.Json;

namespace PropertyRegistration.Core.Entities;

public class AuditLog : BaseEntity
{
    public virtual Guid? UserId { get; set; }

    public virtual string Action { get; set; } = string.Empty; // Create, Update, Delete, Login, etc.
    public virtual string EntityType { get; set; } = string.Empty; // Property, Payment, User, etc.
    public virtual Guid? EntityId { get; set; }
    public virtual JsonDocument? OldValues { get; set; }
    public virtual JsonDocument? NewValues { get; set; }
    public virtual string? IpAddress { get; set; }
    public virtual string? UserAgent { get; set; }

    // Navigation properties
    public virtual User? User { get; set; }
}
