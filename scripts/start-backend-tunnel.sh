#!/usr/bin/env bash
set -euo pipefail

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Install with:"
  echo "  brew install cloudflare/cloudflare/cloudflared"
  exit 1
fi

PORT="${1:-5050}"
TARGET_URL="http://127.0.0.1:${PORT}"

echo "Starting Cloudflare quick tunnel to ${TARGET_URL}"
echo "Copy the generated https://...trycloudflare.com URL and use it as REACT_APP_API_URL."
echo
exec cloudflared tunnel --url "${TARGET_URL}"
