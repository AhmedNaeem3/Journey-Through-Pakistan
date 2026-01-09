#!/bin/bash

echo "=========================================="
echo "Install Admin App on iPhone - Quick Setup"
echo "=========================================="
echo ""

# Check if iPhone is connected
echo "Step 1: Checking for connected iPhone..."
DEVICES=$(xcrun xctrace list devices 2>/dev/null | grep -i "iphone" | grep -v "Simulator" || echo "")

if [ -z "$DEVICES" ]; then
    echo "⚠ No iPhone detected."
    echo ""
    echo "Please:"
    echo "  1. Connect your iPhone via USB cable"
    echo "  2. Unlock your iPhone"
    echo "  3. Trust this computer if prompted"
    echo ""
    read -p "Press Enter when iPhone is connected..."
else
    echo "✓ iPhone detected:"
    echo "$DEVICES" | head -1
fi

# Open Xcode workspace
echo ""
echo "Step 2: Opening Xcode workspace..."
cd "$(dirname "$0")/ios"
open MobileApp.xcworkspace

echo ""
echo "=========================================="
echo "Next Steps in Xcode:"
echo "=========================================="
echo ""
echo "1. In Xcode:"
echo "   - Click 'MobileApp' (blue icon) in left sidebar"
echo "   - Go to 'Signing & Capabilities' tab"
echo "   - Check 'Automatically manage signing'"
echo "   - Select your Apple ID under 'Team'"
echo ""
echo "2. Select your iPhone:"
echo "   - Click device selector (top toolbar, next to Play button)"
echo "   - Choose your iPhone from the list"
echo ""
echo "3. Build and Install:"
echo "   - Click Play button (▶️) or press Cmd + R"
echo "   - On iPhone: Settings > General > VPN & Device Management"
echo "   - Trust your developer account"
echo ""
echo "4. Start Metro Bundler (in another terminal):"
echo "   cd $(dirname "$0")"
echo "   npm start"
echo ""
