#!/usr/bin/env bash
#
# NailBook iOS 真机部署脚本
#
# 固化两处非显然的构建环境修正（详见 ../CLAUDE.md 与项目记忆）：
#   1. Flutter 不在默认 PATH，位于 ~/development/flutter/bin。
#   2. 机器上有两个 CocoaPods：/usr/local/bin/pod (旧 1.11.3) 与
#      /opt/homebrew/bin/pod (1.16.2)。必须让 Homebrew 版排在前面，
#      否则 pod install 会因版本过低 / 不识别新 ISA 而失败。
#
# 用法：
#   ./scripts/run-device.sh                 # 自动选第一台真机，release 模式
#   ./scripts/run-device.sh <device-id>     # 指定设备
#   MODE=debug ./scripts/run-device.sh      # 改用 debug 模式
#
set -euo pipefail

FLUTTER_BIN="${FLUTTER_BIN:-$HOME/development/flutter/bin}"
MODE="${MODE:-release}"

# Homebrew pod 必须优先于 /usr/local/bin 的旧版
export PATH="/opt/homebrew/bin:$FLUTTER_BIN:$PATH"

# 切到项目根（脚本所在目录的上一级）
cd "$(dirname "$0")/.."

echo "▸ flutter : $(command -v flutter)"
echo "▸ pod     : $(command -v pod) ($(pod --version))"

DEVICE_ID="${1:-}"
if [[ -z "$DEVICE_ID" ]]; then
  # 取第一台物理 iOS 设备（targetPlatform=ios 且 emulator=false，排除模拟器/桌面/web）
  DEVICE_ID="$(flutter devices --machine 2>/dev/null | python3 -c '
import sys, json
for d in json.load(sys.stdin):
    if d.get("targetPlatform") == "ios" and not d.get("emulator", True):
        print(d["id"]); break
')"
fi

if [[ -z "$DEVICE_ID" ]]; then
  echo "✗ 未找到真机。请解锁手机、开启开发者模式并确认已连接。" >&2
  flutter devices >&2
  exit 1
fi

echo "▸ device  : $DEVICE_ID"
echo "▸ mode    : $MODE"
echo

flutter pub get
exec flutter run --"$MODE" -d "$DEVICE_ID"
