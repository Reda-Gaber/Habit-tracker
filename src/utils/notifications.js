// Notification helpers - uses the Web Notifications API.
// For scheduled/local notifications on mobile PWAs we rely on the
// service worker + periodic checks while the app is open, plus
// requesting permission upfront.

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

export function getNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function showNotification(title, options = {}) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      reg.showNotification(title, {
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        ...options,
      });
      return;
    }
  }
  // Fallback
  new Notification(title, options);
}

// Checks habit reminder times against the current time (called periodically)
export function timeMatches(reminderTime) {
  if (!reminderTime) return false;
  const now = new Date();
  const [h, m] = reminderTime.split(":").map(Number);
  return now.getHours() === h && now.getMinutes() === m;
}

// ---------------- Periodic checks for habit/task notifications ----------------
// Runs every ~60s while the app is open. Uses a "notified" set in settings
// to avoid repeating the same notification within a day.

import { db, getSetting, setSetting } from "../db/db";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

async function alreadyNotified(key) {
  const sentToday = await getSetting("notifiedKeys", {});
  const today = todayStr();
  return sentToday[today]?.includes(key);
}

async function markNotified(key) {
  const sentToday = await getSetting("notifiedKeys", {});
  const today = todayStr();
  const todays = sentToday[today] || [];
  if (!todays.includes(key)) {
    todays.push(key);
  }
  // Keep only today's entries to avoid unbounded growth
  await setSetting("notifiedKeys", { [today]: todays });
}

export async function runNotificationChecks() {
  if (getNotificationPermission() !== "granted") return;

  const habitRemindersOn = await getSetting("notifHabitReminders", true);
  const taskAlertsOn = await getSetting("notifTaskDueAlerts", true);
  const dailySummaryOn = await getSetting("notifDailySummary", true);
  const dailySummaryTime = await getSetting("notifDailySummaryTime", "08:00");

  const now = new Date();
  const today = todayStr();

  // 1. Habit reminders
  if (habitRemindersOn) {
    const habits = await db.habits.toArray();
    const dow = now.getDay();
    for (const habit of habits) {
      if (!habit.days?.includes(dow)) continue;
      if (!timeMatches(habit.reminderTime)) continue;
      const key = `habit_${habit.id}_${today}`;
      if (await alreadyNotified(key)) continue;
      await showNotification("Habit reminder", {
        body: `Time for "${habit.name}"`,
        tag: key,
      });
      await markNotified(key);
    }
  }

  // 2. Daily digest
  if (dailySummaryOn && timeMatches(dailySummaryTime)) {
    const key = `digest_${today}`;
    if (!(await alreadyNotified(key))) {
      const tasks = await db.tasks.toArray();
      const dueToday = tasks.filter((t) => t.dueDate === today && !t.completed).length;
      const overdue = tasks.filter((t) => t.dueDate < today && !t.completed).length;
      const habits = await db.habits.toArray();
      const dow = now.getDay();
      const habitsToday = habits.filter((h) => h.days?.includes(dow)).length;
      await showNotification("Your day ahead", {
        body: `${dueToday} task${dueToday !== 1 ? "s" : ""} due today, ${habitsToday} habit${habitsToday !== 1 ? "s" : ""} planned${overdue > 0 ? `, ${overdue} overdue` : ""}.`,
        tag: key,
      });
      await markNotified(key);
    }
  }

  // 3. Task due-soon / overdue alerts
  if (taskAlertsOn) {
    const tasks = await db.tasks.toArray();
    for (const task of tasks) {
      if (task.completed) continue;

      // Overdue (date passed)
      if (task.dueDate < today) {
        const key = `task_overdue_${task.id}_${today}`;
        if (!(await alreadyNotified(key))) {
          await showNotification("Task overdue", {
            body: `"${task.title}" was due ${task.dueDate}.`,
            tag: key,
          });
          await markNotified(key);
        }
        continue;
      }

      // Due today with a specific time: notify 30 min before, and at due time
      if (task.dueDate === today && task.hasDueTime && task.dueTime) {
        const [h, m] = task.dueTime.split(":").map(Number);
        const dueDateTime = new Date(now);
        dueDateTime.setHours(h, m, 0, 0);
        const diffMin = (dueDateTime - now) / 60000;

        if (diffMin <= 30 && diffMin > 29) {
          const key = `task_soon_${task.id}_${today}`;
          if (!(await alreadyNotified(key))) {
            await showNotification("Task due soon", {
              body: `"${task.title}" is due in 30 minutes.`,
              tag: key,
            });
            await markNotified(key);
          }
        }

        if (diffMin <= 0 && diffMin > -1) {
          const key = `task_due_${task.id}_${today}`;
          if (!(await alreadyNotified(key))) {
            await showNotification("Task due now", {
              body: `"${task.title}" is due now.`,
              tag: key,
            });
            await markNotified(key);
          }
        }
      }
    }
  }
}
