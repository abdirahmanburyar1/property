using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class PaymentStatusMap : BaseEntityMap<PaymentStatus>
{
    public PaymentStatusMap()
    {
        Table("PaymentStatuses");

        Map(x => x.Name).Not.Nullable().Length(50).Unique();
        Map(x => x.Description);
        Map(x => x.ColorCode).Length(7);
        Map(x => x.IsActive).Not.Nullable();
        Map(x => x.DisplayOrder).Not.Nullable();

        HasMany(x => x.Payments)
            .KeyColumn("StatusId")
            .Cascade.None()
            .Inverse();
    }
}
