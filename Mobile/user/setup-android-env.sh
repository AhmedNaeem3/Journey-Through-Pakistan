#!/bin/bash

# Android SDK Environment Setup Script
# This script helps set up Android SDK paths for React Native development

echo "🔧 Setting up Android SDK Environment..."

# Detect shell
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.zshrc"
fi

# Default Android SDK location for macOS
ANDROID_HOME_DEFAULT="$HOME/Library/Android/sdk"

# Check if ANDROID_HOME is already set
if [ -z "$ANDROID_HOME" ]; then
    if [ -d "$ANDROID_HOME_DEFAULT" ]; then
        ANDROID_HOME="$ANDROID_HOME_DEFAULT"
        echo "✅ Found Android SDK at: $ANDROID_HOME"
    else
        echo "⚠️  Android SDK not found at default location: $ANDROID_HOME_DEFAULT"
        echo "Please install Android Studio and Android SDK first."
        echo "Or set ANDROID_HOME manually:"
        echo "export ANDROID_HOME=/path/to/android/sdk"
        exit 1
    fi
else
    echo "✅ ANDROID_HOME is already set to: $ANDROID_HOME"
fi

# Check if paths are already in shell RC
if grep -q "ANDROID_HOME" "$SHELL_RC" 2>/dev/null; then
    echo "✅ Android SDK paths already configured in $SHELL_RC"
else
    echo "📝 Adding Android SDK paths to $SHELL_RC..."
    cat >> "$SHELL_RC" << EOF

# Android SDK Configuration
export ANDROID_HOME=\$HOME/Library/Android/sdk
export PATH=\$PATH:\$ANDROID_HOME/emulator
export PATH=\$PATH:\$ANDROID_HOME/platform-tools
export PATH=\$PATH:\$ANDROID_HOME/tools
export PATH=\$PATH:\$ANDROID_HOME/tools/bin
EOF
    echo "✅ Android SDK paths added to $SHELL_RC"
    echo "⚠️  Please run: source $SHELL_RC"
fi

# Verify adb is accessible
if command -v adb &> /dev/null; then
    echo "✅ adb is accessible"
    adb version
else
    echo "⚠️  adb not found in PATH"
    echo "Trying to add it temporarily..."
    export PATH=$PATH:$ANDROID_HOME/platform-tools
    if command -v adb &> /dev/null; then
        echo "✅ adb is now accessible (temporarily)"
        echo "⚠️  Run 'source $SHELL_RC' to make it permanent"
    else
        echo "❌ adb still not found. Please check your Android SDK installation."
    fi
fi

# Check for emulators
echo ""
echo "📱 Checking for Android emulators..."
if command -v emulator &> /dev/null || [ -n "$ANDROID_HOME" ]; then
    if [ -n "$ANDROID_HOME" ]; then
        export PATH=$PATH:$ANDROID_HOME/emulator
    fi
    if command -v emulator &> /dev/null; then
        EMULATORS=$(emulator -list-avds 2>/dev/null)
        if [ -z "$EMULATORS" ]; then
            echo "⚠️  No emulators found. Please create one in Android Studio:"
            echo "   1. Open Android Studio"
            echo "   2. Go to Tools → Device Manager"
            echo "   3. Click 'Create Device'"
            echo "   4. Select a device (e.g., Pixel 5)"
            echo "   5. Download a system image (API 24+)"
            echo "   6. Finish setup"
        else
            echo "✅ Found emulators:"
            echo "$EMULATORS"
        fi
    fi
else
    echo "⚠️  emulator command not found"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: source $SHELL_RC"
echo "2. Verify: adb devices"
echo "3. Start Metro: npm start"
echo "4. Run app: npm run android"

