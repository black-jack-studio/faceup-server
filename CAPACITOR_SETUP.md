# Capacitor Mobile App Setup

This guide explains how to build and run the FaceUp app on iOS and Android using Capacitor.

## Prerequisites

### For iOS Development
- macOS computer
- Xcode installed (latest version recommended)
- Apple Developer account (for device testing and App Store deployment)
- CocoaPods installed (`sudo gem install cocoapods`)

### For Android Development
- Android Studio installed (latest version recommended)
- Android SDK configured
- Java Development Kit (JDK) 11 or higher

## Build Commands

We've created `capacitor-scripts.sh` for easy command access:

```bash
# Make the script executable (first time only)
chmod +x capacitor-scripts.sh

# Build the web app
./capacitor-scripts.sh build

# Sync web assets to native platforms
./capacitor-scripts.sh sync

# Build and sync in one command
./capacitor-scripts.sh build_and_sync

# Open iOS project in Xcode
./capacitor-scripts.sh ios

# Open Android project in Android Studio
./capacitor-scripts.sh android
```

Or use npm/npx commands directly:

```bash
# Build web app
npm run build

# Sync to native platforms
npx cap sync

# Open in Xcode
npx cap open ios

# Open in Android Studio
npx cap open android
```

## Development Workflow

1. **Make changes to your web app** (React/TypeScript code)
2. **Build the web app**: `npm run build`
3. **Sync to native platforms**: `npx cap sync`
4. **Open in IDE**:
   - iOS: `npx cap open ios` (opens Xcode)
   - Android: `npx cap open android` (opens Android Studio)
5. **Run on device/simulator** from Xcode or Android Studio

## OAuth Deep Link Configuration

The app uses a custom URL scheme for OAuth callbacks:

- **URL Scheme**: `faceup://auth/callback`
- **iOS Configuration**: `ios/App/App/Info.plist`
- **Android Configuration**: `android/app/src/main/AndroidManifest.xml`

### How it works:

1. User clicks Apple/Google login button on mobile
2. App detects platform using `Capacitor.isNativePlatform()`
3. Redirects to provider with `redirectTo: "faceup://auth/callback"`
4. Provider authenticates and redirects back to app via deep link
5. Deep link handler (`client/src/deep-link.ts`) catches the callback
6. Exchanges auth code for Supabase session
7. User is logged in

## Testing OAuth on Devices

### iOS Testing
1. Open project in Xcode: `npx cap open ios`
2. Select your development team in Signing & Capabilities
3. Choose a simulator or connected device
4. Click Run (⌘R)
5. Test Apple/Google login flows

### Android Testing
1. Open project in Android Studio: `npx cap open android`
2. Wait for Gradle sync to complete
3. Choose an emulator or connected device
4. Click Run (Shift+F10)
5. Test Google login flow (Apple Sign In requires additional setup on Android)

## Troubleshooting

### iOS Issues

**CocoaPods not installed**:
```bash
sudo gem install cocoapods
cd ios/App
pod install
```

**Signing issues**:
- Go to Xcode → Signing & Capabilities
- Select your Apple Developer team
- Enable "Automatically manage signing"

### Android Issues

**Gradle sync failed**:
- File → Invalidate Caches / Restart in Android Studio
- Delete `android/.gradle` folder and resync

**SDK not found**:
- File → Project Structure → SDK Location
- Set Android SDK path (usually `~/Library/Android/sdk` on macOS)

## Deployment

### iOS App Store
1. Archive the app in Xcode (Product → Archive)
2. Upload to App Store Connect
3. Complete app metadata and submit for review

### Google Play Store
1. Generate signed APK/Bundle in Android Studio (Build → Generate Signed Bundle/APK)
2. Upload to Google Play Console
3. Complete store listing and submit for review

## Important Notes

- Always run `npm run build && npx cap sync` after code changes
- Native dependencies require full sync, not just copy
- Test OAuth flows on real devices before deployment
- Keep URL schemes consistent across platforms
- Monitor Supabase OAuth logs for debugging
