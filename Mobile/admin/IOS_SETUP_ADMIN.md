# iOS Setup for Admin App - Step by Step

## Issue: Ruby Version Compatibility

Your system Ruby is 2.6.10, but CocoaPods requires Ruby 3.0+. However, the admin app has a Gemfile that specifies compatible versions.

## Solution: Use Bundle Exec

The admin folder has a `Gemfile` that will install a compatible version of CocoaPods. You need to run bundle install with sudo first, then use `bundle exec pod`.

## Step-by-Step Commands

### Step 1: Install Bundler Dependencies (requires sudo password)

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
sudo bundle install
```

**Note:** You'll be prompted for your password. This installs CocoaPods and dependencies to system directories.

### Step 2: Install Node Dependencies

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm install
```

### Step 3: Install iOS Dependencies (CocoaPods)

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
bundle exec pod install
```

**Note:** This uses the CocoaPods installed via bundle, which is compatible with Ruby 2.6.

### Step 4: Configure Xcode (First Time Only)

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
open MobileApp.xcworkspace
```

In Xcode:
1. Click "MobileApp" in left sidebar
2. Go to "Signing & Capabilities" tab
3. Select your Apple ID/Team
4. Choose a simulator (e.g., "iPhone 15 Pro")

### Step 5: Run the Admin App

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

## Alternative: Install CocoaPods Directly (if bundle doesn't work)

If `bundle install` fails, try installing an older CocoaPods version:

```bash
sudo gem install cocoapods -v 1.13.0
```

Then use `pod install` directly (without bundle exec):

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
pod install
```

## Quick Command Summary

```bash
# Setup (one time)
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
sudo bundle install
npm install
cd ios && bundle exec pod install && cd ..

# Run app (every time)
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm start  # Terminal 1
npm run ios  # Terminal 2
```

## Troubleshooting

### If bundle install fails:
Try installing CocoaPods directly with an older version:
```bash
sudo gem install cocoapods -v 1.13.0
```

### If pod install fails:
```bash
cd ios
bundle exec pod deintegrate
bundle exec pod install
```

### If build fails in Xcode:
1. Clean: `Product > Clean Build Folder` (Shift + Cmd + K)
2. Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
3. Reinstall pods: `bundle exec pod install`

