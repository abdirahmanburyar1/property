using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Seeders;

public static class RolePermissionSeeder
{
    public static void SeedRolesAndPermissions(ISession session)
    {
        if (session.Query<Role>().Any())
        {
            return; // Data already seeded
        }

        // Create Permissions
        var permissions = new List<Permission>
        {
            // Property Permissions
            new Permission { Name = "Properties.Create", Code = "PROPERTIES_CREATE", Category = "Properties", Description = "Create new properties" },
            new Permission { Name = "Properties.Read", Code = "PROPERTIES_READ", Category = "Properties", Description = "View properties" },
            new Permission { Name = "Properties.Update", Code = "PROPERTIES_UPDATE", Category = "Properties", Description = "Update properties" },
            new Permission { Name = "Properties.Delete", Code = "PROPERTIES_DELETE", Category = "Properties", Description = "Delete properties" },
            new Permission { Name = "Properties.Approve", Code = "PROPERTIES_APPROVE", Category = "Properties", Description = "Approve property registrations" },
            
            // Payment Permissions
            new Permission { Name = "Payments.Create", Code = "PAYMENTS_CREATE", Category = "Payments", Description = "Create payments" },
            new Permission { Name = "Payments.Read", Code = "PAYMENTS_READ", Category = "Payments", Description = "View payments" },
            new Permission { Name = "Payments.Update", Code = "PAYMENTS_UPDATE", Category = "Payments", Description = "Update payments" },
            new Permission { Name = "Payments.Delete", Code = "PAYMENTS_DELETE", Category = "Payments", Description = "Delete payments" },
            new Permission { Name = "Payments.PrintReceipt", Code = "PAYMENTS_PRINT_RECEIPT", Category = "Payments", Description = "Print payment receipts" },
            
            // User Permissions
            new Permission { Name = "Users.Create", Code = "USERS_CREATE", Category = "Users", Description = "Create users" },
            new Permission { Name = "Users.Read", Code = "USERS_READ", Category = "Users", Description = "View users" },
            new Permission { Name = "Users.Update", Code = "USERS_UPDATE", Category = "Users", Description = "Update users" },
            new Permission { Name = "Users.Delete", Code = "USERS_DELETE", Category = "Users", Description = "Delete users" },
            
            // Role & Permission Management
            new Permission { Name = "Roles.Manage", Code = "ROLES_MANAGE", Category = "Roles", Description = "Manage roles and permissions" },
            new Permission { Name = "Roles.Assign", Code = "ROLES_ASSIGN", Category = "Roles", Description = "Assign roles to users" },
            
            // Reports
            new Permission { Name = "Reports.View", Code = "REPORTS_VIEW", Category = "Reports", Description = "View reports" },
            new Permission { Name = "Reports.Export", Code = "REPORTS_EXPORT", Category = "Reports", Description = "Export reports" },
            
            // Audit
            new Permission { Name = "Audit.View", Code = "AUDIT_VIEW", Category = "Audit", Description = "View audit logs" },

            // Commission (collector commission rate)
            new Permission { Name = "Commission.Manage", Code = "COMMISSION_MANAGE", Category = "Settings", Description = "Manage collector commission rate" }
        };

        foreach (var permission in permissions)
        {
            session.Save(permission);
        }
        session.Flush();

        // Create Roles
        var adminRole = new Role
        {
            Name = "Administrator",
            Code = "ADMIN",
            Description = "Full system access",
            IsSystemRole = true,
            IsActive = true
        };

        var userRole = new Role
        {
            Name = "User",
            Code = "USER",
            Description = "Standard user with basic permissions",
            IsSystemRole = true,
            IsActive = true
        };

        var collectorRole = new Role
        {
            Name = "Collector",
            Code = "COLLECTOR",
            Description = "Payment collector with property collection permissions",
            IsSystemRole = true,
            IsActive = true
        };

        session.Save(adminRole);
        session.Save(userRole);
        session.Save(collectorRole);
        session.Flush();
        session.Clear(); // Clear session to ensure fresh entities

        // Reload roles and permissions to ensure they're managed entities
        var adminRoleReloaded = session.Get<Role>(adminRole.Id);
        var userRoleReloaded = session.Get<Role>(userRole.Id);
        var collectorRoleReloaded = session.Get<Role>(collectorRole.Id);
        var permissionsReloaded = session.Query<Permission>().ToList();

        // Assign all permissions to Admin role
        foreach (var permission in permissionsReloaded)
        {
            var rolePermission = new RolePermission
            {
                Role = adminRoleReloaded,
                Permission = permission
            };
            session.Save(rolePermission);
        }

        // Assign basic permissions to User role
        var userPermissions = permissionsReloaded.Where(p => 
            p.Code == "PROPERTIES_CREATE" ||
            p.Code == "PROPERTIES_READ" ||
            p.Code == "PROPERTIES_UPDATE" ||
            p.Code == "PAYMENTS_READ"
        ).ToList();

        foreach (var permission in userPermissions)
        {
            var rolePermission = new RolePermission
            {
                Role = userRoleReloaded,
                Permission = permission
            };
            session.Save(rolePermission);
        }

        // Assign collector permissions
        var collectorPermissions = permissionsReloaded.Where(p =>
            p.Code == "PROPERTIES_READ" ||
            p.Code == "PAYMENTS_CREATE" ||
            p.Code == "PAYMENTS_READ" ||
            p.Code == "PAYMENTS_UPDATE" ||
            p.Code == "PAYMENTS_PRINT_RECEIPT"
        ).ToList();

        foreach (var permission in collectorPermissions)
        {
            var rolePermission = new RolePermission
            {
                Role = collectorRoleReloaded,
                Permission = permission
            };
            session.Save(rolePermission);
        }

        session.Flush();
    }
}
