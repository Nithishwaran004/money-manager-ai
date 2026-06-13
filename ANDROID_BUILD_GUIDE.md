# 📱 Android APK Build Guide

## Prerequisites

- Node.js 18+ installed
- Android Studio installed
- JDK 17 installed
- Android SDK configured

## Step-by-Step Build Process

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the React App

```bash
npm run build
```

This creates the `dist` folder with your compiled React app.

### 3. Initialize Capacitor (First Time Only)

```bash
npx cap init
```

When prompted:
- App name: `KlickEx MoneySense`
- App ID: `com.klickex.moneysense`
- Web directory: `dist`

### 4. Add Android Platform (First Time Only)

```bash
npx cap add android
```

### 5. Sync Web Assets to Android

```bash
npx cap sync android
```

This copies your built web app to the Android project.

### 6. Configure Android Permissions

The microphone permission should already be configured, but verify in:
`android/app/src/main/AndroidManifest.xml`

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    
    <application>
        <!-- ... -->
    </application>
</manifest>
```

### 7. Open in Android Studio

```bash
npx cap open android
```

### 8. Build APK in Android Studio

1. Wait for Gradle sync to complete
2. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Wait for build to complete
4. Click **locate** in the notification to find your APK

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### 9. Install APK on Android Device

#### Via ADB:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### Via File Transfer:
1. Copy `app-debug.apk` to your phone
2. Open the file
3. Allow installation from unknown sources if prompted
4. Install

## Development Workflow

### For Web Development (Hot Reload)
```bash
npm run dev
# Open http://localhost:3000
```

### For Android Development (Live Reload)

1. Find your computer's local IP:
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

2. Update `capacitor.config.ts`:
```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:3000',
  cleartext: true
}
```

3. Sync changes:
```bash
npx cap sync android
```

4. Run dev server:
```bash
npm run dev
```

5. Run app in Android Studio

Now the app will connect to your dev server with hot reload!

### After Making Changes

```bash
# 1. Rebuild web app
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Rebuild APK or run in Android Studio
```

## Testing Speech Recognition

### Browser Testing
1. Use Chrome or Edge
2. Grant microphone permission
3. Click mic icon and speak
4. Check console for platform: "Web (Browser)"

### Native Android Testing
1. Install APK on Android device
2. Grant microphone permission when prompted
3. Click mic icon and speak
4. Check logcat for platform: "Native (Capacitor)"

## Troubleshooting

### Build Fails: "SDK location not found"

Create `android/local.properties`:
```
sdk.dir=/path/to/Android/Sdk
```

### Microphone Not Working
- Check `AndroidManifest.xml` has `RECORD_AUDIO` permission
- Verify permission granted in Android Settings → Apps → KlickEx → Permissions

### App Crashes on Startup
- Check `npm run build` completed successfully
- Verify `npx cap sync` ran without errors
- Check Android Studio logcat for error messages

### Speech Recognition Not Accurate
- Ensure device language matches app language
- Test in quiet environment
- Try Google's speech input in other apps to verify hardware

## Environment Variables

For production builds, update `.env`:
```bash
GEMINI_API_KEY=your_actual_key_here
APP_URL=your_production_url
```

## Signing APK for Release

1. Generate keystore:
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Update `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file("my-release-key.keystore")
            storePassword "password"
            keyAlias "my-key-alias"
            keyPassword "password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

3. Build release APK:
```bash
cd android
./gradlew assembleRelease
```

## Optimizations

### Reduce APK Size
- Enable ProGuard/R8 in `build.gradle`
- Use WebP images instead of PNG
- Remove unused dependencies

### Improve Performance
- Enable production build: `npm run build`
- Use code splitting in Vite config
- Optimize images and assets

## Quick Commands Reference

```bash
# Full rebuild workflow
npm run build && npx cap sync android && npx cap open android

# Clean build
rm -rf dist android node_modules
npm install
npm run build
npx cap add android
npx cap sync android

# Check Capacitor
npx cap doctor

# Update Capacitor
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
npx cap sync
```

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio Download](https://developer.android.com/studio)
- [Speech Recognition Plugin](https://github.com/capacitor-community/speech-recognition)
