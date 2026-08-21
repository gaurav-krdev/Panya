// src/app/index.tsx
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, TextInput, TouchableOpacity, Switch, Modal, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme, getThemePreference, setThemePreference, ThemePreference } from '@/hooks/use-theme';
import { useAgentState } from '@/hooks/use-agent';
import { agentEngine } from '@/utils/agentEngine';

export default function HomeScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const agentState = useAgentState();

  const [time, setTime] = useState(new Date());
  const [themePref, setThemePrefState] = useState<ThemePreference>(getThemePreference());

  const handleCycleTheme = () => {
    let nextPref: ThemePreference = 'system';
    if (themePref === 'system') nextPref = 'light';
    else if (themePref === 'light') nextPref = 'dark';
    else nextPref = 'system';

  };

  // Clock Update Interval & Routine / Hourly Follow-Up Engine Check
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      agentEngine.checkRoutineFollowUps();
      agentEngine.checkHourlyBlockAlarms();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const getNextRoutineText = () => {
    const activePending = agentState.routines.filter(r => r.enabled && !r.completed);
    if (activePending.length === 0) return 'All active routines completed!';
    return `Follow-up active (15m interval): ${activePending[0].name}`;
  };

  const handleToggleRoutine = (id: string) => {
    agentEngine.toggleRoutine(id);
  };

  const handleToggleCompleted = (id: string) => {
    agentEngine.toggleRoutineCompleted(id);
  };

  const handleRunRoutine = (id: string) => {
    agentEngine.runRoutine(id);
  };

  // Modal & Routine Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formSteps, setFormSteps] = useState('');
  const [formInterval, setFormInterval] = useState('15');
  const [formError, setFormError] = useState<string | null>(null);

  // Time Validation Helper (HH:MM format, 00:00 to 23:59)
  const validate24HourTime = (timeStr: string): boolean => {
    if (!timeStr) return false;
    const trimmed = timeStr.trim();
    const regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(trimmed);
  };

  // Time Sanitizer
  const handleTimeChange = (text: string) => {
    setFormError(null);
    // Strip everything except digits and colon
    let cleaned = text.replace(/[^0-9:]/g, '');
    if (cleaned.length > 5) cleaned = cleaned.slice(0, 5);
    // Auto-insert colon if 2 digits entered
    if (cleaned.length === 2 && !cleaned.includes(':') && formTime.length === 1) {
      cleaned = cleaned + ':';
    }
    setFormTime(cleaned);
  };

  const handleOpenAddRoutine = () => {
    setEditingRoutineId(null);
    setFormName('');
    setFormTime('09:00');
    setFormSteps('Analyze agenda, Notify user of checklist');
    setFormInterval('15');
    setFormError(null);
    setModalVisible(true);
  };

  const handleOpenEditRoutine = (routine: any) => {
    setEditingRoutineId(routine.id);
    setFormName(routine.name);
    setFormTime(routine.time);
    setFormSteps(routine.steps.map((s: any) => s.text).join(', '));
    setFormInterval(String(routine.followUpIntervalMinutes || 15));
    setFormError(null);
    setModalVisible(true);
  };

  const handleSaveRoutine = () => {
    setFormError(null);
    if (!formName.trim()) {
      setFormError('Please enter a routine name.');
      return;
    }

    if (!validate24HourTime(formTime)) {
      setFormError('Invalid time! Must be 24-hr format (00:00 to 23:59, e.g. 08:30 or 14:15). Non-numeric characters or hours > 23 are not allowed.');
      return;
    }

    const parsedSteps = formSteps
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text) => ({ text, action: 'custom_step' }));

    const intervalMinutes = Math.max(1, parseInt(formInterval, 10) || 15);

    if (editingRoutineId) {
      agentEngine.updateRoutine(editingRoutineId, {
        name: formName.trim(),
        time: formTime.trim(),
        steps: parsedSteps.length > 0 ? parsedSteps : [{ text: formName.trim(), action: 'custom_step' }],
        followUpIntervalMinutes: intervalMinutes,
      });
    } else {
      agentEngine.addRoutine(formName.trim(), formTime.trim(), parsedSteps, intervalMinutes);
    }
    setModalVisible(false);
  };

  const handleDeleteRoutine = (id: string) => {
    agentEngine.deleteRoutine(id);
  };

  const { width } = useWindowDimensions();
  const isNarrow = width < 480;
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
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <View style={styles.header}>
        <View>
          <ThemedText type="subtitle" style={styles.brandTitle}>Panya AI</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.brandSubtitle}>Autonomous Assistant & System Scheduler</ThemedText>
        </View>
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={[styles.themeToggleBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={handleCycleTheme}
          >
            <Text style={[styles.themeToggleText, { color: theme.text }]}>
              {themePref === 'system' ? '⚙️ Auto' : themePref === 'light' ? '☀️ Light' : '🌙 Dark'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.statusIndicator, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.statusDot, { backgroundColor: agentState.isAgentRunning ? theme.primary : theme.accent }]} />
            <Text style={[styles.statusText, { color: theme.text }]}>
              {agentState.isAgentRunning ? 'Agent Active' : 'Agent Standby'}
            </Text>
          </View>
        </View>
      </View>

      {/* CLOCK SECTION */}
      <ThemedView type="backgroundElement" style={[styles.clockCard, { borderColor: theme.border }]}>
        <View style={styles.clockHeader}>
          <ThemedText type="smallBold" themeColor="primary" style={styles.accentText}>SYSTEM CHRONO</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{formatDate(time)}</ThemedText>
        </View>
        <Text style={[styles.clockText, { color: theme.text, fontSize: width < 400 ? 32 : 44 }]}>{formatTime(time)}</Text>
        <View style={styles.clockFooter}>
          <SymbolView tintColor={theme.primary} name={{ ios: 'alarm', android: 'alarm', web: 'alarm' }} size={14} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.footerTimeText}>
            {getNextRoutineText()}
          </ThemedText>
        </View>
      </ThemedView>

      {/* AGENT STATUS QUICK CARD */}
      {agentState.isAgentRunning && (
        <ThemedView type="backgroundElement" style={[styles.activeAgentCard, { borderColor: theme.primary }]}>
          <View style={styles.agentCardHeader}>
            <View style={styles.pulseContainer}>
              <View style={[styles.pulseCircle, { backgroundColor: theme.primary }]} />
              <View style={[styles.pulseCircleBg, { backgroundColor: theme.primary }]} />
            </View>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>Agent Execution Loop</ThemedText>
          </View>
          <Text style={[styles.agentStatusMsg, { color: theme.text }]}>
            {agentState.agentLogs[agentState.agentLogs.length - 1]?.text || 'Processing background thread...'}
          </Text>
        </ThemedView>
      )}

      {/* ROUTINES SECTION */}
      <View style={styles.sectionHeader}>
        <View>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>AUTOMATION ROUTINES</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Scheduled Triggers & Workflows</ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.addRoutineHeaderBtn, { backgroundColor: theme.primary }]}
          onPress={handleOpenAddRoutine}
        >
          <Text style={styles.addRoutineHeaderBtnText}>+ Add Routine</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.routinesList}>
        {agentState.routines.map((routine) => (
          <ThemedView 
            key={routine.id} 
            type="backgroundElement" 
            style={[
              styles.routineCard, 
              { 
                borderColor: theme.border,
                flexDirection: isNarrow ? 'column' : 'row',
                alignItems: isNarrow ? 'stretch' : 'center',
                gap: isNarrow ? Spacing.two : Spacing.three,
              }
            ]}
          >
            <View style={styles.routineInfo}>
              <View style={[styles.routineTimeBadge, { backgroundColor: theme.backgroundSelected, borderColor: theme.border, borderWidth: 1 }]}>
                <Text style={[styles.routineTimeText, { color: theme.primary }]}>{routine.time}</Text>
              </View>
              <View style={styles.routineMeta}>
                <ThemedText type="smallBold">{routine.name}</ThemedText>
                <ThemedText type="small" themeColor={routine.completed ? 'accent' : 'textSecondary'}>
                  {routine.completed
                    ? 'Completed (Follow-up paused)'
                    : routine.enabled
                    ? `Follow-up active (${routine.followUpIntervalMinutes || 15}m)`
                    : 'Disabled'}
                </ThemedText>
              </View>
            </View>

            <View 
              style={[
                styles.routineActions,
                {
                  justifyContent: isNarrow ? 'space-between' : 'flex-end',
                  marginTop: isNarrow ? Spacing.one : 0,
                  borderTopWidth: isNarrow ? 1 : 0,
                  borderTopColor: theme.border,
                  paddingTop: isNarrow ? Spacing.two : 0,
                }
              ]}
            >
              <Switch
                value={routine.enabled}
                onValueChange={() => handleToggleRoutine(routine.id)}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={routine.enabled ? '#ffffff' : theme.textSecondary}
              />
              <TouchableOpacity
                style={[styles.textActionBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
                onPress={() => handleOpenEditRoutine(routine)}
              >
                <Text style={[styles.textActionBtnText, { color: theme.text }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.textActionBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
                onPress={() => handleDeleteRoutine(routine.id)}
              >
                <Text style={[styles.textActionBtnText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.doneButton,
                  {
                    backgroundColor: routine.completed ? theme.accent + '15' : theme.background,
                    borderColor: routine.completed ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => handleToggleCompleted(routine.id)}
              >
                <Text style={[styles.doneButtonText, { color: routine.completed ? theme.accent : theme.text }]}>
                  {routine.completed ? 'Done ✓' : 'Mark Done'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={agentState.isAgentRunning}
                style={[
                  styles.runButton,
                  {
                    backgroundColor: agentState.isAgentRunning ? theme.backgroundSelected : theme.primary,
                    opacity: agentState.isAgentRunning ? 0.6 : 1,
                  },
                ]}
                onPress={() => handleRunRoutine(routine.id)}
              >
                <Text style={styles.runButtonText}>Run</Text>
              </TouchableOpacity>
            </View>
          </ThemedView>
        ))}
      </View>

      {/* ADD / EDIT ROUTINE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <ThemedView type="backgroundElement" style={[styles.modalCard, { borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">
                {editingRoutineId ? 'Edit Routine' : 'Create New Routine'}
              </ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: theme.textSecondary, fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {formError && (
              <View style={{ backgroundColor: '#ef444418', borderColor: '#ef4444', borderWidth: 1, padding: 8, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>⚠️ {formError}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <ThemedText type="smallBold">Routine Name</ThemedText>
              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                value={formName}
                onChangeText={(val) => { setFormError(null); setFormName(val); }}
                placeholder="e.g. Morning Routine Sync"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText type="smallBold">Scheduled Time (24h)</ThemedText>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: formError && formError.includes('time') ? '#ef4444' : theme.border, backgroundColor: theme.background }]}
                  value={formTime}
                  onChangeText={handleTimeChange}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  placeholder="HH:MM (08:30)"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText type="smallBold">Follow-up (Mins)</ThemedText>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  value={formInterval}
                  onChangeText={(val) => { setFormError(null); setFormInterval(val.replace(/[^0-9]/g, '')); }}
                  keyboardType="numeric"
                  placeholder="15"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <ThemedText type="smallBold">Steps (comma separated)</ThemedText>
              <TextInput
                multiline
                numberOfLines={3}
                style={[styles.modalTextArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                value={formSteps}
                onChangeText={setFormSteps}
                placeholder="e.g. Read agenda, Extract notes tasks, Alert high-priority"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveRoutine}
              >
                <Text style={styles.modalSaveText}>Save Routine</Text>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    width: '100%',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
    maxWidth: '100%',
  },
  themeToggleBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: 16,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.one + 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clockCard: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  clockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  accentText: {
    letterSpacing: 1.5,
    fontSize: 10,
  },
  clockText: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 2,
    marginVertical: Spacing.two,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
  },
  clockFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  footerTimeText: {
    fontSize: 12,
  },
  activeAgentCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  agentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pulseContainer: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    zIndex: 2,
  },
  pulseCircleBg: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.4,
  },
  agentStatusMsg: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: Spacing.one,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  routinesList: {
    gap: Spacing.two,
  },
  routineCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  routineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
    flexShrink: 1,
  },
  routineTimeBadge: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  routineTimeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  routineMeta: {
    gap: Spacing.half,
    flex: 1,
    flexShrink: 1,
  },
  routineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  runButton: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
  },
  runButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  brandSubtitle: {
    letterSpacing: 1,
    fontSize: 10,
    marginTop: 2,
  },
  sectionTitle: {
    letterSpacing: 1.2,
  },
  textActionBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
  },
  textActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  addRoutineHeaderBtn: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
  },
  addRoutineHeaderBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  iconActionBtn: {
    padding: Spacing.one,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionText: {
    fontSize: 12,
  },
  doneButton: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: 16,
    borderWidth: 1,
  },
  doneButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  formGroup: {
    gap: Spacing.one,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two + 2,
    height: 40,
    fontSize: 14,
  },
  modalTextArea: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  modalCancelBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 16,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
