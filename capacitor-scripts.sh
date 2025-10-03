#!/bin/bash

# Capacitor Scripts for FaceUp Mobile App
# Since package.json cannot be modified, use these commands directly

# Build the web app
build() {
  npm run build
}

# Sync web assets to native platforms
sync() {
  npx cap sync
}

# Copy web assets only (without updating native dependencies)
copy() {
  npx cap copy
}

# Open iOS project in Xcode
ios() {
  npx cap open ios
}

# Open Android project in Android Studio
android() {
  npx cap open android
}

# Full build and sync
build_and_sync() {
  npm run build && npx cap sync
}

# Run the command passed as argument
if [ $# -eq 0 ]; then
  echo "Usage: ./capacitor-scripts.sh [build|sync|copy|ios|android|build_and_sync]"
  echo ""
  echo "Available commands:"
  echo "  build           - Build the web app (npm run build)"
  echo "  sync            - Sync web assets to native platforms (npx cap sync)"
  echo "  copy            - Copy web assets only (npx cap copy)"
  echo "  ios             - Open iOS project in Xcode (npx cap open ios)"
  echo "  android         - Open Android project in Android Studio (npx cap open android)"
  echo "  build_and_sync  - Build and sync in one command"
else
  $1
fi
