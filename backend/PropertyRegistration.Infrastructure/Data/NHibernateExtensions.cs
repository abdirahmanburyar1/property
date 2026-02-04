using NHibernate;
using NHibernate.Linq;
using PropertyRegistration.Core.Entities;
using PropertyRegistration.Infrastructure.Seeders;

namespace PropertyRegistration.Infrastructure.Data;

public static class NHibernateExtensions
{
    public static void SeedData(this ISession session)
    {
        // Seed Roles and Permissions
        RolePermissionSeeder.SeedRolesAndPermissions(session);

        // Seed other lookup data (each with its own transaction)
        SeedLookupData(session);

        // Seed default admin user
        UserSeeder.SeedDefaultAdmin(session);
    }

    private static void SeedLookupData(ISession session)
    {
        // Seed each lookup table separately with its own transaction
        SeedPropertyTypes(session);
        SeedPropertyStatuses(session);
        SeedPaymentMethods(session);
        SeedPaymentStatuses(session);
        // Commission and revenue split are not seeded – percentages are dynamic, set by admin
    }

    private static void SeedPropertyTypes(ISession session)
    {
        using var transaction = session.BeginTransaction();
        try
        {
            // First, update existing PropertyType records that might not have Unit/Price set (migration)
            try
            {
                var updateSql = @"UPDATE ""PropertyTypes"" 
                                 SET ""Unit"" = COALESCE(""Unit"", 'm'), 
                                     ""Price"" = COALESCE(""Price"", 0) 
                                 WHERE ""Unit"" IS NULL OR ""Price"" IS NULL";
                session.CreateSQLQuery(updateSql).ExecuteUpdate();
                session.Flush();
            }
            catch
            {
                // Columns might not exist yet or already updated - ignore
            }

            // Check if we need to seed new PropertyTypes using raw SQL
            long count = 0;
            try
            {
                var countResult = session.CreateSQLQuery("SELECT COUNT(*) FROM \"PropertyTypes\"").UniqueResult();
                count = Convert.ToInt64(countResult);
            }
            catch
            {
                // Table might not exist yet
                count = 0;
            }
            
            if (count == 0)
            {
                var propertyTypes = new[]
                {
                    new PropertyType { Name = "Residential", Price = 50, Unit = "m" },
                    new PropertyType { Name = "Commercial", Price = 100, Unit = "m" },
                    new PropertyType { Name = "Industrial", Price = 150, Unit = "m" },
                    new PropertyType { Name = "Mosque", Price = 20, Unit = "m" },
                    new PropertyType { Name = "Land", Price = 30, Unit = "m" },
                    new PropertyType { Name = "Agricultural", Price = 25, Unit = "m" },
                    new PropertyType { Name = "Mixed Use", Price = 120, Unit = "m" }
                };

                foreach (var pt in propertyTypes)
                {
                    session.Save(pt);
                }
                session.Flush();
            }

            transaction.Commit();
        }
        catch (Exception ex)
        {
            try { transaction.Rollback(); } catch { }
            Console.WriteLine($"Warning: Could not seed PropertyTypes: {ex.Message}");
        }
    }

    private static void SeedPropertyStatuses(ISession session)
    {
        using var transaction = session.BeginTransaction();
        try
        {
            long count = 0;
            try
            {
                var countResult = session.CreateSQLQuery("SELECT COUNT(*) FROM \"PropertyStatuses\"").UniqueResult();
                count = Convert.ToInt64(countResult);
            }
            catch
            {
                count = 0;
            }

            if (count == 0)
            {
                var propertyStatuses = new[]
                {
                    new PropertyStatus { Name = "Draft", Description = "Property registration in draft state", ColorCode = "#9E9E9E", DisplayOrder = 1 },
                    new PropertyStatus { Name = "Pending", Description = "Property registration pending approval", ColorCode = "#FFC107", DisplayOrder = 2 },
                    new PropertyStatus { Name = "Under Review", Description = "Property registration under review", ColorCode = "#2196F3", DisplayOrder = 3 },
                    new PropertyStatus { Name = "Approved", Description = "Property registration approved", ColorCode = "#4CAF50", DisplayOrder = 4 },
                    new PropertyStatus { Name = "Rejected", Description = "Property registration rejected", ColorCode = "#F44336", DisplayOrder = 5 }
                };

                foreach (var ps in propertyStatuses)
                {
                    session.Save(ps);
                }
                session.Flush();
            }

            transaction.Commit();
        }
        catch (Exception ex)
        {
            try { transaction.Rollback(); } catch { }
            Console.WriteLine($"Warning: Could not seed PropertyStatuses: {ex.Message}");
        }
    }

    private static void SeedPaymentMethods(ISession session)
    {
        using var transaction = session.BeginTransaction();
        try
        {
            long count = 0;
            try
            {
                var countResult = session.CreateSQLQuery("SELECT COUNT(*) FROM \"PaymentMethods\"").UniqueResult();
                count = Convert.ToInt64(countResult);
            }
            catch
            {
                count = 0;
            }

            if (count == 0)
            {
                var paymentMethods = new[]
                {
                    new PaymentMethod { Name = "Cash", Code = "CASH", Description = "Cash payment", DisplayOrder = 1 },
                    new PaymentMethod { Name = "Credit Card", Code = "CARD", Description = "Credit card payment", DisplayOrder = 2 },
                    new PaymentMethod { Name = "Debit Card", Code = "DEBIT", Description = "Debit card payment", DisplayOrder = 3 },
                    new PaymentMethod { Name = "Mobile Money", Code = "MOBILE", Description = "Mobile money payment (M-Pesa, etc.)", DisplayOrder = 4 },
                    new PaymentMethod { Name = "Bank Transfer", Code = "BANK", Description = "Bank transfer payment", DisplayOrder = 5 }
                };

                foreach (var pm in paymentMethods)
                {
                    session.Save(pm);
                }
                session.Flush();
            }

            transaction.Commit();
        }
        catch (Exception ex)
        {
            try { transaction.Rollback(); } catch { }
            Console.WriteLine($"Warning: Could not seed PaymentMethods: {ex.Message}");
        }
    }

    private static void SeedPaymentStatuses(ISession session)
    {
        using var transaction = session.BeginTransaction();
        try
        {
            long count = 0;
            try
            {
                var countResult = session.CreateSQLQuery("SELECT COUNT(*) FROM \"PaymentStatuses\"").UniqueResult();
                count = Convert.ToInt64(countResult);
            }
            catch
            {
                count = 0;
            }

            if (count == 0)
            {
                var paymentStatuses = new[]
                {
                    new PaymentStatus { Name = "Pending", Description = "Payment pending processing", ColorCode = "#FFC107", DisplayOrder = 1 },
                    new PaymentStatus { Name = "Partially Paid", Description = "Payment partially collected", ColorCode = "#2196F3", DisplayOrder = 2 },
                    new PaymentStatus { Name = "Completed", Description = "Payment completed successfully", ColorCode = "#4CAF50", DisplayOrder = 3 },
                    new PaymentStatus { Name = "Failed", Description = "Payment processing failed", ColorCode = "#F44336", DisplayOrder = 4 },
                    new PaymentStatus { Name = "Refunded", Description = "Payment refunded", ColorCode = "#FF9800", DisplayOrder = 5 },
                    new PaymentStatus { Name = "Cancelled", Description = "Payment cancelled", ColorCode = "#9E9E9E", DisplayOrder = 6 }
                };

                foreach (var pstatus in paymentStatuses)
                {
                    session.Save(pstatus);
                }
                session.Flush();
            }

            transaction.Commit();
        }
        catch (Exception ex)
        {
            try { transaction.Rollback(); } catch { }
            Console.WriteLine($"Warning: Could not seed PaymentStatuses: {ex.Message}");
        }
    }
}
