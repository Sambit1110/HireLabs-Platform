#!/usr/bin/env bash
# Hosts the team's models for the deployed website (macOS/Linux).
#
# Runs the model server (parser, matcher and the evaluator proxy) on
# 127.0.0.1:8000 and opens a Cloudflare tunnel to it. Ollama stays on
# 127.0.0.1:11434 and is reached only through the model server.
#
#   export MODEL_API_TOKEN=$(openssl rand -hex 32)   # same value goes into Vercel
#   bash scripts/host-models.sh
#
# Guide: docs/hosting-models.md
set -euo pipefail
cd "$(dirname "$0")/.."

: "${MODEL_API_TOKEN:?Set MODEL_API_TOKEN first: export MODEL_API_TOKEN=\$(openssl rand -hex 32)}"
if [ "${#MODEL_API_TOKEN}" -lt 32 ]; then
  echo "MODEL_API_TOKEN must be at least 32 characters." >&2
  exit 1
fi
command -v cloudflared >/dev/null || { echo "Install cloudflared first (macOS: brew install cloudflared)." >&2; exit 1; }
command -v curl >/dev/null || { echo "curl is required." >&2; exit 1; }

MODEL="${OLLAMA_MODEL:-hirelabs-evaluator}"
PYTHON="${PYTHON:-.venv/bin/python}"
[ -x "$PYTHON" ] || { echo "No Python at $PYTHON. Create .venv (see docs/hosting-models.md) or set PYTHON." >&2; exit 1; }

# The evaluator must be loaded, and Ollama must not listen beyond this machine.
tags="$(curl -sf http://127.0.0.1:11434/api/tags)" || { echo "Ollama is not running: start it with 'ollama serve'." >&2; exit 1; }
grep -q "\"name\":\"$MODEL" <<<"$tags" || { echo "Ollama has no model '$MODEL': run 'ollama create $MODEL -f Modelfile'." >&2; exit 1; }
if command -v lsof >/dev/null && lsof -nP -iTCP:11434 -sTCP:LISTEN 2>/dev/null | grep -q '\*:11434'; then
  echo "Ollama is listening on every network interface. Restart it with OLLAMA_HOST=127.0.0.1." >&2
  exit 1
fi

"$PYTHON" -m uvicorn main:app --app-dir services/model-server --host 127.0.0.1 --port 8000 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT

for _ in $(seq 1 90); do
  curl -sf http://127.0.0.1:8000/health >/dev/null && break
  kill -0 "$server" 2>/dev/null || { echo "The model server stopped while starting." >&2; exit 1; }
  sleep 1
done
echo "Model server health: $(curl -sf http://127.0.0.1:8000/health || echo unreachable)"

cat <<MSG

Starting the tunnel. Copy the https://...trycloudflare.com address it prints, then in Vercel
(Project > Settings > Environment Variables) set:
  USE_LOCAL_MODELS = true
  MODEL_SERVER_URL = <that address>
  OLLAMA_URL       = <that address>
  MODEL_API_TOKEN  = <the same token you exported here>
and redeploy. A quick tunnel gets a new address each time it starts.
Press Ctrl+C to stop the tunnel and the model server.

MSG
cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8000
