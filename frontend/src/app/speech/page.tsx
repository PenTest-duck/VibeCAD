"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Extend Window interface for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

export default function SpeechPage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("en-US");
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      initializeRecognition();
    } else {
      setIsSupported(false);
      setError("Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const initializeRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript("");
      } else {
        setInterimTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        setError("Failed to start speech recognition. Please try again.");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLanguage;
    }
  };

  if (!isSupported) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Speech Recognition Not Supported</CardTitle>
            <CardDescription className="text-center">
              Your browser doesn't support the Web Speech API. Please use Chrome, Edge, or Safari for the best experience.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-text mb-2">Voice Transcription</h1>
          <p className="text-muted-foreground">
            Use your voice to transcribe speech in real-time
          </p>
        </div>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>Speech Recognition</CardTitle>
            <CardDescription>
              Click the microphone button to start transcribing your speech
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Selection */}
            <div className="flex items-center gap-4">
              <label htmlFor="language" className="text-sm font-medium">
                Language:
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
                disabled={isListening}
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="it-IT">Italian</option>
                <option value="pt-BR">Portuguese (Brazil)</option>
                <option value="ja-JP">Japanese</option>
                <option value="ko-KR">Korean</option>
                <option value="zh-CN">Chinese (Simplified)</option>
              </select>
            </div>

            {/* Control Buttons */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={isListening ? stopListening : startListening}
                variant={isListening ? "destructive" : "default"}
                size="lg"
                className="min-w-[120px]"
              >
                {isListening ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                    Start
                  </>
                )}
              </Button>
              
              <Button
                onClick={clearTranscript}
                variant="outline"
                size="lg"
                disabled={isListening}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                Clear
              </Button>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm text-muted-foreground">
                {isListening ? 'Listening...' : 'Not listening'}
              </span>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcript Display */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle>Transcription</CardTitle>
            <CardDescription>
              Your speech will appear here in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-[200px] p-4 bg-muted/30 rounded-lg border">
              {transcript || interimTranscript ? (
                <div className="space-y-2">
                  {transcript && (
                    <div className="text-foreground">
                      {transcript}
                    </div>
                  )}
                  {interimTranscript && (
                    <div className="text-muted-foreground italic">
                      {interimTranscript}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  Start speaking to see your transcription here...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Make sure your microphone is working and you've granted permission</li>
              <li>• Click "Start" to begin listening to your voice</li>
              <li>• Speak clearly and at a normal pace</li>
              <li>• The text will appear in real-time as you speak</li>
              <li>• Click "Stop" when you're done speaking</li>
              <li>• Use "Clear" to reset the transcription</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
