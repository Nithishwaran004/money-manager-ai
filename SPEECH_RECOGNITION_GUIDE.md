# 🎤 Unified Speech Recognition Guide

## Overview

This app uses a **unified speech service** that automatically detects the platform and uses the best speech recognition method:

- **Browser (Web)**: Web Speech API
- **Native Android**: Capacitor Speech Recognition Plugin

## Architecture

```
┌─────────────────────────────────────────┐
│         User Interface (App.tsx)        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Unified Speech Service                │
│   (src/services/speechService.ts)       │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐ ┌──────────────────┐
│ Web Speech  │ │ Capacitor Speech │
│ API         │ │ Recognition      │
│ (Browser)   │ │ (Native Android) │
└─────────────┘ └──────────────────┘
```

## Features

✅ **Automatic Platform Detection** - Uses `Capacitor.isNativePlatform()`
✅ **Single API Interface** - Same methods for both platforms
✅ **Permission Handling** - Automatic permission requests
✅ **Real-time Transcription** - Interim and final results
✅ **Multi-language Support** - English and Tamil
✅ **Error Handling** - Comprehensive error messages

## Usage

### Starting Speech Recognition

```typescript
import { speechService } from './services/speechService';

// Start listening
await speechService.startListening();
```

### Stopping Speech Recognition

```typescript
// Stop listening
await speechService.stopListening();
```

### Setting Language

```typescript
// Set to Tamil
speechService.setLanguage('ta');

// Set to English
speechService.setLanguage('en');
```

### Callbacks

```typescript
speechService.setCallbacks({
  onStart: () => {
    console.log('Started listening');
  },
  onResult: (result) => {
    console.log('Transcript:', result.transcript);
    console.log('Is Final:', result.isFinal);
  },
  onEnd: () => {
    console.log('Stopped listening');
  },
  onError: (error) => {
    console.error('Error:', error);
  }
});
```

## Platform-Specific Behavior

### Web Speech API (Browser)
- **Continuous listening** with interim results
- **Automatic permissions** via browser prompt
- **Works on**: Chrome, Edge, Safari (iOS 14.5+)

### Capacitor Speech Recognition (Native Android)
- **Native Android speech recognition**
- **Better accuracy** on Android devices
- **Permissions** requested via Android system
- **Works on**: Android 5.0+

## Testing

### Browser Testing
1. Run `npm run dev`
2. Open http://localhost:3000
3. Click microphone icon
4. Allow microphone permission
5. Speak and see real-time transcription

### Native Android Testing
1. Build APK: `npm run build && npx cap sync`
2. Open in Android Studio: `npx cap open android`
3. Run on device/emulator
4. Grant microphone permission when prompted
5. Test voice recognition

## Permissions

### Browser
- Automatically requested when starting recognition
- User must click "Allow" in browser prompt

### Android (Native)
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "not-allowed" | Permission denied | Request user to allow microphone |
| "no-speech" | No audio detected | Ask user to speak louder |
| "audio-capture" | No microphone found | Check hardware |
| "network" | Network issue | Check internet connection |

## API Reference

### `speechService.isAvailable()`
Returns: `Promise<boolean>`
Checks if speech recognition is available

### `speechService.requestPermissions()`
Returns: `Promise<boolean>`
Requests microphone permissions

### `speechService.startListening()`
Returns: `Promise<void>`
Starts speech recognition

### `speechService.stopListening()`
Returns: `Promise<void>`
Stops speech recognition

### `speechService.setLanguage(language: 'en' | 'ta')`
Sets the recognition language

### `speechService.isCurrentlyListening()`
Returns: `boolean`
Check if currently listening

### `speechService.getPlatform()`
Returns: `'native' | 'web'`
Get current platform type

## Troubleshooting

### Speech not working in browser
- Use Chrome or Edge (best support)
- Check microphone permissions in browser settings
- Try HTTPS (required for microphone on non-localhost)

### Speech not working on Android
- Check microphone permission in app settings
- Ensure Android version is 5.0+
- Test with different speech input apps

### Poor recognition accuracy
- Speak clearly and at normal pace
- Reduce background noise
- Check microphone is not muted
- Try speaking closer to device

## Performance Tips

1. **Language Selection**: Set correct language for better accuracy
2. **Noise Reduction**: Use in quiet environment
3. **Clear Speech**: Speak naturally but clearly
4. **Short Phrases**: Better for financial transactions

## Security Considerations

- ✅ Microphone permission required
- ✅ Audio not stored on device
- ✅ Transcription happens locally (Web) or via Android system
- ✅ No audio sent to external servers in native mode

## Future Enhancements

- [ ] Offline recognition support
- [ ] Custom vocabulary for financial terms
- [ ] Speaker identification
- [ ] Noise cancellation improvements
