using PropertyRegistration.Infrastructure.Data;

namespace PropertyRegistration.Infrastructure.Migrations;

public class MigrationRunner
{
    private readonly string _connectionString;

    public MigrationRunner(string connectionString)
    {
        _connectionString = connectionString;
    }

    /// <summary>
    /// Updates the database schema to match the current entity mappings
    /// </summary>
    public void UpdateSchema()
    {
        Console.WriteLine("Updating database schema...");
        
        // Run SQL file migrations first (before schema update)
        var sqlMigrationRunner = new SqlMigrationRunner(_connectionString);
        sqlMigrationRunner.RunSqlMigrations();
        
        // Then run NHibernate schema update
        NHibernateSessionFactory.UpdateSchema(_connectionString);
        Console.WriteLine("Schema update completed successfully.");
    }

    /// <summary>
    /// Exports the database schema to a SQL file
    /// </summary>
    public void ExportSchema(string outputFile)
    {
        Console.WriteLine($"Exporting schema to {outputFile}...");
        NHibernateSessionFactory.ExportSchema(_connectionString, outputFile);
        Console.WriteLine("Schema export completed successfully.");
    }

    /// <summary>
    /// Seeds initial data (roles, permissions, lookup tables)
    /// </summary>
    public void SeedData()
    {
        Console.WriteLine("Seeding initial data...");
        using var session = NHibernateSessionFactory.OpenSession(_connectionString);
        session.SeedData();
        Console.WriteLine("Data seeding completed successfully.");
    }
}
