# =========================
#  Build Stage
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

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

# Expose port
EXPOSE 8082

# Chạy nginx ở foreground
CMD ["nginx", "-g", "daemon off;"]
