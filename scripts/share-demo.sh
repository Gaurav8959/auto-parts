#!/usr/bin/env bash
# Share a demo of the app with someone outside your network.
#
#   scripts/share-demo.sh          start the demo and print a public link + logins
#   scripts/share-demo.sh stop     stop it (the link stops working)
#   scripts/share-demo.sh reset    stop the demo and wipe its data (the next start is fresh)
#   scripts/share-demo.sh local    start the demo on this computer only (http://localhost:3005), no public link
#
# The demo is a separate copy: its own database (auto_parts_demo), API on port 5080 and website on
# port 3005, so your real shop data is never touched. The link comes from a free Cloudflare quick
# tunnel: no account or domain needed, but it changes every time the demo restarts, and it only works
# while this computer is on and awake.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$ROOT/backend/logs/demo"
API_PORT=5080
WEB_PORT=3005
DEMO_DB=auto_parts_demo
mkdir -p "$STATE"

stop() {
  for port in $API_PORT $WEB_PORT; do lsof -ti "tcp:$port" -sTCP:LISTEN | xargs kill 2>/dev/null || true; done
  [ -f "$STATE/tunnel.pid" ] && kill "$(cat "$STATE/tunnel.pid")" 2>/dev/null || true
  rm -f "$STATE/tunnel.pid"
}

db() { # runs one SQL statement against the MySQL server from backend/.env
  (cd "$ROOT/backend" && node -e '
    require("dotenv").config();
    const m = require("mysql2/promise");
    (async () => {
      const c = await m.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
      const [rows] = await c.query(process.argv[1]);
      if (Array.isArray(rows) && rows[0]) console.log(Object.values(rows[0])[0]);
      await c.end();
    })().catch((e) => { console.error(e.message); process.exit(1); });' "$1")
}

case "${1:-start}" in
  stop)
    stop
    echo "Demo stopped."
    exit 0
    ;;
  reset)
    stop
    db "DROP DATABASE IF EXISTS $DEMO_DB" >/dev/null
    rm -f "$STATE/credentials.txt" "$STATE/url.txt"
    echo "Demo data wiped. Run scripts/share-demo.sh to start a fresh demo."
    exit 0
    ;;
  start | local) ;;
  *)
    echo "usage: $0 [start|stop|reset|local]"
    exit 1
    ;;
esac

stop

echo "1/4  Preparing the demo database…"
db "CREATE DATABASE IF NOT EXISTS $DEMO_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" >/dev/null
(cd "$ROOT/backend" && DB_NAME=$DEMO_DB npm run --silent migration:run >/dev/null)
if [ ! -f "$STATE/credentials.txt" ]; then
  PASSWORD="Demo-$(node -e 'process.stdout.write(require("crypto").randomBytes(6).toString("base64url"))')"
  (cd "$ROOT/backend" && DB_NAME=$DEMO_DB ADMIN_PASSWORD="$PASSWORD" DEMO_MANAGER_PASSWORD="$PASSWORD" npm run --silent seed -- --demo >/dev/null)
  cat >"$STATE/credentials.txt" <<CREDS
Admin (sees every shop):     admin@autoparts.local / $PASSWORD
Manager, Karol Bagh shop:    ravi@autoparts.local  / $PASSWORD
Manager, Lajpat Nagar shop:  neha@autoparts.local  / $PASSWORD
CREDS
fi

echo "2/4  Starting the demo API…"
# servers run detached so this script (and any pipe it writes to) can finish
(cd "$ROOT/backend" && DB_NAME=$DEMO_DB PORT=$API_PORT MAIL_TRANSPORT=log nohup npm start >"$STATE/api.log" 2>&1 &) </dev/null >/dev/null 2>&1
for _ in $(seq 1 60); do curl -s "localhost:$API_PORT/" >/dev/null && break; sleep 1; done

echo "3/4  Building the demo website (about a minute)…"
(cd "$ROOT/frontend" && NEXT_DIST_DIR=.next-demo API_ORIGIN="http://localhost:$API_PORT" npx next build >"$STATE/build.log" 2>&1)
(cd "$ROOT/frontend" && NEXT_DIST_DIR=.next-demo API_ORIGIN="http://localhost:$API_PORT" nohup npx next start -p $WEB_PORT >"$STATE/web.log" 2>&1 &) </dev/null >/dev/null 2>&1
for _ in $(seq 1 60); do curl -s -o /dev/null "localhost:$WEB_PORT/login" && break; sleep 1; done

if [ "${1:-start}" = "local" ]; then
  echo
  echo "  Demo is running on this computer only:  http://localhost:$WEB_PORT"
  echo
  cat "$STATE/credentials.txt"
  echo
  echo "  Run scripts/share-demo.sh (without 'local') to get a link your friend can open."
  exit 0
fi

echo "4/4  Opening the public link…"
: >"$STATE/tunnel.log"
nohup cloudflared tunnel --no-autoupdate --url "http://localhost:$WEB_PORT" </dev/null >"$STATE/tunnel.log" 2>&1 &
echo $! >"$STATE/tunnel.pid"
URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$STATE/tunnel.log" | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done
[ -z "$URL" ] && { echo "Couldn't open a tunnel. See $STATE/tunnel.log"; exit 1; }
echo "$URL" >"$STATE/url.txt"

cat <<DONE

  Demo is live:  $URL

$(cat "$STATE/credentials.txt")

  It's a separate copy with sample data; your real shop is not affected.
  Emails sent in the demo are saved to backend/logs/mail instead of being delivered.
  Stop it with:  scripts/share-demo.sh stop
DONE
