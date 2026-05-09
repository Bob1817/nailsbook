#!/bin/bash

# NailBook 全项目启动脚本
# 官网: http://localhost:5174
# 客户端: http://localhost:5173
# 美甲师端: http://localhost:5175

echo "🚀 启动 NailBook 全平台服务..."
echo ""

# 启动官网
echo "📱 启动官网 (Landing Page)..."
cd /Users/shibo/Documents/Codex/nailBook/landing-frontend
npm run dev &
LANDING_PID=$!
echo "   官网 PID: $LANDING_PID"
echo "   访问地址: http://localhost:5174"
echo ""

# 启动客户端
echo "💅 启动客户端 (Client)..."
cd /Users/shibo/Documents/Codex/nailBook/client-frontend
npm run dev &
CLIENT_PID=$!
echo "   客户端 PID: $CLIENT_PID"
echo "   访问地址: http://localhost:5173"
echo ""

# 启动美甲师端
echo "✨ 启动美甲师端 (Technician)..."
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend
npm run dev &
TECH_PID=$!
echo "   美甲师端 PID: $TECH_PID"
echo "   访问地址: http://localhost:5175"
echo ""

echo "=========================================="
echo "✅ 所有服务已启动!"
echo ""
echo "📱 官网入口: http://localhost:5174"
echo "💅 客户端:   http://localhost:5173"
echo "✨ 美甲师端: http://localhost:5175"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "=========================================="

# 等待所有进程
wait
