import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moneysense.app',
  appName: 'MoneySense',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development, uncomment and update with your local IP
    // url: 'http://192.168.1.100:3000',
    // cleartext: true
  },
  plugins: {
    SpeechRecognition: {
      androidIntentDefaultLanguage: 'en-US',
      androidSpeechResultsObserverKey: 'SpeechRecognitionResults',
      androidSpeechErrorKey: 'SpeechRecognitionError'
    }
  }
};

export default config;
