using System.Text.Json;

namespace PropertyRegistration.Core.Entities;

public class BackgroundTask : BaseEntity
{
    public virtual string TaskType { get; set; } = string.Empty;
    public virtual string TaskName { get; set; } = string.Empty;
    public virtual string Status { get; set; } = "Pending"; // Pending, Processing, Completed, Failed, Cancelled
    public virtual JsonDocument? TaskData { get; set; }
    public virtual JsonDocument? ResultData { get; set; }
    public virtual string? ErrorMessage { get; set; }
    public virtual int RetryCount { get; set; } = 0;

    public virtual DateTime? StartedAt { get; set; }
    public virtual DateTime? CompletedAt { get; set; }
    public virtual DateTime? FailedAt { get; set; }

    // Navigation properties
    public virtual ICollection<TaskLog> Logs { get; set; } = new List<TaskLog>();
}
