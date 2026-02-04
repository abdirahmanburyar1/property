using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class RolePermissionMap : BaseEntityMap<RolePermission>
{
    public RolePermissionMap()
    {
        Table("RolePermissions");

        Map(x => x.GrantedAt).Not.Nullable();
        
        // Map RoleId property explicitly so it can be queried
        Map(x => x.RoleId).Not.Nullable().Column("RoleId");
        
        // Map PermissionId property explicitly so it can be queried
        Map(x => x.PermissionId).Not.Nullable().Column("PermissionId");

        References(x => x.Role)
            .Column("RoleId")
            .Not.Nullable()
            .Cascade.None()
            .Not.Insert()
            .Not.Update();

        References(x => x.Permission)
            .Column("PermissionId")
            .Not.Nullable()
            .Cascade.None()
            .Not.Insert()
            .Not.Update();

        References(x => x.GrantedByUser)
            .Column("GrantedBy")
            .Cascade.None();

        // Unique constraint on RoleId + PermissionId combination
        // Note: FluentNHibernate will create unique index based on References
    }
}
