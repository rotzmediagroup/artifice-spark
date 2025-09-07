FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy source code
COPY . .

# Build the frontend
ENV NODE_ENV=production
ENV VITE_API_URL=/api
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install nginx and wget (no sqlite needed for PostgreSQL setup)
RUN apk add --no-cache nginx wget

# Copy backend code
COPY backend/package*.json ./
RUN npm ci --only=production || npm install --production

COPY backend/ ./

# Copy built frontend to nginx directory
COPY --from=builder /app/dist /var/www/html

# Copy configuration files
COPY nginx-single.conf /etc/nginx/nginx.conf
COPY start-single.sh /app/start.sh

# Create directories and set permissions
RUN mkdir -p /app/uploads/reference-images /app/uploads/generated-content /var/log/nginx /run/nginx && \
    chmod +x /app/start.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start both services
CMD ["/app/start.sh"]