FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci || npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Remove default nginx configs to prevent conflicts
RUN rm -rf /etc/nginx/conf.d/*

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy standalone nginx configuration (without API proxy)
COPY nginx-standalone.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 8888

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8888/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]