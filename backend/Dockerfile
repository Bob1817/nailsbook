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

RUN sed -i "s|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g" /etc/apk/repositories && apk add --no-cache dumb-init openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
RUN npx prisma generate

RUN mkdir -p data uploads

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
# ⚠️ DATABASE_URL 必须用绝对路径 /app/data/prod.db（卷挂载点）。
# 相对路径 file:./data/prod.db 会被 Prisma 解析到 schema 目录 /app/prisma/data/prod.db（镜像内临时库），
# 导致每次重建容器都用空库、丢失生产数据。切勿改回相对路径。
CMD ["sh", "-c", "export DATABASE_URL=${DATABASE_URL:-file:/app/data/prod.db} && npx prisma migrate deploy && exec node --max-old-space-size=384 dist/src/main"]
