/**
 * Unified Speech Service
 * Automatically uses Web Speech API in browser or Capacitor Speech Recognition in native Android
 */

import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechServiceCallbacks {
  onStart?: () => void;
  onResult?: (result: SpeechRecognitionResult) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

class UnifiedSpeechService {
  private isNative: boolean;
  private webRecognition: any = null;
  private isListening: boolean = false;
  private callbacks: SpeechServiceCallbacks = {};
  private currentLanguage: string = 'en-US';

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    console.log('🎤 Speech Service initialized:', this.isNative ? 'Native (Capacitor)' : 'Web (Browser)');
  }

  /**
   * Check if speech recognition is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.isNative) {
      try {
        const { available } = await SpeechRecognition.available();
        return available;
      } catch (error) {
        console.error('Capacitor Speech Recognition error:', error);
        return false;
      }
    } else {
      // Check Web Speech API
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      return !!SpeechRecognitionAPI;
    }
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (this.isNative) {
      try {
        const { speechRecognition } = await SpeechRecognition.requestPermissions();
        return speechRecognition === 'granted';
      } catch (error) {
        console.error('Permission request error:', error);
        return false;
      }
    } else {
      // Web Speech API handles permissions automatically on start
      return true;
    }
  }

  /**
   * Set language for recognition (optional - auto-detect by default)
   * Can be 'auto' for multi-language support, 'en' for English, 'ta' for Tamil
   */
  setLanguage(language: 'en' | 'ta' | 'auto' = 'auto') {
    if (language === 'auto') {
      // Use auto-detection or broad language support
      this.currentLanguage = this.isNative ? 'auto' : 'en-US';
      console.log('🌐 Language set to auto-detect mode');
    } else if (language === 'ta') {
      this.currentLanguage = 'ta-IN';
      console.log('🌐 Language set to Tamil (ta-IN)');
    } else {
      this.currentLanguage = 'en-US';
      console.log('🌐 Language set to English (en-US)');
    }
  }

  /**
   * Set callbacks for speech events
   */
  setCallbacks(callbacks: SpeechServiceCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Start speech recognition
   */
  async startListening(): Promise<void> {
    console.log('🎤 Starting speech recognition...');

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    if (this.isNative) {
      await this.startNativeRecognition();
    } else {
      await this.startWebRecognition();
    }
  }

  /**
   * Stop speech recognition
   */
  async stopListening(): Promise<void> {
    console.log('🛑 Stopping speech recognition...');

    if (!this.isListening) {
      return;
    }

    if (this.isNative) {
      await this.stopNativeRecognition();
    } else {
      await this.stopWebRecognition();
    }
  }

  /**
   * Native Android Speech Recognition (Capacitor)
   */
  private async startNativeRecognition(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        this.callbacks.onError?.('Microphone permission denied');
        return;
      }

      this.isListening = true;
      this.callbacks.onStart?.();

      await SpeechRecognition.start({
        language: this.currentLanguage === 'auto' ? 'en-US' : this.currentLanguage,
        maxResults: 1,
        prompt: 'Speak now...',
        partialResults: true,
        popup: false,
      });

      // Listen for results
      SpeechRecognition.addListener('partialResults', (data: any) => {
        console.log('📝 Partial result:', data.matches);
        if (data.matches && data.matches.length > 0) {
          this.callbacks.onResult?.({
            transcript: data.matches[0],
            confidence: 1.0,
            isFinal: false,
          });
        }
      });

      SpeechRecognition.addListener('listeningState', (data: any) => {
        console.log('👂 Listening state:', data.status);
        if (data.status === 'stopped') {
          this.isListening = false;
          this.callbacks.onEnd?.();
        }
      });

    } catch (error: any) {
      console.error('Native recognition error:', error);
      this.isListening = false;
      this.callbacks.onError?.(error.message || 'Speech recognition failed');
    }
  }

  private async stopNativeRecognition(): Promise<void> {
    try {
      await SpeechRecognition.stop();
      this.isListening = false;
      this.callbacks.onEnd?.();
    } catch (error) {
      console.error('Stop native recognition error:', error);
    }
  }

  /**
   * Web Speech Recognition (Browser)
   */
  private async startWebRecognition(): Promise<void> {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      this.callbacks.onError?.('Speech recognition not supported in this browser');
      return;
    }

    if (!this.webRecognition) {
      this.webRecognition = new SpeechRecognitionAPI();
      this.webRecognition.continuous = true;
      this.webRecognition.interimResults = true;
      this.webRecognition.maxAlternatives = 1;

      // Track full transcript
      let fullTranscript = '';

      this.webRecognition.onstart = () => {
        console.log('🎤 Web recognition started');
        this.isListening = true;
        fullTranscript = '';
        this.callbacks.onStart?.();
      };

      this.webRecognition.onresult = (event: any) => {
        let interimTranscript = '';
        let newFinalTranscript = '';

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence || 0.9;

          if (event.results[i].isFinal) {
            newFinalTranscript += transcript + ' ';
            fullTranscript += transcript + ' ';
            
            console.log('✅ Final segment:', transcript);
            
            // Send final result
            this.callbacks.onResult?.({
              transcript: fullTranscript.trim(),
              confidence,
              isFinal: true,
            });
          } else {
            interimTranscript += transcript;
            
            // Send interim result (current speaking + accumulated)
            this.callbacks.onResult?.({
              transcript: (fullTranscript + interimTranscript).trim(),
              confidence,
              isFinal: false,
            });
          }
        }
      };

      this.webRecognition.onerror = (event: any) => {
        console.error('Web recognition error:', event.error);
        this.isListening = false;
        
        if (event.error === 'not-allowed') {
          this.callbacks.onError?.('Microphone permission denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          this.callbacks.onError?.('No speech detected. Please try again.');
        } else if (event.error === 'audio-capture') {
          this.callbacks.onError?.('No microphone found. Check your device.');
        } else if (event.error === 'network') {
          this.callbacks.onError?.('Network error. Check internet connection.');
        } else {
          this.callbacks.onError?.(`Speech error: ${event.error}`);
        }
      };

      this.webRecognition.onend = () => {
        console.log('🛑 Web recognition ended');
        this.isListening = false;
        this.callbacks.onEnd?.();
      };
    }

    this.webRecognition.lang = this.currentLanguage === 'auto' ? 'en-US' : this.currentLanguage;
    // For web, we primarily use English but the AI can process mixed content
    this.webRecognition.start();
  }

  private async stopWebRecognition(): Promise<void> {
    if (this.webRecognition) {
      this.webRecognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Get platform type
   */
  getPlatform(): 'native' | 'web' {
    return this.isNative ? 'native' : 'web';
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.isNative) {
      SpeechRecognition.removeAllListeners();
    }
    this.webRecognition = null;
    this.callbacks = {};
  }
}

// Export singleton instance
export const speechService = new UnifiedSpeechService();
