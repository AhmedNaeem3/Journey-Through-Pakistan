# Fixed iOS Setup for Admin App

## The Issue
Version 1.13.2 doesn't exist. Let's install the latest compatible version.

## Step 1: Install CocoaPods (Latest Version)

Run this command in your terminal:

```bash
sudo gem install cocoapods
```

**Note:** 
- You'll be prompted for your password
- This installs the latest CocoaPods version compatible with your Ruby
- May take 2-3 minutes

**Verify installation:**
```bash
pod --version
```

---

## Step 2: Install Node Dependencies

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm install
```

---

## Step 3: Install iOS Dependencies

```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin/ios
pod install
cd ..
```

**Note:** This takes 5-10 minutes the first time.

---

## Step 4: Run the Admin App

**Terminal 1:**
```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm start
```

**Terminal 2:**
```bash
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm run ios
```

---

## Alternative: If CocoaPods Installation Fails

If you get Ruby version errors, try installing via Homebrew:

```bash
brew install cocoapods
```

Then verify:
```bash
pod --version
```

---

## Quick Command Summary

```bash
# 1. Install CocoaPods (latest version)
sudo gem install cocoapods

# 2. Verify
pod --version

# 3. Install dependencies
cd /Users/personal/JTP2/Journey-Through-Pakistan/Mobile/admin
npm install
cd ios && pod install && cd ..

# 4. Run app
# Terminal 1: npm start
# Terminal 2: npm run ios
```

