# Property Registration API

.NET 8 Web API for Property Registration System.

## Prerequisites

- .NET 8 SDK
- PostgreSQL 15+ (via Docker Compose)
- RabbitMQ (via Docker Compose)

## Getting Started

### 1. Start Infrastructure Services

```bash
docker-compose up -d
```

This starts PostgreSQL and RabbitMQ containers.

### 2. Run the API

```bash
cd backend/PropertyRegistration.Api
dotnet run
```

The API will:
- Automatically update the database schema using NHibernate SchemaUpdate
- Seed initial data (roles, permissions, lookup tables)
- Start on `http://localhost:5062`

### 3. Access Swagger UI

Open your browser and navigate to:
- Swagger UI: http://localhost:5062/swagger

### 4. Test Health Endpoint

```bash
curl http://localhost:5062/api/health
```

## Configuration

Connection strings and settings are in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=property_registration;Username=property_user;Password=property_password"
  }
}
```

## Database Migrations

NHibernate automatically updates the database schema on startup using `SchemaUpdate`. This will:
- Create tables if they don't exist
- Add new columns
- Add new indexes
- **Note**: It will NOT drop columns or tables (for safety)

## API Endpoints

- `GET /api/health` - Health check endpoint
- Swagger UI available at `/swagger` in Development mode

## Project Structure

```
PropertyRegistration.Api/
├── Controllers/     # API controllers
├── Models/         # DTOs and request/response models
├── Services/       # Business logic services
├── Extensions/     # Extension methods for DI
└── Program.cs      # Application entry point
```
