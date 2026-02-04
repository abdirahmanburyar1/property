using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Mappings.CustomTypes;

namespace PropertyRegistration.Infrastructure.Mappings;

public class BackgroundTaskMap : BaseEntityMap<BackgroundTask>
{
    public BackgroundTaskMap()
    {
        Table("Tasks");

        Map(x => x.TaskType).Not.Nullable().Length(100);
        Map(x => x.TaskName).Not.Nullable().Length(255);
        Map(x => x.Status).Not.Nullable().Length(50);
        Map(x => x.TaskData).CustomType<JsonbType>();
        Map(x => x.ResultData).CustomType<JsonbType>();
        Map(x => x.ErrorMessage).CustomType("StringClob");
        Map(x => x.RetryCount).Not.Nullable();

        Map(x => x.StartedAt);
        Map(x => x.CompletedAt);
        Map(x => x.FailedAt);

        HasMany(x => x.Logs)
            .KeyColumn("TaskId")
            .Cascade.AllDeleteOrphan()
            .Inverse();
    }
}
