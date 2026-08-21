# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# 使用相对路径，边缘 nginx 会将 /api/admin 反代到后端（同源，无需 CORS）
ARG VITE_API_URL=/api/admin
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- production stage ----
FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
