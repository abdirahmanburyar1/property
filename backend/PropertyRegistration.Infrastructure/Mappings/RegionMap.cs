using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class RegionMap : BaseEntityMap<Region>
{
    public RegionMap()
    {
        Table("Regions");

        Map(x => x.Name).Not.Nullable().Length(100);
        Map(x => x.Code).Length(20);
        Map(x => x.Description).CustomType("StringClob");
        Map(x => x.IsActive).Not.Nullable();

        HasMany(x => x.Cities)
            .KeyColumn("RegionId")
            .Cascade.AllDeleteOrphan()
            .Inverse();
    }
}
