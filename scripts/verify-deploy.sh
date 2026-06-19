#!/usr/bin/env bash
# Verify the live FRONTEND is serving a specific commit — a SHA MATCH, per CAM
# Article XXIII (Deploy Verification). The static-site analogue of the backend's
# scripts/verify-deploy.sh. A bundle-hash flip proves "a new build deployed";
# it does NOT prove the RUNNING code is the commit you pushed. This does.
#
# Usage:  scripts/verify-deploy.sh <commit-sha> [frontend-url]
# Reads the running commit from /version.json, falling back to the
# <meta name="fti-commit"> baked into index.html (survives an SPA catch-all).
set -euo pipefail

EXPECTED="${1:?usage: verify-deploy.sh <commit-sha> [frontend-url]}"
URL="${2:-https://fti-frontend-production.up.railway.app}"

running="$(curl -fsS "$URL/version.json" 2>/dev/null | grep -o '"commit":"[^"]*"' | cut -d'"' -f4 || true)"
if [ -z "$running" ]; then
  running="$(curl -fsS "$URL/" 2>/dev/null | grep -o 'name="fti-commit" content="[^"]*"' | sed 's/.*content="//; s/"$//' || true)"
fi

if [ -z "$running" ]; then
  echo "FE verify: could not read running commit from $URL (no /version.json, no fti-commit meta)"
  exit 2
fi

if [ "${running:0:7}" = "${EXPECTED:0:7}" ]; then
  echo "FE verified live: running $running matches $EXPECTED"
  exit 0
fi

echo "FE NOT verified: running $running != expected $EXPECTED"
exit 1
