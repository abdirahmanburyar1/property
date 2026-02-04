using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class SubSectionMap : BaseEntityMap<SubSection>
{
    public SubSectionMap()
    {
        Table("SubSections");

        Map(x => x.SectionId).Not.Nullable().Column("SectionId");
        Map(x => x.Name).Not.Nullable().Length(100);
        Map(x => x.Description).CustomType("StringClob");
        Map(x => x.IsActive).Not.Nullable();
        Map(x => x.DisplayOrder).Not.Nullable();

        References(x => x.Section)
            .Column("SectionId")
            .Not.Nullable()
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        HasMany(x => x.Properties)
            .KeyColumn("SubSectionId")
            .Cascade.None()
            .Inverse();
    }
}
