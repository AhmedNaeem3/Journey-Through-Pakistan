#!/bin/bash

echo "=========================================="
echo "iOS Setup for Admin App - Manual Steps"
echo "=========================================="
echo ""

# Check if CocoaPods is already installed
if command -v pod &> /dev/null; then
    echo "✓ CocoaPods is already installed: $(pod --version)"
    SKIP_PODS=true
else
    echo "⚠ CocoaPods not found. You'll need to install it manually."
    SKIP_PODS=false
fi

# Step 1: Install Node dependencies
echo ""
echo "Step 1: Installing npm dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ npm dependencies installed"
else
    echo "✗ npm install failed"
    exit 1
fi

# Step 2: Install iOS pods (if CocoaPods is available)
if [ "$SKIP_PODS" = true ]; then
    echo ""
    echo "Step 2: Installing iOS dependencies (CocoaPods)..."
    cd ios
    pod install
    POD_RESULT=$?
    cd ..
    
    if [ $POD_RESULT -eq 0 ]; then
        echo "✓ iOS dependencies installed"
    else
        echo "⚠ pod install had issues. You may need to run it manually."
    fi
else
    echo ""
    echo "Step 2: SKIPPED - CocoaPods not installed"
    echo "   Please run: sudo gem install cocoapods -v 1.13.2"
    echo "   Then run: cd ios && pod install && cd .."
fi

echo ""
echo "=========================================="
if [ "$SKIP_PODS" = true ]; then
    echo "Setup Complete!"
else
    echo "Partial Setup Complete!"
    echo "You still need to install CocoaPods manually."
fi
echo "=========================================="
echo ""
echo "To run the admin app on iOS:"
echo "  Terminal 1: npm start"
echo "  Terminal 2: npm run ios"
echo ""
