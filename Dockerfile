FROM node:18-alpine

WORKDIR /app

# Install PostgreSQL and other dependencies
RUN apk add --no-cache \
    postgresql \
    postgresql-contrib \
    curl \
    supervisor

# Set up PostgreSQL
USER postgres
RUN initdb -D /var/lib/postgresql/data
USER root

# Copy package files for frontend
COPY package*.json ./

# Install frontend dependencies and build
RUN npm ci || npm install
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Copy and install API dependencies
COPY api/package*.json ./api/
WORKDIR /app/api
RUN npm ci --only=production || npm install --production

# Copy API source code
COPY api/ .

# Copy database schema
COPY database/schema.sql /app/database/

# Create uploads directory for file storage
RUN mkdir -p uploads/reference-images uploads/generated-content

# Create supervisor configuration
RUN mkdir -p /etc/supervisor/conf.d
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:postgresql]
command=/usr/bin/postgres -D /var/lib/postgresql/data
user=postgres
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/postgresql.log
priority=1

[program:api]
command=node /app/api/index.js
directory=/app/api
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/api.log
environment=
    NODE_ENV=production,
    DB_HOST=localhost,
    DB_PORT=5432,
    DB_NAME=rotz_image_generator,
    DB_USER=postgres,
    DB_PASSWORD=postgres,
    PORT=3000,
    JWT_SECRET=your-super-secret-jwt-key-change-in-production,
    GOOGLE_CLIENT_ID=1035190682648-p60ao4phea2hbovo087bcao80741u10o.apps.googleusercontent.com,
    GOOGLE_CLIENT_SECRET=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
priority=2
EOF

# Create initialization script
COPY <<EOF /app/init.sh
#!/bin/sh
set -e

# Initialize PostgreSQL if needed
if [ ! -s "/var/lib/postgresql/data/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database..."
    su - postgres -c "initdb -D /var/lib/postgresql/data"
fi

# Start PostgreSQL temporarily to set up database
echo "Starting PostgreSQL for initialization..."
su - postgres -c "pg_ctl start -D /var/lib/postgresql/data -l /tmp/postgres.log"

# Wait for PostgreSQL to start
sleep 3

# Create database and load schema
echo "Setting up database..."
su - postgres -c "createdb rotz_image_generator || true"
su - postgres -c "psql -d rotz_image_generator -f /app/database/schema.sql || true"

# Stop PostgreSQL (supervisor will start it properly)
echo "Stopping temporary PostgreSQL..."
su - postgres -c "pg_ctl stop -D /var/lib/postgresql/data"

# Start supervisor
echo "Starting services with supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
EOF

RUN chmod +x /app/init.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start with initialization script
CMD ["/app/init.sh"]