# NailBook 后端部署手册

## 前置条件

- ECS 服务器（Ubuntu 22.04 推荐）已安装 Docker + Docker Compose v2
- 域名 `api.lunails.cn` 已解析到 ECS 公网 IP
- ECS 安全组已放行 **80** 和 **443** 端口

---

## 第一步：服务器准备

```bash
# 安装 Docker（未安装时）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# 克隆代码
git clone https://github.com/YOUR_ORG/nailBook.git /opt/nailbook
cd /opt/nailbook
```

---

## 第二步：配置环境变量

```bash
cp backend/.env.production backend/.env.production.local   # 备份模板
vim backend/.env.production
```

必须修改的字段：

| 字段 | 操作 |
|------|------|
| `ADMIN_JWT_SECRET` | `openssl rand -base64 48` |
| `TECHNICIAN_JWT_SECRET` | `openssl rand -base64 48` |
| `CLIENT_JWT_SECRET` | `openssl rand -base64 48` |
| `CORS_ORIGINS` | 替换为真实域名 |
| `UPLOAD_BASE_URL` | 替换为真实域名 |

---

## 第三步：配置 Nginx 域名

```bash
# 把配置里的 lunails.cn 替换为真实域名
sed -i 's/api.lunails.cn/api.你的域名.com/g' deploy/nginx/conf.d/nailbook.conf
```

---

## 第四步：首次申请 SSL 证书

```bash
# 先用 HTTP-only 模式启动 nginx（临时注释掉 443 server block）
# 或直接运行脚本（它会处理顺序）
./deploy/init-ssl.sh api.你的域名.com admin@你的域名.com
```

---

## 第五步：启动所有服务

管理后台镜像由 GitHub Actions 构建并推送到 GHCR，生产服务器不再构建
`admin-frontend`。私有镜像首次部署前，需要使用具备 `read:packages` 权限的
GitHub PAT 登录：

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u Bob1817 --password-stdin
docker compose pull admin-web
```

默认拉取 `ghcr.io/bob1817/nailsbook-admin-web:latest`。生产发布建议在仓库根目录
`.env` 中固定已通过 CI 的提交镜像，避免 `latest` 漂移：

```bash
ADMIN_WEB_IMAGE=ghcr.io/bob1817/nailsbook-admin-web:sha-<完整提交 SHA>
```

```bash
docker compose up -d --build
docker compose logs -f backend   # 观察启动日志
```

验证：

```bash
curl https://api.你的域名.com/health
# 期望返回 {"status":"ok"}
```

---

## 第六步：配置 SSL 自动续期

```bash
# 加入 crontab（每天凌晨 3 点检查）
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/nailbook/deploy/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1") | crontab -
```

---

## 第七步：更新小程序 API 地址

打开 `client-wxapp/app.js`，修改：

```js
apiBaseUrl: 'https://api.你的域名.com'
```

并在**微信公众平台 → 开发管理 → 开发设置 → 服务器域名**添加：
- request 合法域名：`https://api.你的域名.com`
- uploadFile 合法域名：`https://api.你的域名.com`
- socket 合法域名：`https://api.你的域名.com`

---

## 用户端 WebApp 部署（m.lunails.cn）

用户端是一个静态 SPA（`client-frontend`），由 `client-web` 容器内部 nginx 提供，
边缘 nginx 终止 TLS 并反代 `m.lunails.cn`：`/api/` 和 `/socket.io/` 转发到后端，
其余转发到 SPA。前端用相对路径 `/api/client` 调接口，**同源、无需 CORS**。

> 想换域名/换前端：把下文的 `m.lunails.cn` 全局替换为目标域名即可
> （`deploy/nginx/conf.d/nailbook.conf`、`deploy/nginx/conf.d/m.lunails.cn-ssl.conf.disabled` 两处）。

### 第一步：DNS 解析

在域名服务商处添加一条 A 记录：`m.lunails.cn` → ECS 公网 IP（与 `api.lunails.cn` 同一台）。

### 第二步：拉取代码并构建前端容器

```bash
cd /opt/nailbook
git pull
docker compose up -d --build client-web      # 构建并启动用户端静态服务
docker compose restart nginx                  # 加载 m.lunails.cn 的 HTTP(80) 配置
```

此时 `m.lunails.cn` 的 80 端口已可用于 ACME 验证（HTTPS 暂未开启）。

### 第三步：申请 SSL 证书

```bash
./deploy/init-ssl.sh m.lunails.cn admin@lunails.cn
```

### 第四步：启用 HTTPS 配置

证书申请成功后，去掉 SSL 配置文件的 `.disabled` 后缀并重启 nginx：

```bash
mv deploy/nginx/conf.d/m.lunails.cn-ssl.conf.disabled deploy/nginx/conf.d/m.lunails.cn-ssl.conf
docker compose restart nginx
```

### 第五步：验证

```bash
curl -I https://m.lunails.cn          # 期望 200，返回 SPA 的 index.html
# 浏览器打开 https://m.lunails.cn ，登录后进入「消息」→ 对话页，确认顶部有「发起预约」按钮
```

### 证书自动续期

`m.lunails.cn` 与 `api.lunails.cn` 共用 certbot 容器，已有的 `renew-ssl.sh` crontab
会一并续期，无需额外配置。

---

## 后续更新部署

```bash
cd /opt/nailbook
git pull
docker compose up -d --build backend       # 仅后端更新
docker compose up -d --build client-web     # 仅用户端更新
docker compose pull admin-web               # 拉取 CI 构建的管理端镜像
docker compose up -d admin-web               # 仅重建管理端容器
```

也可以使用 `./deploy/deploy.sh admin-web`。该命令只拉取管理端镜像并重建容器，
不会在生产服务器执行 `npm ci` 或前端构建。执行前应确认目标提交的
`admin-image` GitHub Actions 任务已经成功。

后端容器启动时执行 `prisma migrate deploy`。迁移失败时应用不会继续启动，
禁止使用 `prisma db push` 代替生产迁移；详细预检和备份流程见
`backend/docs/DATABASE-MIGRATION-DEPLOYMENT.md`。

---

## 常用命令

```bash
docker compose ps                    # 查看容器状态
docker compose logs -f backend       # 实时日志
docker compose exec backend sh       # 进入容器
docker compose restart backend       # 重启后端
```
