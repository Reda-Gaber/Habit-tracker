import { db } from "../db/db";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Checks every active recurring rule and, if today is its scheduled day and
// it hasn't already fired today, creates the matching transaction plus a
// heads-up notification. lastGeneratedDate lives on the rule itself, so
// deleting the generated transaction later never causes it to re-fire.
export async function runRecurringTransactions() {
  const today = todayStr();
  const now = new Date();
  const rules = await db.recurringTransactions.toArray();

  for (const rule of rules) {
    if (!rule.active) continue;
    if (rule.lastGeneratedDate === today) continue;

    let shouldRun = false;
    if (rule.frequency === "monthly") {
      const lastDay = lastDayOfMonth(now.getFullYear(), now.getMonth());
      const targetDay = Math.min(rule.dayOfMonth || 1, lastDay);
      shouldRun = now.getDate() === targetDay;
    } else if (rule.frequency === "weekly") {
      shouldRun = now.getDay() === rule.dayOfWeek;
    }

    if (!shouldRun) continue;

    await db.transactions.add({
      type: rule.type,
      amount: rule.amount,
      category: rule.category,
      note: rule.note || "",
      date: today,
      createdAt: Date.now(),
    });

    await db.recurringTransactions.update(rule.id, { lastGeneratedDate: today });

    await db.notifications.add({
      type: rule.type === "income" ? "success" : "warning",
      title: rule.type === "income" ? "Recurring income added" : "Recurring expense added",
      message: `"${rule.category}" — ${rule.amount} logged automatically.`,
      read: false,
      dedupeKey: `recurring_${rule.id}_${today}`,
      createdAt: Date.now(),
    });
  }
}
