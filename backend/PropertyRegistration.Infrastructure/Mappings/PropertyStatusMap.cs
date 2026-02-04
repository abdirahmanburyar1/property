using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class PropertyStatusMap : BaseEntityMap<PropertyStatus>
{
    public PropertyStatusMap()
    {
        Table("PropertyStatuses");

        Map(x => x.Name).Not.Nullable().Length(50).Unique();
        Map(x => x.Description);
        Map(x => x.ColorCode).Length(7);
        Map(x => x.IsActive).Not.Nullable();
        Map(x => x.DisplayOrder).Not.Nullable();

        HasMany(x => x.Properties)
            .KeyColumn("StatusId")
            .Cascade.None()
            .Inverse();
    }
}
