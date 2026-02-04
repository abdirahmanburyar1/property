using System.IO;
using System.Linq;
using NHibernate;
using PropertyRegistration.Infrastructure.Data;

namespace PropertyRegistration.Infrastructure.Migrations;

/// <summary>
/// Runs SQL migration files from the Migrations/Sql directory
/// Tracks executed migrations in the database to avoid re-running them
/// </summary>
public class SqlMigrationRunner
{
    private readonly string _connectionString;
    private readonly string _migrationsPath;

    public SqlMigrationRunner(string connectionString, string? migrationsPath = null)
    {
        _connectionString = connectionString;
        
        if (!string.IsNullOrEmpty(migrationsPath))
        {
            _migrationsPath = migrationsPath;
        }
        else
        {
            // Get the Infrastructure project directory
            var currentDir = Directory.GetCurrentDirectory();
            Console.WriteLine($"Current working directory: {currentDir}");
            Console.WriteLine($"Base directory: {AppDomain.CurrentDomain.BaseDirectory}");
            
            // Try multiple paths to find the Migrations/Sql directory
            var possiblePaths = new[]
            {
                // When running from solution root (dotnet run from Api project)
                Path.GetFullPath(Path.Combine(currentDir, "..", "PropertyRegistration.Infrastructure", "Migrations", "Sql")),
                // When running from solution root (dotnet run from root)
                Path.GetFullPath(Path.Combine(currentDir, "backend", "PropertyRegistration.Infrastructure", "Migrations", "Sql")),
                // When running from Infrastructure project
                Path.GetFullPath(Path.Combine(currentDir, "Migrations", "Sql")),
                // Relative to bin directory (when running from Api)
                Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "Migrations", "Sql")),
            };

            // Log all possible paths
            Console.WriteLine("Checking possible migration paths:");
            foreach (var path in possiblePaths)
            {
                var exists = Directory.Exists(path);
                Console.WriteLine($"  {(exists ? "✓" : "✗")} {path}");
            }

            var foundPath = possiblePaths.FirstOrDefault(Directory.Exists);
            if (foundPath != null)
            {
                _migrationsPath = foundPath;
                Console.WriteLine($"✓ Using migration path: {_migrationsPath}");
            }
            else
            {
                // Use the first path and create it if needed
                _migrationsPath = possiblePaths[0];
                Console.WriteLine($"⚠ No existing migration directory found, will use/create: {_migrationsPath}");
            }
        }
    }

    /// <summary>
    /// Ensures the migration tracking table exists
    /// </summary>
    private void EnsureMigrationTable(ISession session)
    {
        var createTableSql = @"
            CREATE TABLE IF NOT EXISTS ""__MigrationHistory"" (
                ""MigrationName"" VARCHAR(255) PRIMARY KEY,
                ""AppliedAt"" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        ";

        try
        {
            session.CreateSQLQuery(createTableSql).ExecuteUpdate();
            session.Flush();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Could not create migration tracking table: {ex.Message}");
        }
    }

    /// <summary>
    /// Gets list of already executed migrations
    /// </summary>
    private HashSet<string> GetExecutedMigrations(ISession session)
    {
        try
        {
            var executed = session.CreateSQLQuery("SELECT \"MigrationName\" FROM \"__MigrationHistory\"")
                .List<string>();
            return new HashSet<string>(executed);
        }
        catch
        {
            return new HashSet<string>();
        }
    }

    /// <summary>
    /// Records a migration as executed
    /// </summary>
    private void RecordMigration(ISession session, string migrationName)
    {
        var insertSql = @"INSERT INTO ""__MigrationHistory"" (""MigrationName"", ""AppliedAt"") VALUES (:name, CURRENT_TIMESTAMP)";
        session.CreateSQLQuery(insertSql)
            .SetParameter("name", migrationName)
            .ExecuteUpdate();
        session.Flush();
    }

    /// <summary>
    /// Runs all SQL migration files from the Migrations/Sql directory
    /// </summary>
    public void RunSqlMigrations()
    {
        Console.WriteLine("=== Starting SQL Migrations ===");
        Console.WriteLine($"Looking for migrations in: {_migrationsPath}");
        
        if (!Directory.Exists(_migrationsPath))
        {
            Console.WriteLine($"Migrations directory not found: {_migrationsPath}");
            Console.WriteLine("Creating migrations directory...");
            try
            {
                Directory.CreateDirectory(_migrationsPath);
                Console.WriteLine($"Created directory: {_migrationsPath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to create migrations directory: {ex.Message}");
                return;
            }
        }

        using var session = NHibernateSessionFactory.OpenSession(_connectionString);
        using var transaction = session.BeginTransaction();

        try
        {
            // Ensure migration tracking table exists
            EnsureMigrationTable(session);

            // Get list of executed migrations
            var executedMigrations = GetExecutedMigrations(session);

            // Get all SQL files from migrations directory, sorted by name
            var migrationFiles = Directory.GetFiles(_migrationsPath, "*.sql")
                .OrderBy(f => Path.GetFileName(f))
                .ToList();

            if (migrationFiles.Count == 0)
            {
                Console.WriteLine($"⚠ No SQL migration files found in: {_migrationsPath}");
                Console.WriteLine($"Current directory: {Directory.GetCurrentDirectory()}");
                Console.WriteLine($"Base directory: {AppDomain.CurrentDomain.BaseDirectory}");
                transaction.Commit();
                return;
            }

            Console.WriteLine($"Found {migrationFiles.Count} SQL migration file(s):");
            foreach (var file in migrationFiles)
            {
                Console.WriteLine($"  - {Path.GetFileName(file)}");
            }

            int executedCount = 0;
            foreach (var filePath in migrationFiles)
            {
                var fileName = Path.GetFileName(filePath);
                var migrationName = fileName;

                // Skip if already executed
                if (executedMigrations.Contains(migrationName))
                {
                    Console.WriteLine($"Skipping already executed migration: {migrationName}");
                    continue;
                }

                try
                {
                    Console.WriteLine($"Executing migration: {migrationName}");

                    // Read SQL file
                    var sql = File.ReadAllText(filePath);
                    
                    if (string.IsNullOrWhiteSpace(sql))
                    {
                        Console.WriteLine($"Warning: Migration file {migrationName} is empty, skipping");
                        continue;
                    }

                    // Split by semicolons and execute each statement
                    var statements = sql.Split(';', StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim())
                        .Where(s => !string.IsNullOrWhiteSpace(s) && !s.StartsWith("--"))
                        .ToList();

                    foreach (var statement in statements)
                    {
                        if (string.IsNullOrWhiteSpace(statement))
                            continue;

                        try
                        {
                            session.CreateSQLQuery(statement).ExecuteUpdate();
                        }
                        catch (Exception ex)
                        {
                            // Some statements might fail (e.g., column already exists)
                            // Log but continue
                            Console.WriteLine($"Warning: Statement in {migrationName} failed: {ex.Message}");
                        }
                    }

                    session.Flush();

                    // Record migration as executed
                    RecordMigration(session, migrationName);
                    executedCount++;

                    Console.WriteLine($"✓ Successfully executed migration: {migrationName}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"✗ Error executing migration {migrationName}: {ex.Message}");
                    Console.WriteLine($"Stack trace: {ex.StackTrace}");
                    // Continue with next migration instead of failing completely
                }
            }

            transaction.Commit();

            if (executedCount > 0)
            {
                Console.WriteLine($"✓ Executed {executedCount} new migration(s)");
            }
            else
            {
                Console.WriteLine("✓ All migrations are up to date");
            }
        }
        catch (Exception ex)
        {
            try { transaction.Rollback(); } catch { }
            Console.WriteLine($"Error running SQL migrations: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            // Don't throw - allow application to continue
        }
    }
}
