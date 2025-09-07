# Build stage for React frontend
FROM node:18-alpine AS frontend-builder

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

# Production stage - Single unified server
FROM node:18-alpine

WORKDIR /app

# Install PostgreSQL client and wget for health checks
RUN apk add --no-cache postgresql-client wget

# Copy unified server
COPY server.cjs ./
COPY package.json ./

# Install production dependencies (includes backend packages)
RUN npm install --only=production pg cors bcrypt jsonwebtoken multer uuid express-rate-limit google-auth-library dotenv

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Create upload directories
RUN mkdir -p /app/uploads/reference-images /app/uploads/generated-content

# Set proper permissions
RUN chmod 755 /app/uploads /app/uploads/reference-images /app/uploads/generated-content

# Expose port 80
EXPOSE 80

# Health check - check the unified server
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start the unified server
CMD ["node", "server.cjs"]