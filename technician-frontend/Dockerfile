# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# 使用相对路径，边缘 nginx 会将 /api/technician 反代到后端（同源，无需 CORS）
ARG VITE_API_URL=/api/technician
ENV VITE_API_URL=$VITE_API_URL
# 邀请链接指向客户端域名
ARG VITE_CLIENT_BASE_URL=https://m.lunails.cn
ENV VITE_CLIENT_BASE_URL=$VITE_CLIENT_BASE_URL
# Docker 构建上下文为 ./technician-frontend，跳过依赖仓库根 scripts/ 的 prebuild 颜色检查
RUN npx tsc -b && npx vite build

# ---- production stage ----
FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
