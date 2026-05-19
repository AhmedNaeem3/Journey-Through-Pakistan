#!/bin/bash

echo "=========================================="
echo "iOS Setup for Both User and Admin Apps"
echo "=========================================="

# Stop any running Metro bundlers
echo ""
echo "Step 1: Stopping Metro bundlers..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || echo "  ✓ Port 8081 is free"
lsof -ti:8082 | xargs kill -9 2>/dev/null || echo "  ✓ Port 8082 is free"

# Check CocoaPods
echo ""
echo "Step 2: Checking CocoaPods..."
if ! command -v pod &> /dev/null; then
    echo "  ⚠ CocoaPods not found. Installing..."
    sudo gem install cocoapods
else
    echo "  ✓ CocoaPods is installed ($(pod --version))"
fi

# Setup User App
echo ""
echo "Step 3: Setting up USER app..."
cd user
if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install
else
    echo "  ✓ npm dependencies already installed"
fi

if [ ! -d "ios/Pods" ]; then
    echo "  Installing CocoaPods dependencies (this may take 5-10 minutes)..."
    cd ios
    pod install
    cd ..
else
    echo "  ✓ CocoaPods dependencies already installed"
fi
cd ..

# Setup Admin App
echo ""
echo "Step 4: Setting up ADMIN app..."
cd admin
if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install
else
    echo "  ✓ npm dependencies already installed"
fi

if [ ! -d "ios/Pods" ]; then
    echo "  Installing CocoaPods dependencies (this may take 5-10 minutes)..."
    cd ios
    pod install
    cd ..
else
    echo "  ✓ CocoaPods dependencies already installed"
fi
cd ..

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To run USER app:"
echo "  Terminal 1: cd user && npm start"
echo "  Terminal 2: cd user && npm run ios"
echo ""
echo "To run ADMIN app:"
echo "  Terminal 1: cd admin && npm start"
echo "  Terminal 2: cd admin && npm run ios"
echo ""
echo "To run BOTH apps simultaneously:"
echo "  Terminal 1: cd user && npm start -- --port=8081"
echo "  Terminal 2: cd user && npm run ios"
echo "  Terminal 3: cd admin && npm start -- --port=8082"
echo "  Terminal 4: cd admin && npm run ios"
echo ""
