import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import TopAppBar from "../components/TopAppBar";
import BottomNav from "../components/BottomNav";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Stats() {
  const navigate = useNavigate();
  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const studySessions = useLiveQuery(() => db.studySessions.toArray(), []) || [];
  const lessons = useLiveQuery(() => db.lessons.toArray(), []) || [];

  const habitsCompleted = habitLogs.length;
  const tasksDone = tasks.filter((t) => t.completed).length;
  const totalFocusMinutes = studySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

  // Weekly chart: completions per day (habits + tasks)
  const weekStart = startOfWeek(new Date());
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const habitCount = habitLogs.filter((l) => l.date === dateStr).length;
    const sessionCount = studySessions.filter((s) => s.date === dateStr).length;
    return { label: DAY_LABELS[i], value: habitCount + sessionCount };
  });
  const maxVal = Math.max(...weekData.map((d) => d.value), 1);
  const todayIdx = new Date().getDay();

  // Achievements
  const longestStreak = (() => {
    let max = 0;
    habits.forEach((h) => {
      let streak = 0;
      let cursor = new Date();
      const logDates = new Set(habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date));
      for (let i = 0; i < 365; i++) {
        const dow = cursor.getDay();
        const dateStr = cursor.toISOString().split("T")[0];
        if (h.days?.includes(dow)) {
          if (logDates.has(dateStr)) streak++;
          else if (dateStr !== new Date().toISOString().split("T")[0]) break;
        }
        cursor.setDate(cursor.getDate() - 1);
      }
      max = Math.max(max, streak);
    });
    return max;
  })();

  const completedLessons = lessons.filter((l) => l.status === "completed").length;

  const achievements = [
    {
      title: "Early Bird",
      desc: "7-day streak",
      icon: "workspace_premium",
      unlocked: longestStreak >= 7,
      progress: Math.min(100, (longestStreak / 7) * 100),
      sub: `${longestStreak}/7 days`,
    },
    {
      title: "Task Crusher",
      desc: "25 tasks done",
      icon: "task_alt",
      unlocked: tasksDone >= 25,
      progress: Math.min(100, (tasksDone / 25) * 100),
      sub: `${tasksDone}/25`,
    },
    {
      title: "Study Master",
      desc: "50 hours logged",
      icon: "school",
      unlocked: totalFocusMinutes / 60 >= 50,
      progress: Math.min(100, (totalFocusMinutes / 60 / 50) * 100),
      sub: `${totalFocusHours}/50h`,
    },
    {
      title: "Knowledge Seeker",
      desc: "10 lessons completed",
      icon: "auto_stories",
      unlocked: completedLessons >= 10,
      progress: Math.min(100, (completedLessons / 10) * 100),
      sub: `${completedLessons}/10`,
    },
  ];

  return (
    <div className="bg-background text-on-surface min-h-screen pb-32">
      <TopAppBar title="Your Impact" showProfile rightIcon="notifications" onRightClick={() => navigate("/settings/notifications")} />

      <main className="px-container_margin_mobile mt-20 space-y-xl max-w-2xl mx-auto">
        {/* Overview bento */}
        <section className="grid grid-cols-2 gap-md">
          <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-card flex flex-col justify-between">
            <span className="material-symbols-outlined text-primary icon-filled">task_alt</span>
            <div>
              <p className="text-display-lg text-primary leading-none">{habitsCompleted}</p>
              <p className="text-label-md text-on-surface-variant mt-xs">Habits completed</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-card flex flex-col justify-between">
            <span className="material-symbols-outlined text-secondary icon-filled">local_fire_department</span>
            <div>
              <p className="text-display-lg text-secondary leading-none">{tasksDone}</p>
              <p className="text-label-md text-on-surface-variant mt-xs">Tasks done</p>
            </div>
          </div>
          <div className="col-span-2 bg-primary-container text-on-primary-container p-lg rounded-xl flex items-center justify-between">
            <div>
              <p className="text-label-md opacity-80 uppercase tracking-widest">Focus Duration</p>
              <p className="text-display-lg mt-xs">{totalFocusHours}h</p>
              <p className="text-body-sm opacity-90 mt-xs">Total study time</p>
            </div>
            <div className="w-20 h-20 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="opacity-20" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" strokeWidth="8" />
                <circle
                  cx="40"
                  cy="40"
                  fill="transparent"
                  r="34"
                  stroke="currentColor"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * 0.3}
                  strokeLinecap="round"
                  strokeWidth="8"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined">schedule</span>
              </div>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-card">
          <div className="flex justify-between items-end mb-lg">
            <div>
              <h2 className="text-title-md text-on-surface">Productivity Trends</h2>
              <p className="text-body-sm text-on-surface-variant">Activity this week</p>
            </div>
          </div>
          <div className="h-48 flex items-end justify-between gap-sm px-sm">
            {weekData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-sm">
                <div
                  className={`w-full rounded-t-full transition-colors ${i === todayIdx ? "bg-primary" : "bg-primary-fixed"}`}
                  style={{ height: `${Math.max(4, (d.value / maxVal) * 100)}%` }}
                />
                <span className={`text-label-md ${i === todayIdx ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Achievements */}
        <section>
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-title-md text-on-surface">Milestones</h2>
          </div>
          <div className="grid grid-cols-2 gap-md">
            {achievements.map((a) => (
              <div
                key={a.title}
                className={`bg-surface-container-low p-md rounded-xl flex flex-col items-center text-center border ${
                  a.unlocked ? "border-transparent" : "opacity-70"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-sm ${
                    a.unlocked
                      ? "bg-gradient-to-br from-yellow-100 to-yellow-300 shadow-sm"
                      : "bg-surface-container-high border-2 border-dashed border-outline"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-3xl ${
                      a.unlocked ? "text-yellow-700 icon-filled" : "text-outline"
                    }`}
                  >
                    {a.icon}
                  </span>
                </div>
                <h3 className="text-body-lg font-semibold text-on-surface">{a.title}</h3>
                <p className="text-body-sm text-on-surface-variant">{a.desc}</p>
                {a.unlocked ? (
                  <span className="mt-sm px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] rounded-full uppercase font-bold tracking-wider">
                    Unlocked
                  </span>
                ) : (
                  <>
                    <div className="w-full bg-surface-container-highest h-1 rounded-full mt-sm overflow-hidden">
                      <div className="bg-outline h-full" style={{ width: `${a.progress}%` }} />
                    </div>
                    <p className="text-[10px] mt-1 text-on-surface-variant">{a.sub}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
