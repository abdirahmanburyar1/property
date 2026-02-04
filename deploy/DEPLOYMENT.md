# Production Deployment Guide

## VPS Setup Commands

### 1. Initial Setup

```bash
# Update system
sudo dnf update -y

# Install required packages
sudo dnf install -y git nginx dotnet-sdk-8.0 firewalld

# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Verify Docker is installed
docker --version
docker compose version

# Add cloud-user to docker group
sudo usermod -aG docker cloud-user

# Create directories
sudo mkdir -p /home/cloud-user/property-work
sudo mkdir -p /home/cloud-user/docker/data/{postgres,rabbitmq,redis}

# Set ownership (property directory already exists as bare repo)
sudo chown -R cloud-user:cloud-user /home/cloud-user/property-work
sudo chown -R cloud-user:cloud-user /home/cloud-user/docker
```

### 2. Setup Docker Services

```bash
# Switch to cloud-user
su - cloud-user

# Copy docker-compose.prod.yml to working directory
cp /home/cloud-user/property-work/docker-compose.prod.yml /home/cloud-user/docker/infrastructure/docker-compose.yml

# Note: Using development credentials and different ports to avoid conflicts
# with system-installed PostgreSQL and RabbitMQ
# PostgreSQL Docker: port 5433 (system uses 5432)
# RabbitMQ Docker: port 5673 (system uses 5672)
# Redis Docker: port 6380 (if system Redis exists on 6379)
# Backend API: port 9000 (localhost only)
# Frontend: port 8080 (localhost only, proxied by nginx)

# Build and start all services (infrastructure + backend + frontend)
cd /home/cloud-user/docker/infrastructure
docker compose build
docker compose up -d

# Verify services are running
docker compose ps
docker compose logs
```

### 3. Create Post-Receive Hook

```bash
cat > /home/cloud-user/property/hooks/post-receive << 'EOF'
#!/bin/bash
set -e

DEPLOY_DIR="/home/cloud-user/property"
BACKEND_DIR="$DEPLOY_DIR/backend/PropertyRegistration.Api"
FRONTEND_DIR="$DEPLOY_DIR/frontend"
BRANCH="main"

while read oldrev newrev refname; do
    branch=$(git rev-parse --symbolic --abbrev-ref $refname)
    
    if [ "$branch" = "$BRANCH" ]; then
        echo "Deploying branch: $branch"
        
        # Checkout code to working directory
        cd /home/cloud-user/property
        GIT_WORK_TREE="$DEPLOY_DIR" git checkout -f "$BRANCH"
        
        # Rebuild and restart Docker services
        echo "Rebuilding Docker services..."
        cd "$DEPLOY_DIR"
        docker compose -f docker-compose.prod.yml build backend frontend
        docker compose -f docker-compose.prod.yml up -d --force-recreate backend frontend
        
        # Ensure all infrastructure services are running
        docker compose -f docker-compose.prod.yml up -d postgres rabbitmq redis
        
        echo "Deployment completed!"
    fi
done
EOF

chmod +x /home/cloud-user/property/hooks/post-receive
```

### 4. Configure Nginx

```bash
sudo cat > /etc/nginx/conf.d/property.conf << 'EOF'
upstream property_api {
    server localhost:9000;
    keepalive 64;
}

upstream property_frontend {
    server localhost:8080;
    keepalive 64;
}

server {
    listen 80;
    server_name 31.97.154.123;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    client_max_body_size 20M;

    location /api {
        proxy_pass http://property_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    location /hubs {
        proxy_pass http://property_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://property_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 5. Configure Firewall

```bash
sudo systemctl enable firewalld
sudo systemctl start firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload
```

### 6. Add Git Remote and Deploy

On your local machine:

```bash
git remote add vps cloud-user@31.97.154.123:/home/cloud-user/property
git push vps main
```

### 7. Start Services Manually

```bash
# Switch to cloud-user
su - cloud-user

# Navigate to property directory
cd /home/cloud-user/property-work

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# To stop services
# docker compose -f docker-compose.prod.yml down

# To restart services
# docker compose -f docker-compose.prod.yml restart
```

## Important Notes

1. **Port Configuration**: 
   - PostgreSQL Docker uses port **5433** (system PostgreSQL uses 5432)
   - RabbitMQ Docker uses port **5673** (system RabbitMQ uses 5672)
   - Redis Docker uses port **6380** (if system Redis exists on 6379)
   - Update `appsettings.Production.json` with these ports

2. **Docker Services**: 
   - All services (PostgreSQL, RabbitMQ, Redis, Backend, Frontend) run in Docker containers
   - Backend connects to `postgres:5432` and `rabbitmq:5672` (internal Docker network)
   - External ports: PostgreSQL 5433, RabbitMQ 5673, Backend 9000, Frontend 8080 (all localhost only)
   - Nginx proxies to backend (port 9000) and frontend (port 8080)

3. **Update frontend .env** with production API URL: `VITE_API_URL=http://31.97.154.123/api`

4. **Security**: All service ports are bound to localhost only (127.0.0.1)

5. **Data persistence**: Docker volumes use bind mounts to `/home/cloud-user/docker/data/`

6. **Development Credentials**: Using development credentials (property_user/property_password) as requested

7. **Docker Build Context**: 
   - `docker-compose.prod.yml` is located in the repository root
   - Code is checked out to `/home/cloud-user/property-work/`
   - Docker Compose is run from `/home/cloud-user/property-work/` using `-f docker-compose.prod.yml`
   - Build contexts use relative paths: `./backend` and `./frontend`

8. **Manual Docker Compose Management**: 
   - Docker Compose is managed manually (no systemd service)
   - Use `docker compose up -d` to start services
   - Use `docker compose down` to stop services
   - Use `docker compose restart` to restart services
   - Use `docker compose logs -f` to view logs

9. **Containerization**: 
   - **Backend**: Fully containerized with multi-stage Dockerfile (builds .NET 8 API)
   - **Frontend**: Fully containerized with multi-stage Dockerfile (builds React app with Nginx)
   - **Infrastructure**: PostgreSQL, RabbitMQ, and Redis run in Docker containers
   - All services communicate via Docker network (`property_network_prod`)
   - `.dockerignore` files optimize build context by excluding unnecessary files
