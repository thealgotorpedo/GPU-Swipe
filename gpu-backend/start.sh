#!/bin/bash
set -e

# Start MongoDB in the background.
mongod --bind_ip 127.0.0.1 --dbpath /data/db &

mongo_pid=$!

# Give MongoDB time to begin listening.
for attempt in $(seq 1 30); do
  if mongosh --quiet --eval "db.adminCommand({ ping: 1 }).ok" 2>/dev/null | grep -q 1; then
    break
  fi

  sleep 1
done

# Combined-image fallback only. On the droplet, Server.js reads .env instead.
export MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/GpuMarketplaceDB}"
node /app/Server.js &

api_pid=$!

# Stop the other process if either program exits.
trap 'kill "$mongo_pid" "$api_pid" 2>/dev/null || true; wait || true' EXIT TERM INT
wait -n "$mongo_pid" "$api_pid"
