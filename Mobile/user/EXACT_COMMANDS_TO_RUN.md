# ✅ Exact Commands to Run Your App - Copy & Paste

## Current Status
- ✅ Server running
- ✅ Metro bundler running  
- ✅ Emulator connected (`adb devices` shows device)
- ✅ Dependencies installed
- ❌ **Java 21 not properly installed** (only Java 24 found)

---

## Step 1: Install Java 21 (REQUIRED)

**Run these commands one by one:**

```bash
# Download Java 21 for macOS ARM64 (Apple Silicon)
cd ~/Downloads
curl -L -o OpenJDK21.pkg "https://api.adoptium.net/v3/installer/latest/21/ga/mac/aarch64/jdk/hotspot/normal/eclipse?project=jdk"
```

**Then install it:**
```bash
open OpenJDK21.pkg
```

**Follow the installer, then verify:**
```bash
/usr/libexec/java_home -V
```

You should see Java 21 listed.

---

## Step 2: Set JAVA_HOME to Java 21

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc
```

**Verify:**
```bash
java -version
```

Should show: `openjdk version "21.x.x"`

---

## Step 3: Clean Gradle Build

```bash
cd "Journey-Through-Pakistan/MobileApp/android"
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./gradlew clean
```

**Wait for it to complete.** This may take 1-2 minutes.

---

## Step 4: Run the App

**Make sure:**
- ✅ Backend server is running (Terminal 1)
- ✅ Metro bundler is running (Terminal 2)  
- ✅ Emulator is running (`adb devices` shows device)

**Then run:**
```bash
cd "Journey-Through-Pakistan/MobileApp"
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
npm run android
```

---

## Alternative: Use the Run Script

After installing Java 21:

```bash
cd "Journey-Through-Pakistan/MobileApp"
./run-android.sh
```

---

## If Java 21 Installation Fails

**Try SDKMAN instead:**

```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install Java 21
sdk install java 21.0.1-tem

# Set as default
sdk default java 21.0.1-tem

# Verify
java -version

# Then run app
cd "Journey-Through-Pakistan/MobileApp"
npm run android
```

---

## Quick Test After Java 21 Installation

```bash
# 1. Verify Java 21
java -version

# 2. Set JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# 3. Test Gradle
cd "Journey-Through-Pakistan/MobileApp/android"
./gradlew --version

# Should show Gradle 8.10.2 with Java 21
```

---

## Summary

**The issue is:** Gradle needs Java 21, but only Java 24 is installed.

**The solution is:** Install Java 21, then set JAVA_HOME to point to it.

**After that:** `npm run android` will work!

---

**🎯 Follow Step 1-4 above in order, and your app will run!**

