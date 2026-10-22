#!/usr/bin/env bash
# Mac/Linux: sync current season from NBA.com and push (Vercel redeploys).
# Schedule daily with: crontab -e  →  0 8 * * * /path/to/Basketballstats/sync/sync.sh >> /tmp/nba-sync.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --rebase --autostash -q || true
python3 -m pip install -q -r sync/requirements.txt
python3 sync/sync_nba.py --push "$@"
