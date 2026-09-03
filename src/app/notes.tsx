// src/app/notes.tsx
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAgentState } from '@/hooks/use-agent';
import {
  agentEngine,
  HourlyLog,
  HourlySlot,
  formatHourNumber,
  formatHourRange,
} from '@/utils/agentEngine';

const CATEGORIES: { key: HourlyLog['category']; label: string; icon: string }[] = [
  { key: 'work', label: 'Work', icon: '💻' },
  { key: 'meeting', label: 'Meeting', icon: '🤝' },
  { key: 'study', label: 'Study', icon: '📚' },
  { key: 'routine', label: 'Routine', icon: '🧘' },
  { key: 'break', label: 'Break', icon: '☕' },
  { key: 'personal', label: 'Personal', icon: '👤' },
];

export default function NotesScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const agentState = useAgentState();

  const todayStr = agentEngine.getTodayDateString();
  const yesterdayStr = agentEngine.getYesterdayDateString();
  const availableDates = agentEngine.getAvailableDates();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unloggedSlots, setUnloggedSlots] = useState<HourlySlot[]>([]);
  
  // Local inputs state for unlogged cards: key by slot startHour
  const [slotInputs, setSlotInputs] = useState<Record<number, { activity: string; duration: string; category: HourlyLog['category'] }>>({});

  // Merge Multi-Hour Modal State
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [mergeStartHour, setMergeStartHour] = useState('15');
  const [mergeEndHour, setMergeEndHour] = useState('19');
  const [mergeActivity, setMergeActivity] = useState('');
  const [mergeDuration, setMergeDuration] = useState('240');
  const [mergeCategory, setMergeCategory] = useState<HourlyLog['category']>('work');

  // Todo State
  const [newTaskText, setNewTaskText] = useState('');

  // Clock & Slot Refresher
  useEffect(() => {
    const updateSlots = () => {
      const now = new Date();
      setCurrentTime(now);
      setUnloggedSlots(agentEngine.getUnloggedHourlySlots(now, selectedDate));
    };

    updateSlots();
    const timer = setInterval(updateSlots, 1000);
    return () => clearInterval(timer);
  }, [agentState.hourlyLogs, agentState.dayStartHour, selectedDate]);

  const handleNotesChange = (text: string) => {
    agentEngine.setNotes(text);
  };

  const handleExtractTasks = () => {
    agentEngine.processCommand('extract tasks');
  };

  const handleAddTodo = () => {
    if (!newTaskText.trim()) return;
    agentEngine.addTodo(newTaskText.trim());
    setNewTaskText('');
  };

  const handleToggleTodo = (id: string) => {
    agentEngine.toggleTodo(id);
  };

  // Unlogged Block Logging Handlers
  const handleSlotInputChange = (hour: number, field: 'activity' | 'duration' | 'category', value: any) => {
    setSlotInputs((prev) => ({
      ...prev,
      [hour]: {
        activity: field === 'activity' ? value : (prev[hour]?.activity || ''),
        duration: field === 'duration' ? value : (prev[hour]?.duration || '60'),
        category: field === 'category' ? value : (prev[hour]?.category || 'work'),
      },
    }));
  };

  const handleSaveSlot = (slot: HourlySlot) => {
    const input = slotInputs[slot.startHour] || { activity: '', duration: '60', category: 'work' };
    const activity = input.activity.trim();
    if (!activity) return;

    const duration = parseInt(input.duration, 10) || 60;
    agentEngine.logHourlyBlock(slot.startHour, slot.endHour, activity, duration, input.category, selectedDate);

    // Clear local input for this slot
    setSlotInputs((prev) => {
      const next = { ...prev };
      delete next[slot.startHour];
      return next;
    });
  };

  const handleQuickBreak = (slot: HourlySlot) => {
    agentEngine.quickLogBreak(slot.startHour, slot.endHour, 'Break / Personal Time', selectedDate);
  };

  const handleSaveMergedBlock = () => {
    const start = parseInt(mergeStartHour, 10);
    const end = parseInt(mergeEndHour, 10);
    const activity = mergeActivity.trim();
    if (isNaN(start) || isNaN(end) || start >= end || !activity) return;

    const duration = parseInt(mergeDuration, 10) || (end - start) * 60;
    agentEngine.logHourlyBlock(start, end, activity, duration, mergeCategory, selectedDate);

    setMergeModalVisible(false);
    setMergeActivity('');
  };

  const handleDeleteLog = (id: string) => {
    agentEngine.deleteHourlyLog(id);
  };

  // Aggregated Stats for Currently Selected Date
  const displayedLogs = agentEngine.getLogsForDate(selectedDate);
  const totalMinutesLogged = displayedLogs.reduce((acc, log) => acc + (log.durationMinutes || (log.endHour - log.startHour) * 60), 0);
  const totalHours = Math.floor(totalMinutesLogged / 60);
  const totalMins = totalMinutesLogged % 60;

  const isToday = selectedDate === todayStr;
  const isYesterday = selectedDate === yesterdayStr;

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

  // Alarm Status Helper (only active for today)
  const unloggedCount = unloggedSlots.length;
  let alarmBadgeColor: string = theme.accent;
  let alarmBadgeText = isToday ? '✓ All Caught Up' : `🗓️ Viewing ${isYesterday ? 'Yesterday' : selectedDate}`;
  let alarmBadgeBg: string = theme.accent + '18';

  if (isToday) {
    if (unloggedCount === 1) {
      alarmBadgeColor = '#F59E0B';
      alarmBadgeText = '⏳ 1 Hour Pending';
      alarmBadgeBg = '#F59E0B18';
    } else if (unloggedCount === 2) {
      alarmBadgeColor = '#EA580C';
      alarmBadgeText = '⚠️ 2 Hours Overdue (Alarm Sent)';
      alarmBadgeBg = '#EA580C22';
    } else if (unloggedCount >= 3) {
      alarmBadgeColor = '#EF4444';
      alarmBadgeText = `🚨 ${unloggedCount} Hours Overdue (15m Alarm Repeating)`;
      alarmBadgeBg = '#EF444426';
    }
  } else {
    alarmBadgeColor = theme.secondary;
    alarmBadgeBg = theme.secondary + '18';
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      {/* HEADER WITH ALARM STATUS PILL */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <ThemedText type="subtitle">Daily Ledger & Notes</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Current Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Day Start: {formatHourNumber(agentState.dayStartHour)}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.statusBadge, { borderColor: alarmBadgeColor, backgroundColor: alarmBadgeBg }]}
            onPress={() => agentEngine.checkHourlyBlockAlarms()}
          >
            <Text style={[styles.statusBadgeText, { color: alarmBadgeColor }]}>{alarmBadgeText}</Text>
          </TouchableOpacity>
        </View>

        {/* ── DATE NAVIGATION SWITCHER ── */}
        <View style={styles.dateSwitcherContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateSwitcherScroll}>
            <TouchableOpacity
              style={[
                styles.dateTab,
                { borderColor: isToday ? theme.primary : theme.border },
                isToday && { backgroundColor: theme.primary + '20' },
              ]}
              onPress={() => setSelectedDate(todayStr)}
            >
              <Text style={[styles.dateTabText, { color: isToday ? theme.primary : theme.textSecondary, fontWeight: isToday ? '700' : '500' }]}>
                📅 Today ({todayStr})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateTab,
                { borderColor: isYesterday ? theme.primary : theme.border },
                isYesterday && { backgroundColor: theme.primary + '20' },
              ]}
              onPress={() => setSelectedDate(yesterdayStr)}
            >
              <Text style={[styles.dateTabText, { color: isYesterday ? theme.primary : theme.textSecondary, fontWeight: isYesterday ? '700' : '500' }]}>
                ⏮️ Yesterday ({yesterdayStr})
              </Text>
            </TouchableOpacity>

            {availableDates
              .filter((d) => d !== todayStr && d !== yesterdayStr)
              .map((d) => {
                const isSelected = selectedDate === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dateTab,
                      { borderColor: isSelected ? theme.primary : theme.border },
                      isSelected && { backgroundColor: theme.primary + '20' },
                    ]}
                    onPress={() => setSelectedDate(d)}
                  >
                    <Text style={[styles.dateTabText, { color: isSelected ? theme.primary : theme.textSecondary, fontWeight: isSelected ? '700' : '500' }]}>
                      🗓️ {d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        </View>
      </View>

      {/* ── 1. UNLOGGED HOURLY BLOCKS (TOP ACTIVE SECTION) ── */}
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <SymbolView tintColor={isToday && unloggedCount >= 2 ? '#EF4444' : theme.primary} name={{ ios: 'clock.badge.exclamationmark', android: 'schedule', web: 'schedule' }} size={18} />
            <ThemedText type="smallBold" style={styles.cardTitle}>
              UNLOGGED BLOCKS ({unloggedCount}) — {isToday ? 'TODAY' : isYesterday ? 'YESTERDAY' : selectedDate}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={[styles.mergeButton, { backgroundColor: theme.primary }]}
            onPress={() => setMergeModalVisible(true)}
          >
            <Text style={styles.mergeButtonText}>⚡ Multi-Hour Log</Text>
          </TouchableOpacity>
        </View>

        {unloggedCount === 0 ? (
          <View style={[styles.allCaughtUpBox, { borderColor: theme.accent + '44', backgroundColor: theme.accent + '0D' }]}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              🎉 You are completely up to date for {isToday ? 'today' : isYesterday ? 'yesterday' : selectedDate}!
            </ThemedText>
            {isToday && (
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.half }}>
                The next hourly block ({formatHourRange(currentTime.getHours(), currentTime.getHours() + 1)}) will appear here once elapsed.
              </ThemedText>
            )}
          </View>
        ) : (
          <View style={styles.unloggedList}>
            {unloggedSlots.map((slot) => {
              const currentInput = slotInputs[slot.startHour] || { activity: '', duration: '60', category: 'work' };
              return (
                <View
                  key={slot.startHour}
                  style={[
                    styles.unloggedCard,
                    {
                      borderColor: unloggedCount >= 3 ? '#EF444466' : unloggedCount === 2 ? '#F59E0B66' : theme.border,
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  {/* Slot Header */}
                  <View style={styles.slotHeader}>
                    <View style={styles.slotTimePill}>
                      <ThemedText type="smallBold" style={{ color: theme.primary }}>
                        🕒 {slot.label}
                      </ThemedText>
                    </View>

                    {/* Category Selector Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
                      {CATEGORIES.map((cat) => {
                        const isSelected = currentInput.category === cat.key;
                        return (
                          <TouchableOpacity
                            key={cat.key}
                            style={[
                              styles.catChip,
                              { borderColor: isSelected ? theme.primary : theme.border },
                              isSelected && { backgroundColor: theme.primary + '22' },
                            ]}
                            onPress={() => handleSlotInputChange(slot.startHour, 'category', cat.key)}
                          >
                            <Text style={styles.catChipText}>{cat.icon} {cat.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Activity Input & Duration */}
                  <View style={styles.slotInputsRow}>
                    <TextInput
                      style={[styles.activityInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                      placeholder={`What did you do during ${slot.label}? (e.g. PR Review, Cassandra)`}
                      placeholderTextColor={theme.textSecondary}
                      value={currentInput.activity}
                      onChangeText={(val) => handleSlotInputChange(slot.startHour, 'activity', val)}
                      onSubmitEditing={() => handleSaveSlot(slot)}
                    />
                    <TextInput
                      style={[styles.durationInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                      placeholder="Mins"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="numeric"
                      value={currentInput.duration}
                      onChangeText={(val) => handleSlotInputChange(slot.startHour, 'duration', val)}
                    />
                  </View>

                  {/* Actions Row */}
                  <View style={styles.slotActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.saveSlotBtn,
                        { backgroundColor: currentInput.activity.trim() ? theme.primary : theme.border },
                      ]}
                      onPress={() => handleSaveSlot(slot)}
                      disabled={!currentInput.activity.trim()}
                    >
                      <Text style={styles.saveSlotBtnText}>✓ Save Block</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickBreakBtn, { borderColor: theme.border }]}
                      onPress={() => handleQuickBreak(slot)}
                    >
                      <Text style={[styles.quickBreakBtnText, { color: theme.textSecondary }]}>☕ Quick Break (Off-Time)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ThemedView>

      {/* ── 2. HOURLY LOG SHEET (TIMELINE) ── */}
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <SymbolView tintColor={theme.secondary} name={{ ios: 'list.clipboard', android: 'assignment', web: 'assignment' }} size={18} />
            <ThemedText type="smallBold" style={styles.cardTitle}>
              {isToday ? "TODAY'S" : isYesterday ? "YESTERDAY'S" : selectedDate} LOG SHEET ({displayedLogs.length})
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Total Logged: <Text style={{ fontWeight: '700', color: theme.text }}>{totalHours}h {totalMins}m</Text>
          </ThemedText>
        </View>

        <View style={styles.logSheetList}>
          {displayedLogs.map((log) => {
            const catObj = CATEGORIES.find((c) => c.key === log.category) || CATEGORIES[0];
            const isMultiHour = log.endHour - log.startHour > 1;
            return (
              <View key={log.id} style={[styles.logSheetItem, { borderBottomColor: theme.border }]}>
                <View style={styles.logSheetLeft}>
                  <View style={styles.logTimeCategoryRow}>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>
                      {formatHourRange(log.startHour, log.endHour)}
                    </ThemedText>
                    <View style={[styles.categoryTag, { backgroundColor: theme.background }]}>
                      <Text style={styles.categoryTagText}>{catObj.icon} {catObj.label}</Text>
                    </View>
                    {isMultiHour && (
                      <View style={[styles.multiHourTag, { backgroundColor: theme.secondary + '20' }]}>
                        <Text style={[styles.multiHourTagText, { color: theme.secondary }]}>
                          {log.endHour - log.startHour}h Span
                        </Text>
                      </View>
                    )}
                  </View>

                  <ThemedText type="default" style={styles.logActivityText}>
                    {log.activity}
                  </ThemedText>
                </View>

                <View style={styles.logSheetRight}>
                  <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                    ⏱️ {log.durationMinutes || (log.endHour - log.startHour) * 60}m
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.deleteLogBtn}
                    onPress={() => handleDeleteLog(log.id)}
                  >
                    <SymbolView tintColor="#EF4444" name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={14} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {displayedLogs.length === 0 && (
            <View style={styles.emptyContainer}>
              <ThemedText type="small" themeColor="textSecondary">
                No hours logged yet for {isToday ? 'today' : isYesterday ? 'yesterday' : selectedDate}.
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>

      {/* ── 3. SCRATCHPAD & TASKS (COLLAPSIBLE NOTE PAD) ── */}
      <Collapsible title="📝 Scratch Note Pad & Task Checklist">
        <View style={styles.collapsibleInner}>
          {/* Note Pad */}
          <View style={styles.notesSection}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold">ACTIVE NOTES</ThemedText>
              <TouchableOpacity
                style={[styles.extractButton, { backgroundColor: theme.primary }]}
                onPress={handleExtractTasks}
                disabled={agentState.isAgentRunning}
              >
                <Text style={styles.extractButtonText}>Panya: Extract Tasks</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              multiline
              style={[styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              value={agentState.notes}
              onChangeText={handleNotesChange}
              placeholder="Type scratch notes here... bullet lists with * will be extracted as tasks."
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          {/* Checklist */}
          <View style={styles.checklistSection}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>
              TASKS ({agentState.todos.filter((t) => !t.completed).length} pending)
            </ThemedText>

            {agentState.todos.map((todo) => (
              <TouchableOpacity
                key={todo.id}
                style={[styles.todoItem, { borderBottomColor: theme.border }]}
                onPress={() => handleToggleTodo(todo.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: todo.completed ? theme.accent : theme.textSecondary },
                    todo.completed && { backgroundColor: theme.accent + '22' },
                  ]}
                >
                  {todo.completed && <View style={[styles.checkboxInner, { backgroundColor: theme.accent }]} />}
                </View>
                <Text
                  style={[
                    styles.todoText,
                    { color: todo.completed ? theme.textSecondary : theme.text },
                    todo.completed && styles.todoTextCompleted,
                  ]}
                >
                  {todo.text}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.addTodoRow}>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                value={newTaskText}
                onChangeText={setNewTaskText}
                placeholder="Add checklist item..."
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={handleAddTodo}
              />
              <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={handleAddTodo}>
                <SymbolView tintColor="#ffffff" name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Collapsible>

      {/* ── MULTI-HOUR LOG MODAL ── */}
      <Modal visible={mergeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={[styles.modalCard, { borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="smallBold">⚡ LOG MULTI-HOUR SPAN</ThemedText>
              <TouchableOpacity onPress={() => setMergeModalVisible(false)}>
                <SymbolView tintColor={theme.textSecondary} name={{ ios: 'xmark', android: 'close', web: 'close' }} size={18} />
              </TouchableOpacity>
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              Log a continuous block of multiple hours (e.g. 3:00 PM – 7:00 PM) in a single entry.
            </ThemedText>

            {/* Hours Picker */}
            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small">Start Hour (24h)</ThemedText>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. 15 (3 PM)"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={mergeStartHour}
                  onChangeText={setMergeStartHour}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small">End Hour (24h)</ThemedText>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. 19 (7 PM)"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={mergeEndHour}
                  onChangeText={setMergeEndHour}
                />
              </View>
            </View>

            {/* Activity Input */}
            <View>
              <ThemedText type="small">Activity Description</ThemedText>
              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="e.g. kitt cluster change to approved list"
                placeholderTextColor={theme.textSecondary}
                value={mergeActivity}
                onChangeText={setMergeActivity}
              />
            </View>

            {/* Duration and Category */}
            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small">Total Minutes</ThemedText>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. 240"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={mergeDuration}
                  onChangeText={setMergeDuration}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small">Category</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.one }}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.modalCatChip,
                        { borderColor: mergeCategory === cat.key ? theme.primary : theme.border },
                        mergeCategory === cat.key && { backgroundColor: theme.primary + '22' },
                      ]}
                      onPress={() => setMergeCategory(cat.key)}
                    >
                      <Text style={styles.catChipText}>{cat.icon} {cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: theme.primary }]}
              onPress={handleSaveMergedBlock}
            >
              <Text style={styles.modalSubmitBtnText}>
                Save Span ({formatHourNumber(parseInt(mergeStartHour, 10) || 15)} – {formatHourNumber(parseInt(mergeEndHour, 10) || 19)})
              </Text>
            </TouchableOpacity>
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
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateSwitcherContainer: {
    marginTop: Spacing.two,
  },
  dateSwitcherScroll: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingVertical: 2,
  },
  dateTab: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dateTabText: {
    fontSize: 12,
  },
  card: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  cardTitle: {
    letterSpacing: 0.8,
  },
  mergeButton: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  mergeButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  allCaughtUpBox: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
  },
  unloggedList: {
    gap: Spacing.three,
  },
  unloggedCard: {
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  slotTimePill: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: 6,
  },
  catChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  slotInputsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  activityInput: {
    flex: 1,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    height: 42,
    fontSize: 13,
  },
  durationInput: {
    width: 65,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    height: 42,
    fontSize: 13,
    textAlign: 'center',
  },
  slotActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  saveSlotBtn: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
  saveSlotBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  quickBreakBtn: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickBreakBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  logSheetList: {
    gap: Spacing.two,
  },
  logSheetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  logSheetLeft: {
    flex: 1,
    gap: 4,
  },
  logTimeCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 11,
  },
  multiHourTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  multiHourTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  logActivityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logSheetRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  deleteLogBtn: {
    padding: 6,
  },
  collapsibleInner: {
    gap: Spacing.four,
  },
  notesSection: {
    gap: Spacing.two,
  },
  extractButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  extractButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  textArea: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.two,
    minHeight: 120,
    fontSize: 14,
    textAlignVertical: 'top',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'System' }),
  },
  checklistSection: {
    gap: Spacing.one,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  todoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
  },
  addTodoRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  input: {
    flex: 1,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    height: 38,
    fontSize: 13,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalInput: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    height: 42,
    fontSize: 13,
    marginTop: 4,
  },
  modalCatChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
  },
  modalSubmitBtn: {
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

