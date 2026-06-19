import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import BottomNav from "../components/BottomNav";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const DOT_COLORS = {
  habit: "bg-tertiary",
  task: "bg-error",
  study: "bg-primary",
  finance: "bg-secondary",
  journal: "bg-on-surface-variant",
  goal: "bg-primary",
};

function fmt(d) {
  return d.toISOString().split("T")[0];
}

function todayStr() {
  return fmt(new Date());
}

export default function Calendar() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const studySessions = useLiveQuery(() => db.studySessions.toArray(), []) || [];
  const lessons = useLiveQuery(() => db.lessons.toArray(), []) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const journalEntries = useLiveQuery(() => db.journalEntries.toArray(), []) || [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) || [];

  const todayKey = todayStr();
  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(fmt(new Date(cursor.year, cursor.month, day)));
  }

  const dayInfo = (dateStr) => {
    if (!dateStr) return null;
    const hasHabit = habitLogs.some((l) => l.date === dateStr);
    const hasTask = tasks.some((t) => t.dueDate === dateStr);
    const hasStudy = studySessions.some((s) => s.date === dateStr);
    const hasFinance = transactions.some((t) => t.date === dateStr);
    const hasJournal = journalEntries.some((j) => j.date === dateStr);
    const hasGoal = goals.some((g) => g.targetDate === dateStr);
    return { hasHabit, hasTask, hasStudy, hasFinance, hasJournal, hasGoal };
  };

  const changeMonth = (delta) => {
    let m = cursor.month + delta;
    let y = cursor.year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCursor({ year: y, month: m });
  };

  const goToToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedDate(todayKey);
  };

  // Selected day detail
  const selected = selectedDate
    ? {
        date: selectedDate,
        habits: habits.filter((h) => {
          const dow = new Date(selectedDate).getDay();
          return h.days?.includes(dow) && habitLogs.some((l) => l.habitId === h.id && l.date === selectedDate);
        }),
        tasks: tasks.filter((t) => t.dueDate === selectedDate),
        study: studySessions.filter((s) => s.date === selectedDate).map((s) => ({
          ...s,
          lesson: lessons.find((l) => l.id === s.lessonId),
        })),
        transactions: transactions.filter((t) => t.date === selectedDate),
        journal: journalEntries.find((j) => j.date === selectedDate),
        goals: goals.filter((g) => g.targetDate === selectedDate),
      }
    : null;

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
        <h1 className="text-title-md text-primary">Calendar</h1>
        <button onClick={goToToday} className="text-label-md text-primary px-2">
          Today
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-container_margin_mobile pt-4 flex flex-col gap-lg">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h2 className="text-title-md text-on-surface">
            {MONTH_LABELS[cursor.month]} {cursor.year}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-md text-label-md text-on-surface-variant">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tertiary inline-block" /> Habits</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error inline-block" /> Tasks</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Study</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Finance</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-on-surface-variant inline-block" /> Journal</span>
        </div>

        {/* Grid */}
        <section className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-card">
          <div className="grid grid-cols-7 mb-sm">
            {WEEKDAY_LABELS.map((d, i) => (
              <div key={i} className="text-center text-label-md text-on-surface-variant py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((dateStr, i) => {
              if (!dateStr) return <div key={i} />;
              const info = dayInfo(dateStr);
              const isToday = dateStr === todayKey;
              const isSelected = dateStr === selectedDate;
              const dayNum = Number(dateStr.split("-")[2]);
              const dots = [
                info.hasHabit && DOT_COLORS.habit,
                info.hasTask && DOT_COLORS.task,
                info.hasStudy && DOT_COLORS.study,
                info.hasFinance && DOT_COLORS.finance,
                info.hasJournal && DOT_COLORS.journal,
              ].filter(Boolean);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className="flex flex-col items-center justify-start py-1.5 gap-0.5"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-body-sm transition-colors ${
                      isSelected
                        ? "bg-primary text-on-primary"
                        : isToday
                        ? "border-2 border-primary text-primary"
                        : "text-on-surface"
                    }`}
                  >
                    {dayNum}
                  </span>
                  <div className="flex gap-0.5 h-1.5">
                    {dots.slice(0, 4).map((c, idx) => (
                      <span key={idx} className={`w-1 h-1 rounded-full ${c}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {!selected && (
          <p className="text-center text-on-surface-variant text-body-sm py-md">Tap a day to see what happened.</p>
        )}
      </main>

      {selected && (
        <DaySheet
          selected={selected}
          onClose={() => setSelectedDate(null)}
          onNavigate={(path) => {
            setSelectedDate(null);
            navigate(path);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}

function DaySheet({ selected, onClose, onNavigate }) {
  const d = new Date(selected.date);
  const label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isEmpty =
    selected.habits.length === 0 &&
    selected.tasks.length === 0 &&
    selected.study.length === 0 &&
    selected.transactions.length === 0 &&
    !selected.journal &&
    selected.goals.length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface rounded-t-2xl p-lg pb-xl space-y-md max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-md" />
        <h3 className="text-title-md text-on-surface">{label}</h3>

        {isEmpty && <p className="text-body-sm text-on-surface-variant py-md">Nothing logged this day.</p>}

        {selected.habits.length > 0 && (
          <div className="space-y-xs">
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Habits Completed</p>
            {selected.habits.map((h) => (
              <div key={h.id} className="flex items-center gap-2 text-body-sm text-on-surface">
                <span className="material-symbols-outlined text-tertiary text-[18px] icon-filled">check_circle</span>
                {h.name}
              </div>
            ))}
          </div>
        )}

        {selected.tasks.length > 0 && (
          <div className="space-y-xs">
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Tasks Due</p>
            {selected.tasks.map((t) => (
              <button
                key={t.id}
                onClick={() => onNavigate(`/tasks/${t.id}/edit`)}
                className="flex items-center gap-2 text-body-sm text-on-surface w-full text-left"
              >
                <span className={`material-symbols-outlined text-[18px] ${t.completed ? "text-tertiary icon-filled" : "text-error"}`}>
                  {t.completed ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span className={t.completed ? "line-through text-on-surface-variant" : ""}>{t.title}</span>
              </button>
            ))}
          </div>
        )}

        {selected.study.length > 0 && (
          <div className="space-y-xs">
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Study Sessions</p>
            {selected.study.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-body-sm text-on-surface">
                <span className="material-symbols-outlined text-primary text-[18px]">menu_book</span>
                {s.lesson?.name || "Lesson"} · {Math.round((s.duration || 0) / 60)} min
              </div>
            ))}
          </div>
        )}

        {selected.transactions.length > 0 && (
          <div className="space-y-xs">
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Transactions</p>
            {selected.transactions.map((t) => (
              <button
                key={t.id}
                onClick={() => onNavigate("/finance")}
                className="flex items-center justify-between gap-2 text-body-sm w-full"
              >
                <span className="text-on-surface">{t.category}</span>
                <span className={t.type === "income" ? "text-tertiary" : "text-error"}>
                  {t.type === "income" ? "+" : "-"}{t.amount}
                </span>
              </button>
            ))}
          </div>
        )}

        {selected.goals.length > 0 && (
          <div className="space-y-xs">
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Goal Deadlines</p>
            {selected.goals.map((g) => (
              <button
                key={g.id}
                onClick={() => onNavigate("/goals")}
                className="flex items-center gap-2 text-body-sm text-on-surface w-full text-left"
              >
                <span className="material-symbols-outlined text-primary text-[18px] icon-filled">flag</span>
                {g.title}
              </button>
            ))}
          </div>
        )}

        {selected.journal && (
          <div className="space-y-xs">
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Journal</p>
            <button
              onClick={() => onNavigate("/journal")}
              className="text-body-sm text-on-surface-variant text-left line-clamp-2"
            >
              {selected.journal.text}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
