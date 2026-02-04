using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class PropertyTypeMap : BaseEntityMap<PropertyType>
{
    public PropertyTypeMap()
    {
        Table("PropertyTypes");

        Map(x => x.Name).Not.Nullable().Length(100).Unique();
        Map(x => x.Price).Not.Nullable().Precision(18).Scale(3);
        Map(x => x.Unit).Not.Nullable().Length(10);

        HasMany(x => x.Properties)
            .KeyColumn("PropertyTypeId")
            .Cascade.None()
            .Inverse();
    }
}
