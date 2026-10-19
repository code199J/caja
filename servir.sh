#!/usr/bin/env bash
# Sirve la app en la red local para abrir-la desde el teléfono.
# Uso: ./servir.sh [puerto]   (puerto por defecto: 8080)
set -euo pipefail
cd "$(dirname "$0")"

PUERTO="${1:-8080}"

if [ ! -f dist/index.html ]; then
  echo "→ Compilando la app…"
  npm run build
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[ -z "${IP}" ] && IP="localhost"

echo
echo "  Caja lista. Abre en el teléfono (misma red WiFi):"
echo
echo "      http://${IP}:${PUERTO}"
echo
echo "  Detener: Ctrl+C"
echo
cd dist && python3 -m http.server "${PUERTO}" --bind 0.0.0.0
