import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import BottomNav from "../components/BottomNav";
import { useLanguage } from "../utils/language";

const COLOR_MAP = {
  primary: { bg: "bg-primary-fixed", text: "text-primary" },
  secondary: { bg: "bg-secondary-fixed", text: "text-secondary" },
  tertiary: { bg: "bg-tertiary-fixed-dim", text: "text-tertiary" },
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function Today() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const lessons = useLiveQuery(() => db.lessons.toArray(), []) || [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) || [];
  const recurringRules = useLiveQuery(() => db.recurringTransactions.toArray(), []) || [];
  const journalEntries = useLiveQuery(() => db.journalEntries.toArray(), []) || [];

  const todayKey = todayStr();
  const now = new Date();
  const todayDow = now.getDay();

  const todayHabits = habits.filter((h) => h.days?.includes(todayDow));
  const todayTasks = tasks
    .filter((t) => !t.completed && t.dueDate <= todayKey)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const inProgressLessons = lessons.filter((l) => l.status === "in_progress");
  const todayRecurring = recurringRules.filter((r) => {
    if (!r.active) return false;
    if (r.frequency === "monthly") {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return now.getDate() === Math.min(r.dayOfMonth || 1, lastDay);
    }
    return now.getDay() === r.dayOfWeek;
  });
  const journalToday = journalEntries.find((j) => j.date === todayKey);

  const toggleHabit = async (habit) => {
    const existing = habitLogs.find((l) => l.habitId === habit.id && l.date === todayKey);
    if (existing) await db.habitLogs.delete(existing.id);
    else await db.habitLogs.add({ habitId: habit.id, date: todayKey });
  };

  const toggleTask = async (task) => {
    await db.tasks.update(task.id, { completed: !task.completed });
  };

  const completedCount =
    todayHabits.filter((h) => habitLogs.some((l) => l.habitId === h.id && l.date === todayKey)).length +
    (tasks.filter((t) => t.completed && t.dueDate === todayKey).length);
  const totalCount = todayHabits.length + todayTasks.length;

  const todayLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const isEmpty = todayHabits.length === 0 && todayTasks.length === 0 && inProgressLessons.length === 0 && todayRecurring.length === 0;

  return (
    <div className="bg-background text-on-background min-h-screen pb-24">
      <header className="bg-surface sticky top-0 z-40 flex justify-between items-center w-full px-container_margin_mobile h-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 p-2 -ml-2 rounded-full"
        >
          <span className="material-symbols-outlined rtl-flip">arrow_back</span>
          <span className="text-label-md">{t("Back")}</span>
        </button>
        <h1 className="text-title-md text-primary">{t("Today")}</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-2xl mx-auto px-container_margin_mobile pt-4 flex flex-col gap-lg">
        <section className="bg-primary-container rounded-xl p-lg text-on-primary-container">
          <p className="text-label-md opacity-80 uppercase tracking-widest mb-1">{todayLabel}</p>
          {totalCount > 0 ? (
            <>
              <p className="text-display-lg mb-1">{completedCount}/{totalCount}</p>
              <p className="text-body-sm opacity-90">{t("items done so far today")}</p>
            </>
          ) : (
            <p className="text-title-md">{t("Nothing scheduled — open agenda 🎉")}</p>
          )}
        </section>

        {isEmpty && (
          <div className="text-center py-xl text-on-surface-variant text-body-sm">
            {t("All clear for today. Maybe write in your journal or get ahead on a lesson.")}
          </div>
        )}

        {/* Habits */}
        {todayHabits.length > 0 && (
          <section className="space-y-sm">
            <h3 className="text-title-md text-on-surface px-1">{t("Habits")}</h3>
            <div className="flex flex-col gap-sm">
              {todayHabits.map((h) => {
                const done = habitLogs.some((l) => l.habitId === h.id && l.date === todayKey);
                const colors = COLOR_MAP[h.color] || COLOR_MAP.primary;
                return (
                  <div
                    key={h.id}
                    onClick={() => navigate(`/habits/${h.id}`)}
                    className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant/30 flex items-center gap-md cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text} shrink-0`}>
                      <span className="material-symbols-outlined">{h.icon || "task_alt"}</span>
                    </div>
                    <p className={`flex-1 text-body-sm ${done ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                      {h.name}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHabit(h);
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        done ? "bg-primary text-on-primary" : "border-2 border-outline-variant text-outline-variant"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${done ? "icon-filled" : ""}`}>
                        {done ? "check" : "radio_button_unchecked"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tasks */}
        {todayTasks.length > 0 && (
          <section className="space-y-sm">
            <h3 className="text-title-md text-on-surface px-1">{t("Tasks")}</h3>
            <div className="flex flex-col gap-sm">
              {todayTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/tasks/${t.id}/edit`)}
                  className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant/30 flex items-center gap-md cursor-pointer hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(t);
                    }}
                    className="w-6 h-6 rounded-full border-2 border-outline-variant shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-on-surface truncate">{t.title}</p>
                    {t.dueDate < todayKey && <p className="text-label-md text-error">Overdue · {t.dueDate}</p>}
                  </div>
                  <span
                    className={`text-label-md px-2 py-0.5 rounded-full shrink-0 ${
                      t.priority === "high"
                        ? "bg-error-container text-on-error-container"
                        : t.priority === "medium"
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Continue Learning */}
        {inProgressLessons.length > 0 && (
          <section className="space-y-sm">
            <h3 className="text-title-md text-on-surface px-1">{t("Continue Learning")}</h3>
            <div className="flex flex-col gap-sm">
              {inProgressLessons.map((l) => {
                const course = courses.find((c) => c.id === l.courseId);
                return (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/learning/lesson/${l.id}`)}
                    className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-lowest border border-surface-variant/30 text-left hover:border-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-primary shrink-0">play_circle</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-on-surface truncate">{l.name}</p>
                      {course && <p className="text-label-md text-on-surface-variant">{course.name}</p>}
                    </div>
                    <span className="material-symbols-outlined rtl-flip text-on-surface-variant text-[18px] shrink-0">chevron_right</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Recurring transactions firing today */}
        {todayRecurring.length > 0 && (
          <section className="space-y-sm">
            <h3 className="text-title-md text-on-surface px-1">{t("Scheduled Today")}</h3>
            <div className="flex flex-col gap-sm">
              {todayRecurring.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate("/finance")}
                  className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-lowest border border-surface-variant/30 text-left hover:border-primary transition-colors"
                >
                  <span className={`material-symbols-outlined shrink-0 ${r.type === "income" ? "text-tertiary" : "text-error"}`}>
                    {r.type === "income" ? "arrow_downward" : "arrow_upward"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-on-surface truncate">{r.category}</p>
                    <p className="text-label-md text-on-surface-variant">Recurring {r.frequency}</p>
                  </div>
                  <span className={`text-title-md shrink-0 ${r.type === "income" ? "text-tertiary" : "text-error"}`}>
                    {r.type === "income" ? "+" : "-"}{r.amount}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Journal quick link */}
        <button
          onClick={() => navigate("/journal")}
          className="w-full flex items-center gap-md p-md rounded-xl bg-secondary-fixed/30 border border-secondary/20 hover:border-secondary transition-colors"
        >
          <span className="material-symbols-outlined text-secondary shrink-0">auto_stories</span>
          <p className="flex-1 text-left text-body-sm text-on-surface">
            {journalToday ? t("You've written in your journal today") : t("Haven't written in your journal today")}
          </p>
          <span className="material-symbols-outlined rtl-flip text-on-surface-variant text-[18px] shrink-0">chevron_right</span>
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
