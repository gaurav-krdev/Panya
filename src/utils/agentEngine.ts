// src/utils/agentEngine.ts
import {
  fireFollowUpNotification,
  scheduleRoutineAlarm,
  cancelRoutineAlarm,
  syncRoutineAlarms,
  fireHourlyOverdueNotification,
} from './notificationService';

export interface AgentLog {
  id: string;
  type: 'thought' | 'tool' | 'success' | 'error' | 'info';
  text: string;
  timestamp: string;
}

export interface Routine {
  id: string;
  name: string;
  time: string;
  enabled: boolean;
  completed: boolean;
  followUpIntervalMinutes: number;
  lastRunTimestamp?: number;
  steps: { text: string; action: string }[];
}

export interface HourlyLog {
  id: string;
  date: string; // "YYYY-MM-DD"
  startHour: number; // 6 = 6:00 AM (0-23)
  endHour: number; // 7 = 7:00 AM (1-24)
  activity: string;
  durationMinutes?: number;
  category: 'work' | 'meeting' | 'study' | 'routine' | 'break' | 'personal';
  loggedAt: number;
}

export interface HourlySlot {
  startHour: number;
  endHour: number;
  label: string;
  formattedStart: string;
  formattedEnd: string;
}

export function formatHourNumber(hour: number): string {
  const normalized = hour % 24;
  const period = normalized >= 12 ? 'PM' : 'AM';
  let displayHour = normalized % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
}

export function formatHourRange(startHour: number, endHour: number): string {
  return `${formatHourNumber(startHour)} – ${formatHourNumber(endHour)}`;
}

export interface AppState {
  currentTab: 'home' | 'notes' | 'console' | 'sandbox';
  isAgentRunning: boolean;
  agentLogs: AgentLog[];
  routines: Routine[];
  todos: { id: string; text: string; completed: boolean }[];
  notes: string;
  // Hourly Block Ledger State
  hourlyLogs: HourlyLog[];
  dayStartHour: number; // default 6 = 06:00 AM
  unloggedAlarmLastFiredTimestamp?: number;
  unloggedAlarmLevel: number; // 0, 1, 2, 3
  // Simulated Food App State
  foodApp: {
    restaurant: string;
    items: { name: string; price: number; quantity: number }[];
    status: 'idle' | 'searching' | 'cart' | 'checking_out' | 'delivering' | 'done';
    activeSearch: string;
    cursorPos: { x: number; y: number } | null;
    highlightedElement: string | null;
    riderLocation: { x: number; y: number };
  };
  // Simulated Grocery App State
  groceryApp: {
    items: { name: string; price: number; selected: boolean }[];
    status: 'idle' | 'searching' | 'cart' | 'checking_out' | 'done';
    cursorPos: { x: number; y: number } | null;
    highlightedElement: string | null;
  };
}

class AgentSimulator {
  private state: AppState;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = {
      currentTab: 'home',
      isAgentRunning: false,
      agentLogs: [
        {
          id: '1',
          type: 'info',
          text: 'Panya Agent Core initialized. System status: Ready. Routine 15-min follow-up engine active.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
      routines: [
        {
          id: 'routine-1',
          name: 'Morning Routine Sync',
          time: '08:00',
          enabled: true,
          completed: false,
          followUpIntervalMinutes: 15,
          lastRunTimestamp: Date.now() - 14 * 60 * 1000, // 14 min ago for demonstration
          steps: [
            { text: 'Analyze today\'s agenda and calendar', action: 'read_calendar' },
            { text: 'Extract tasks from active note pad', action: 'extract_tasks' },
            { text: 'Alert user of critical high-priority todo items', action: 'alert_user' },
          ],
        },
        {
          id: 'routine-2',
          name: 'Auto-Order Midday Lunch',
          time: '12:30',
          enabled: true,
          completed: false,
          followUpIntervalMinutes: 15,
          steps: [
            { text: 'Identify meal preference from notes', action: 'read_meal_pref' },
            { text: 'Open EatEasy App and search for restaurant', action: 'food_search' },
            { text: 'Add Salad to cart and place the order', action: 'food_checkout' },
          ],
        },
        {
          id: 'routine-3',
          name: 'Evening Grocery Replenishment',
          time: '18:00',
          enabled: false,
          completed: true,
          followUpIntervalMinutes: 15,
          steps: [
            { text: 'Parse note for bulleted grocery lists', action: 'read_grocery_list' },
            { text: 'Open CartGo App and search for listed items', action: 'grocery_search' },
            { text: 'Compare prices and confirm secure checkout', action: 'grocery_checkout' },
          ],
        },
      ],
      todos: [
        { id: 'todo-1', text: 'Plan next week\'s exercise routine', completed: false },
        { id: 'todo-2', text: 'Buy items on grocery list (Milk, Eggs)', completed: false },
        { id: 'todo-3', text: 'Set review alarm for 9 PM', completed: true },
      ],
      notes: `- Grocery List:\n  * Organic Milk\n  * Free-Range Eggs\n  * Fresh Spinach\n- Lunch preference: Vegan Quinoa Salad\n- Team standup at 3:00 PM today.`,
      // Hourly Block Ledger State
      hourlyLogs: [
        {
          id: 'log-1',
          date: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
          startHour: 6,
          endHour: 7,
          activity: 'working on sync - five min meditation',
          durationMinutes: 20,
          category: 'routine',
          loggedAt: Date.now() - 15 * 3600 * 1000,
        },
        {
          id: 'log-2',
          date: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
          startHour: 7,
          endHour: 8,
          activity: 'ready',
          durationMinutes: 30,
          category: 'routine',
          loggedAt: Date.now() - 14 * 3600 * 1000,
        },
        {
          id: 'log-3',
          date: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
          startHour: 8,
          endHour: 9,
          activity: 'Cassandra',
          durationMinutes: 25,
          category: 'study',
          loggedAt: Date.now() - 13 * 3600 * 1000,
        },
        {
          id: 'log-4',
          date: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
          startHour: 9,
          endHour: 10,
          activity: 'meet',
          durationMinutes: 10,
          category: 'meeting',
          loggedAt: Date.now() - 12 * 3600 * 1000,
        },
        {
          id: 'log-5',
          date: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
          startHour: 10,
          endHour: 11,
          activity: 'PR Review',
          durationMinutes: 30,
          category: 'work',
          loggedAt: Date.now() - 11 * 3600 * 1000,
        },
        {
          id: 'log-6',
          date: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
          startHour: 11,
          endHour: 12,
          activity: 'scrum',
          durationMinutes: 30,
          category: 'meeting',
          loggedAt: Date.now() - 10 * 3600 * 1000,
        },
        {
          id: 'log-7',
          date: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
          startHour: 12,
          endHour: 13,
          activity: 'Created PR',
          durationMinutes: 20,
          category: 'work',
          loggedAt: Date.now() - 9 * 3600 * 1000,
        },
        {
          id: 'log-8',
          date: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
          startHour: 13,
          endHour: 14,
          activity: 'walk',
          durationMinutes: 30,
          category: 'break',
          loggedAt: Date.now() - 8 * 3600 * 1000,
        },
        {
          id: 'log-9',
          date: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
          startHour: 14,
          endHour: 15,
          activity: 'add ref of Perf kitt in par kitt',
          durationMinutes: 20,
          category: 'work',
          loggedAt: Date.now() - 7 * 3600 * 1000,
        },
        {
          id: 'log-10',
          date: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
          startHour: 15,
          endHour: 19,
          activity: 'kitt cluster change to approved list',
          durationMinutes: 240,
          category: 'work',
          loggedAt: Date.now() - 3 * 3600 * 1000,
        },
      ],
      dayStartHour: 6,
      unloggedAlarmLevel: 0,
      foodApp: {
        restaurant: 'GreenLeaf Salads & Bowls',
        items: [
          { name: 'Quinoa Avocado Bowl', price: 14.99, quantity: 0 },
          { name: 'Caesar Salad Wrap', price: 11.99, quantity: 0 },
          { name: 'Matcha Protein Smoothie', price: 7.99, quantity: 0 },
        ],
        status: 'idle',
        activeSearch: '',
        cursorPos: null,
        highlightedElement: null,
        riderLocation: { x: 10, y: 90 },
      },
      groceryApp: {
        items: [
          { name: 'Organic Milk', price: 4.89, selected: false },
          { name: 'Free-Range Eggs', price: 5.49, selected: false },
          { name: 'Fresh Spinach', price: 2.99, selected: false },
          { name: 'Almond Butter', price: 8.99, selected: false },
        ],
        status: 'idle',
        cursorPos: null,
        highlightedElement: null,
      },
    };
  }

  public getState(): AppState {
    return {
      ...this.state,
      routines: [...this.state.routines],
      todos: [...this.state.todos],
      agentLogs: [...this.state.agentLogs],
      hourlyLogs: [...this.state.hourlyLogs],
    };
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public addLog(type: AgentLog['type'], text: string) {
    this.state.agentLogs = [
      ...this.state.agentLogs,
      {
        id: Math.random().toString(),
        type,
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ];
    this.notify();
  }

  public clearLogs() {
    this.state.agentLogs = [];
    this.addLog('info', 'Logs cleared.');
  }

  public toggleRoutine(id: string) {
    this.state.routines = this.state.routines.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );

    // Sync the OS alarm: schedule if enabled+pending, cancel if disabled
    const routine = this.state.routines.find((r) => r.id === id);
    if (routine) {
      if (routine.enabled && !routine.completed) {
        scheduleRoutineAlarm(routine.id, routine.name, routine.time, routine.steps)
          .catch((err) => console.warn('[Panya] Failed to schedule alarm:', err));
      } else {
        cancelRoutineAlarm(routine.id)
          .catch((err) => console.warn('[Panya] Failed to cancel alarm:', err));
      }
    }

    this.notify();
  }

  public toggleRoutineCompleted(id: string) {
    this.state.routines = this.state.routines.map((r) => {
      if (r.id === id) {
        const nextCompleted = !r.completed;
        this.addLog(
          nextCompleted ? 'success' : 'info',
          nextCompleted
            ? `Routine "${r.name}" marked as DONE. Follow-up sequence paused.`
            : `Routine "${r.name}" marked PENDING. Follow-up sequence active.`
        );

        // Sync OS alarm
        if (nextCompleted) {
          cancelRoutineAlarm(r.id)
            .catch((err) => console.warn('[Panya] Failed to cancel alarm:', err));
        } else if (r.enabled) {
          scheduleRoutineAlarm(r.id, r.name, r.time, r.steps)
            .catch((err) => console.warn('[Panya] Failed to schedule alarm:', err));
        }

        return { ...r, completed: nextCompleted };
      }
      return r;
    });
    this.notify();
  }

  public addRoutine(name: string, time: string, steps: { text: string; action: string }[], followUpIntervalMinutes: number = 15) {
    const newRoutine: Routine = {
      id: 'routine-' + Date.now(),
      name,
      time,
      enabled: true,
      completed: false,
      followUpIntervalMinutes,
      steps: steps.length > 0 ? steps : [{ text: `Execute routine: ${name}`, action: 'custom_action' }],
    };
    this.state.routines = [...this.state.routines, newRoutine];
    this.addLog('success', `Created new routine "${name}" scheduled for ${time}.`);

    // Schedule a real OS alarm for this routine
    scheduleRoutineAlarm(newRoutine.id, name, time, newRoutine.steps)
      .catch((err) => console.warn('[Panya] Failed to schedule alarm:', err));

    this.notify();
  }

  public updateRoutine(id: string, updates: Partial<Routine>) {
    this.state.routines = this.state.routines.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    );
    this.addLog('info', `Updated routine details.`);

    // Re-schedule the OS alarm with the updated time/steps
    const routine = this.state.routines.find((r) => r.id === id);
    if (routine && routine.enabled && !routine.completed) {
      scheduleRoutineAlarm(routine.id, routine.name, routine.time, routine.steps)
        .catch((err) => console.warn('[Panya] Failed to reschedule alarm after edit:', err));
    }

    this.notify();
  }

  public deleteRoutine(id: string) {
    const routine = this.state.routines.find((r) => r.id === id);
    this.state.routines = this.state.routines.filter((r) => r.id !== id);
    if (routine) {
      cancelRoutineAlarm(routine.id)
        .catch((err) => console.warn('[Panya] Failed to cancel alarm:', err));
      this.addLog('info', `Deleted routine "${routine.name}".`);
    }
    this.notify();
  }

  public checkRoutineFollowUps() {
    if (this.state.isAgentRunning) return;
    const now = Date.now();

    for (const routine of this.state.routines) {
      if (routine.enabled && !routine.completed) {
        const intervalMs = (routine.followUpIntervalMinutes || 15) * 60 * 1000;
        const lastRun = routine.lastRunTimestamp || 0;
        if (now - lastRun >= intervalMs) {
          routine.lastRunTimestamp = now;
          this.addLog('thought', `⏰ FOLLOW-UP: Pending routine "${routine.name}" has not been marked done!`);
          this.addLog('tool', `Re-evaluating routine checklist items for "${routine.name}"...`);

          // Fire a REAL OS notification with sound
          fireFollowUpNotification(
            routine.id,
            routine.name,
            routine.followUpIntervalMinutes || 15
          ).catch((err) => console.warn('[Panya] Follow-up notification failed:', err));

          this.notify();
          break;
        }
      }
    }
  }

  public setNotes(notes: string) {
    this.state.notes = notes;
    this.notify();
  }

  public toggleTodo(id: string) {
    this.state.todos = this.state.todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    this.notify();
  }

  public addTodo(text: string) {
    this.state.todos.push({
      id: 'todo-' + Date.now(),
      text,
      completed: false,
    });
    this.notify();
  }

  // ── Hourly Block Ledger Methods ────────────────────────────────────

  public getTodayDateString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  public getTodayLogs(): HourlyLog[] {
    const today = this.getTodayDateString();
    return this.state.hourlyLogs
      .filter((l) => l.date === today)
      .sort((a, b) => a.startHour - b.startHour);
  }

  public getUnloggedHourlySlots(currentDate: Date = new Date()): HourlySlot[] {
    const currentHour = currentDate.getHours();
    const startHour = this.state.dayStartHour;
    const todayLogs = this.getTodayLogs();

    const slots: HourlySlot[] = [];

    // Derive all elapsed hours of the current day that are not yet filled
    for (let h = startHour; h < currentHour; h++) {
      const isCovered = todayLogs.some((l) => l.startHour <= h && h < l.endHour);
      if (!isCovered) {
        slots.push({
          startHour: h,
          endHour: h + 1,
          label: formatHourRange(h, h + 1),
          formattedStart: formatHourNumber(h),
          formattedEnd: formatHourNumber(h + 1),
        });
      }
    }

    return slots;
  }

  public logHourlyBlock(
    startHour: number,
    endHour: number,
    activity: string,
    durationMinutes: number = 60,
    category: HourlyLog['category'] = 'work'
  ) {
    if (!activity.trim()) return;
    const today = this.getTodayDateString();
    const newLog: HourlyLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: today,
      startHour,
      endHour,
      activity: activity.trim(),
      durationMinutes,
      category,
      loggedAt: Date.now(),
    };

    // Remove any overlapping partial logs if this is a merged block
    this.state.hourlyLogs = this.state.hourlyLogs.filter((l) => {
      if (l.date !== today) return true;
      const overlaps = Math.max(l.startHour, startHour) < Math.min(l.endHour, endHour);
      return !overlaps;
    });

    this.state.hourlyLogs.push(newLog);
    this.state.hourlyLogs.sort((a, b) => a.startHour - b.startHour);

    this.addLog(
      'success',
      `Logged [${formatHourRange(startHour, endHour)}]: "${newLog.activity}" (${durationMinutes}m)`
    );

    // Re-check alarms immediately
    this.checkHourlyBlockAlarms();
    this.notify();
  }

  public quickLogBreak(startHour: number, endHour: number, reason: string = 'Break / Personal') {
    this.logHourlyBlock(startHour, endHour, reason, (endHour - startHour) * 60, 'break');
  }

  public deleteHourlyLog(id: string) {
    const target = this.state.hourlyLogs.find((l) => l.id === id);
    this.state.hourlyLogs = this.state.hourlyLogs.filter((l) => l.id !== id);
    if (target) {
      this.addLog('info', `Deleted log for ${formatHourRange(target.startHour, target.endHour)}.`);
    }
    this.checkHourlyBlockAlarms();
    this.notify();
  }

  public updateHourlyLog(id: string, updates: Partial<HourlyLog>) {
    this.state.hourlyLogs = this.state.hourlyLogs.map((l) =>
      l.id === id ? { ...l, ...updates } : l
    );
    this.notify();
  }

  public setDayStartHour(hour: number) {
    this.state.dayStartHour = hour;
    this.notify();
  }

  public checkHourlyBlockAlarms() {
    const unloggedSlots = this.getUnloggedHourlySlots();
    const count = unloggedSlots.length;
    const now = Date.now();

    if (count < 2) {
      this.state.unloggedAlarmLevel = count;
      return;
    }

    const timeSummary = unloggedSlots.map((s) => s.label).join(', ');

    if (count === 2) {
      // 2 Empty Blocks: One-time alarm
      if (this.state.unloggedAlarmLevel !== 2) {
        this.state.unloggedAlarmLevel = 2;
        this.state.unloggedAlarmLastFiredTimestamp = now;

        this.addLog('thought', `⚠️ 2 Unlogged Hourly Blocks detected: ${timeSummary}. Firing reminder.`);
        fireHourlyOverdueNotification(count, timeSummary, false)
          .catch((err) => console.warn('[Panya] Hourly notification error:', err));
        this.notify();
      }
    } else if (count >= 3) {
      // 3+ Empty Blocks: Repeating alarm every 15 minutes
      this.state.unloggedAlarmLevel = 3;
      const intervalMs = 15 * 60 * 1000;
      const lastFired = this.state.unloggedAlarmLastFiredTimestamp || 0;

      if (now - lastFired >= intervalMs || lastFired === 0) {
        this.state.unloggedAlarmLastFiredTimestamp = now;

        this.addLog('thought', `🚨 ESCALATION: ${count} Unlogged Blocks (${timeSummary})! Repeating alarm active.`);
        fireHourlyOverdueNotification(count, timeSummary, true)
          .catch((err) => console.warn('[Panya] Escalated hourly notification error:', err));
        this.notify();
      }
    }
  }

  // --- Agent Core Actions ---

  public async runRoutine(routineId: string) {
    if (this.state.isAgentRunning) return;
    const routine = this.state.routines.find((r) => r.id === routineId);
    if (!routine) return;

    routine.lastRunTimestamp = Date.now();
    this.state.isAgentRunning = true;
    this.notify();

    this.addLog('info', `Starting routine: "${routine.name}"`);

    // Fire a real notification that the routine has started
    fireFollowUpNotification(routine.id, `${routine.name} – Started`, 0)
      .catch((err) => console.warn('[Panya] Routine start notification failed:', err));

    for (const step of routine.steps) {
      this.addLog('thought', `Next objective: ${step.text}`);
      await this.sleep(1500);

      this.addLog('tool', `Executing action: ${step.action}`);
      await this.sleep(1000);

      try {
        await this.executeAction(step.action);
        this.addLog('success', `Completed: ${step.text}`);
      } catch (err: any) {
        this.addLog('error', `Failed: ${err.message}`);
        break;
      }
      await this.sleep(1000);
    }

    this.state.isAgentRunning = false;
    this.addLog('info', `Routine "${routine.name}" finished.`);
    this.notify();
  }

  public async processCommand(commandText: string) {
    if (this.state.isAgentRunning) return;
    const cmd = commandText.toLowerCase().trim();

    this.state.isAgentRunning = true;
    this.notify();

    this.addLog('thought', `Analyzing user query: "${commandText}"`);
    await this.sleep(1200);

    if (cmd.includes('pizza') || cmd.includes('lunch') || cmd.includes('food') || cmd.includes('order meal')) {
      this.addLog('tool', `Matching user intent: Food Order Simulation`);
      await this.sleep(1000);
      await this.simulateFoodOrder();
    } else if (cmd.includes('grocery') || cmd.includes('groceries') || cmd.includes('buy milk')) {
      this.addLog('tool', `Matching user intent: Grocery Store Simulation`);
      await this.sleep(1000);
      await this.simulateGroceryOrder();
    } else if (cmd.includes('extract') || cmd.includes('parse notes')) {
      this.addLog('tool', `Matching user intent: Notes Parsing & Task Extraction`);
      await this.sleep(1000);
      await this.executeAction('extract_tasks');
    } else if (cmd.includes('task') || cmd.includes('todo')) {
      const match = commandText.match(/(?:create|add)\s+task\s+(.+)/i);
      if (match && match[1]) {
        const text = match[1];
        this.addLog('thought', `Creating todo task: "${text}"`);
        this.addTodo(text);
        this.addLog('success', `Added task "${text}" successfully.`);
      } else {
        this.addLog('info', `Your checklist has ${this.state.todos.filter(t => !t.completed).length} active items.`);
      }
    } else if (cmd.includes('test alarm') || cmd.includes('test notification')) {
      this.addLog('tool', `Matching user intent: Test Notification System`);
      await this.sleep(500);
      try {
        const { fireTestNotification } = await import('./notificationService');
        await fireTestNotification();
        this.addLog('success', `🔔 Test alarm fired! You should hear a notification sound now.`);
      } catch (err: any) {
        this.addLog('error', `Notification test failed: ${err.message}`);
      }
    } else {
      this.addLog('error', `Unknown command. Supported: "order food", "buy groceries", "extract tasks", "create task <desc>", "test alarm".`);
    }

    this.state.isAgentRunning = false;
    this.notify();
  }

  private async executeAction(action: string) {
    if (action === 'read_calendar') {
      this.addLog('info', 'Reading local calendar events... found "Team standup at 3:00 PM".');
    } else if (action === 'extract_tasks') {
      this.addLog('thought', 'Scanning active notes for lines containing lists (* or -)...');
      await this.sleep(800);
      const lines = this.state.notes.split('\n');
      let extractedCount = 0;
      for (const line of lines) {
        if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
          const cleanText = line.replace(/^[*\-\s]+/, '').trim();
          if (cleanText && !cleanText.includes(':') && !this.state.todos.some(t => t.text.toLowerCase() === cleanText.toLowerCase())) {
            this.addTodo(cleanText);
            extractedCount++;
          }
        }
      }
      this.addLog('success', `Extracted and imported ${extractedCount} new checklist items from your notes!`);
    } else if (action === 'alert_user') {
      this.addLog('success', 'Sending notifications: "Reminder: Plan exercise routine"');
      // Fire a real OS notification for the alert
      fireFollowUpNotification('alert', 'Plan exercise routine', 0)
        .catch((err) => console.warn('[Panya] Alert notification failed:', err));
    } else if (action === 'read_meal_pref') {
      this.addLog('thought', 'Reading note pad preferences...');
      if (this.state.notes.toLowerCase().includes('vegan quinoa salad')) {
        this.addLog('success', 'Found meal preference: Vegan Quinoa Salad');
      } else {
        this.addLog('success', 'Defaulting preference: Quinoa Salad');
      }
    } else if (action === 'food_search') {
      await this.simulateFoodOrderStep1();
    } else if (action === 'food_checkout') {
      await this.simulateFoodOrderStep2();
    } else if (action === 'read_grocery_list') {
      this.addLog('thought', 'Scanning notes for grocery lists...');
      await this.sleep(800);
      this.addLog('success', 'Found list: Organic Milk, Free-Range Eggs');
    } else if (action === 'grocery_search') {
      await this.simulateGroceryOrderStep1();
    } else if (action === 'grocery_checkout') {
      await this.simulateGroceryOrderStep2();
    }
  }

  // --- Specific Simulation Step Functions ---

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- Food Order Simulator State Machine ---

  private async simulateFoodOrder() {
    this.state.currentTab = 'sandbox';
    this.state.foodApp.status = 'idle';
    this.notify();
    await this.sleep(1000);

    await this.simulateFoodOrderStep1();
    await this.simulateFoodOrderStep2();
  }

  private async simulateFoodOrderStep1() {
    this.addLog('thought', 'Opening "EatEasy" food delivery app.');
    this.state.foodApp.status = 'searching';
    this.state.foodApp.cursorPos = { x: 50, y: 150 };
    this.state.foodApp.highlightedElement = 'Search Bar';
    this.notify();
    await this.sleep(1200);

    this.addLog('tool', 'Typing search query: "GreenLeaf Salads"');
    this.state.foodApp.activeSearch = 'GreenLeaf Salads';
    this.state.foodApp.cursorPos = { x: 300, y: 150 };
    this.notify();
    await this.sleep(1000);

    this.addLog('thought', 'Found restaurant. Selecting "GreenLeaf Salads & Bowls".');
    this.state.foodApp.status = 'cart';
    this.state.foodApp.cursorPos = { x: 180, y: 280 };
    this.state.foodApp.highlightedElement = 'Quinoa Avocado Bowl Add Button';
    this.notify();
    await this.sleep(1200);
  }

  private async simulateFoodOrderStep2() {
    this.addLog('tool', 'Clicking "Add to Cart" for Quinoa Avocado Bowl');
    this.state.foodApp.items = this.state.foodApp.items.map((item) =>
      item.name === 'Quinoa Avocado Bowl' ? { ...item, quantity: 1 } : item
    );
    this.state.foodApp.cursorPos = { x: 180, y: 400 };
    this.state.foodApp.highlightedElement = 'Smoothie Add Button';
    this.notify();
    await this.sleep(1000);

    this.addLog('tool', 'Clicking "Add to Cart" for Matcha Protein Smoothie');
    this.state.foodApp.items = this.state.foodApp.items.map((item) =>
      item.name === 'Matcha Protein Smoothie' ? { ...item, quantity: 1 } : item
    );
    this.state.foodApp.cursorPos = { x: 250, y: 620 };
    this.state.foodApp.highlightedElement = 'Checkout Button';
    this.notify();
    await this.sleep(1200);

    this.addLog('thought', 'Redirecting to Cart Checkout screen.');
    this.state.foodApp.status = 'checking_out';
    this.state.foodApp.cursorPos = { x: 200, y: 670 };
    this.state.foodApp.highlightedElement = 'Confirm Order Payment';
    this.notify();
    await this.sleep(1500);

    this.addLog('tool', 'Authorizing secure credit card transaction API... done.');
    this.state.foodApp.status = 'delivering';
    this.state.foodApp.highlightedElement = null;
    this.state.foodApp.cursorPos = null;
    this.notify();
    this.addLog('success', 'EatEasy Order placed successfully! Tracking live delivery...');

    // Live Rider Delivery Loop Simulation
    for (let i = 1; i <= 5; i++) {
      await this.sleep(1000);
      this.state.foodApp.riderLocation = {
        x: 10 + i * 16,
        y: 90 - i * 14,
      };
      this.notify();
    }

    await this.sleep(1000);
    this.state.foodApp.status = 'done';
    this.notify();
    this.addLog('success', 'Rider arrived! Order has been delivered to your front desk.');
  }

  // --- Grocery Order Simulator State Machine ---

  private async simulateGroceryOrder() {
    this.state.currentTab = 'sandbox';
    this.state.groceryApp.status = 'idle';
    this.notify();
    await this.sleep(1000);

    await this.simulateGroceryOrderStep1();
    await this.simulateGroceryOrderStep2();
  }

  private async simulateGroceryOrderStep1() {
    this.addLog('thought', 'Opening "CartGo" grocery store companion.');
    this.state.groceryApp.status = 'searching';
    this.state.groceryApp.cursorPos = { x: 80, y: 200 };
    this.state.groceryApp.highlightedElement = 'Items List';
    this.notify();
    await this.sleep(1200);

    this.addLog('tool', 'Selecting list items: "Organic Milk", "Free-Range Eggs"');
    this.state.groceryApp.items = this.state.groceryApp.items.map((item) =>
      item.name === 'Organic Milk' || item.name === 'Free-Range Eggs'
        ? { ...item, selected: true }
        : item
    );
    this.state.groceryApp.cursorPos = { x: 320, y: 300 };
    this.state.groceryApp.highlightedElement = 'Add selected items to cart';
    this.notify();
    await this.sleep(1500);
  }

  private async simulateGroceryOrderStep2() {
    this.addLog('thought', 'Items added to shopping cart. Navigating to Checkout.');
    this.state.groceryApp.status = 'cart';
    this.state.groceryApp.cursorPos = { x: 200, y: 640 };
    this.state.groceryApp.highlightedElement = 'Checkout & Secure Pay';
    this.notify();
    await this.sleep(1500);

    this.state.groceryApp.status = 'checking_out';
    this.state.groceryApp.cursorPos = { x: 200, y: 670 };
    this.notify();
    await this.sleep(1500);

    this.addLog('tool', 'Paying $10.38 via checkout gateway integration...');
    this.state.groceryApp.status = 'done';
    this.state.groceryApp.cursorPos = null;
    this.state.groceryApp.highlightedElement = null;
    this.notify();
    this.addLog('success', 'CartGo grocery delivery confirmed! Delivery scheduled between 6 - 7 PM.');
  }

  /**
   * Sync all active routines with the OS notification scheduler.
   * Call once after app init / notification permissions are granted.
   */
  public syncAllAlarms() {
    syncRoutineAlarms(this.state.routines)
      .catch((err) => console.warn('[Panya] Failed to sync alarms:', err));
  }
}

export const agentEngine = new AgentSimulator();
