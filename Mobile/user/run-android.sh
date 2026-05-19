#!/bin/bash

# Script to run Android app with Java 21

echo "🔧 Setting up Java 21 for Gradle..."

# Try to find Java 21
JAVA_21_PATH=""

# Check common locations
if [ -d "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ]; then
    JAVA_21_PATH="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
elif [ -d "/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home" ]; then
    JAVA_21_PATH="/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home"
elif [ -d "$HOME/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home" ]; then
    JAVA_21_PATH="$HOME/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home"
else
    # Try to find via java_home
    JAVA_21_PATH=$(/usr/libexec/java_home -v 21 2>/dev/null)
fi

if [ -z "$JAVA_21_PATH" ] || [ ! -d "$JAVA_21_PATH" ]; then
    echo "⚠️  Java 21 not found in standard locations"
    echo "Trying to use system Java..."
    
    # Check if current Java is 21
    JAVA_VERSION=$(java -version 2>&1 | head -1 | grep -o "21\.[0-9]")
    if [ -n "$JAVA_VERSION" ]; then
        echo "✅ Found Java 21 in PATH"
        export JAVA_HOME=$(/usr/libexec/java_home 2>/dev/null || echo "")
    else
        echo "❌ Java 21 not found. Please install Java 21 first."
        echo "Run: brew install openjdk@21"
        exit 1
    fi
else
    echo "✅ Found Java 21 at: $JAVA_21_PATH"
    export JAVA_HOME="$JAVA_21_PATH"
fi

# Verify Java version
echo "📋 Java version:"
"$JAVA_HOME/bin/java" -version 2>&1 | head -1

echo ""
echo "🚀 Running Android app..."
echo ""

# Run the app
cd "$(dirname "$0")"
npm run android

