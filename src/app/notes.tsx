// src/app/notes.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Text, TextInput, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAgentState } from '@/hooks/use-agent';
import { agentEngine } from '@/utils/agentEngine';

export default function NotesScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const agentState = useAgentState();

  const [newTaskText, setNewTaskText] = useState('');

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

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 640;

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: safeAreaInsets.top + Spacing.three,
      paddingLeft: safeAreaInsets.left,
      paddingRight: safeAreaInsets.right,
      paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
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
          <ThemedText type="subtitle">Notes & Tasks</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Write plans and let Panya parse checklists</ThemedText>
        </View>
      </View>

      {/* NOTES PAD */}
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <View 
          style={[
            styles.cardHeader,
            {
              flexDirection: width < 400 ? 'column' : 'row',
              alignItems: width < 400 ? 'stretch' : 'center',
              gap: width < 400 ? Spacing.two : 0,
            }
          ]}
        >
          <View style={styles.cardTitleRow}>
            <SymbolView tintColor={theme.primary} name={{ ios: 'note.text', android: 'edit', web: 'edit' }} size={16} />
            <ThemedText type="smallBold" style={styles.cardTitle}>ACTIVE NOTE PAD</ThemedText>
          </View>
          <TouchableOpacity
            style={[
              styles.extractButton, 
              { backgroundColor: theme.primary },
              width < 400 && { alignItems: 'center' }
            ]}
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
          placeholder="Type notes here... bullet lists with * will be extracted as tasks."
          placeholderTextColor={theme.textSecondary}
        />
      </ThemedView>

      {/* CHECKLIST */}
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <SymbolView tintColor={theme.secondary} name={{ ios: 'checkmark.circle', android: 'check', web: 'check' }} size={16} />
            <ThemedText type="smallBold" style={styles.cardTitle}>TASK CHECKLIST</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {agentState.todos.filter(t => !t.completed).length} pending
          </ThemedText>
        </View>

        {/* List of Tasks */}
        <View style={styles.todoList}>
          {agentState.todos.map((todo) => (
            <TouchableOpacity
              key={todo.id}
              style={[styles.todoItem, { borderBottomColor: theme.border }]}
              onPress={() => handleToggleTodo(todo.id)}
            >
              <View style={[
                styles.checkbox,
                { borderColor: todo.completed ? theme.accent : theme.textSecondary },
                todo.completed && { backgroundColor: theme.accent + '22' }
              ]}>
                {todo.completed && (
                  <View style={[styles.checkboxInner, { backgroundColor: theme.accent }]} />
                )}
              </View>
              <Text style={[
                styles.todoText,
                { color: todo.completed ? theme.textSecondary : theme.text },
                todo.completed && styles.todoTextCompleted
              ]}>
                {todo.text}
              </Text>
            </TouchableOpacity>
          ))}

          {agentState.todos.length === 0 && (
            <View style={styles.emptyContainer}>
              <ThemedText type="small" themeColor="textSecondary">No tasks created yet.</ThemedText>
            </View>
          )}
        </View>

        {/* Add Todo Row */}
        <View style={styles.addTodoRow}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            value={newTaskText}
            onChangeText={setNewTaskText}
            placeholder="Add a new task manually..."
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={handleAddTodo}
          />
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={handleAddTodo}>
            <SymbolView tintColor="#ffffff" name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} />
          </TouchableOpacity>
        </View>
      </ThemedView>
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
    marginBottom: Spacing.two,
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
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  cardTitle: {
    letterSpacing: 0.8,
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
    minHeight: 140,
    fontSize: 14,
    textAlignVertical: 'top',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'System' }),
  },
  todoList: {
    marginVertical: Spacing.one,
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
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.three,
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
});
