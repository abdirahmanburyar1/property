using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class PaymentDetailMap : BaseEntityMap<PaymentDetail>
{
    public PaymentDetailMap()
    {
        Table("PaymentDetails");

        // Payment information
        Map(x => x.Amount).Not.Nullable().Precision(18).Scale(2);
        Map(x => x.Currency).Not.Nullable().Length(3).Default("'USD'");
        Map(x => x.PaymentDate).Not.Nullable();
        Map(x => x.TransactionReference).Not.Nullable().Length(100);
        Map(x => x.ReceiptNumber).Length(50);
        Map(x => x.Notes).CustomType("StringClob");
        Map(x => x.InstallmentNumber).Not.Nullable().Default("1");

        // Foreign key columns
        Map(x => x.PropertyId).Not.Nullable().Column("PropertyId");
        Map(x => x.PaymentId).Column("PaymentId");
        Map(x => x.CollectedBy).Not.Nullable().Column("CollectedBy");
        Map(x => x.PaymentMethodId).Not.Nullable().Column("PaymentMethodId");

        // Relationships
        References(x => x.Property)
            .Column("PropertyId")
            .Not.Nullable()
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.Payment)
            .Column("PaymentId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.CollectedByUser)
            .Column("CollectedBy")
            .Not.Nullable()
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.PaymentMethod)
            .Column("PaymentMethodId")
            .Not.Nullable()
            .Not.Insert()
            .Not.Update()
            .Cascade.None();
    }
}
