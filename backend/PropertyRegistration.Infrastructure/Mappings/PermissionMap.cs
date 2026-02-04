using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class PermissionMap : BaseEntityMap<Permission>
{
    public PermissionMap()
    {
        Table("Permissions");

        Map(x => x.Name).Not.Nullable().Length(255);
        Map(x => x.Code).Not.Nullable().Length(100).Unique();
        Map(x => x.Description);
        Map(x => x.Category).Not.Nullable().Length(100);
        Map(x => x.IsActive).Not.Nullable();

        HasMany(x => x.RolePermissions)
            .KeyColumn("PermissionId")
            .Cascade.AllDeleteOrphan()
            .Inverse();
    }
}
