// Points are derived live from existing data — no separate ledger table to
// keep in sync. Each completed thing has a fixed point value.
const POINTS = {
  habitLog: 10,
  taskCompleted: 15,
  lessonCompleted: 30,
  studySession: 5,
  goalAchieved: 100,
};

export const LEVELS = [
  { level: 1, title: "Newcomer", threshold: 0 },
  { level: 2, title: "Apprentice", threshold: 150 },
  { level: 3, title: "Achiever", threshold: 400 },
  { level: 4, title: "Specialist", threshold: 800 },
  { level: 5, title: "Expert", threshold: 1500 },
  { level: 6, title: "Master", threshold: 2500 },
  { level: 7, title: "Champion", threshold: 4000 },
  { level: 8, title: "Legend", threshold: 6000 },
];

export function computeTotalPoints({ habitLogs = [], tasks = [], lessons = [], studySessions = [], goals = [], goalProgressFn }) {
  const habitPts = habitLogs.length * POINTS.habitLog;
  const taskPts = tasks.filter((t) => t.completed).length * POINTS.taskCompleted;
  const lessonPts = lessons.filter((l) => l.status === "completed").length * POINTS.lessonCompleted;
  const studyPts = studySessions.length * POINTS.studySession;
  const goalPts = goalProgressFn
    ? goals.filter((g) => goalProgressFn(g) >= 100).length * POINTS.goalAchieved
    : 0;

  return habitPts + taskPts + lessonPts + studyPts + goalPts;
}

export function getLevelInfo(points) {
  let current = LEVELS[0];
  let next = LEVELS[1] || null;

  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].threshold) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    } else {
      break;
    }
  }

  let progressPct = 100;
  if (next) {
    const span = next.threshold - current.threshold;
    progressPct = Math.round(((points - current.threshold) / span) * 100);
  }

  return {
    level: current.level,
    title: current.title,
    points,
    next,
    pointsToNext: next ? next.threshold - points : 0,
    progressPct: Math.min(100, Math.max(0, progressPct)),
  };
}
