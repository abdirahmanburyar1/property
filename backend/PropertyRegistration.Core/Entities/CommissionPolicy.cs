namespace PropertyRegistration.Core.Entities;

/// <summary>
/// Defines the collector commission rate (e.g. 2% of collected amount).
/// Only one policy should be active at a time; managed by admin or users with commission permission.
/// </summary>
public class CommissionPolicy : BaseEntity
{
    /// <summary>Commission rate as a percentage (e.g. 2 for 2%).</summary>
    public virtual decimal RatePercent { get; set; }

    /// <summary>When false, this policy is not used for new calculations.</summary>
    public virtual bool IsActive { get; set; } = true;

    public virtual string? Description { get; set; }
}
