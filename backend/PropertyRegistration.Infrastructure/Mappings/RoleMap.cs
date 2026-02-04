using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class RoleMap : BaseEntityMap<Role>
{
    public RoleMap()
    {
        Table("Roles");

        Map(x => x.Name).Not.Nullable().Length(100).Unique();
        Map(x => x.Code).Not.Nullable().Length(50).Unique();
        Map(x => x.Description);
        Map(x => x.IsActive).Not.Nullable();
        Map(x => x.IsSystemRole).Not.Nullable();

        HasMany(x => x.UserRoles)
            .KeyColumn("RoleId")
            .Cascade.None()
            .Inverse();

        HasMany(x => x.RolePermissions)
            .KeyColumn("RoleId")
            .Cascade.AllDeleteOrphan()
            .Inverse();
    }
}
