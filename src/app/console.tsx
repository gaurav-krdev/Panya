// src/app/console.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, TextInput, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAgentState } from '@/hooks/use-agent';
import { agentEngine, AgentLog } from '@/utils/agentEngine';

export default function ConsoleScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const agentState = useAgentState();

  const [inputVal, setInputVal] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto scroll terminal to bottom on logs change
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [agentState.agentLogs]);

  const handleSendCommand = () => {
    if (!inputVal.trim()) return;
    const command = inputVal;
    setInputVal('');
    agentEngine.processCommand(command);
  };

  const handleQuickCommand = (cmd: string) => {
    agentEngine.processCommand(cmd);
  };

  const handleClearLogs = () => {
    agentEngine.clearLogs();
  };

  const getLogStyle = (type: AgentLog['type']) => {
    switch (type) {
      case 'thought':
        return { color: theme.primary, label: '[PANYA THINK]' };
      case 'tool':
        return { color: theme.secondary, label: '[PANYA TOOL]' };
      case 'success':
        return { color: theme.accent, label: '[SUCCESS]' };
      case 'error':
        return { color: '#ef4444', label: '[ERROR]' };
      default:
        return { color: theme.textSecondary, label: '[SYSTEM]' };
    }
  };

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 640;

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: Spacing.three,
      paddingLeft: safeAreaInsets.left,
      paddingRight: safeAreaInsets.right,
      paddingBottom: Spacing.four,
    },
    web: {
      paddingTop: isSmallScreen ? Spacing.four : 85,
      paddingBottom: isSmallScreen ? 85 : Spacing.four,
    },
  });

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      >
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle">Agent Terminal</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Watch Panya\'s real-time action pipeline & logs</ThemedText>
          </View>
          <TouchableOpacity style={[styles.clearBtn, { borderColor: theme.border }]} onPress={handleClearLogs}>
            <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        {/* TERMINAL TERMINUS */}
        <ThemedView type="backgroundElement" style={[styles.terminal, { borderColor: theme.border }]}>
          <View style={[styles.terminalHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.dotRow}>
              <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
              <View style={[styles.dot, { backgroundColor: '#eab308' }]} />
              <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            </View>
            <Text style={[styles.terminalTitle, { color: theme.textSecondary }]}>panya-agent-core@panya-agent:~</Text>
          </View>

          <View style={styles.terminalBody}>
            {agentState.agentLogs.map((log) => {
              const meta = getLogStyle(log.type);
              return (
                <View key={log.id} style={styles.logRow}>
                  <Text style={[styles.logTimestamp, { color: theme.textSecondary }]}>[{log.timestamp}]</Text>
                  <Text style={[styles.logLabel, { color: meta.color }]}>{meta.label}</Text>
                  <Text style={[styles.logText, { color: theme.text }]}>{log.text}</Text>
                </View>
              );
            })}
          </View>
        </ThemedView>

        {/* QUICK CHEAT SHEET SHORTCUTS */}
        <View style={styles.shortcutsSection}>
          <ThemedText type="smallBold" themeColor="textSecondary">QUICK SIMULATIONS</ThemedText>
          <View style={styles.shortcutRow}>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              onPress={() => handleQuickCommand('order food')}
              disabled={agentState.isAgentRunning}
            >
              <Text style={[styles.chipText, { color: theme.text }]}>🍔 Order Lunch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              onPress={() => handleQuickCommand('buy groceries')}
              disabled={agentState.isAgentRunning}
            >
              <Text style={[styles.chipText, { color: theme.text }]}>🛒 Order Groceries</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              onPress={() => handleQuickCommand('parse notes')}
              disabled={agentState.isAgentRunning}
            >
              <Text style={[styles.chipText, { color: theme.text }]}>📄 Parse Notes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  clearBtn: {
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  terminal: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 250,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    gap: Spacing.three,
  },
  dotRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  terminalTitle: {
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
    fontWeight: '600',
  },
  terminalBody: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  logRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginVertical: 1,
  },
  logTimestamp: {
    fontSize: 12,
    marginRight: Spacing.one,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
  },
  logLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: Spacing.one,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
  },
  logText: {
    fontSize: 13,
    flex: 1,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
  },
  shortcutsSection: {
    gap: Spacing.two,
  },
  shortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputDrawer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    paddingBottom: Platform.select({ ios: Spacing.four, android: Spacing.three, default: Spacing.three }),
  },
  inputWrapper: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cliInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    height: 40,
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
