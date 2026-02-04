using FluentNHibernate.Mapping;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Mappings;

public class UserMap : BaseEntityMap<User>
{
    public UserMap()
    {
        Table("Users");

        Map(x => x.Email).Not.Nullable().Length(255).Unique();
        Map(x => x.Username).Not.Nullable().Length(100).Unique();
        Map(x => x.PasswordHash).Not.Nullable().Length(255);
        Map(x => x.FirstName).Not.Nullable().Length(100);
        Map(x => x.LastName).Not.Nullable().Length(100);
        Map(x => x.PhoneNumber).Length(20);
        Map(x => x.CurrentPropertyCount).Not.Nullable();
        Map(x => x.IsActive).Not.Nullable();
        Map(x => x.LastLoginAt);
        
        // Explicit mappings for foreign key properties (so they can be queried directly)
        Map(x => x.RegionId).Column("RegionId");
        Map(x => x.CityId).Column("CityId");

        HasMany(x => x.UserRoles)
            .KeyColumn("UserId")
            .Cascade.AllDeleteOrphan()
            .Inverse();

        HasMany(x => x.CreatedProperties)
            .KeyColumn("CreatedBy")
            .Cascade.None()
            .Inverse();

        HasMany(x => x.CollectedProperties)
            .KeyColumn("CollectorId")
            .Cascade.None()
            .Inverse();

        HasMany(x => x.Payments)
            .KeyColumn("CreatedBy")
            .Cascade.None()
            .Inverse();

        HasMany(x => x.UploadedDocuments)
            .KeyColumn("UploadedBy")
            .Cascade.None()
            .Inverse();

        HasMany(x => x.AuditLogs)
            .KeyColumn("UserId")
            .Cascade.None()
            .Inverse();

        HasMany(x => x.AssignedRoles)
            .KeyColumn("AssignedBy")
            .Cascade.None()
            .Inverse();

        HasMany(x => x.GrantedPermissions)
            .KeyColumn("GrantedBy")
            .Cascade.None()
            .Inverse();

        // Relationships (read-only to avoid conflicts with explicit FK mappings)
        References(x => x.Region)
            .Column("RegionId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();

        References(x => x.City)
            .Column("CityId")
            .Not.Insert()
            .Not.Update()
            .Cascade.None();
    }
}
