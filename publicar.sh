#!/usr/bin/env bash
# Publica la app en GitHub Pages: compila, sube el código a main y dist a gh-pages.
set -euo pipefail
cd "$(dirname "$0")"

REPO=code199J/caja
URL=https://github.com/$REPO.git
TOK="$(grep -oP 'export GITHUB_PAT="\K[^"]+' ~/.bashrc 2>/dev/null || printenv GITHUB_PAT)"
if [ -z "$TOK" ]; then echo "Falta GITHUB_PAT"; exit 1; fi
AUTH="Authorization: Basic $(printf 'x-access-token:%s' "$TOK" | base64 -w0)"

echo "→ Compilando…"
npm run build >/dev/null

echo "→ Subiendo código (main)…"
git add -A
if ! git diff --cached --quiet; then
  git commit -q -m "Actualización $(date +%F)"
fi
git -c "http.extraheader=$AUTH" push -q origin main

echo "→ Subiendo dist (gh-pages)…"
TMP="$(mktemp -d)"
cp -r dist/. "$TMP"/
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "dist: $(date '+%F %H:%M')"
git -c "http.extraheader=$AUTH" push -q -f "$URL" gh-pages
cd - >/dev/null
rm -rf "$TMP"

echo "→ Publicada: https://code199j.github.io/caja/  (tarda ~1 min en refrescar)"
