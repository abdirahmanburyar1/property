using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Mappings.CustomTypes;

namespace PropertyRegistration.Infrastructure.Mappings;

public class PaymentTransactionMap : BaseEntityMap<PaymentTransaction>
{
    public PaymentTransactionMap()
    {
        Table("PaymentTransactions");

        Map(x => x.TransactionType).Not.Nullable().Length(50);
        Map(x => x.Amount).Not.Nullable().Precision(18).Scale(2);
        Map(x => x.Currency).Not.Nullable().Length(3);
        Map(x => x.Reference).Length(100);
        Map(x => x.Description).CustomType("StringClob");
        Map(x => x.TransactionData).CustomType<JsonbType>();
        Map(x => x.TransactionDate).Not.Nullable();

        References(x => x.Payment)
            .Column("PaymentId")
            .Not.Nullable()
            .Cascade.None();
    }
}
