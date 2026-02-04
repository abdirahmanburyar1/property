using PropertyRegistration.Infrastructure.Data;

namespace PropertyRegistration.Infrastructure.Migrations;

public class DatabaseMigrator
{
    private readonly string _connectionString;

    public DatabaseMigrator(string connectionString)
    {
        _connectionString = connectionString;
    }

    public void UpdateSchema()
    {
        NHibernateSessionFactory.UpdateSchema(_connectionString);
    }

    public void ExportSchema(string outputFile)
    {
        NHibernateSessionFactory.ExportSchema(_connectionString, outputFile);
    }
}
