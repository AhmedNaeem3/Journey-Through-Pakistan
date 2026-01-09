# Fix Java Version Issue

## Problem
You have Java 24 installed, but Gradle needs Java 21 or 23 (LTS versions).

## Solution: Install Java 21 (Recommended)

### Option 1: Using Homebrew (Easiest)

```bash
# Install Java 21
brew install openjdk@21

# Link it
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk

# Set JAVA_HOME for this session
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# Add to ~/.zshrc permanently
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc
```

### Option 2: Download from Oracle/Adoptium

1. Visit: https://adoptium.net/temurin/releases/?version=21
2. Download macOS ARM64 version
3. Install the .pkg file
4. Set JAVA_HOME:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc
```

### Verify Installation

```bash
java -version
# Should show: openjdk version "21.x.x"

echo $JAVA_HOME
# Should show path to Java 21
```

### After Installing Java 21

```bash
cd "Journey-Through-Pakistan/MobileApp/android"
./gradlew clean
cd ..
npm run android
```

---

## Alternative: Use Java 23

If you prefer Java 23:

```bash
brew install openjdk@23
sudo ln -sfn /opt/homebrew/opt/openjdk@23/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-23.jdk
export JAVA_HOME=$(/usr/libexec/java_home -v 23)
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 23)' >> ~/.zshrc
source ~/.zshrc
```

---

## Quick Fix (Temporary)

If you want to test quickly without installing:

```bash
# This will fail, but you can see the error
cd "Journey-Through-Pakistan/MobileApp/android"
./gradlew clean
```

Then install Java 21 using Option 1 above.

---

**After fixing Java version, continue with STEP_BY_STEP_RUN.md**

