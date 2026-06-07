# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# The site calls the backend via the relative "/api" path, which the edge nginx
# (lunails.cn vhost) proxies to the backend (same-origin, no CORS).
RUN npm run build

# ---- production stage ----
FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
