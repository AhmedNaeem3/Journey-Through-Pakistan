# Quick iOS Setup for Admin App

## Run These Commands

### Option 1: Use the Setup Script (Easiest)

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
./setup-ios.sh
```

This script will:
1. Install CocoaPods (you'll be prompted for password)
2. Install npm dependencies
3. Install iOS pods

### Option 2: Manual Setup

**Step 1: Install CocoaPods (requires password)**
```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
sudo gem install cocoapods -v 1.13.2
```

**Step 2: Install Node Dependencies**
```bash
npm install
```

**Step 3: Install iOS Dependencies**
```bash
cd ios
pod install
cd ..
```

## Run the Admin App

**Terminal 1 - Start Metro Bundler:**
```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm start
```

**Terminal 2 - Run iOS App:**
```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm run ios
```

## First Time Xcode Setup

If you haven't configured Xcode yet:

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
open MobileApp.xcworkspace
```

In Xcode:
1. Click "MobileApp" in the left sidebar
2. Go to "Signing & Capabilities" tab  
3. Select your Apple ID/Team
4. Choose a simulator from the top toolbar

## Troubleshooting

**If CocoaPods installation fails:**
- Make sure you enter your password when prompted
- Try: `sudo gem install cocoapods -v 1.13.2 --user-install`

**If pod install fails:**
```bash
cd ios
pod deintegrate
pod install
```

**If build fails:**
- Clean Xcode: `Product > Clean Build Folder` (Shift + Cmd + K)
- Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`

