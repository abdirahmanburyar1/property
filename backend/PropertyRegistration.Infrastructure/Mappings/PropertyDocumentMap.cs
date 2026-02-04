using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Core.Enums;

namespace PropertyRegistration.Infrastructure.Mappings;

public class PropertyDocumentMap : BaseEntityMap<PropertyDocument>
{
    public PropertyDocumentMap()
    {
        Table("PropertyDocuments");

        Map(x => x.FileName).Not.Nullable().Length(255);
        Map(x => x.OriginalFileName).Not.Nullable().Length(255);
        Map(x => x.FilePath).Not.Nullable().Length(500);
        Map(x => x.FileType).Not.Nullable().Length(50);
        Map(x => x.FileSize).Not.Nullable();
        Map(x => x.MimeType).Not.Nullable().Length(100);
        Map(x => x.DocumentType).Not.Nullable().CustomType<DocumentType>();
        Map(x => x.IsPrimary).Not.Nullable();
        Map(x => x.UploadedAt).Not.Nullable();

        // Explicit mapping for PropertyId (so it can be queried directly)
        Map(x => x.PropertyId).Not.Nullable().Column("PropertyId");
        Map(x => x.UploadedBy).Not.Nullable().Column("UploadedBy");

        References(x => x.Property)
            .Column("PropertyId")
            .Not.Nullable()
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.UploadedByUser)
            .Column("UploadedBy")
            .Not.Nullable()
            .Not.Insert()
            .Not.Update()
            .Cascade.None();
    }
}
