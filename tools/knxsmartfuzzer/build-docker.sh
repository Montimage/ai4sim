#!/bin/bash

# Script to build KNX Smart Fuzzer Docker image locally
# This replaces the need to pull from the remote GitLab registry

echo "Building KNX Smart Fuzzer Docker image locally..."

# Navigate to the knxsmartfuzzer directory
cd "$(dirname "$0")"

# Build the Docker image with the local tag
docker build -t knxsmartfuzzer:latest .

if [ $? -eq 0 ]; then
    echo "✅ KNX Smart Fuzzer Docker image built successfully!"
    echo "Image name: knxsmartfuzzer:latest"
    echo ""
    echo "You can now use the KNX Smart Fuzzer in the dashboard."
else
    echo "❌ Failed to build KNX Smart Fuzzer Docker image"
    exit 1
fi 