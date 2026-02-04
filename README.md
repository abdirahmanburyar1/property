# Property Registration System

A monolithic property registration system built with .NET C# backend, React frontend, PostgreSQL database, RabbitMQ task queue, and Mapbox integration.

## Tech Stack

- **Backend**: .NET 8, ASP.NET Core Web API, Entity Framework Core
- **Frontend**: React 18, TypeScript, Mapbox GL JS
- **Database**: PostgreSQL 15
- **Message Queue**: RabbitMQ 3.12
- **Real-time**: SignalR WebSocket
- **Authentication**: JWT Bearer tokens

## Prerequisites

- Docker and Docker Compose
- .NET 8 SDK (for backend development)
- Node.js 18+ and npm/yarn (for frontend development)

## Getting Started

### 1. Start Infrastructure Services

Start PostgreSQL and RabbitMQ using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** on port `5432`
  - Database: `property_registration`
  - User: `property_user`
  - Password: `property_password`
- **RabbitMQ** on ports `5672` (AMQP) and `15672` (Management UI)
  - User: `property_user`
  - Password: `property_password`
  - Management UI: http://localhost:15672

### 2. Verify Services

Check if services are running:

```bash
docker-compose ps
```

Access RabbitMQ Management UI:
- URL: http://localhost:15672
- Username: `property_user`
- Password: `property_password`

### 3. Backend Setup

Navigate to the backend directory and follow the setup instructions in `backend/README.md`.

### 4. Frontend Setup

Navigate to the frontend directory and follow the setup instructions in `frontend/README.md`.

## Docker Compose Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart a specific service
docker-compose restart postgres
docker-compose restart rabbitmq

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v
```

## Database Connection

- **Host**: localhost
- **Port**: 5432
- **Database**: property_registration
- **Username**: property_user
- **Password**: property_password
- **Connection String**: `Host=localhost;Port=5432;Database=property_registration;Username=property_user;Password=property_password`

## RabbitMQ Connection

- **Host**: localhost
- **Port**: 5672
- **Username**: property_user
- **Password**: property_password
- **Virtual Host**: property_vhost
- **Connection String**: `amqp://property_user:property_password@localhost:5672/property_vhost`

## Project Structure

```
property/
├── backend/                 # .NET 8 Web API
├── frontend/                # React TypeScript app
├── docker-compose.yml       # Infrastructure services
└── README.md               # This file
```

## Development

### Environment Variables

Create `.env` files in backend and frontend directories as needed for local development.

### Database Migrations

Run migrations from the backend project:

```bash
cd backend
dotnet ef database update
```

## License

[Your License Here]
