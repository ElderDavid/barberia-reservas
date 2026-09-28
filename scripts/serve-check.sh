#!/usr/bin/env bash
# usage: bash scripts/serve-check.sh <path> <expected-status> [required-response-header]
# Starts the production build (`pnpm build` must have run) on port 3100, requests <path>,
# asserts the HTTP status and, optionally, that a response header is present, then stops
# the server. Exits 0 only when every assertion holds.
set -u

path="$1"
expected="$2"
header="${3:-}"
port=3100
base="http://localhost:${port}"

node node_modules/next/dist/bin/next start -p "$port" > /tmp/serve-check.log 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null' EXIT

for _ in $(seq 1 60); do
  if curl -s -o /dev/null "$base/"; then
    break
  fi
  sleep 0.5
done

status="$(curl -s -o /dev/null -w '%{http_code}' "$base$path")"
if [ "$status" != "$expected" ]; then
  echo "serve-check: $path returned $status, expected $expected"
  tail -n 20 /tmp/serve-check.log
  exit 1
fi

if [ -n "$header" ]; then
  if ! curl -s -D - -o /dev/null "$base$path" | grep -qi "^$header:"; then
    echo "serve-check: header '$header' missing on $path"
    exit 1
  fi
fi

echo "serve-check: $path -> $status ok"
