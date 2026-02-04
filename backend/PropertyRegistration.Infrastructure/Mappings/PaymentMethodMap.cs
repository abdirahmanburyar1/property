using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class PaymentMethodMap : BaseEntityMap<PaymentMethod>
{
    public PaymentMethodMap()
    {
        Table("PaymentMethods");

        Map(x => x.Name).Not.Nullable().Length(100).Unique();
        Map(x => x.Code).Not.Nullable().Length(20).Unique();
        Map(x => x.Description);
        Map(x => x.IsActive).Not.Nullable();
        Map(x => x.DisplayOrder).Not.Nullable();

        HasMany(x => x.Payments)
            .KeyColumn("PaymentMethodId")
            .Cascade.None()
            .Inverse();
    }
}
