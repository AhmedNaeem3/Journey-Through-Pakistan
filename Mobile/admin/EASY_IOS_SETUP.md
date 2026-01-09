# Easy iOS Setup for Admin App - Step by Step

## Why the script got stuck?

The script was waiting for your password for `sudo`. Let's do this manually in clear steps.

---

## Step 1: Install CocoaPods (One-Time, Requires Password)

Open a terminal and run this command. **You'll be prompted to enter your password:**

```bash
sudo gem install cocoapods -v 1.13.2
```

**Note:** 
- Type your password when prompted (you won't see it being typed - that's normal)
- Press Enter after typing your password
- This may take 2-3 minutes

**Verify installation:**
```bash
pod --version
```
You should see: `1.13.2` (or similar)

---

## Step 2: Install Node Dependencies

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm install
```

This installs all JavaScript/React Native dependencies.

---

## Step 3: Install iOS Dependencies (CocoaPods)

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
pod install
cd ..
```

**Note:** This will take 5-10 minutes the first time as it downloads all iOS libraries.

---

## Step 4: Run the Admin App

### Option A: Using React Native CLI (Recommended)

**Open Terminal 1:**
```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm start
```

**Open Terminal 2 (new terminal window):**
```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm run ios
```

### Option B: Using Xcode

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
open MobileApp.xcworkspace
```

Then in Xcode:
1. Select a simulator (e.g., "iPhone 15 Pro") from the top toolbar
2. Click the Play button (▶️) or press `Cmd + R`

---

## First Time Xcode Configuration

If this is your first time running iOS apps:

1. Open the workspace:
   ```bash
   cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
   open MobileApp.xcworkspace
   ```

2. In Xcode:
   - Click "MobileApp" in the left sidebar
   - Go to "Signing & Capabilities" tab
   - Under "Team", select your Apple ID
   - Xcode will automatically create a provisioning profile

---

## Quick Command Summary

```bash
# 1. Install CocoaPods (one time, needs password)
sudo gem install cocoapods -v 1.13.2

# 2. Install dependencies
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm install
cd ios && pod install && cd ..

# 3. Run app (two terminals)
# Terminal 1:
npm start

# Terminal 2:
npm run ios
```

---

## Troubleshooting

### If CocoaPods installation fails:
- Make sure you're entering your password correctly
- Try: `sudo gem install cocoapods -v 1.13.2 --user-install`
- Or install via Homebrew: `brew install cocoapods` (if you have Homebrew)

### If `pod install` fails:
```bash
cd ios
pod deintegrate
pod install
```

### If build fails in Xcode:
1. Clean: `Product > Clean Build Folder` (Shift + Cmd + K)
2. Delete derived data: 
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. Reinstall pods:
   ```bash
   cd ios
   pod install
   ```

### If Metro bundler port is in use:
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9
```

---

## Alternative: Use the Non-Sudo Script

If you've already installed CocoaPods, you can use:

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
./setup-ios-manual.sh
```

This script skips the CocoaPods installation step.

