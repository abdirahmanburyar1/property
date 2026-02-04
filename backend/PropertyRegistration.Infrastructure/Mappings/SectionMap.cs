using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class SectionMap : BaseEntityMap<Section>
{
    public SectionMap()
    {
        Table("Sections");

        Map(x => x.Name).Not.Nullable().Length(100);
        Map(x => x.Description).CustomType("StringClob");
        Map(x => x.IsActive).Not.Nullable();
        Map(x => x.DisplayOrder).Not.Nullable();

        HasMany(x => x.SubSections)
            .KeyColumn("SectionId")
            .Cascade.AllDeleteOrphan()
            .Inverse();

        HasMany(x => x.Properties)
            .KeyColumn("SectionId")
            .Cascade.None()
            .Inverse();
    }
}
