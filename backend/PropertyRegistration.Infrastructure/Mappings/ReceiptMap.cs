using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class ReceiptMap : BaseEntityMap<Receipt>
{
    public ReceiptMap()
    {
        Table("Receipts");

        Map(x => x.ReceiptNumber).Not.Nullable().Length(50).Unique();
        Map(x => x.ReceiptContent).Not.Nullable().CustomType("StringClob");
        Map(x => x.FilePath).Length(500);
        Map(x => x.IsPrinted).Not.Nullable();
        Map(x => x.PrintedAt);

        References(x => x.Payment)
            .Column("PaymentId")
            .Not.Nullable()
            .Unique()
            .Cascade.None();
    }
}
