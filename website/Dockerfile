# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# The site calls the backend via the relative "/api" path, which the edge nginx
# (lunails.cn vhost) proxies to the backend (same-origin, no CORS).
# Color checks run before the image build in CI. --ignore-scripts skips the
# prebuild hook here because the image context intentionally excludes ../scripts.
RUN npm run build --ignore-scripts

# ---- production stage ----
FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
