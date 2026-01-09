#!/bin/bash

echo "=========================================="
echo "iOS Setup for Admin App"
echo "=========================================="
echo ""

# Step 1: Install CocoaPods (compatible with Ruby 2.6)
echo "Step 1: Installing CocoaPods (this requires your password)..."
sudo gem install cocoapods -v 1.13.2

if [ $? -eq 0 ]; then
    echo "✓ CocoaPods installed successfully"
else
    echo "✗ CocoaPods installation failed"
    exit 1
fi

# Step 2: Install Node dependencies
echo ""
echo "Step 2: Installing npm dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ npm dependencies installed"
else
    echo "✗ npm install failed"
    exit 1
fi

# Step 3: Install iOS pods
echo ""
echo "Step 3: Installing iOS dependencies (CocoaPods)..."
cd ios
pod install
cd ..

if [ $? -eq 0 ]; then
    echo "✓ iOS dependencies installed"
else
    echo "✗ pod install failed"
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
echo "Or open in Xcode:"
echo "  open ios/MobileApp.xcworkspace"
echo ""
