# Step-by-Step: Run Your App Now! 🚀

Follow these steps **exactly in order** to run your app successfully.

## ✅ Pre-Check: What We Fixed

- ✅ Port 8081 issue - Fixed with `fix-port.sh` script
- ✅ Gradle version - Updated to 9.0 (compatible version)
- ✅ Android SDK paths - Setup script created
- ✅ Emulator found - You have `Medium_Phone_API_36.1` emulator

## ⚠️ IMPORTANT: Java Version Issue

**You have Java 24 installed, but Gradle needs Java 21 or 23.**

**Before proceeding, install Java 21:**

```bash
# Install Java 21
brew install openjdk@21

# Link it
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk

# Set JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc

# Verify
java -version
```

**See `FIX_JAVA_VERSION.md` for detailed instructions.**

---

## Step 1: Reload Shell Configuration (REQUIRED)

Open your terminal and run:

```bash
source ~/.zshrc
```

This loads the Android SDK paths we just added.

**Verify it worked:**
```bash
adb version
```

You should see adb version info. If not, run the setup script again:
```bash
cd "Journey-Through-Pakistan/MobileApp"
./setup-android-env.sh
source ~/.zshrc
```

---

## Step 2: Start Your Android Emulator

You have an emulator called `Medium_Phone_API_36.1`. Start it:

### Option A: Using Android Studio
1. Open **Android Studio**
2. Click **Tools → Device Manager**
3. Find **Medium_Phone_API_36.1**
4. Click the **Play** button ▶️
5. Wait for it to boot (may take 1-2 minutes)

### Option B: Using Command Line
```bash
# List emulators
emulator -list-avds

# Start your emulator
emulator -avd Medium_Phone_API_36.1 &
```

**Verify emulator is running:**
```bash
adb devices
```

You should see:
```
List of devices attached
emulator-5554   device
```

---

## Step 3: Fix Port 8081 (If Needed)

Open a terminal and run:

```bash
cd "Journey-Through-Pakistan/MobileApp"
./fix-port.sh
```

This kills any process using port 8081.

---

## Step 4: Start Backend Server (Terminal 1)

**Open a NEW terminal window** and run:

```bash
cd "Journey-Through-Pakistan/Server"
npm start
```

**Keep this terminal open!** You should see:
```
Server is on! Port 3000
```

**Don't close this terminal!**

---

## Step 5: Start Metro Bundler (Terminal 2)

**Open a NEW terminal window** (keep Terminal 1 running) and run:

```bash
cd "Journey-Through-Pakistan/MobileApp"

# Fix port if needed
./fix-port.sh

# Start Metro bundler
npm start
```

**Keep this terminal open!** You should see:
```
Metro waiting on exp://192.168.x.x:8081
```

**Don't close this terminal!**

---

## Step 6: Clean Gradle Build (First Time Only)

**Open a NEW terminal window** (keep Terminals 1 & 2 running) and run:

```bash
cd "Journey-Through-Pakistan/MobileApp/android"
./gradlew clean
cd ..
```

This cleans any previous build issues.

---

## Step 7: Run the App (Terminal 3)

**In the same terminal** (or a new one), run:

```bash
cd "Journey-Through-Pakistan/MobileApp"

# Verify emulator is connected
adb devices

# Run the app
npm run android
```

**What happens:**
1. Gradle will build the Android project (first time takes 2-5 minutes)
2. App will install on your emulator
3. App will launch automatically
4. You should see the **Login Screen**!

---

## 🎉 Success!

If everything worked, you should see:
- ✅ Metro bundler running
- ✅ Backend server running
- ✅ App installed on emulator
- ✅ Login screen displayed

---

## ⚠️ If You Get Errors

### Error: "adb: command not found"
```bash
source ~/.zshrc
adb version
```

### Error: "No devices found"
```bash
# Check if emulator is running
adb devices

# If not, start emulator (see Step 2)
```

### Error: "Port 8081 already in use"
```bash
cd "Journey-Through-Pakistan/MobileApp"
./fix-port.sh
npm start
```

### Error: "Gradle build failed"
```bash
cd "Journey-Through-Pakistan/MobileApp/android"
./gradlew clean
./gradlew --stop
cd ..
npm run android
```

### Error: "Network request failed"
- Make sure backend server is running (Terminal 1)
- Check server shows: `Server is on! Port 3000`

---

## 📱 Testing the App

Once the app is running:

1. **Login Screen**: You should see email/password fields
2. **Signup**: Tap "Sign Up" to create account
3. **Home**: After login, you'll see the home screen

---

## Quick Reference

**Terminal 1** (Backend Server):
```bash
cd "Journey-Through-Pakistan/Server"
npm start
```

**Terminal 2** (Metro Bundler):
```bash
cd "Journey-Through-Pakistan/MobileApp"
./fix-port.sh
npm start
```

**Terminal 3** (Run App):
```bash
cd "Journey-Through-Pakistan/MobileApp"
adb devices  # Verify emulator
npm run android
```

---

## Next Time You Run

After the first successful run, you only need:

1. Start emulator
2. Start backend server (Terminal 1)
3. Start Metro bundler (Terminal 2)
4. Run app (Terminal 3)

**That's it!** 🎉

