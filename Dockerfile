FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci || npm install

# Copy source code
COPY . .

# Build the application (ensuring production API URL is used)
ENV NODE_ENV=production
RUN npm run build

# Production stage - Use a simple Node server instead of nginx
FROM node:18-alpine

WORKDIR /app

# Install serve and curl for health checks
RUN npm install -g serve && apk add --no-cache curl

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment variable for binding to all interfaces
ENV HOST=0.0.0.0

# Expose port (using standard port 3000 for Coolify)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the server - uses HOST environment variable for binding
CMD ["serve", "-s", "dist", "-l", "3000"]