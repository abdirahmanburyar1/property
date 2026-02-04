using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;

namespace PropertyRegistration.Infrastructure.Seeders;

public static class UserSeeder
{
    public static void SeedDefaultAdmin(ISession session)
    {
        // Check if admin user already exists
        if (session.Query<User>().Any(u => u.Username == "admin" || u.Email == "admin@property.local"))
        {
            return; // Admin user already exists
        }

        // Get Admin role
        var adminRole = session.Query<Role>().FirstOrDefault(r => r.Code == "ADMIN");
        if (adminRole == null)
        {
            throw new InvalidOperationException("Admin role not found. Please seed roles first.");
        }

        // Create default admin user
        // Password: Admin@123
        var adminUser = new User
        {
            Email = "admin@property.local",
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            FirstName = "System",
            LastName = "Administrator",
            IsActive = true,
            CurrentPropertyCount = 0
        };

        session.Save(adminUser);
        session.Flush();
        session.Clear(); // Clear session to ensure fresh entity

        // Reload admin user to ensure it's a managed entity
        var reloadedAdminUser = session.Query<User>().FirstOrDefault(u => u.Username == "admin");
        if (reloadedAdminUser == null)
        {
            throw new InvalidOperationException("Failed to create admin user.");
        }

        // Reload admin role to ensure it's a managed entity
        var reloadedAdminRole = session.Get<Role>(adminRole.Id);
        if (reloadedAdminRole == null)
        {
            throw new InvalidOperationException("Failed to reload admin role.");
        }

        // Assign Admin role to the user
        var userRole = new UserRole
        {
            User = reloadedAdminUser,
            Role = reloadedAdminRole,
            AssignedAt = DateTime.UtcNow
        };

        session.Save(userRole);
        session.Flush();
    }
}
