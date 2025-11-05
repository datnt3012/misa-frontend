# =========================
#  Build Stage
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

# Configure npm for better network handling
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Copy package files
COPY package*.json ./

# Install dependencies with retry logic
RUN npm ci || (npm cache clean --force && npm ci)

# Copy source code
COPY . .

# Build the app (Vite hoặc CRA)
RUN npm run build


# =========================
#  Production Stage (Nginx)
# =========================
FROM nginx:alpine AS production

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html
# 👉 Nếu bạn dùng Create React App thay vì Vite, hãy đổi dòng trên thành:
# COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Chạy nginx ở foreground
CMD ["nginx", "-g", "daemon off;"]
