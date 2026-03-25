#!/usr/bin/env bash
# Start the GST Invoice React Native app on Android emulator

set -e

# Load nvm
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 18

# Android SDK + Java paths
export JAVA_HOME=~/Android/jdk/jdk-17.0.11+9
export ANDROID_HOME=~/Android/sdk
export PATH=$JAVA_HOME/bin:$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator

cd "$(dirname "$0")"

# Check if emulator is running
DEVICE=$(adb devices 2>/dev/null | grep "emulator.*device$" | head -1)

if [ -z "$DEVICE" ]; then
  echo "No emulator running. Starting Pixel_7_API_35..."
  nohup emulator -avd Pixel_7_API_35 -no-audio -no-boot-anim -no-snapshot \
    -gpu swiftshader_indirect -memory 2048 > /tmp/emulator.log 2>&1 &

  echo "Waiting for emulator to boot (this takes ~30-60 seconds)..."
  for i in {1..40}; do
    BOOT=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')
    if [ "$BOOT" = "1" ]; then
      echo "Emulator ready!"
      break
    fi
    sleep 5
  done
else
  echo "Emulator already running: $DEVICE"
fi

# Start Expo (EXPO_OFFLINE skips the Expo Go version prompt)
echo "Starting Expo..."
EXPO_OFFLINE=1 npx expo start --android
