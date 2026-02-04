namespace PropertyRegistration.Core.Entities;

/// <summary>
/// Defines how daily collected revenue (after collector commission) is split
/// between the company (system owner) and Dowlada Hoose (municipality).
/// Used for daily settlement (xisaab xir).
/// </summary>
public class RevenueSplitPolicy : BaseEntity
{
    /// <summary>Company share as percentage (e.g. 40 for 40%).</summary>
    public virtual decimal CompanySharePercent { get; set; }

    /// <summary>Municipality (Dowlada Hoose) share as percentage (e.g. 60 for 60%). Should equal 100 - CompanySharePercent.</summary>
    public virtual decimal MunicipalitySharePercent { get; set; }

    public virtual bool IsActive { get; set; } = true;

    public virtual string? Description { get; set; }
}
