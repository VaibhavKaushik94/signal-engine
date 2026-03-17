#!/bin/bash
set -euo pipefail

# Signal Engine extension setup script
# 1. Install Ollama (macOS only)
if ! command -v ollama &> /dev/null; then
  echo "Ollama not found. Installing..."
  if command -v brew &> /dev/null; then
    brew install ollama
  else
    echo "Homebrew not found; please install Ollama manually from https://ollama.ai"
    exit 1
  fi
fi

# 2. Pull phi3 model
echo "Pulling phi3 model into Ollama..."
ollama pull phi3

# 3. Set default endpoint and run Ollama (non-blocking)
export OLLAMA_ORIGIN="*"

if pgrep -x "ollama" > /dev/null; then
  echo "Ollama already running"
else
  echo "Starting Ollama server on port 11434..."
  ollama serve --host 127.0.0.1 --port 11434 --cors &
  sleep 2
fi

# 4. Quick user instructions
cat <<EOF

Setup complete!

Next steps:
  1. Open Chrome and navigate to chrome://extensions
  2. Enable "Developer mode"
  3. Click "Load unpacked" and point to $(pwd)
  4. Use the Signal Engine popup to select mode and verify AI status.

EOF
