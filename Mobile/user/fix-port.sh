#!/bin/bash

# Script to kill process on port 8081 (Metro bundler)

echo "🔍 Checking for process on port 8081..."

PID=$(lsof -ti:8081 2>/dev/null)

if [ -z "$PID" ]; then
    echo "✅ Port 8081 is free"
else
    echo "⚠️  Found process $PID on port 8081"
    echo "🛑 Killing process..."
    kill -9 $PID 2>/dev/null
    sleep 1
    
    # Verify it's killed
    if lsof -ti:8081 &>/dev/null; then
        echo "❌ Failed to kill process. Trying force kill..."
        kill -9 $PID 2>/dev/null
    else
        echo "✅ Port 8081 is now free"
    fi
fi

