# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# VITE_API_URL is intentionally left unset: the app falls back to the relative
# "/api/client" path, which the edge nginx proxies to the backend (same-origin,
# no CORS). Override with a build arg only if serving the API cross-origin.
ARG VITE_API_URL
RUN npm run build

# ---- production stage ----
FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
