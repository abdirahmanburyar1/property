using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public abstract class BaseEntityMap<T> : ClassMap<T> where T : BaseEntity
{
    protected BaseEntityMap()
    {
        Id(x => x.Id)
            .GeneratedBy.GuidComb()
            .Column("Id")
            .CustomSqlType("uuid")
            .Not.Nullable();
        Map(x => x.CreatedAt).Not.Nullable();
        Map(x => x.UpdatedAt).Not.Nullable();
    }
}
