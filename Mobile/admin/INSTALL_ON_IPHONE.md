# Install Admin App on Your iPhone

## Overview
Unlike Android (APK files), iOS requires either:
1. **Development Build** - Install directly via Xcode (easiest, free)
2. **IPA File** - Create a distributable file (requires Apple Developer account - $99/year)

## Option 1: Install via Xcode (Recommended - Free)

This is the easiest way to test on your iPhone.

### Prerequisites
- iPhone connected via USB cable
- Xcode installed
- Your Apple ID (free)

### Step 1: Connect Your iPhone

1. Connect your iPhone to your Mac via USB cable
2. Unlock your iPhone
3. Trust the computer if prompted (tap "Trust" on iPhone)

### Step 2: Open Xcode Project

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
open MobileApp.xcworkspace
```

### Step 3: Configure Signing in Xcode

1. In Xcode, click **"MobileApp"** in the left sidebar (blue icon at top)
2. Select the **"MobileApp"** target (under TARGETS)
3. Go to **"Signing & Capabilities"** tab
4. Check **"Automatically manage signing"**
5. Under **"Team"**, select your Apple ID
   - If you don't see it, click "Add Account..." and sign in
6. Xcode will automatically create a provisioning profile

### Step 4: Select Your iPhone

1. At the top toolbar, click the device selector (next to the Play button)
2. Select your iPhone from the list
   - It will show as: "Your iPhone Name" or "iPhone (Your Name)"

### Step 5: Build and Install

1. Click the **Play button** (▶️) or press `Cmd + R`
2. First time: On your iPhone, go to **Settings > General > VPN & Device Management**
3. Tap on your Apple ID/Developer App
4. Tap **"Trust [Your Name]"**
5. Tap **"Trust"** to confirm
6. The app will install and launch on your iPhone!

### Step 6: Run Metro Bundler

In a terminal, start Metro bundler:

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm start
```

The app should now work on your iPhone!

---

## Option 2: Create IPA File (For Distribution)

If you want to create an IPA file (like APK for Android), you need an Apple Developer account ($99/year).

### Step 1: Get Apple Developer Account

1. Go to: https://developer.apple.com/programs/
2. Enroll ($99/year)
3. Wait for approval (usually instant)

### Step 2: Configure in Xcode

1. Open the workspace:
   ```bash
   cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
   open MobileApp.xcworkspace
   ```

2. In Xcode:
   - Click "MobileApp" → Select target
   - Go to "Signing & Capabilities"
   - Select your **Apple Developer Team** (not personal team)
   - Change Bundle Identifier if needed (must be unique)

### Step 3: Archive the App

1. In Xcode menu: **Product > Scheme > MobileApp**
2. Select **"Any iOS Device"** from device selector (top toolbar)
3. Go to **Product > Archive**
4. Wait for build to complete (5-10 minutes)

### Step 4: Export IPA

1. After archive completes, **Organizer** window opens
2. Select your archive
3. Click **"Distribute App"**
4. Choose **"Ad Hoc"** (for testing) or **"App Store"** (for distribution)
5. Follow the wizard to export IPA file
6. Save the IPA file

### Step 5: Install IPA on iPhone

**Method A: Via Xcode**
- Connect iPhone
- Drag IPA file to Xcode's Devices window
- Install on device

**Method B: Via iTunes/Finder**
- Connect iPhone
- Open Finder (or iTunes)
- Select your iPhone
- Drag IPA to "Apps" section

**Method C: Via TestFlight** (Recommended for testing)
- Upload IPA to App Store Connect
- Add testers
- Install TestFlight app on iPhone
- Install your app via TestFlight

---

## Quick Summary - Install on iPhone (Free Method)

```bash
# 1. Connect iPhone via USB
# 2. Open Xcode
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
open MobileApp.xcworkspace

# 3. In Xcode:
#    - Select your iPhone from device selector
#    - Click Play button (▶️)
#    - Trust developer on iPhone if prompted

# 4. Start Metro bundler
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm start
```

---

## Troubleshooting

### "No devices found"
- Make sure iPhone is unlocked
- Check USB cable connection
- Trust the computer on iPhone
- In Xcode: Window > Devices and Simulators - check if iPhone appears

### "Signing requires a development team"
- Go to Xcode > Preferences > Accounts
- Add your Apple ID
- Select it in Signing & Capabilities

### "Untrusted Developer"
- On iPhone: Settings > General > VPN & Device Management
- Tap your developer account
- Tap "Trust"

### App crashes on launch
- Make sure Metro bundler is running: `npm start`
- Check iPhone and Mac are on same WiFi network
- Or configure Metro to use your Mac's IP address

### Build fails
- Clean build: Product > Clean Build Folder (Shift + Cmd + K)
- Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Reinstall pods: `cd ios && pod install`

---

## Notes

- **Free Apple ID**: Can install on your own devices (limited to 3 apps, expires after 7 days)
- **Paid Developer Account**: No limits, apps don't expire, can distribute to others
- **IPA vs APK**: IPA files are signed and can only be installed on registered devices (unlike APK)
- **Wireless Debugging**: After first USB install, you can enable wireless debugging in Xcode

