#!/usr/bin/env bash
# Assemble a folder you can push to a Hugging Face Space (Docker SDK).
#   scripts/build_hf_space.sh <output-folder> [path/to/hirelabs_parser.whl]
# Needs models/hirelabs-llm (from scripts/python/train_llm.py). models/hirelabs-matcher and
# models/hirelabs-matcher-v2 are copied when present; without a matcher (or the parser wheel)
# those routes answer 503.
set -euo pipefail

out="${1:?usage: scripts/build_hf_space.sh <output-folder> [parser.whl]}"
wheel="${2:-}"
root="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$root/models/hirelabs-llm/model.pt" ]; then
  echo "models/hirelabs-llm/model.pt not found: train it first (see docs/hirelabs-llm.md)." >&2
  exit 1
fi
if [ -e "$out" ] && [ -n "$(ls -A "$out" | grep -v '^\.git$' || true)" ]; then
  echo "$out is not empty. Use a new folder, or a fresh clone of the Space." >&2
  exit 1
fi

mkdir -p "$out/services" "$out/scripts" "$out/models" "$out/wheels"
cp "$root/deploy/huggingface-space/Dockerfile" "$root/deploy/huggingface-space/README.md" "$out/"
rsync -a --exclude tests --exclude __pycache__ "$root/services/model-server" "$out/services/"
rsync -a --exclude tests --exclude __pycache__ "$root/scripts/python" "$out/scripts/"
rsync -a --exclude training-log.json "$root/models/hirelabs-llm" "$out/models/"
if [ -d "$root/models/hirelabs-matcher" ]; then
  rsync -a "$root/models/hirelabs-matcher" "$out/models/"
else
  echo "Note: models/hirelabs-matcher not found; /embed will answer 503."
fi
# The from-scratch matcher (docs/hirelabs-matcher-v2.md). Set the Space variable
# MATCHER_MODEL=/app/models/hirelabs-matcher-v2 to use it.
if [ -d "$root/models/hirelabs-matcher-v2" ]; then
  rsync -a --exclude training-log.json "$root/models/hirelabs-matcher-v2" "$out/models/"
fi
if [ -n "$wheel" ]; then
  cp "$wheel" "$out/wheels/"
else
  echo "Note: no parser wheel given; /parse will answer 503."
fi
touch "$out/wheels/.keep"

# Model files are binary: Hugging Face stores them with Git LFS.
printf '*.pt filter=lfs diff=lfs merge=lfs -text\n*.safetensors filter=lfs diff=lfs merge=lfs -text\n*.bin filter=lfs diff=lfs merge=lfs -text\n*.whl filter=lfs diff=lfs merge=lfs -text\n' > "$out/.gitattributes"

echo "Space folder ready: $out"
du -sh "$out"
