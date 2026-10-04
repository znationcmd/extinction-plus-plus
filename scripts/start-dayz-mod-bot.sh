#!/usr/bin/env bash
set -euo pipefail
mkdir -p /data/steamcmd /data/steam-home
if [ ! -f /data/steamcmd/steamcmd.sh ]; then
  cp -a /opt/steamcmd/. /data/steamcmd/
  chown -R node:node /data/steamcmd
fi
if [ ! -f /data/database.json ]; then
  cp /app/shared/database.json /data/database.json
fi
chown node:node /data /data/steamcmd /data/steam-home /data/database.json
exec runuser -u node -- node index.js
