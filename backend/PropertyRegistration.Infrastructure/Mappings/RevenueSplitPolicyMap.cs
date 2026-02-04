using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class RevenueSplitPolicyMap : BaseEntityMap<RevenueSplitPolicy>
{
    public RevenueSplitPolicyMap()
    {
        Table("RevenueSplitPolicies");

        Map(x => x.CompanySharePercent).Not.Nullable().Precision(5).Scale(2);
        Map(x => x.MunicipalitySharePercent).Not.Nullable().Precision(5).Scale(2);
        Map(x => x.IsActive).Not.Nullable().Default("true");
        Map(x => x.Description).Length(500);
    }
}
