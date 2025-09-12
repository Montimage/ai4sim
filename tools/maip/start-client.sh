#!/bin/bash
# run client in dev mode
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/src/client"

# Set port to 3001 to avoid conflict with dashboard backend (port 3000)
export PORT=3001
export BROWSER=none
export GENERATE_SOURCEMAP=false
export DISABLE_ESLINT_PLUGIN=true
export FAST_REFRESH=false

echo "🌐 Starting MAIP Client with iframe-friendly configuration..."
npm start
cd -