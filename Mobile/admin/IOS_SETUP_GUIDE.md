# iOS Setup Guide for React Native App

This guide will help you set up and run the iOS app on your Mac.

## Prerequisites

### 1. Install Xcode
- **Download**: Open the Mac App Store and search for "Xcode"
- **Install**: Click "Get" or "Install" (this may take 30-60 minutes)
- **Version**: Xcode 15.0 or later is recommended
- **Command Line Tools**: After installation, open Xcode and accept the license agreement

### 2. Install Xcode Command Line Tools
```bash
xcode-select --install
```
If you see "command line tools are already installed", you're good to go.

### 3. Install CocoaPods
CocoaPods is a dependency manager for iOS projects:
```bash
sudo gem install cocoapods
```
Enter your Mac password when prompted.

### 4. Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 5. Install Node.js (if not already installed)
```bash
brew install node
```
Verify installation:
```bash
node --version  # Should be >= 20
npm --version
```

### 6. Install Watchman (recommended for better performance)
```bash
brew install watchman
```

## Setup Steps

### Step 1: Navigate to MobileApp Directory
```bash
cd "/Users/personal/JTP(FYP)/Journey-Through-Pakistan/MobileApp"
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Install iOS Dependencies (CocoaPods)
```bash
cd ios
pod install
cd ..
```

**Note**: If you encounter errors during `pod install`, try:
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Step 4: Open Xcode Project
```bash
open ios/MobileApp.xcworkspace
```

**Important**: Always open `.xcworkspace`, NOT `.xcodeproj`

### Step 5: Configure Signing in Xcode

1. In Xcode, select the **MobileApp** project in the left sidebar
2. Select the **MobileApp** target
3. Go to the **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** (your Apple ID)
   - If you don't have a team, click "Add Account" and sign in with your Apple ID
   - Free Apple ID accounts can create development certificates

### Step 6: Select Simulator or Device

**Option A: Run on iOS Simulator**
1. In Xcode, click the device selector dropdown (top toolbar)
2. Select an iOS Simulator (e.g., "iPhone 15 Pro" or "iPhone 15")
3. If no simulators are available, go to **Xcode > Settings > Platforms** and download iOS Simulator

**Option B: Run on Physical Device**
1. Connect your iPhone/iPad via USB
2. Unlock your device and trust the computer if prompted
3. In Xcode, select your device from the device selector dropdown
4. You may need to register your device in Xcode (it will prompt you)

### Step 7: Start Metro Bundler
Open a new terminal window and run:
```bash
cd "/Users/personal/JTP(FYP)/Journey-Through-Pakistan/MobileApp"
npm start
```

Keep this terminal open - Metro bundler needs to be running.

### Step 8: Run the App

**Method 1: Using npm script (Recommended)**
```bash
npm run ios
```

**Method 2: Using Xcode**
1. In Xcode, click the **Play** button (▶️) in the top-left corner
2. Or press `Cmd + R`

**Method 3: Using React Native CLI**
```bash
npx react-native run-ios
```

To run on a specific simulator:
```bash
npx react-native run-ios --simulator="iPhone 15 Pro"
```

## Running on Specific Simulator

To see available simulators:
```bash
xcrun simctl list devices
```

To run on a specific simulator:
```bash
npx react-native run-ios --simulator="iPhone 15 Pro"
```

## Troubleshooting

### Issue: "No such file or directory: node"
**Solution**: Make sure Node.js is installed and in your PATH:
```bash
which node
# If not found, add to ~/.zshrc:
export PATH="/usr/local/bin:$PATH"
source ~/.zshrc
```

### Issue: "Command PhaseScriptExecution failed"
**Solution**: Clean build folder:
```bash
cd ios
rm -rf build
cd ..
npm start -- --reset-cache
```

### Issue: "Unable to boot simulator"
**Solution**: 
1. Open Xcode
2. Go to **Xcode > Settings > Platforms**
3. Download the iOS Simulator runtime
4. Or restart your Mac

### Issue: "Pod install fails"
**Solution**:
```bash
cd ios
pod deintegrate
pod cache clean --all
pod install --repo-update
cd ..
```

### Issue: "Build failed with exit code 65"
**Solution**: 
1. Clean Xcode build: In Xcode, go to **Product > Clean Build Folder** (Shift + Cmd + K)
2. Delete derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. Reinstall pods:
   ```bash
   cd ios
   pod install
   cd ..
   ```

### Issue: "Signing for MobileApp requires a development team"
**Solution**:
1. Open `ios/MobileApp.xcworkspace` in Xcode
2. Select **MobileApp** project > **MobileApp** target
3. Go to **Signing & Capabilities**
4. Select your **Team** (or add your Apple ID)

### Issue: Metro bundler port 8081 already in use
**Solution**:
```bash
lsof -ti:8081 | xargs kill -9
npm start
```

### Issue: App crashes on launch
**Solution**:
1. Check Metro bundler is running: `npm start`
2. Reset Metro cache: `npm start -- --reset-cache`
3. Clean iOS build: In Xcode, **Product > Clean Build Folder**

### Issue: "Unable to resolve module"
**Solution**:
```bash
rm -rf node_modules
npm install
cd ios
pod install
cd ..
npm start -- --reset-cache
```

## Quick Reference Commands

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on specific simulator
npx react-native run-ios --simulator="iPhone 15 Pro"

# Clean and rebuild
cd ios
rm -rf build
pod install
cd ..
npm start -- --reset-cache

# Reset Metro cache
npm start -- --reset-cache

# List available simulators
xcrun simctl list devices
```

## Common Workflow

1. **Start Metro bundler** (in one terminal):
   ```bash
   npm start
   ```

2. **Run the app** (in another terminal):
   ```bash
   npm run ios
   ```

3. **To reload**: Press `Cmd + R` in the simulator or shake device

4. **To open developer menu**: Press `Cmd + D` in simulator or shake device

## Notes

- **First build takes longer**: The first time you build, it may take 5-10 minutes
- **Keep Metro running**: Metro bundler must be running while the app is running
- **Use .xcworkspace**: Always open `.xcworkspace`, never `.xcodeproj` directly
- **Xcode updates**: Keep Xcode updated for best compatibility

## Next Steps

Once the app is running:
- Test the admin login flow
- Test user login/signup
- Test navigation between screens
- Check that API calls are working

For Android setup, see `README.md` in the MobileApp directory.
