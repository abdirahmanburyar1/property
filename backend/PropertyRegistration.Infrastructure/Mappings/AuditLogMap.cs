using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Mappings.CustomTypes;

namespace PropertyRegistration.Infrastructure.Mappings;

public class AuditLogMap : BaseEntityMap<AuditLog>
{
    public AuditLogMap()
    {
        Table("AuditLogs");

        Map(x => x.Action).Not.Nullable().Length(100);
        Map(x => x.EntityType).Not.Nullable().Length(100);
        Map(x => x.EntityId).CustomSqlType("uuid").CustomType("Guid");
        Map(x => x.OldValues).CustomType<JsonbType>();
        Map(x => x.NewValues).CustomType<JsonbType>();
        Map(x => x.IpAddress).Length(45);
        Map(x => x.UserAgent).Length(500);

        References(x => x.User)
            .Column("UserId")
            .Cascade.None();
    }
}
