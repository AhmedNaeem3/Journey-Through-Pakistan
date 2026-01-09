# Install Java 21 - Required for Gradle

## Problem
Gradle 8.10.2 requires Java 21, but your system only has Java 24.

## Solution: Download and Install Java 21

### Option 1: Download from Adoptium (Easiest)

1. **Visit**: https://adoptium.net/temurin/releases/?version=21
2. **Download**: macOS ARM64 (Apple Silicon) or x64 (Intel)
3. **Install**: Double-click the .pkg file
4. **Verify**:
   ```bash
   /usr/libexec/java_home -V
   ```
   You should see Java 21 listed.

5. **Set JAVA_HOME**:
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 21)
   echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
   source ~/.zshrc
   ```

### Option 2: Using SDKMAN (Recommended for Developers)

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
```

### Option 3: Manual Download and Setup

```bash
# Download Java 21 (ARM64 for Apple Silicon)
cd ~/Downloads
curl -L -o openjdk-21.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/mac/aarch64/jdk/hotspot/normal/eclipse"

# Extract
tar -xzf openjdk-21.tar.gz

# Move to standard location
sudo mv jdk-21* /Library/Java/JavaVirtualMachines/openjdk-21.jdk

# Set JAVA_HOME
export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home
echo 'export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home' >> ~/.zshrc
source ~/.zshrc

# Verify
java -version
```

---

## After Installing Java 21

1. **Verify installation**:
   ```bash
   /usr/libexec/java_home -V
   java -version
   ```

2. **Set JAVA_HOME**:
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 21)
   ```

3. **Test Gradle**:
   ```bash
   cd "Journey-Through-Pakistan/MobileApp/android"
   ./gradlew clean
   ```

4. **Run app**:
   ```bash
   cd "Journey-Through-Pakistan/MobileApp"
   npm run android
   ```

---

## Quick Install Command (Adoptium)

For macOS ARM64 (Apple Silicon):
```bash
cd ~/Downloads
curl -L -o OpenJDK21.pkg "https://api.adoptium.net/v3/installer/latest/21/ga/mac/aarch64/jdk/hotspot/normal/eclipse?project=jdk"
open OpenJDK21.pkg
# Follow installer, then:
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

For macOS x64 (Intel):
```bash
cd ~/Downloads
curl -L -o OpenJDK21.pkg "https://api.adoptium.net/v3/installer/latest/21/ga/mac/x64/jdk/hotspot/normal/eclipse?project=jdk"
open OpenJDK21.pkg
# Follow installer, then:
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

---

**After installing, continue with RUN_APP_COMMANDS.md**

