#!/bin/bash

echo "=========================================="
echo "iOS Setup for Admin App - Fixed Version"
echo "=========================================="
echo ""

# Check if CocoaPods is already installed
if command -v pod &> /dev/null; then
    echo "✓ CocoaPods is already installed: $(pod --version)"
    echo "  Skipping CocoaPods installation..."
else
    echo "⚠ CocoaPods not found."
    echo ""
    echo "Please run this command manually (requires password):"
    echo "  sudo gem install cocoapods"
    echo ""
    echo "Or install via Homebrew:"
    echo "  brew install cocoapods"
    echo ""
    read -p "Press Enter after you've installed CocoaPods..."
    
    if ! command -v pod &> /dev/null; then
        echo "✗ CocoaPods still not found. Please install it first."
        exit 1
    fi
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

# Step 2: Install iOS pods
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
    exit 1
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To run the admin app on iOS:"
echo "  Terminal 1: npm start"
echo "  Terminal 2: npm run ios"
echo ""
