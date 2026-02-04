using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class CityMap : BaseEntityMap<City>
{
    public CityMap()
    {
        Table("Cities");

        Map(x => x.Name).Not.Nullable().Length(100);
        Map(x => x.Code).Length(20);
        Map(x => x.Description).CustomType("StringClob");
        Map(x => x.IsActive).Not.Nullable();
        
        // Map RegionId property explicitly so it can be queried
        Map(x => x.RegionId).Not.Nullable().Column("RegionId");

        References(x => x.Region)
            .Column("RegionId")
            .Not.Nullable()
            .Cascade.None()
            .Not.Insert()
            .Not.Update();
    }
}
