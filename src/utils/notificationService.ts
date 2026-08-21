// src/utils/notificationService.ts
// Real Android/iOS notification service using expo-notifications.
// This replaces the purely in-memory "alarm" simulation so routines
// actually fire audible OS-level notifications with sound.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Channel IDs ─────────────────────────────────────────────────────
const ROUTINE_CHANNEL_ID = 'panya-routine-alarms';
const FOLLOW_UP_CHANNEL_ID = 'panya-follow-up-alarms';
const HOURLY_ALARM_CHANNEL_ID = 'panya-hourly-alarms';

// ── Notification handler (shows banners while app is in foreground) ─
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Initialisation ─────────────────────────────────────────────────
/**
 * Must be called once at app startup (e.g. in _layout.tsx).
 * Sets up Android notification channels and requests permissions.
 */
export async function initNotifications(): Promise<boolean> {
  // 1. Create high-importance channels on Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ROUTINE_CHANNEL_ID, {
      name: 'Routine Alarms',
      description: 'Alarm notifications for scheduled Panya routines',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });

    await Notifications.setNotificationChannelAsync(FOLLOW_UP_CHANNEL_ID, {
      name: 'Follow-up Alerts',
      description: 'Periodic follow-up reminders for pending routines',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#22C55E',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });

    await Notifications.setNotificationChannelAsync(HOURLY_ALARM_CHANNEL_ID, {
      name: 'Hourly Log Alarms',
      description: 'Alerts for unlogged hourly activity blocks',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#F59E0B',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });
  }

  if (Platform.OS === 'web') {
    return true;
  }

  // 2. Request permission on native iOS/Android
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Panya] Notification permission NOT granted – alarms will be silent.');
      return false;
    }
  } catch (e) {
    return false;
  }

  console.log('[Panya] Notification system initialised. Channels ready.');
  return true;
}

// ── Schedule a routine alarm ───────────────────────────────────────
/**
 * Schedules a one-shot notification for a routine at a specific HH:MM
 * today (or tomorrow if the time has already passed).
 *
 * @returns The notification identifier (for later cancellation).
 */
export async function scheduleRoutineAlarm(
  routineId: string,
  routineName: string,
  timeStr: string, // "HH:MM"
  steps: { text: string }[]
): Promise<string> {
  if (Platform.OS === 'web') return 'web-routine-noop';
  // Cancel any existing notification for this routine first
  await cancelRoutineAlarm(routineId);

  const [hours, minutes] = timeStr.split(':').map(Number);

  const now = new Date();
  const triggerDate = new Date();
  triggerDate.setHours(hours, minutes, 0, 0);

  // If the time already passed today, schedule for tomorrow
  if (triggerDate.getTime() <= now.getTime()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  const stepsPreview = steps.slice(0, 3).map((s) => `• ${s.text}`).join('\n');

  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: `routine-alarm-${routineId}`,
    content: {
      title: `⏰ ${routineName}`,
      body: `Routine triggered!\n${stepsPreview}`,
      data: { routineId, type: 'routine_alarm' },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === 'android' ? { channelId: ROUTINE_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  console.log(
    `[Panya] Scheduled alarm for "${routineName}" at ${triggerDate.toLocaleTimeString()} (id: ${identifier})`
  );
  return identifier;
}

// ── Schedule a follow-up reminder ──────────────────────────────────
/**
 * Fires a follow-up notification immediately (or after a short delay)
 * reminding the user that a routine is still pending.
 */
export async function fireFollowUpNotification(
  routineId: string,
  routineName: string,
  intervalMinutes: number
): Promise<string> {
  if (Platform.OS === 'web') return 'web-followup-noop';
  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: `follow-up-${routineId}-${Date.now()}`,
    content: {
      title: `🔔 Follow-up: ${routineName}`,
      body: `This routine has not been marked done.\nNext check in ${intervalMinutes} min.`,
      data: { routineId, type: 'follow_up' },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      ...(Platform.OS === 'android' ? { channelId: FOLLOW_UP_CHANNEL_ID } : {}),
    },
    trigger: null, // fire immediately
  });

  return identifier;
}

// ── Cancel a scheduled routine alarm ───────────────────────────────
export async function cancelRoutineAlarm(routineId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`routine-alarm-${routineId}`);
  } catch {
    // Notification may not exist — that's fine
  }
}

// ── Cancel all Panya notifications ─────────────────────────────────
export async function cancelAllPanyaNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Re-schedule all enabled & incomplete routines ──────────────────
/**
 * Call this after app restart or when routine list changes
 * to ensure every active routine has a scheduled OS alarm.
 */
export async function syncRoutineAlarms(
  routines: { id: string; name: string; time: string; enabled: boolean; completed: boolean; steps: { text: string }[] }[]
): Promise<void> {
  if (Platform.OS === 'web') return;
  // Cancel everything first to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const r of routines) {
    if (r.enabled && !r.completed) {
      await scheduleRoutineAlarm(r.id, r.name, r.time, r.steps);
    }
  }
}

// ── Fire an immediate test notification ────────────────────────────
/**
 * Useful for verifying the notification system works.
 */
export async function fireTestNotification(): Promise<string> {
  if (Platform.OS === 'web') return 'web-test-noop';
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧪 Panya Test Alarm',
      body: 'If you can hear this, notifications are working!',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === 'android' ? { channelId: ROUTINE_CHANNEL_ID } : {}),
    },
    trigger: null, // fire immediately
  });

  return identifier;
}

// ── Fire Hourly Overdue Alarm Notification ─────────────────────────
/**
 * Triggers an alarm when 2 or 3+ past hourly blocks are unlogged.
 */
export async function fireHourlyOverdueNotification(
  unfilledCount: number,
  timeSummary: string,
  isEscalated: boolean
): Promise<string> {
  if (Platform.OS === 'web') {
    console.log(`[Panya Web] Overdue Alarm: ${unfilledCount} hours unlogged (${timeSummary})`);
    return 'web-hourly-noop';
  }
  const title = isEscalated
    ? `🚨 ${unfilledCount} Hours Unlogged!`
    : `⚠️ ${unfilledCount} Hours Unlogged`;
  const body = isEscalated
    ? `You have ${unfilledCount} hours pending (${timeSummary}). Repeating reminder every 15 min.`
    : `Please log what you did for (${timeSummary}).`;

  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: `hourly-overdue-${Date.now()}`,
    content: {
      title,
      body,
      data: { type: 'hourly_overdue', unfilledCount, isEscalated },
      sound: 'default',
      priority: isEscalated
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.HIGH,
      ...(Platform.OS === 'android' ? { channelId: HOURLY_ALARM_CHANNEL_ID } : {}),
    },
    trigger: null, // fire immediately
  });

  console.log(`[Panya] Fired hourly overdue alarm (count: ${unfilledCount}, escalated: ${isEscalated})`);
  return identifier;
}

