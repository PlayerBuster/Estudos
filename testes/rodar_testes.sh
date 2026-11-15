#!/usr/bin/env bash
# Roda toda a suíte de testes do Plano de Estudos. Sai com código 1 se algum teste falhar.
# Uso: bash testes/rodar_testes.sh
set -uo pipefail
cd "$(dirname "$0")/.."

falta=0
command -v node >/dev/null || { echo 'Falta o Node 18+ (https://nodejs.org).'; falta=1; }
node -e 'require.resolve("playwright"); require.resolve("xlsx")' 2>/dev/null || { echo 'Falta instalar: npm install --no-save playwright@1.49.1 xlsx@0.18.5 && npx playwright install chromium'; falta=1; }
[ "$falta" = 0 ] || exit 1

node --test --test-reporter=spec --test-concurrency=1 \
  testes/calculos.test.js testes/telas.test.js testes/fluxo.test.js testes/importar.test.js testes/sync.test.js testes/sw.test.js
status=$?
echo
if [ "$status" = 0 ]; then echo 'TODOS OS TESTES PASSARAM.'; else echo 'HÁ TESTES FALHANDO.'; fi
exit "$status"
