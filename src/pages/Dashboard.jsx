import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSetting } from "../db/db";
import { getGoalProgress } from "../utils/goalProgress";
import { computeTotalPoints, getLevelInfo } from "../utils/points";
import { useLanguage } from "../utils/language";
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
  const { t } = useLanguage();
  const [userName, setUserName] = useState("there");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    getSetting("userName", "there").then(setUserName);
  }, []);

  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const allLogs = useLiveQuery(() => db.habitLogs.toArray(), []) || [];
  const studySessions = useLiveQuery(() => db.studySessions.toArray(), []) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const [financeCurrency, setFinanceCurrency] = useState("EGP");

  useEffect(() => {
    getSetting("financeCurrency", "EGP").then(setFinanceCurrency);
  }, []);

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
    const scheduledHabits = habits.filter((h) => h.days?.includes(dow));
    const doneHabits = allLogs.filter(
      (l) => l.date === dateStr && habits.some((h) => h.id === l.habitId && h.days?.includes(dow))
    ).length;
    const hasStudy = studySessions.some((s) => s.date === dateStr);
    const hasCompletedTask = tasks.some((t) => t.completed && t.dueDate === dateStr);
    const hasAnyActivity = doneHabits > 0 || hasStudy || hasCompletedTask;

    return {
      dateStr,
      done: doneHabits,
      expected: scheduledHabits.length,
      // The dot lights up for ANY activity that day (habit, study session, or
      // completed task) — not just habits — so studying still shows progress.
      complete: scheduledHabits.length > 0 ? doneHabits >= scheduledHabits.length : hasAnyActivity,
    };
  });

  // Habit Consistency ring stays habit-only (that's what it's labeled as);
  // days with zero scheduled habits simply don't contribute to it.
  const totalExpected = weeklyCompletionByDay.reduce((sum, d) => sum + (d.expected || 0), 0);
  const totalDone = weeklyCompletionByDay.reduce((sum, d) => sum + (d.done || 0), 0);
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

  // Goals overview
  const goals = useLiveQuery(() => db.goals.toArray(), []) || [];

  // Today's tasks (for full list on dashboard)
  const todaysTaskList = tasks
    .filter((t) => t.dueDate === todayKey || (t.dueDate < todayKey && !t.completed))
    .sort((a, b) => Number(a.completed) - Number(b.completed));

  // Learning breakdown: Subjects -> Levels -> Courses with completed/total lessons
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];
  const allLevels = useLiveQuery(() => db.levels.toArray(), []) || [];
  const allCourses = useLiveQuery(() => db.courses.toArray(), []) || [];
  const allLessons = useLiveQuery(() => db.lessons.toArray(), []) || [];

  // Weekly focus time comparison
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisWeekFocusMin = studySessions
    .filter((s) => new Date(s.date) >= weekStart)
    .reduce((sum, s) => sum + (s.duration || 0), 0);
  const lastWeekFocusMin = studySessions
    .filter((s) => new Date(s.date) >= lastWeekStart && new Date(s.date) < weekStart)
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  let focusChange = null;
  if (lastWeekFocusMin > 0) {
    focusChange = { pct: Math.round(((thisWeekFocusMin - lastWeekFocusMin) / lastWeekFocusMin) * 100) };
    focusChange.up = focusChange.pct >= 0;
  } else if (thisWeekFocusMin > 0) {
    focusChange = { pct: 100, up: true };
  }
  const thisWeekFocusHours = (thisWeekFocusMin / 60).toFixed(1);

  const learningBreakdown = subjects.map((subject) => {
    const subjectLevels = allLevels.filter((l) => l.subjectId === subject.id);
    const levelsWithCourses = subjectLevels.map((level) => {
      const levelCourses = allCourses.filter((c) => c.levelId === level.id);
      const coursesWithLessons = levelCourses.map((course) => {
        const courseLessons = allLessons.filter((les) => les.courseId === course.id);
        const completed = courseLessons.filter((les) => les.status === "completed").length;
        return { course, total: courseLessons.length, completed };
      });
      const levelTotal = coursesWithLessons.reduce((sum, c) => sum + c.total, 0);
      const levelCompleted = coursesWithLessons.reduce((sum, c) => sum + c.completed, 0);
      return { level, courses: coursesWithLessons, total: levelTotal, completed: levelCompleted };
    });
    const subjectTotal = levelsWithCourses.reduce((sum, l) => sum + l.total, 0);
    const subjectCompleted = levelsWithCourses.reduce((sum, l) => sum + l.completed, 0);
    return { subject, levels: levelsWithCourses, total: subjectTotal, completed: subjectCompleted };
  });

  const totalLessonsAll = allLessons.length;
  const completedLessonsAll = allLessons.filter((l) => l.status === "completed").length;

  // Finance snapshot
  const todayIncome = transactions.filter((t) => t.date === todayKey && t.type === "income").reduce((s, t) => s + t.amount, 0);
  const todayExpense = transactions.filter((t) => t.date === todayKey && t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const todayNet = todayIncome - todayExpense;

  const learningData = { subjects, levels: allLevels, courses: allCourses, lessons: allLessons, transactions };
  const avgGoalProgress = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + getGoalProgress(g, learningData), 0) / goals.length)
    : 0;
  const goalsWithProgress = goals.map((goal) => ({
    ...goal,
    effectiveProgress: getGoalProgress(goal, learningData),
  }));

  const totalPoints = computeTotalPoints({
    habitLogs: allLogs,
    tasks,
    lessons: allLessons,
    studySessions,
    goals,
    goalProgressFn: (g) => getGoalProgress(g, learningData),
  });
  const levelInfo = getLevelInfo(totalPoints);

  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const greeting = (() => {
    const h = today.getHours();
    const name = userName && userName !== "there" ? `, ${userName}` : "";
    if (h < 12) return `${t("Good Morning")}${name}`;
    if (h < 18) return `${t("Good Afternoon")}${name}`;
    return `${t("Good Evening")}${name}`;
  })();

  return (
    <div className="bg-background text-on-background min-h-screen pb-24">
      <TopAppBar title={greeting} subtitle={todayLabel} showProfile />

      <main className="pt-20 px-container_margin_mobile max-w-2xl mx-auto space-y-xl">
        {/* Level banner */}
        <section
          onClick={() => navigate("/stats")}
          className="bento-card p-md flex items-center gap-md cursor-pointer bg-primary/5 border-primary/15"
        >
          <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 relative">
            <span className="text-title-md font-bold">{levelInfo.level}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-body-sm text-on-surface font-semibold">{levelInfo.title}</span>
              <span className="text-label-md text-on-surface-variant shrink-0">
                {levelInfo.points} pts{levelInfo.next ? ` · ${levelInfo.pointsToNext} to next` : ""}
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${levelInfo.progressPct}%` }} />
            </div>
          </div>
        </section>

        {/* Quick links: Today / Calendar / Journal */}
        <section className="grid grid-cols-3 gap-sm">
          <div onClick={() => navigate("/today")} className="bento-card p-md flex flex-col items-center gap-1 cursor-pointer">
            <span className="material-symbols-outlined text-primary icon-filled">today</span>
            <span className="text-label-md text-on-surface-variant text-center">{t("Today")}</span>
          </div>
          <div onClick={() => navigate("/calendar")} className="bento-card p-md flex flex-col items-center gap-1 cursor-pointer">
            <span className="material-symbols-outlined text-secondary icon-filled">calendar_month</span>
            <span className="text-label-md text-on-surface-variant text-center">{t("Calendar")}</span>
          </div>
          <div onClick={() => navigate("/journal")} className="bento-card p-md flex flex-col items-center gap-1 cursor-pointer">
            <span className="material-symbols-outlined text-tertiary icon-filled">auto_stories</span>
            <span className="text-label-md text-on-surface-variant text-center">{t("Journal")}</span>
          </div>
        </section>

        {/* Top Cards */}
        <section className="grid grid-cols-2 gap-md">
          <div
            onClick={() => navigate("/habits")}
            className="bento-card relative p-lg flex flex-col justify-between h-40 bg-primary-container/5 border-primary-container/20 overflow-hidden cursor-pointer"
          >
            <div className="z-10">
              <span className="text-label-md text-primary mb-1 block">{t("Habit Progress")}</span>
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
              <span className="text-label-md text-secondary mb-1 block">{t("Tasks Remaining")}</span>
              <div className="text-headline-lg-mobile">{tasksRemaining}</div>
            </div>
            <div className="flex items-center gap-xs text-secondary">
              <span className="material-symbols-outlined text-base rtl-flip">arrow_forward</span>
              <span className="text-label-md">{t("View all tasks")}</span>
            </div>
          </div>
        </section>

        {/* Finance snapshot */}
        <section
          onClick={() => navigate("/finance")}
          className="bento-card relative p-lg flex items-center justify-between cursor-pointer bg-tertiary-container/5 border-tertiary-container/20 overflow-hidden"
        >
          <div className="z-10">
            <span className="text-label-md text-tertiary mb-1 block">{t("Today's Balance")}</span>
            <div className="text-headline-lg-mobile">
              {todayNet >= 0 ? "+" : ""}
              {todayNet} {financeCurrency}
            </div>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Income {todayIncome} · Expense {todayExpense}
            </p>
          </div>
          <span className="material-symbols-outlined text-tertiary text-[40px] z-10">account_balance_wallet</span>
          <div className="absolute -right-4 -bottom-4 opacity-5">
            <span className="material-symbols-outlined text-9xl">payments</span>
          </div>
        </section>

        {/* Overview Stats */}
        <section className="grid grid-cols-3 gap-sm">
          <div onClick={() => navigate("/goals")} className="bento-card p-md flex flex-col items-center gap-1 cursor-pointer">
            <span className="material-symbols-outlined text-secondary icon-filled">flag</span>
            <span className="text-title-md text-on-surface">{avgGoalProgress}%</span>
            <span className="text-label-md text-on-surface-variant text-center">Goals avg.</span>
          </div>
          <div onClick={() => navigate("/learning")} className="bento-card p-md flex flex-col items-center gap-1 cursor-pointer">
            <span className="material-symbols-outlined text-primary icon-filled">school</span>
            <span className="text-title-md text-on-surface">{completedLessonsAll}/{totalLessonsAll}</span>
            <span className="text-label-md text-on-surface-variant text-center">Lessons done</span>
          </div>
          <div onClick={() => navigate("/stats/focus-time")} className="bento-card p-md flex flex-col items-center gap-1 cursor-pointer">
            <span className="material-symbols-outlined text-tertiary icon-filled">timer</span>
            <span className="text-title-md text-on-surface">{thisWeekFocusHours}h</span>
            <span className="text-label-md text-on-surface-variant text-center">This week</span>
            {focusChange && (
              <span className={`flex items-center gap-0.5 text-[10px] ${focusChange.up ? "text-tertiary" : "text-secondary"}`}>
                <span className="material-symbols-outlined text-[12px]">
                  {focusChange.up ? "trending_up" : "trending_down"}
                </span>
                {Math.abs(focusChange.pct)}%
              </span>
            )}
          </div>
        </section>

        <section className="space-y-md">
          <h3 className="text-title-md text-on-surface">{t("Weekly Overview")}</h3>
          <div className="bento-card p-lg space-y-lg">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-body-lg font-semibold text-on-surface">{t("Habit Consistency")}</h4>
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

        {/* Today's Tasks */}
        <section className="space-y-md">
          <div className="flex justify-between items-center">
            <h3 className="text-title-md text-on-surface">Today's Tasks</h3>
            <button onClick={() => navigate("/tasks")} className="text-label-md text-primary">
              View all
            </button>
          </div>
          <div className="bento-card p-md space-y-sm">
            {todaysTaskList.length === 0 && (
              <p className="text-body-sm text-on-surface-variant text-center py-md">
                Nothing due today. Enjoy the calm!
              </p>
            )}
            {todaysTaskList.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}/edit`)}
                className="flex items-center gap-md p-sm rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[20px] ${task.completed ? "text-tertiary icon-filled" : "text-outline"}`}>
                  {task.completed ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span className={`flex-1 text-body-sm ${task.completed ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                  {task.title}
                </span>
                {task.dueDate < todayKey && !task.completed && (
                  <span className="text-label-md text-error">Overdue</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Goals Progress */}
        <section className="space-y-md">
          <div className="flex justify-between items-center">
            <h3 className="text-title-md text-on-surface">{t("Goals Progress")}</h3>
            <button onClick={() => navigate("/goals")} className="text-label-md text-primary">
              {t("View all")}
            </button>
          </div>
          <div className="bento-card p-md space-y-md">
            {goals.length === 0 && (
              <p className="text-body-sm text-on-surface-variant text-center py-md">
                {t("No goals yet — add one to start planning ahead.")}
              </p>
            )}
            {goalsWithProgress.map((goal) => (
              <div key={goal.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-body-sm text-on-surface truncate pr-md">{goal.title}</span>
                  <span className="text-label-md text-primary shrink-0">{goal.effectiveProgress}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${goal.effectiveProgress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Learning Progress Breakdown */}
        <section className="space-y-md">
          <div className="flex justify-between items-center">
            <h3 className="text-title-md text-on-surface">{t("Learning Progress")}</h3>
            <button onClick={() => navigate("/learning")} className="text-label-md text-primary">
              {t("Open")}
            </button>
          </div>
          <div className="space-y-md">
            {learningBreakdown.length === 0 && (
              <div className="bento-card p-md">
                <p className="text-body-sm text-on-surface-variant text-center py-md">
                  {t("No subjects yet — add one from the Learning tab.")}
                </p>
              </div>
            )}
            {learningBreakdown.map(({ subject, levels, total, completed }) => (
              <div key={subject.id} className="bento-card p-md">
                <div className="flex items-center justify-between mb-sm">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary text-[20px]">{subject.icon}</span>
                    <span className="text-body-lg font-semibold text-on-surface">{subject.name}</span>
                  </div>
                  <span className="text-label-md text-on-surface-variant">
                    {completed}/{total} lessons
                  </span>
                </div>
                <div className="space-y-sm pl-lg">
                  {levels.map(({ level, courses, total: lTotal, completed: lCompleted }) => (
                    <div key={level.id}>
                      <div className="flex items-center justify-between">
                        <span className="text-label-md text-on-surface-variant uppercase tracking-wider">{level.name}</span>
                        <span className="text-label-md text-on-surface-variant">{lCompleted}/{lTotal}</span>
                      </div>
                      {courses.map(({ course, total: cTotal, completed: cCompleted }) => {
                        const pct = cTotal ? Math.round((cCompleted / cTotal) * 100) : 0;
                        return (
                          <div
                            key={course.id}
                            onClick={() => navigate(`/learning/course/${course.id}`)}
                            className="flex items-center gap-sm py-1 cursor-pointer"
                          >
                            <span className="text-body-sm text-on-surface flex-1 truncate">{course.name}</span>
                            <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden shrink-0">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-label-md text-on-surface-variant w-10 text-right shrink-0">
                              {cCompleted}/{cTotal}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-md">
          <h3 className="text-title-md text-on-surface">{t("Continue Learning")}</h3>
          <div
            onClick={() => navigate(inProgressLesson ? `/learning/lesson/${inProgressLesson.id}` : "/learning")}
            className="bento-card overflow-hidden cursor-pointer"
          >
            <div className="relative h-32 w-full bg-gradient-to-br from-primary to-primary-container flex items-end">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <span className="absolute bottom-md left-lg text-title-md text-white">
                {inProgressLesson ? inProgressLesson.name : t("Start a new course")}
              </span>
            </div>
            <div className="p-lg flex justify-between items-center">
              <div>
                <p className="text-body-sm text-on-surface-variant">
                  {lessonCourse ? lessonCourse.name : t("Explore your learning path")}
                </p>
                <p className="text-label-md text-primary">
                  {inProgressLesson ? t("In progress") : t("Tap to browse")}
                </p>
              </div>
              <button className="bg-primary text-on-primary rounded-full px-lg py-sm text-label-md">
                {inProgressLesson ? t("Resume") : t("Explore")}
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
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface rounded-t-2xl p-lg pb-xl space-y-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-md" />
        <h3 className="text-title-md text-on-surface mb-sm">{t("Quick Add")}</h3>
        <button
          onClick={() => navigate("/habits/new")}
          className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-low active:scale-[0.98] transition-transform"
        >
          <span className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">self_improvement</span>
          </span>
          <span className="text-body-lg text-on-surface">{t("New Habit")}</span>
        </button>
        <button
          onClick={() => navigate("/tasks/new")}
          className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-low active:scale-[0.98] transition-transform"
        >
          <span className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined">task_alt</span>
          </span>
          <span className="text-body-lg text-on-surface">{t("New Task")}</span>
        </button>
        <button
          onClick={() => navigate("/finance", { state: { openNew: true } })}
          className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-low active:scale-[0.98] transition-transform"
        >
          <span className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined">payments</span>
          </span>
          <span className="text-body-lg text-on-surface">{t("New Transaction")}</span>
        </button>
        <button
          onClick={() => navigate("/journal")}
          className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-low active:scale-[0.98] transition-transform"
        >
          <span className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined">edit_note</span>
          </span>
          <span className="text-body-lg text-on-surface">{t("Journal Entry")}</span>
        </button>
      </div>
    </div>
  );
}
