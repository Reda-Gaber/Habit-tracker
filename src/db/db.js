import Dexie from "dexie";

export const db = new Dexie("RitualAppDB");

db.version(1).stores({
  habits: "++id, name, frequency, days, reminderTime, color, icon, createdAt",
  habitLogs: "++id, habitId, date", // date = 'YYYY-MM-DD'
  tasks: "++id, title, dueDate, priority, category, completed, createdAt",
  goals: "++id, title, targetDate, progress, createdAt",
  subjects: "++id, name, icon, color, order",
  levels: "++id, subjectId, name, order",
  courses: "++id, levelId, name, description, order",
  lessons: "++id, courseId, name, status, notes, completedAt, order",
  studySessions: "++id, lessonId, duration, date",
  settings: "key", // key-value store for notification prefs, onboarding flag, etc.
});

db.version(2).stores({
  habits: "++id, name, frequency, days, reminderTime, color, icon, createdAt",
  habitLogs: "++id, habitId, date",
  tasks: "++id, title, dueDate, priority, category, completed, createdAt",
  goals: "++id, title, targetDate, progress, linkedType, linkedId, createdAt",
  subjects: "++id, name, icon, color, order",
  levels: "++id, subjectId, name, order",
  courses: "++id, levelId, name, description, order",
  lessons: "++id, courseId, name, status, notes, completedAt, order",
  studySessions: "++id, lessonId, duration, date",
  settings: "key",
});

// ---------- Seed data (first run only) ----------
export async function seedIfEmpty() {
  const habitCount = await db.habits.count();
  if (habitCount > 0) return;

  const today = new Date();
  const fmt = (d) => d.toISOString().split("T")[0];

  // Habits
  const habitIds = await db.habits.bulkAdd(
    [
      { name: "Morning Run", frequency: "daily", days: [0, 1, 2, 3, 4, 5, 6], reminderTime: "07:00", color: "primary", icon: "directions_run", createdAt: Date.now() },
      { name: "Read 20 Pages", frequency: "daily", days: [0, 1, 2, 3, 4, 5, 6], reminderTime: "21:00", color: "secondary", icon: "menu_book", createdAt: Date.now() },
      { name: "Meditate", frequency: "daily", days: [1, 2, 3, 4, 5], reminderTime: "06:30", color: "tertiary", icon: "self_improvement", createdAt: Date.now() },
    ],
    { allKeys: true }
  );

  // Logs - mark Mon/Tue done this week for habit 1
  const logs = [];
  for (let i = 0; i < 2; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + 1 + i); // Mon, Tue of current week
    logs.push({ habitId: habitIds[0], date: fmt(d) });
    logs.push({ habitId: habitIds[1], date: fmt(d) });
  }
  await db.habitLogs.bulkAdd(logs);

  // Tasks
  await db.tasks.bulkAdd([
    { title: "Finish Q3 report draft", dueDate: fmt(today), priority: "high", category: "Work", completed: false, createdAt: Date.now() },
    { title: "Buy groceries", dueDate: fmt(today), priority: "low", category: "Personal", completed: false, createdAt: Date.now() },
    { title: "Call dentist for appointment", dueDate: fmt(new Date(today.getTime() + 86400000)), priority: "medium", category: "Health", completed: false, createdAt: Date.now() },
    { title: "Review pull request", dueDate: fmt(new Date(today.getTime() + 86400000 * 2)), priority: "high", category: "Work", completed: false, createdAt: Date.now() },
  ]);

  // Goals
  await db.goals.bulkAdd([
    { title: "Finish Intermediate English Level", targetDate: fmt(new Date(today.getTime() + 86400000 * 60)), progress: 45, createdAt: Date.now() },
    { title: "Build & ship Habit Tracker App", targetDate: fmt(new Date(today.getTime() + 86400000 * 30)), progress: 70, createdAt: Date.now() },
    { title: "Run a 10K race", targetDate: fmt(new Date(today.getTime() + 86400000 * 90)), progress: 20, createdAt: Date.now() },
  ]);

  // Learning: Subjects -> Levels -> Courses -> Lessons
  const subjectIds = await db.subjects.bulkAdd(
    [
      { name: "English", icon: "translate", color: "primary", order: 1 },
      { name: "Programming", icon: "code", color: "secondary", order: 2 },
    ],
    { allKeys: true }
  );

  const levelIds = await db.levels.bulkAdd(
    [
      { subjectId: subjectIds[0], name: "Beginner", order: 1 },
      { subjectId: subjectIds[0], name: "Intermediate", order: 2 },
      { subjectId: subjectIds[0], name: "Advanced", order: 3 },
      { subjectId: subjectIds[1], name: "Beginner", order: 1 },
      { subjectId: subjectIds[1], name: "Intermediate", order: 2 },
    ],
    { allKeys: true }
  );

  const courseIds = await db.courses.bulkAdd(
    [
      { levelId: levelIds[1], name: "Grammar Essentials", description: "Master tenses and sentence structure", order: 1 },
      { levelId: levelIds[1], name: "Conversational Fluency", description: "Practical speaking patterns", order: 2 },
      { levelId: levelIds[4], name: "Async JavaScript", description: "Promises, async/await, event loop", order: 1 },
    ],
    { allKeys: true }
  );

  await db.lessons.bulkAdd([
    { courseId: courseIds[0], name: "Present Simple vs Present Continuous", status: "completed", notes: "", completedAt: Date.now(), order: 1 },
    { courseId: courseIds[0], name: "Past Perfect Tense", status: "in_progress", notes: "Remember: had + past participle", completedAt: null, order: 2 },
    { courseId: courseIds[0], name: "Conditionals (1st & 2nd)", status: "not_started", notes: "", completedAt: null, order: 3 },
    { courseId: courseIds[1], name: "Everyday Small Talk", status: "not_started", notes: "", completedAt: null, order: 1 },
    { courseId: courseIds[2], name: "Understanding Promises", status: "in_progress", notes: "", completedAt: null, order: 1 },
    { courseId: courseIds[2], name: "Async/Await Syntax", status: "not_started", notes: "", completedAt: null, order: 2 },
  ]);

  // Settings defaults
  await db.settings.bulkAdd([
    { key: "onboardingComplete", value: false },
    { key: "notifHabitReminders", value: true },
    { key: "notifTaskDueAlerts", value: true },
    { key: "notifDailySummary", value: true },
    { key: "notifDailySummaryTime", value: "08:00" },
    { key: "userName", value: "Alex" },
  ]);
}

export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

// ---------- Backup: export / import all data as JSON ----------
const DATA_TABLES = [
  "habits",
  "habitLogs",
  "tasks",
  "goals",
  "subjects",
  "levels",
  "courses",
  "lessons",
  "studySessions",
  "settings",
];

export async function exportAllData() {
  const data = {};
  for (const table of DATA_TABLES) {
    data[table] = await db[table].toArray();
  }
  return {
    app: "Ritual - Habit & Learning Tracker",
    exportedAt: new Date().toISOString(),
    version: 1,
    data,
  };
}

// Replaces ALL local data with the contents of the given backup object.
// Throws if the backup looks invalid.
export async function importAllData(backup) {
  if (!backup || typeof backup !== "object" || !backup.data) {
    throw new Error("Invalid backup file: missing 'data' field.");
  }
  const { data } = backup;

  await db.transaction("rw", DATA_TABLES.map((t) => db[t]), async () => {
    for (const table of DATA_TABLES) {
      if (!Array.isArray(data[table])) continue;
      await db[table].clear();
      if (data[table].length > 0) {
        await db[table].bulkAdd(data[table]);
      }
    }
  });
}
