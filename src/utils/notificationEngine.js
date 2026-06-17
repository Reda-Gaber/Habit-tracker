import { db, getSetting, setSetting } from "../db/db";
import { getGoalProgress } from "./goalProgress";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Keeps a permanent log of every dedupeKey that has ever fired, completely
// independent from the notifications table. This is what actually prevents
// repeats — checking the notifications table itself doesn't work, because
// the user can read/delete rows there, and the underlying condition (an
// overdue task, an exceeded budget, etc.) would then look "new" again on
// the very next check and re-fire endlessly.
async function hasFired(key) {
  const fired = await getSetting("firedNotificationKeys", []);
  return fired.includes(key);
}

async function markFired(key) {
  const fired = await getSetting("firedNotificationKeys", []);
  if (!fired.includes(key)) {
    fired.push(key);
    await setSetting("firedNotificationKeys", fired);
  }
}

async function notifyOnce(dedupeKey, type, title, message) {
  if (await hasFired(dedupeKey)) return;
  await db.notifications.add({ type, title, message, read: false, dedupeKey, createdAt: Date.now() });
  await markFired(dedupeKey);
}

async function checkTasks(today) {
  const tasks = await db.tasks.toArray();
  for (const task of tasks) {
    if (task.completed) continue;
    if (task.dueDate < today) {
      await notifyOnce(
        `task_overdue_${task.id}_${today}`,
        "danger",
        "Task overdue",
        `"${task.title}" was due ${task.dueDate}.`
      );
    } else if (task.dueDate === today) {
      await notifyOnce(
        `task_due_today_${task.id}_${today}`,
        "warning",
        "Task due today",
        `"${task.title}" is due today.`
      );
    }
  }
}

async function checkHabitStreaks(today) {
  const habits = await db.habits.toArray();
  const habitLogs = await db.habitLogs.toArray();

  for (const habit of habits) {
    const logDates = new Set(habitLogs.filter((l) => l.habitId === habit.id).map((l) => l.date));
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const dow = cursor.getDay();
      const dateStr = cursor.toISOString().split("T")[0];
      if (habit.days?.includes(dow)) {
        if (logDates.has(dateStr)) streak++;
        else if (dateStr !== today) break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    for (const milestone of [7, 30, 100]) {
      if (streak === milestone) {
        await notifyOnce(
          `habit_streak_${habit.id}_${milestone}`,
          "success",
          "Streak milestone!",
          `"${habit.name}" hit a ${milestone}-day streak. Keep it up!`
        );
      }
    }
  }
}

async function checkGoals(today, now, learningData) {
  const goals = await db.goals.toArray();

  for (const goal of goals) {
    const progress = getGoalProgress(goal, learningData);

    if (progress >= 100) {
      await notifyOnce("goal_complete_" + goal.id, "success", "Goal achieved!", `You completed "${goal.title}".`);
      continue;
    }

    if (!goal.createdAt || !goal.targetDate) continue;
    const created = new Date(goal.createdAt);
    const target = new Date(goal.targetDate);
    const totalSpan = target - created;
    if (totalSpan <= 0) continue;

    const elapsedFrac = Math.min(1, Math.max(0, (now - created) / totalSpan));
    const progressFrac = progress / 100;

    if (elapsedFrac >= 1) {
      await notifyOnce(
        `goal_overdue_${goal.id}_${today}`,
        "danger",
        "Goal overdue",
        `"${goal.title}" passed its target date and is only ${progress}% complete.`
      );
    } else if (elapsedFrac - progressFrac > 0.25) {
      await notifyOnce(
        `goal_behind_${goal.id}_${today}`,
        "danger",
        "Falling behind",
        `"${goal.title}" is behind pace — ${progress}% done with ${Math.round((1 - elapsedFrac) * 100)}% of the time left.`
      );
    }
  }
}

async function checkFinance(today, now, transactions) {
  const dailyLimit = await getSetting("financeDailyLimit", null);
  const monthlyLimit = await getSetting("financeMonthlyLimit", null);
  const currency = await getSetting("financeCurrency", "EGP");

  const todayExpense = transactions
    .filter((t) => t.date === today && t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  if (dailyLimit) {
    if (todayExpense > dailyLimit) {
      await notifyOnce(
        `finance_daily_over_${today}`,
        "danger",
        "Daily limit exceeded",
        `You've spent ${todayExpense} ${currency} today, over your ${dailyLimit} ${currency} limit.`
      );
    } else if (todayExpense >= dailyLimit * 0.8) {
      await notifyOnce(
        `finance_daily_warn_${today}`,
        "warning",
        "Approaching daily limit",
        `You've spent ${todayExpense} of ${dailyLimit} ${currency} today.`
      );
    }
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthExpense = transactions
    .filter((t) => t.date >= monthStart && t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  if (monthlyLimit) {
    if (monthExpense > monthlyLimit) {
      await notifyOnce(
        `finance_monthly_over_${monthStart}`,
        "danger",
        "Monthly limit exceeded",
        `You've spent ${monthExpense} ${currency} this month, over your ${monthlyLimit} ${currency} limit.`
      );
    } else if (monthExpense >= monthlyLimit * 0.8) {
      await notifyOnce(
        `finance_monthly_warn_${monthStart}`,
        "warning",
        "Approaching monthly limit",
        `You've spent ${monthExpense} of ${monthlyLimit} ${currency} this month.`
      );
    }
  }
}

// Scans habits, tasks, goals and finance for new events and writes
// in-app notification rows (deduped per day/event so it never repeats).
export async function runNotificationEngine() {
  const now = new Date();
  const today = todayStr();

  const [subjects, levels, courses, lessons, transactions] = await Promise.all([
    db.subjects.toArray(),
    db.levels.toArray(),
    db.courses.toArray(),
    db.lessons.toArray(),
    db.transactions.toArray(),
  ]);
  const learningData = { subjects, levels, courses, lessons, transactions };

  await checkTasks(today);
  await checkHabitStreaks(today);
  await checkGoals(today, now, learningData);
  await checkFinance(today, now, transactions);
}
