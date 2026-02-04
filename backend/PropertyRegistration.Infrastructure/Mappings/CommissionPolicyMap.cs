using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class CommissionPolicyMap : BaseEntityMap<CommissionPolicy>
{
    public CommissionPolicyMap()
    {
        Table("CommissionPolicies");

        Map(x => x.RatePercent).Not.Nullable().Precision(5).Scale(2);
        Map(x => x.IsActive).Not.Nullable().Default("true");
        Map(x => x.Description).Length(500);
    }
}
