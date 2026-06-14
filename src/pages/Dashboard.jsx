import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSetting } from "../db/db";
import TopAppBar from "../components/TopAppBar";
import BottomNav from "../components/BottomNav";
import FAB from "../components/FAB";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("there");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    getSetting("userName", "there").then(setUserName);
  }, []);

  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const allLogs = useLiveQuery(() => db.habitLogs.toArray(), []) || [];

  const today = new Date();
  const todayDow = today.getDay();
  const todayKey = todayStr();

  // Habit progress today
  const todaysHabits = habits.filter((h) => h.days?.includes(todayDow));
  const completedToday = allLogs.filter(
    (l) => l.date === todayKey && todaysHabits.some((h) => h.id === l.habitId)
  ).length;
  const habitProgressPct = todaysHabits.length
    ? Math.round((completedToday / todaysHabits.length) * 100)
    : 0;

  const tasksRemaining = tasks.filter((t) => !t.completed).length;

  // Weekly overview
  const weekStart = startOfWeek(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const weeklyCompletionByDay = weekDates.map((dateStr) => {
    const d = new Date(dateStr);
    const dow = d.getDay();
    const expected = habits.filter((h) => h.days?.includes(dow)).length;
    if (expected === 0) return null; // no habits scheduled
    const done = allLogs.filter(
      (l) => l.date === dateStr && habits.some((h) => h.id === l.habitId && h.days?.includes(dow))
    ).length;
    return { dateStr, done, expected, complete: done >= expected && expected > 0 };
  });

  const totalExpected = weeklyCompletionByDay.reduce((sum, d) => sum + (d?.expected || 0), 0);
  const totalDone = weeklyCompletionByDay.reduce((sum, d) => sum + (d?.done || 0), 0);
  const weeklyPct = totalExpected ? Math.round((totalDone / totalExpected) * 100) : 0;

  const circumference = 2 * Math.PI * 32;
  const dashOffset = circumference - (weeklyPct / 100) * circumference;

  // Continue learning - find an in-progress lesson
  const inProgressLesson = useLiveQuery(
    () => db.lessons.where("status").equals("in_progress").first(),
    []
  );
  const lessonCourse = useLiveQuery(
    () => (inProgressLesson ? db.courses.get(inProgressLesson.courseId) : null),
    [inProgressLesson]
  );

  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <div className="bg-background text-on-background min-h-screen pb-24">
      <TopAppBar title={greeting} subtitle={todayLabel} showProfile rightIcon="notifications" onRightClick={() => navigate("/settings/notifications")} />

      <main className="pt-20 px-container_margin_mobile max-w-2xl mx-auto space-y-xl">
        {/* Top Cards */}
        <section className="grid grid-cols-2 gap-md">
          <div
            onClick={() => navigate("/habits")}
            className="bento-card relative p-lg flex flex-col justify-between h-40 bg-primary-container/5 border-primary-container/20 overflow-hidden cursor-pointer"
          >
            <div className="z-10">
              <span className="text-label-md text-primary mb-1 block">Habit Progress</span>
              <div className="text-headline-lg-mobile">{habitProgressPct}%</div>
            </div>
            <div className="w-full bg-primary-container/10 h-2 rounded-full overflow-hidden z-10">
              <div className="bg-primary h-full rounded-full" style={{ width: `${habitProgressPct}%` }} />
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <span className="material-symbols-outlined text-9xl">checklist</span>
            </div>
          </div>

          <div
            onClick={() => navigate("/tasks")}
            className="bento-card p-lg flex flex-col justify-between h-40 bg-secondary-container/5 border-secondary-container/20 cursor-pointer"
          >
            <div>
              <span className="text-label-md text-secondary mb-1 block">Tasks Remaining</span>
              <div className="text-headline-lg-mobile">{tasksRemaining}</div>
            </div>
            <div className="flex items-center gap-xs text-secondary">
              <span className="material-symbols-outlined text-base">arrow_forward</span>
              <span className="text-label-md">View all tasks</span>
            </div>
          </div>
        </section>

        {/* Weekly Overview */}
        <section className="space-y-md">
          <h3 className="text-title-md text-on-surface">Weekly Overview</h3>
          <div className="bento-card p-lg space-y-lg">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-body-lg font-semibold text-on-surface">Habit Consistency</h4>
                <p className="text-body-sm text-on-surface-variant">
                  {weeklyPct >= 70 ? "Excellent streak this week!" : weeklyPct >= 40 ? "Good progress so far" : "Let's build momentum"}
                </p>
              </div>
              <div className="relative flex items-center justify-center">
                <svg className="w-20 h-20">
                  <circle className="text-surface-container-high" cx="40" cy="40" fill="transparent" r="32" stroke="currentColor" strokeWidth="8" />
                  <circle
                    className="text-primary progress-ring-circle"
                    cx="40"
                    cy="40"
                    fill="transparent"
                    r="32"
                    stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <span className="absolute text-label-md text-primary font-bold">{weeklyPct}%</span>
              </div>
            </div>

            <div className="flex justify-between pt-md border-t border-surface-container">
              {weeklyCompletionByDay.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-xs">
                  <span className="text-label-md text-on-surface-variant">{DAY_LABELS[i]}</span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      d?.complete
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {d?.complete && (
                      <span className="material-symbols-outlined text-body-sm icon-filled">check</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Continue Learning */}
        <section className="space-y-md">
          <h3 className="text-title-md text-on-surface">Continue Learning</h3>
          <div
            onClick={() => navigate(inProgressLesson ? `/learning/lesson/${inProgressLesson.id}` : "/learning")}
            className="bento-card overflow-hidden cursor-pointer"
          >
            <div className="relative h-32 w-full bg-gradient-to-br from-primary to-primary-container flex items-end">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <span className="absolute bottom-md left-lg text-title-md text-white">
                {inProgressLesson ? inProgressLesson.name : "Start a new course"}
              </span>
            </div>
            <div className="p-lg flex justify-between items-center">
              <div>
                <p className="text-body-sm text-on-surface-variant">
                  {lessonCourse ? lessonCourse.name : "Explore your learning path"}
                </p>
                <p className="text-label-md text-primary">
                  {inProgressLesson ? "In progress" : "Tap to browse"}
                </p>
              </div>
              <button className="bg-primary text-on-primary rounded-full px-lg py-sm text-label-md">
                {inProgressLesson ? "Resume" : "Explore"}
              </button>
            </div>
          </div>
        </section>
      </main>

      <FAB onClick={() => setQuickAddOpen(true)} />
      {quickAddOpen && (
        <QuickAddSheet onClose={() => setQuickAddOpen(false)} />
      )}
      <BottomNav />
    </div>
  );
}

function QuickAddSheet({ onClose }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface rounded-t-2xl p-lg pb-xl space-y-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-md" />
        <h3 className="text-title-md text-on-surface mb-sm">Quick Add</h3>
        <button
          onClick={() => navigate("/habits/new")}
          className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-low active:scale-[0.98] transition-transform"
        >
          <span className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">self_improvement</span>
          </span>
          <span className="text-body-lg text-on-surface">New Habit</span>
        </button>
        <button
          onClick={() => navigate("/tasks/new")}
          className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-low active:scale-[0.98] transition-transform"
        >
          <span className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined">task_alt</span>
          </span>
          <span className="text-body-lg text-on-surface">New Task</span>
        </button>
      </div>
    </div>
  );
}
