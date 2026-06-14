import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import TopAppBar from "../components/TopAppBar";
import BottomNav from "../components/BottomNav";
import FAB from "../components/FAB";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// Compute current streak (consecutive days, walking backwards from today, only counting scheduled days)
function computeStreak(habit, logs) {
  const logDates = new Set(logs.filter((l) => l.habitId === habit.id).map((l) => l.date));
  let streak = 0;
  let cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const dow = cursor.getDay();
    const dateStr = cursor.toISOString().split("T")[0];
    if (habit.days?.includes(dow)) {
      if (logDates.has(dateStr)) {
        streak++;
      } else if (dateStr === todayStr()) {
        // today not done yet, don't break streak, just skip
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const COLOR_MAP = {
  primary: { bg: "bg-primary-fixed", text: "text-primary" },
  secondary: { bg: "bg-secondary-fixed", text: "text-secondary" },
  tertiary: { bg: "bg-tertiary-fixed-dim", text: "text-tertiary" },
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function Habits() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all"); // all | daily | weekly

  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  const allLogs = useLiveQuery(() => db.habitLogs.toArray(), []) || [];

  const todayKey = todayStr();
  const todayDow = new Date().getDay();

  const filteredHabits = habits.filter((h) => {
    if (filter === "daily") return h.frequency === "daily";
    if (filter === "weekly") return h.frequency === "weekly";
    return true;
  });

  const toggleToday = async (habit) => {
    const existing = await db.habitLogs
      .where({ habitId: habit.id, date: todayKey })
      .first();
    if (existing) {
      await db.habitLogs.delete(existing.id);
    } else {
      await db.habitLogs.add({ habitId: habit.id, date: todayKey });
    }
  };

  // Overall current streak = max streak across habits (for hero card)
  const maxStreak = habits.reduce((max, h) => Math.max(max, computeStreak(h, allLogs)), 0);

  return (
    <div className="bg-background text-on-background min-h-screen pb-24">
      <TopAppBar title="Daily Rituals" showProfile rightIcon="notifications" onRightClick={() => navigate("/settings/notifications")} />

      <main className="pt-20 px-container_margin_mobile max-w-2xl mx-auto">
        {/* Hero Summary */}
        <section className="mb-xl">
          <div className="relative overflow-hidden rounded-xl bg-primary-container p-lg text-white shadow-lg">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined !text-9xl">auto_awesome</span>
            </div>
            <p className="text-label-md opacity-80 mb-sm">CURRENT STREAK</p>
            <div className="flex items-baseline gap-xs mb-md">
              <h2 className="text-display-lg">{maxStreak}</h2>
              <span className="text-title-md">Days</span>
            </div>
            <div className="flex items-center gap-sm">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-primary-container bg-tertiary-fixed-dim" />
                <div className="w-8 h-8 rounded-full border-2 border-primary-container bg-primary-fixed" />
                <div className="w-8 h-8 rounded-full border-2 border-primary-container bg-secondary-fixed-dim" />
              </div>
              <p className="text-body-sm">
                {maxStreak > 0 ? "Keep the momentum going!" : "Start your first streak today!"}
              </p>
            </div>
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="mb-lg">
          <div className="flex gap-sm p-1 bg-surface-container rounded-xl">
            {["all", "daily", "weekly"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 px-md rounded-lg text-label-md transition-all duration-200 capitalize ${
                  filter === f ? "bg-white text-primary shadow-sm" : "text-on-surface-variant"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Habit List */}
        <div className="space-y-md">
          {filteredHabits.length === 0 && (
            <div className="text-center py-xl text-on-surface-variant text-body-sm">
              No habits yet. Tap + to add your first ritual.
            </div>
          )}
          {filteredHabits.map((habit) => {
            const streak = computeStreak(habit, allLogs);
            const doneToday = allLogs.some((l) => l.habitId === habit.id && l.date === todayKey);
            const scheduledToday = habit.days?.includes(todayDow);
            const colors = COLOR_MAP[habit.color] || COLOR_MAP.primary;

            return (
              <div
                key={habit.id}
                onClick={() => navigate(`/habits/${habit.id}/edit`)}
                className="rounded-xl p-md flex items-center gap-md shadow-card border border-outline-variant/30 bg-white group cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text} transition-transform group-active:scale-95`}>
                  <span className="material-symbols-outlined">{habit.icon || "task_alt"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-body-lg text-on-surface truncate">{habit.name}</h3>
                    <div className={`flex items-center gap-xs ${streak > 0 ? "text-secondary" : "text-outline"}`}>
                      <span className={`material-symbols-outlined text-[18px] ${streak > 0 ? "icon-filled" : ""}`}>
                        local_fire_department
                      </span>
                      <span className="text-label-md">{streak}</span>
                    </div>
                  </div>
                  {/* Weekly dots */}
                  <div className="flex gap-2">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = dateNDaysAgo((todayDow - i + 7) % 7);
                      const dow = i;
                      const isScheduled = habit.days?.includes(dow);
                      const isDone = allLogs.some((l) => l.habitId === habit.id && l.date === date);
                      const isToday = dow === todayDow;
                      return (
                        <div key={i} className="flex flex-col items-center">
                          <span className={`text-[8px] font-bold opacity-40 mb-1 ${isToday ? "text-primary opacity-100" : ""}`}>
                            {DAY_LABELS[i]}
                          </span>
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              !isScheduled
                                ? "bg-surface-container-high"
                                : isDone
                                ? "bg-tertiary"
                                : "bg-primary-fixed"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (scheduledToday) toggleToday(habit);
                  }}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${
                    !scheduledToday
                      ? "border-2 border-outline-variant text-outline-variant opacity-40 cursor-default"
                      : doneToday
                      ? "bg-primary text-white cursor-pointer hover:opacity-90"
                      : "border-2 border-outline-variant text-outline-variant cursor-pointer hover:border-primary hover:text-primary"
                  }`}
                >
                  <span className={`material-symbols-outlined ${doneToday ? "icon-filled" : ""}`}>
                    {doneToday ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <FAB onClick={() => navigate("/habits/new")} />
      <BottomNav />
    </div>
  );
}
