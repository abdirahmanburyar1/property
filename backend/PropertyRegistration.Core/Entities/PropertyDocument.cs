using PropertyRegistration.Core.Enums;

namespace PropertyRegistration.Core.Entities;

public class PropertyDocument : BaseEntity
{
    public virtual Guid PropertyId { get; set; }
    public virtual Guid UploadedBy { get; set; }

    public virtual string FileName { get; set; } = string.Empty;
    public virtual string OriginalFileName { get; set; } = string.Empty;
    public virtual string FilePath { get; set; } = string.Empty;
    public virtual string FileType { get; set; } = string.Empty;
    public virtual long FileSize { get; set; }
    public virtual string MimeType { get; set; } = string.Empty;
    public virtual DocumentType DocumentType { get; set; }
    public virtual bool IsPrimary { get; set; } = false;

    public virtual DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual Property Property { get; set; } = null!;
    public virtual User UploadedByUser { get; set; } = null!;
}
