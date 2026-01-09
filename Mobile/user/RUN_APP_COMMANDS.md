# 🚀 Step-by-Step Commands to Run Your App

## Prerequisites Check
✅ Server is running on port 3000
✅ Metro bundler is running (`npm start`)
✅ Emulator is running (`adb devices` shows device)
✅ Dependencies installed (`npm install` completed)

---

## Method 1: Using the Run Script (Easiest)

```bash
cd "Journey-Through-Pakistan/MobileApp"
./run-android.sh
```

This script automatically finds and uses Java 21.

---

## Method 2: Manual Commands

### Step 1: Set JAVA_HOME to Java 21

**First, find your Java 21 path:**
```bash
# Check if Java 21 is accessible
java -version
```

**If Java 21 is in your PATH, set JAVA_HOME:**
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "")
```

**If that doesn't work, try:**
```bash
# For Homebrew installation
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home

# Or for standard installation
export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home
```

### Step 2: Verify Java 21
```bash
echo $JAVA_HOME
$JAVA_HOME/bin/java -version
```

Should show: `openjdk version "21.x.x"`

### Step 3: Clean Gradle Build (First Time)
```bash
cd "Journey-Through-Pakistan/MobileApp/android"
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "")
./gradlew clean
```

### Step 4: Run the App
```bash
cd "Journey-Through-Pakistan/MobileApp"
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "")
npm run android
```

---

## Method 3: Permanent JAVA_HOME Setup

Add to `~/.zshrc`:
```bash
# Set Java 21 as default
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo $JAVA_HOME)
export PATH=$JAVA_HOME/bin:$PATH
```

Then reload:
```bash
source ~/.zshrc
```

After this, you can just run:
```bash
cd "Journey-Through-Pakistan/MobileApp"
npm run android
```

---

## Troubleshooting

### Error: "Unsupported class file major version 68"
**Solution**: Java 24 is being used. Set JAVA_HOME to Java 21:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "")
```

### Error: "Java 21 not found"
**Solution**: Install Java 21:
```bash
brew install openjdk@21
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

### Error: "react-native: command not found"
**Solution**: Reinstall dependencies:
```bash
cd "Journey-Through-Pakistan/MobileApp"
npm install
```

### Error: "adb: command not found"
**Solution**: Reload shell config:
```bash
source ~/.zshrc
adb devices
```

---

## Quick Reference

**All-in-one command (if JAVA_HOME is set):**
```bash
cd "Journey-Through-Pakistan/MobileApp" && npm run android
```

**With Java 21 setup:**
```bash
cd "Journey-Through-Pakistan/MobileApp"
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "")
npm run android
```

**Using the script:**
```bash
cd "Journey-Through-Pakistan/MobileApp"
./run-android.sh
```

---

**🎉 Once JAVA_HOME points to Java 21, the app will build and run!**

