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

## 后续更新部署

```bash
cd /opt/nailbook
git pull
docker compose up -d --build backend
```

---

## 常用命令

```bash
docker compose ps                    # 查看容器状态
docker compose logs -f backend       # 实时日志
docker compose exec backend sh       # 进入容器
docker compose restart backend       # 重启后端
```
