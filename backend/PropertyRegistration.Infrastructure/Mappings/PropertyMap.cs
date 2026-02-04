using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class PropertyMap : BaseEntityMap<Property>
{
    public PropertyMap()
    {
        Table("Properties");

        // Location
        Map(x => x.Latitude).Not.Nullable().Precision(10).Scale(8);
        Map(x => x.Longitude).Not.Nullable().Precision(11).Scale(8);

        // Address
        Map(x => x.StreetAddress).Not.Nullable().Length(255);
        Map(x => x.City).Not.Nullable().Length(100);
        Map(x => x.State).Length(100);

        // Owner information
        Map(x => x.OwnerName).Not.Nullable().Length(255);
        Map(x => x.OwnerPhone).Length(20);
        Map(x => x.OwnerEmail).Length(255);

        // Property details (height, width and areaSize stored separately)
        Map(x => x.Height).Precision(12).Scale(2);
        Map(x => x.Width).Precision(12).Scale(2);
        Map(x => x.AreaSize).Not.Nullable().Precision(12).Scale(2);
        Map(x => x.AreaUnit).Not.Nullable().Length(20);
        Map(x => x.EstimatedValue).Precision(18).Scale(2);
        Map(x => x.Currency).Not.Nullable().Length(3);
        Map(x => x.Description).CustomType("StringClob");
        Map(x => x.Metadata).CustomType<CustomTypes.JsonbType>();
        
        // Payment tracking
        Map(x => x.PaidAmount).Not.Nullable().Precision(18).Scale(2).Default("0");
        Map(x => x.PaymentStatus).Not.Nullable().Length(50).Default("'Pending'");

        Map(x => x.ApprovedAt);

        // Additional property information
        Map(x => x.PlateNumber).Length(50); // Unique constraint is handled by database index (partial unique index)
        Map(x => x.SectionId).Column("SectionId");
        Map(x => x.SubSectionId).Column("SubSectionId");
        Map(x => x.KontontriyeId).Column("KontontriyeId");
        Map(x => x.ImageUrl).Length(500); // URL of the primary property image

        // Explicit mappings for foreign key properties (so they can be queried directly)
        Map(x => x.CreatedBy).Not.Nullable().Column("CreatedBy");
        Map(x => x.CollectorId).Column("CollectorId");
        Map(x => x.PropertyTypeId).Not.Nullable().Column("PropertyTypeId");
        Map(x => x.StatusId).Not.Nullable().Column("StatusId");
        Map(x => x.ApprovedBy).Column("ApprovedBy");
        Map(x => x.OwnerId).Column("OwnerId");
        Map(x => x.ResponsiblePersonId).Column("ResponsiblePersonId");
        Map(x => x.RegionId).Column("RegionId");
        Map(x => x.CityId).Column("CityId");

        // Relationships (read-only to avoid conflicts with explicit FK mappings)
        References(x => x.CreatedByUser)
            .Column("CreatedBy")
            .Not.Nullable()
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.Collector)
            .Column("CollectorId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.PropertyType)
            .Column("PropertyTypeId")
            .Not.Nullable()
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.Status)
            .Column("StatusId")
            .Not.Nullable()
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.ApprovedByUser)
            .Column("ApprovedBy")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.Owner)
            .Column("OwnerId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.ResponsiblePerson)
            .Column("ResponsiblePersonId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.Region)
            .Column("RegionId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.CityNavigation)
            .Column("CityId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.Section)
            .Column("SectionId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.SubSection)
            .Column("SubSectionId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.Kontontriye)
            .Column("KontontriyeId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        HasMany(x => x.Documents)
            .KeyColumn("PropertyId")
            .Cascade.AllDeleteOrphan()
            .Inverse();

        HasMany(x => x.Payments)
            .KeyColumn("PropertyId")
            .Cascade.None()
            .Inverse();

        HasMany(x => x.PaymentDetails)
            .KeyColumn("PropertyId")
            .Cascade.None()
            .Inverse();
    }
}
