using PropertyRegistration.Infrastructure.Data;
using PropertyRegistration.Infrastructure.Migrations;

namespace PropertyRegistration.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddNHibernate(this IServiceCollection services, string connectionString)
    {
        services.AddSingleton<ISessionFactoryProvider>(provider =>
            new SessionFactoryProvider(connectionString));

        services.AddScoped<IUnitOfWork>(provider =>
        {
            var sessionFactoryProvider = provider.GetRequiredService<ISessionFactoryProvider>();
            return new UnitOfWork(sessionFactoryProvider);
        });

        return services;
    }

    public static IApplicationBuilder UseDatabaseMigration(this IApplicationBuilder app, string connectionString)
    {
        var logger = app.ApplicationServices.GetRequiredService<ILogger<Program>>();
        var migrator = new MigrationRunner(connectionString);
        
        try
        {
            logger.LogInformation("Starting database migration...");
            migrator.UpdateSchema();
            logger.LogInformation("Database schema updated successfully.");
            
            logger.LogInformation("Starting data seeding...");
            migrator.SeedData();
            logger.LogInformation("Data seeding completed successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during database migration: {Message}", ex.Message);
            logger.LogError("Stack trace: {StackTrace}", ex.StackTrace);
            
            // In development, continue anyway to see other errors
            if (app.ApplicationServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
            {
                logger.LogWarning("Continuing despite migration error in Development mode");
            }
            else
            {
                throw;
            }
        }

        return app;
    }
}
