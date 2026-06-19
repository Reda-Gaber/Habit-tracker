import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import BottomNav from "../components/BottomNav";

const COLOR_MAP = {
  primary: { bg: "bg-primary-fixed", text: "text-primary", solid: "bg-primary" },
  secondary: { bg: "bg-secondary-fixed", text: "text-secondary", solid: "bg-secondary" },
  tertiary: { bg: "bg-tertiary-fixed-dim", text: "text-tertiary", solid: "bg-tertiary" },
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function computeStreak(habit, logs) {
  const logDates = new Set(logs.map((l) => l.date));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const dow = cursor.getDay();
    const dateStr = cursor.toISOString().split("T")[0];
    if (habit.days?.includes(dow)) {
      if (logDates.has(dateStr)) streak++;
      else if (dateStr !== todayStr()) break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Builds a 53-week x 7-day grid ending today, GitHub-contributions style.
function buildHeatmapGrid(logDates) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = 53 * 7;
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1) - today.getDay());

  const weeks = [];
  const cursor = new Date(start);
  const monthMarkers = [];
  let lastMonth = -1;

  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split("T")[0];
      const inFuture = cursor > today;
      week.push({ date: dateStr, active: logDates.has(dateStr), inFuture });
      if (d === 0) {
        const m = cursor.getMonth();
        if (m !== lastMonth) {
          monthMarkers.push({ week: w, label: MONTH_LABELS[m] });
          lastMonth = m;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return { weeks, monthMarkers };
}

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const habitId = Number(id);

  const habit = useLiveQuery(() => db.habits.get(habitId), [habitId]);
  const logs = useLiveQuery(() => db.habitLogs.where("habitId").equals(habitId).toArray(), [habitId]) || [];

  if (!habit) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant text-body-sm">Loading...</p>
      </div>
    );
  }

  const colors = COLOR_MAP[habit.color] || COLOR_MAP.primary;
  const todayKey = todayStr();
  const todayDow = new Date().getDay();
  const scheduledToday = habit.days?.includes(todayDow);
  const doneToday = logs.some((l) => l.date === todayKey);
  const streak = computeStreak(habit, logs);

  const logDates = new Set(logs.map((l) => l.date));
  const { weeks, monthMarkers } = buildHeatmapGrid(logDates);
  const totalActive = logs.length;

  // Best streak ever (not just current)
  let bestStreak = 0;
  let running = 0;
  const sortedDates = [...logDates].sort();
  let prevDate = null;
  for (const d of sortedDates) {
    if (prevDate) {
      const diff = (new Date(d) - new Date(prevDate)) / 86400000;
      running = diff <= 7 ? running + 1 : 1; // loose tolerance for weekly habits
    } else {
      running = 1;
    }
    bestStreak = Math.max(bestStreak, running);
    prevDate = d;
  }

  const toggleDate = async (dateStr) => {
    if (dateStr > todayKey) return; // can't log future days
    const existing = await db.habitLogs.where({ habitId, date: dateStr }).first();
    if (existing) {
      await db.habitLogs.delete(existing.id);
    } else {
      await db.habitLogs.add({ habitId, date: dateStr });
    }
  };

  const deleteHabit = async () => {
    if (!confirm(`Delete "${habit.name}"? This also removes its log history.`)) return;
    await db.habitLogs.where("habitId").equals(habitId).delete();
    await db.habits.delete(habitId);
    navigate("/habits");
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-24">
      <header className="bg-surface sticky top-0 z-40 flex justify-between items-center w-full px-container_margin_mobile h-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 p-2 -ml-2 rounded-full"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-label-md">Back</span>
        </button>
        <h1 className="text-title-md text-primary truncate px-2">{habit.name}</h1>
        <button
          onClick={() => navigate(`/habits/${habitId}/edit`)}
          aria-label="Edit habit"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant"
        >
          <span className="material-symbols-outlined">edit</span>
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-container_margin_mobile pt-4 flex flex-col gap-lg">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl bg-primary-container p-lg text-white shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined !text-9xl">{habit.icon || "task_alt"}</span>
          </div>
          <div className="flex items-center gap-md mb-md z-10 relative">
            <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text}`}>
              <span className="material-symbols-outlined">{habit.icon || "task_alt"}</span>
            </div>
            <div>
              <p className="text-label-md opacity-80">CURRENT STREAK</p>
              <div className="flex items-baseline gap-xs">
                <h2 className="text-display-lg">{streak}</h2>
                <span className="text-title-md">days</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => toggleDate(todayKey)}
            disabled={!scheduledToday}
            className={`relative z-10 w-full py-3 rounded-xl text-label-md font-bold flex items-center justify-center gap-sm transition-all ${
              !scheduledToday
                ? "bg-white/10 text-white/50 cursor-not-allowed"
                : doneToday
                ? "bg-white text-primary"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            <span className="material-symbols-outlined">{doneToday ? "check_circle" : "radio_button_unchecked"}</span>
            {!scheduledToday ? "Not scheduled today" : doneToday ? "Done today" : "Mark today done"}
          </button>
        </section>

        {/* Stats row */}
        <section className="grid grid-cols-3 gap-sm">
          <div className="bento-card p-md flex flex-col items-center gap-1">
            <span className="text-title-md text-on-surface">{bestStreak}</span>
            <span className="text-label-md text-on-surface-variant text-center">Best Streak</span>
          </div>
          <div className="bento-card p-md flex flex-col items-center gap-1">
            <span className="text-title-md text-on-surface">{totalActive}</span>
            <span className="text-label-md text-on-surface-variant text-center">Total Logged</span>
          </div>
          <div className="bento-card p-md flex flex-col items-center gap-1">
            <span className="text-title-md text-on-surface capitalize">{habit.frequency}</span>
            <span className="text-label-md text-on-surface-variant text-center">Frequency</span>
          </div>
        </section>

        {/* Heatmap */}
        <section className="bento-card p-md overflow-x-auto">
          <h3 className="text-title-md text-on-surface mb-md px-1">Past Year</h3>
          <div className="inline-flex flex-col gap-1 min-w-max px-1">
            <div className="flex gap-[3px] pl-6">
              {weeks.map((_, w) => {
                const marker = monthMarkers.find((m) => m.week === w);
                return (
                  <div key={w} className="w-[11px] text-[9px] text-on-surface-variant shrink-0">
                    {marker ? marker.label : ""}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-[3px]">
              <div className="flex flex-col gap-[3px] justify-between pr-1 shrink-0">
                {["", "M", "", "W", "", "F", ""].map((l, i) => (
                  <div key={i} className="h-[11px] w-4 text-[9px] text-on-surface-variant flex items-center">
                    {l}
                  </div>
                ))}
              </div>
              {weeks.map((week, w) => (
                <div key={w} className="flex flex-col gap-[3px] shrink-0">
                  {week.map((day, d) => (
                    <button
                      key={d}
                      onClick={() => toggleDate(day.date)}
                      disabled={day.inFuture}
                      title={day.date}
                      className={`w-[11px] h-[11px] rounded-[2px] transition-transform ${
                        day.inFuture
                          ? "bg-transparent"
                          : day.active
                          ? colors.solid
                          : "bg-surface-container-high hover:opacity-70"
                      } ${!day.inFuture ? "cursor-pointer active:scale-90" : ""}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p className="text-label-md text-on-surface-variant mt-md px-1">
            Tap any past day to log or unlog it — handy for catching up on a day you forgot.
          </p>
        </section>

        <button
          onClick={deleteHabit}
          className="w-full py-3 rounded-xl text-error border border-error/40 flex items-center justify-center gap-sm hover:bg-error/5 transition-colors"
        >
          <span className="material-symbols-outlined">delete</span>
          Delete Habit
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
