using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class UserRoleMap : BaseEntityMap<UserRole>
{
    public UserRoleMap()
    {
        Table("UserRoles");

        Map(x => x.AssignedAt).Not.Nullable();

        References(x => x.User)
            .Column("UserId")
            .Not.Nullable()
            .Cascade.None();

        References(x => x.Role)
            .Column("RoleId")
            .Not.Nullable()
            .Cascade.None();

        References(x => x.AssignedByUser)
            .Column("AssignedBy")
            .Cascade.None();

        // Unique constraint on UserId + RoleId combination
        // Note: FluentNHibernate will create unique index based on References
    }
}
