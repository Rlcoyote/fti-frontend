#!/usr/bin/env bash
# Verify the live FRONTEND is serving a specific commit — a SHA MATCH, per CAM
# Article XXIII (Deploy Verification). The static-site analogue of the backend's
# scripts/verify-deploy.sh. A bundle-hash flip proves "a new build deployed";
# it does NOT prove the RUNNING code is the commit you pushed. This does.
#
# Usage:  scripts/verify-deploy.sh <commit-sha> [frontend-url]
# Reads the running commit from /version.json, falling back to the
# <meta name="fti-commit"> baked into index.html (survives an SPA catch-all).
#
# v28.292 — polls like the backend script (30 × 15s) instead of single-shot.
# The old one-look check reported "NOT verified" on any deploy slower than
# the moment you ran it, which read as failure when the deploy was merely
# in flight.
set -euo pipefail

EXPECTED="${1:?usage: verify-deploy.sh <commit-sha> [frontend-url]}"
URL="${2:-https://fti-frontend-production.up.railway.app}"

read_running() {
  local r
  r="$(curl -fsS "$URL/version.json" 2>/dev/null | grep -o '"commit":"[^"]*"' | cut -d'"' -f4 || true)"
  if [ -z "$r" ]; then
    r="$(curl -fsS "$URL/" 2>/dev/null | grep -o 'name="fti-commit" content="[^"]*"' | sed 's/.*content="//; s/"$//' || true)"
  fi
  echo "$r"
}

echo "verify-deploy: waiting for ${EXPECTED:0:7} to go live at $URL"
for i in $(seq 1 30); do
  running="$(read_running)"
  if [ -n "$running" ] && [ "${running:0:7}" = "${EXPECTED:0:7}" ]; then
    echo "FE verified live: running $running matches $EXPECTED (attempt $i)"
    exit 0
  fi
  echo "attempt $i/30: running=${running:-unreadable} != ${EXPECTED:0:7} — waiting 15s…"
  sleep 15
done

echo "FE NOT verified: ${EXPECTED:0:7} never went live (deploy dropped/stuck/failed — check Railway Deployments, do NOT nudge blind)"
exit 1
