using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class OwnerMap : BaseEntityMap<Owner>
{
    public OwnerMap()
    {
        Table("Owners");

        Map(x => x.Name).Not.Nullable().Length(255);
        Map(x => x.Phone).Length(20);
        Map(x => x.Email).Length(255);
        Map(x => x.Address).CustomType("StringClob");
        Map(x => x.IdNumber).Length(50);
        Map(x => x.IsActive).Not.Nullable().Default("true");

        HasMany(x => x.Properties)
            .KeyColumn("OwnerId")
            .Cascade.None()
            .Inverse();
    }
}
