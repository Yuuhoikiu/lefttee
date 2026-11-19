#!/bin/sh
# 个人站建站台一键启动
# 用法：./start.sh                        默认端口 8765，站点目录 ./site
#       PORT=9000 ./start.sh              指定端口
#       STUDIO_SITE=/path/to/site ./start.sh  指定已有站点目录

set -e
cd "$(dirname "$0")"

PORT="${PORT:-8765}"
SITE="${STUDIO_SITE:-}"
URL="http://127.0.0.1:$PORT/studio/"

if ! command -v python3 >/dev/null 2>&1; then
  echo "未找到 python3，请先安装 Python 3。"
  exit 1
fi

# 已经在运行就直接打开浏览器
if curl -s -o /dev/null --max-time 1 "$URL"; then
  echo "建站台已在运行：$URL"
  open "$URL"
  exit 0
fi

echo "正在启动建站台：$URL"
if [ -n "$SITE" ]; then
  echo "站点目录：$SITE"
fi
echo "停止服务按 Ctrl+C"
if [ -n "$SITE" ]; then
  exec python3 studio.py --port "$PORT" --site "$SITE"
fi
exec python3 studio.py --port "$PORT"
