#!/bin/bash
set -euo pipefail

# Signal Engine extension setup script

# 1. Install Ollama
if ! command -v ollama &> /dev/null; then
  echo "Ollama not found. Attempting installation..."
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &> /dev/null; then
      brew install ollama
    else
      echo "Homebrew not found. Please install Ollama manually: https://ollama.com"
      exit 1
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Detected Linux. Installing via official script..."
    curl -fsSL https://ollama.com/install.sh | sh
  else
    echo "Unsupported OS for auto-install. Please install Ollama manually: https://ollama.com"
    exit 1
  fi
fi

# 2. Pull phi3 model
echo "Pulling phi3 model into Ollama..."
ollama pull phi3

# 3. Set default endpoint and run Ollama (non-blocking)
# Note: OLLAMA_ORIGIN="*" is required for browser extensions to talk to local Ollama
export OLLAMA_ORIGIN="*"

if pgrep -x "ollama" > /dev/null; then
  echo "Ollama is already running."
  echo "NOTE: If you experience connection issues in the extension, restart Ollama with:"
  echo "      OLLAMA_ORIGIN='*' ollama serve"
else
  echo "Starting Ollama server on port 11434..."
  ollama serve --host 127.0.0.1 --port 11434 --cors &
  sleep 3
fi

# 4. Quick user instructions
cat <<EOF

✅ Setup complete!

Next steps:
  1. Open Chrome and navigate to chrome://extensions
  2. Enable "Developer mode" (top right)
  3. Click "Load unpacked" and select this folder:
     $(pwd)
  4. Open the Signal Engine popup to verify AI status.

⚠️ IMPORTANT:
If the extension shows "AI Engine: Unreachable", ensure Ollama is running 
with CORS enabled by running:
    export OLLAMA_ORIGIN="*"
    ollama serve
EOF
