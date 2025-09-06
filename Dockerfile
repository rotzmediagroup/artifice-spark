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

# Production stage - Use a simple Node server instead of nginx
FROM node:18-alpine

WORKDIR /app

# Install serve to host the static files
RUN npm install -g serve

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8888

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8888 || exit 1

# Start the server
CMD ["serve", "-s", "dist", "-l", "8888"]