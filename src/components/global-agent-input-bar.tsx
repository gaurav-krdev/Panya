// src/components/global-agent-input-bar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, NativeModules, NativeEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAgentState } from '@/hooks/use-agent';
import { agentEngine } from '@/utils/agentEngine';

export function GlobalAgentInputBar() {
  const theme = useTheme();
  const agentState = useAgentState();
  const safeAreaInsets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Setup Android Native Speech Recognition Event Listeners
  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.PanyaSpeechModule) {
      const speechEmitter = new NativeEventEmitter(NativeModules.PanyaSpeechModule);

      const readySub = speechEmitter.addListener('onSpeechReady', () => {
        setIsListening(true);
        setSpeechError(null);
      });

      const startSub = speechEmitter.addListener('onSpeechStart', () => {
        setIsListening(true);
      });

      const resultSub = speechEmitter.addListener('onSpeechResult', (data: { transcript: string; isFinal: boolean }) => {
        if (data && data.transcript) {
          setInputVal(data.transcript);
        }
        if (data && data.isFinal) {
          setIsListening(false);
        }
      });

      const errorSub = speechEmitter.addListener('onSpeechError', (data: { code: number; message: string }) => {
        console.warn('Android speech recognition error:', data);
        setSpeechError(data?.message || 'Speech recognition error');
        setIsListening(false);
      });

      const endSub = speechEmitter.addListener('onSpeechEnd', () => {
        setIsListening(false);
      });

      return () => {
        readySub.remove();
        startSub.remove();
        resultSub.remove();
        errorSub.remove();
        endSub.remove();
      };
    }
  }, []);

  // Web / Native Speech Recognition Toggle
  const toggleSpeechListening = async () => {
    if (isListening) {
      if (Platform.OS === 'android' && NativeModules.PanyaSpeechModule) {
        try {
          await NativeModules.PanyaSpeechModule.stopListening();
        } catch (e) {}
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    setSpeechError(null);

    // 1. Native Android Speech Engine
    if (Platform.OS === 'android' && NativeModules.PanyaSpeechModule) {
      try {
        setIsListening(true);
        await NativeModules.PanyaSpeechModule.startListening();
        return;
      } catch (err) {
        console.warn('Native speech module error, falling back:', err);
      }
    }

    // 2. Web Speech API
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          setInputVal(transcript);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setSpeechError('Voice input error. Tap mic again.');
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        startVoiceSimulationFallback();
      }
    } else {
      startVoiceSimulationFallback();
    }
  };

  // Fallback Voice Simulation for non-WebSpeech environments
  const startVoiceSimulationFallback = () => {
    setIsListening(true);
    setInputVal('');

    const voicePhrases = [
      'order vegan quinoa salad for lunch',
      'buy milk and eggs on grocery list',
      'extract tasks from my active notes',
      'create task plan exercise routine',
    ];
    const phrase = voicePhrases[Math.floor(Math.random() * voicePhrases.length)];

    let charIndex = 0;
    const interval = setInterval(() => {
      if (charIndex <= phrase.length) {
        setInputVal(phrase.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsListening(false);
        }, 500);
      }
    }, 40);
  };

  const handleSendCommand = () => {
    if (!inputVal.trim()) return;
    const cmd = inputVal.trim();
    setInputVal('');
    agentEngine.processCommand(cmd);
  };

  const isSmallScreen = width < 640;

  return (
    <View
      style={[
        styles.outerContainer,
        {
          borderTopColor: theme.border,
          backgroundColor: theme.backgroundElement,
          paddingBottom: Math.max(safeAreaInsets.bottom, Spacing.two),
        },
      ]}
    >
      <View style={styles.inputWrapper}>
        {/* Listening Indicator Badge */}
        {isListening && (
          <View style={[styles.listeningBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary }]}>
            <View style={[styles.pulseDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.listeningText, { color: theme.primary }]}>Listening... speak now</Text>
          </View>
        )}

        <View style={[styles.inputBox, { borderColor: isListening ? theme.primary : theme.border, backgroundColor: theme.background }]}>
          <TextInput
            style={[styles.textInput, { color: theme.text }]}
            value={inputVal}
            onChangeText={setInputVal}
            placeholder={agentState.isAgentRunning ? 'Panya is executing background routine...' : 'Ask Panya AI (e.g. "order meal", "parse notes")...'}
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={handleSendCommand}
            editable={!agentState.isAgentRunning}
          />

          {/* RIGHT SIDE CONTROLS: MIC + SEND */}
          <View style={styles.controlsRow}>
            {/* MIC BUTTON */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.micBtn,
                {
                  backgroundColor: isListening ? theme.primary : theme.backgroundElement,
                  borderColor: isListening ? theme.primary : theme.border,
                },
              ]}
              onPress={toggleSpeechListening}
              disabled={agentState.isAgentRunning}
            >
              <Text style={{ fontSize: 15, color: isListening ? '#ffffff' : theme.textSecondary }}>
                🎙️
              </Text>
            </TouchableOpacity>

            {/* SEND BUTTON */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: agentState.isAgentRunning || !inputVal.trim() ? theme.border : theme.primary,
                },
              ]}
              onPress={handleSendCommand}
              disabled={agentState.isAgentRunning || !inputVal.trim()}
            >
              <Text style={{ fontSize: 13, color: '#ffffff', fontWeight: 'bold' }}>
                ➤
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    zIndex: 999,
  },
  inputWrapper: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.one,
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listeningText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    height: 44,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    paddingRight: Spacing.two,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
