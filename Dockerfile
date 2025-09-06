FROM node:18-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ curl

# Copy package files for frontend
COPY package*.json ./

# Install frontend dependencies and build
RUN npm ci || npm install
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Install API dependencies (files already copied by COPY . .)
WORKDIR /app/api
RUN npm ci --only=production || npm install --production

# Create required directories
RUN mkdir -p /app/data /app/uploads/reference-images /app/uploads/generated-content

# Set environment variables
ENV PORT=3000
ENV DB_PATH=/app/data/rotz.db
ENV JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENV GOOGLE_CLIENT_ID=1035190682648-p60ao4phea2hbovo087bcao80741u10o.apps.googleusercontent.com
ENV GOOGLE_CLIENT_SECRET=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

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "/app/api/index.js"]