# Fix Gradle Java Version Issue

## Problem
Gradle is still using Java 24, but it needs Java 21.

## Solution

### Step 1: Verify Java 21 is Installed
```bash
/usr/libexec/java_home -V
```

You should see Java 21 listed.

### Step 2: Set JAVA_HOME for Gradle

**Option A: Set in Terminal (Temporary)**
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
cd "Journey-Through-Pakistan/MobileApp/android"
./gradlew clean
```

**Option B: Set in gradle.properties (Permanent)**

Add this line to `android/gradle.properties`:
```properties
org.gradle.java.home=/Users/personal/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home
```

**To find your Java 21 path:**
```bash
/usr/libexec/java_home -v 21
```

Then add that path to `gradle.properties`:
```properties
org.gradle.java.home=<path_from_above_command>
```

### Step 3: Verify
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
java -version  # Should show Java 21
cd "Journey-Through-Pakistan/MobileApp/android"
./gradlew clean
```

---

## Quick Fix Command

Run this before building:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
cd "Journey-Through-Pakistan/MobileApp"
npm run android
```

Or add to `~/.zshrc`:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

Then reload:
```bash
source ~/.zshrc
```

