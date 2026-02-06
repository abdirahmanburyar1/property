using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Mappings.CustomTypes;

namespace PropertyRegistration.Infrastructure.Mappings;

public class PaymentMap : BaseEntityMap<Payment>
{
    public PaymentMap()
    {
        Table("Payments");

        Map(x => x.Amount).Not.Nullable().Precision(18).Scale(2);
        Map(x => x.Currency).Not.Nullable().Length(3);
        Map(x => x.TransactionReference).Not.Nullable().Length(100).Unique();
        Map(x => x.ExternalReference).Length(255);
        Map(x => x.Notes).CustomType("StringClob");
        Map(x => x.PaymentMetadata).CustomType<JsonbType>();
        Map(x => x.PaymentDate).Not.Nullable();
        Map(x => x.CompletedAt);
        Map(x => x.AppointmentDate);
        Map(x => x.AppointmentNotes).Length(1000);

        // Discount fields
        Map(x => x.DiscountAmount).Not.Nullable().Precision(18).Scale(2);
        Map(x => x.DiscountReason).Length(500);

        // Exemption fields
        Map(x => x.IsExempt).Not.Nullable();
        Map(x => x.ExemptionReason).Length(500);

        // Explicit mapping for foreign key IDs (for direct property access)
        Map(x => x.PropertyId).Column("PropertyId").Not.Nullable().Access.Property();
        Map(x => x.CreatedBy).Column("CreatedBy").Not.Nullable().Access.Property();
        Map(x => x.PaymentMethodId).Column("PaymentMethodId").Not.Nullable().Access.Property();
        Map(x => x.StatusId).Column("StatusId").Not.Nullable().Access.Property();
        Map(x => x.CollectorId).Column("CollectorId").Access.Property();

        // Navigation properties (for relationships only, not for insert/update)
        References(x => x.Property)
            .Column("PropertyId")
            .Not.Nullable()
            .Cascade.None()
            .Not.Insert().Not.Update(); // Use PropertyId property for insert/update

        References(x => x.CreatedByUser)
            .Column("CreatedBy")
            .Not.Nullable()
            .Cascade.None()
            .Not.Insert().Not.Update(); // Use CreatedBy property for insert/update

        References(x => x.Collector)
            .Column("CollectorId")
            .Not.Insert().Not.Update()
            .Cascade.None(); // Use CollectorId property for insert/update

        References(x => x.PaymentMethod)
            .Column("PaymentMethodId")
            .Not.Nullable()
            .Cascade.None()
            .Not.Insert().Not.Update(); // Use PaymentMethodId property for insert/update

        References(x => x.Status)
            .Column("StatusId")
            .Not.Nullable()
            .Cascade.None()
            .Not.Insert().Not.Update(); // Use StatusId property for insert/update

        HasMany(x => x.Transactions)
            .KeyColumn("PaymentId")
            .Cascade.AllDeleteOrphan()
            .Inverse();

#pragma warning disable CS8602 // Nullable reference type warning - Receipt.Payment is initialized with null! in entity
        HasOne(x => x.Receipt)
            .PropertyRef(r => r.Payment)
            .Cascade.All();
#pragma warning restore CS8602
    }
}
