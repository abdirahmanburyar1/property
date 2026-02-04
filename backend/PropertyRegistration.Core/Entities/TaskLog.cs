using System.Text.Json;

namespace PropertyRegistration.Core.Entities;

public class TaskLog : BaseEntity
{
    public virtual Guid TaskId { get; set; }

    public virtual string LogLevel { get; set; } = "Info"; // Info, Warning, Error
    public virtual string Message { get; set; } = string.Empty;
    public virtual JsonDocument? LogData { get; set; }

    // Navigation properties
    public virtual BackgroundTask Task { get; set; } = null!;
}
