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

EXPOSE 8082

# Start the application
CMD ["npm", "run", "start"]