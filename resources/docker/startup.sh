#!/bin/bash

# Start Ollama server in background
ollama serve &

# Wait for server to be ready
echo "Waiting for Ollama server to start..."
sleep 10

# Check if fallback model exists, if not pull it
if ! ollama list | grep -q "phi3:3.8b-mini-4k-instruct-q4_K_M"; then
    echo "Pulling fallback model: phi3:3.8b-mini-4k-instruct-q4_K_M"
    ollama pull phi3:3.8b-mini-4k-instruct-q4_K_M || {
        echo "Failed to pull phi3, trying tinyllama as ultra-lightweight fallback"
        ollama pull tinyllama:latest
    }
fi

# Keep the server running
wait