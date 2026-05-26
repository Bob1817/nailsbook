# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- production stage ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
RUN npx prisma generate

RUN mkdir -p uploads data

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "DATABASE_URL=${DATABASE_URL:-file:/app/data/prod.db} npx prisma migrate deploy && node dist/src/main"]
