using FluentNHibernate.Cfg;
using FluentNHibernate.Cfg.Db;
using NHibernate;
using NHibernate.Cfg;
using NHibernate.Tool.hbm2ddl;
using PropertyRegistration.Infrastructure.Mappings;
using NHibernate.Dialect;

namespace PropertyRegistration.Infrastructure.Data;

public class NHibernateSessionFactory
{
    private static ISessionFactory? _sessionFactory;
    private static readonly object _lock = new object();

    public static ISessionFactory GetSessionFactory(string connectionString)
    {
        if (_sessionFactory == null)
        {
            lock (_lock)
            {
                if (_sessionFactory == null)
                {
                    _sessionFactory = Fluently.Configure()
                        .Database(PostgreSQLConfiguration.Standard
                            .ConnectionString(connectionString)
                            .FormatSql()
                            .ShowSql())
                        .Mappings(m => m.FluentMappings
                            .AddFromAssemblyOf<UserMap>())
                        .ExposeConfiguration(cfg =>
                        {
                            cfg.SetProperty("hbm2ddl.auto", "update");
                            cfg.SetProperty("dialect", "NHibernate.Dialect.PostgreSQL82Dialect");
                            cfg.SetProperty("connection.provider", "NHibernate.Connection.DriverConnectionProvider");
                            cfg.SetProperty("connection.driver_class", "NHibernate.Driver.NpgsqlDriver");
                        })
                        .BuildSessionFactory();
                }
            }
        }

        return _sessionFactory;
    }

    public static ISession OpenSession(string connectionString)
    {
        return GetSessionFactory(connectionString).OpenSession();
    }

    public static void UpdateSchema(string connectionString)
    {
        try
        {
            var configuration = Fluently.Configure()
                .Database(PostgreSQLConfiguration.Standard
                    .ConnectionString(connectionString))
                .Mappings(m => m.FluentMappings
                    .AddFromAssemblyOf<UserMap>())
                .ExposeConfiguration(cfg =>
                {
                    cfg.SetProperty("dialect", "NHibernate.Dialect.PostgreSQL82Dialect");
                    cfg.SetProperty("connection.provider", "NHibernate.Connection.DriverConnectionProvider");
                    cfg.SetProperty("connection.driver_class", "NHibernate.Driver.NpgsqlDriver");
                })
                .BuildConfiguration();

            // Use SchemaUpdate ONLY - it's safe and never drops data
            // SchemaUpdate only adds missing tables, columns, and indexes - it never drops anything
            // This ensures your data is preserved when the backend restarts
            var schemaUpdate = new SchemaUpdate(configuration);
            schemaUpdate.Execute(true, true);
            
            if (schemaUpdate.Exceptions != null && schemaUpdate.Exceptions.Count > 0)
            {
                foreach (var ex in schemaUpdate.Exceptions)
                {
                    Console.WriteLine($"Schema update warning: {ex.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error updating schema: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            throw;
        }
    }

    public static void ExportSchema(string connectionString, string outputFile)
    {
        var configuration = Fluently.Configure()
            .Database(PostgreSQLConfiguration.Standard
                .ConnectionString(connectionString))
            .Mappings(m => m.FluentMappings
                .AddFromAssemblyOf<UserMap>())
            .ExposeConfiguration(cfg =>
            {
                            cfg.SetProperty("dialect", "NHibernate.Dialect.PostgreSQL82Dialect");
                cfg.SetProperty("connection.provider", "NHibernate.Connection.DriverConnectionProvider");
                cfg.SetProperty("connection.driver_class", "NHibernate.Driver.NpgsqlDriver");
            })
            .BuildConfiguration();

        var schemaExport = new SchemaExport(configuration);
        schemaExport.SetOutputFile(outputFile);
        schemaExport.Create(false, false);
    }
}
