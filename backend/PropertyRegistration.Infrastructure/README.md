# Property Registration Infrastructure

This project contains the data access layer using NHibernate ORM.

## Features

- **NHibernate ORM** with FluentNHibernate mappings
- **PostgreSQL** database support
- **JSONB** custom type for flexible JSON storage
- **Unit of Work** pattern implementation
- **Database migrations** using SchemaUpdate
- **Data seeding** for roles, permissions, and lookup tables

## Database Migrations

NHibernate uses SchemaUpdate for automatic schema migrations. Unlike EF Core migrations, NHibernate will automatically update the database schema based on your entity mappings.

### Running Migrations

```csharp
var connectionString = "Host=localhost;Port=5432;Database=property_registration;Username=property_user;Password=property_password";
var migrator = new MigrationRunner(connectionString);

// Update schema
migrator.UpdateSchema();

// Seed initial data
migrator.SeedData();

// Export schema to SQL file
migrator.ExportSchema("schema.sql");
```

### Schema Update Behavior

NHibernate's SchemaUpdate will:
- Create new tables
- Add new columns
- Add new indexes
- **Note**: It will NOT drop columns or tables automatically (for safety)

## Entity Mappings

All entity mappings are located in the `Mappings` folder:
- `UserMap.cs` - User entity mapping
- `RoleMap.cs` - Role entity mapping
- `PermissionMap.cs` - Permission entity mapping
- `PropertyMap.cs` - Property entity mapping
- And more...

## Custom Types

- `JsonbType` - Custom NHibernate type for PostgreSQL JSONB columns

## Usage Example

```csharp
// Configure session factory
var sessionFactory = NHibernateSessionFactory.GetSessionFactory(connectionString);

// Open session
using var session = sessionFactory.OpenSession();
using var transaction = session.BeginTransaction();

try
{
    // Your operations here
    var user = new User { Username = "test", Email = "test@example.com" };
    session.Save(user);
    
    transaction.Commit();
}
catch
{
    transaction.Rollback();
    throw;
}
```
