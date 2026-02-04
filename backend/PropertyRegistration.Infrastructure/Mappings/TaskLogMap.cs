using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Mappings.CustomTypes;

namespace PropertyRegistration.Infrastructure.Mappings;

public class TaskLogMap : BaseEntityMap<TaskLog>
{
    public TaskLogMap()
    {
        Table("TaskLogs");

        Map(x => x.LogLevel).Not.Nullable().Length(20);
        Map(x => x.Message).Not.Nullable().CustomType("StringClob");
        Map(x => x.LogData).CustomType<JsonbType>();

        References(x => x.Task)
            .Column("TaskId")
            .Not.Nullable()
            .Cascade.None();
    }
}
