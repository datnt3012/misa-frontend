# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files + lockfile 
COPY package*.json ./

# Install dependencies
RUN npm ci 

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Copy built assets from builder stage
COPY --from=builder /app/dist /app/dist/

# Set working directory
WORKDIR /app

# Ensure runtime has scripts and dependencies needed for preview
COPY --from=builder /app/package*.json /app/
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 8082

# Start the production preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8082", "--strictPort"]