import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSetting } from "../db/db";
import TopAppBar from "../components/TopAppBar";
import BottomNav from "../components/BottomNav";
import LinkLearningPicker from "../components/LinkLearningPicker";
import {
  getGoalProgress,
  getLinkedGoalLabel,
  getLinkedGoalStats,
  getLinkTypeLabel,
  isLinkedGoal,
  isFinancialGoal,
  getFinancialGoalStats,
  getFinancialGoalLabel,
} from "../utils/goalProgress";
import { useLanguage } from "../utils/language";

function formatTarget(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

const PROGRESS_COLOR = (p) => (p >= 75 ? "bg-tertiary" : p >= 40 ? "bg-primary" : "bg-secondary");
const PROGRESS_TEXT = (p) => (p >= 75 ? "text-tertiary" : p >= 40 ? "text-primary" : "text-secondary");

export default function Goals() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const goals = useLiveQuery(() => db.goals.toArray(), []) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];
  const levels = useLiveQuery(() => db.levels.toArray(), []) || [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) || [];
  const lessons = useLiveQuery(() => db.lessons.toArray(), []) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const [activeGoalSheet, setActiveGoalSheet] = useState(null); // null | "new" | goal object being edited
  const [currency, setCurrency] = useState("EGP");

  useEffect(() => {
    getSetting("financeCurrency", "EGP").then(setCurrency);
  }, []);

  const learningData = { subjects, levels, courses, lessons, transactions };
  const goalsWithProgress = goals.map((goal) => ({
    ...goal,
    effectiveProgress: getGoalProgress(goal, learningData),
  }));

  const avgProgress = goalsWithProgress.length
    ? Math.round(goalsWithProgress.reduce((sum, g) => sum + g.effectiveProgress, 0) / goalsWithProgress.length)
    : 0;

  const studySessions = useLiveQuery(() => db.studySessions.toArray(), []) || [];
  const totalFocusMinutes = studySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const completedTasks = tasks.filter((t) => t.completed).length;

  const openLinkedContent = (goal) => {
    if (isFinancialGoal(goal)) {
      navigate("/finance");
      return;
    }
    if (goal.linkedType === "lesson") {
      navigate(`/learning/lesson/${goal.linkedId}`);
    } else if (goal.linkedType === "course") {
      navigate(`/learning/course/${goal.linkedId}`);
    } else if (goal.linkedType === "level") {
      const level = levels.find((l) => l.id === goal.linkedId);
      navigate("/learning", { state: { subjectId: level?.subjectId ?? null, levelId: goal.linkedId } });
    } else if (goal.linkedType === "subject") {
      navigate("/learning", { state: { subjectId: goal.linkedId } });
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-24">
      <TopAppBar title={t("Your Goals")} showProfile />

      <main className="px-container_margin_mobile mt-20 space-y-xl max-w-2xl mx-auto">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl bg-primary h-48 flex items-end p-lg">
          <div className="relative z-10">
            <h2 className="text-headline-lg-mobile text-white">{t("Keep Pushing.")}</h2>
            <p className="text-body-sm text-on-primary-container opacity-90 mt-1">
              {t("You are")} {avgProgress}% {t("closer to your milestones.")}
            </p>
          </div>
        </section>

        {/* Goals list */}
        <section className="space-y-md">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-title-md text-on-surface">{t("Active Pursuits")}</h3>
            <span className="text-label-md text-on-surface-variant uppercase tracking-widest">
              {goals.length} {t("In Progress")}
            </span>
          </div>

          {goals.length === 0 && (
            <div className="text-center py-lg text-on-surface-variant text-body-sm">
              {t("No goals yet — add one to start planning ahead.")}
            </div>
          )}

          {goalsWithProgress.map((goal) => {
            const linked = isLinkedGoal(goal);
            const financial = isFinancialGoal(goal);
            const stats = linked && !financial ? getLinkedGoalStats(goal, learningData) : null;
            const finStats = financial ? getFinancialGoalStats(goal, transactions) : null;
            const daysLeft = daysUntil(goal.targetDate);
            const deadlineLabel =
              daysLeft > 0
                ? `${daysLeft} ${t("days left")}`
                : daysLeft === 0
                ? t("Due today")
                : `${Math.abs(daysLeft)} ${t("days overdue")}`;

            return (
              <div
                key={goal.id}
                className="bg-surface-container-lowest rounded-xl shadow-card p-lg flex flex-col gap-md transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-md min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-secondary-container/10 flex items-center justify-center text-secondary shrink-0">
                      <span className="material-symbols-outlined text-[28px] icon-filled">
                        {financial ? (goal.linkedType === "income" ? "savings" : "shield") : linked ? "school" : "flag"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-title-md text-on-surface">{goal.title}</h4>
                      <p className="text-label-md text-on-surface-variant">
                        {t("Target:")} {formatTarget(goal.targetDate)} · {deadlineLabel}
                      </p>
                      {linked && (
                        <p className="text-label-md text-primary truncate mt-0.5">
                          {financial
                            ? `${getLinkTypeLabel(goal.linkedType)} · ${getFinancialGoalLabel(goal, currency)}`
                            : `${getLinkTypeLabel(goal.linkedType)} · ${getLinkedGoalLabel(goal.linkedType, goal.linkedId, learningData)}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-sm shrink-0">
                    <span className={`text-headline-lg-mobile ${PROGRESS_TEXT(goal.effectiveProgress)}`}>
                      {goal.effectiveProgress}%
                    </span>
                    <button
                      onClick={() => setActiveGoalSheet(goal)}
                      aria-label="Edit goal"
                      className="text-on-surface-variant hover:text-primary p-1 rounded-full transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      onClick={() => deleteGoal(goal)}
                      aria-label="Delete goal"
                      className="text-on-surface-variant hover:text-error p-1 -mr-1 rounded-full transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-sm">
                  <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${PROGRESS_COLOR(goal.effectiveProgress)}`}
                      style={{ width: `${goal.effectiveProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-xs min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-tertiary shrink-0">
                        {linked ? "auto_awesome" : "check_circle"}
                      </span>
                      <span className="text-label-md text-on-surface-variant truncate">
                        {financial
                          ? finStats?.kind === "income"
                            ? `${finStats.current}/${finStats.target} ${currency} ${t("saved")}`
                            : `${finStats.current}/${finStats.target} ${currency} ${t("spent")}${finStats?.over ? ` — ${t("over limit")}` : ""}`
                          : linked
                          ? stats?.total
                            ? `${stats.completed}/${stats.total} ${t("lessons completed")}`
                            : t("No lessons yet")
                          : `${Math.round((100 - goal.effectiveProgress) / 10)} ${t("sub-tasks remaining")}`}
                      </span>
                    </div>
                    {!linked && (
                      <button
                        onClick={() => updateProgress(goal)}
                        className="text-primary text-label-md hover:underline shrink-0"
                      >
                        {t("+10% Progress")}
                      </button>
                    )}
                    {linked && (
                      <div className="flex items-center gap-sm shrink-0">
                        <span className="text-label-md text-on-surface-variant">{t("Auto-tracked")}</span>
                        <button
                          onClick={() => openLinkedContent(goal)}
                          className="text-label-md text-primary hover:underline flex items-center gap-0.5"
                        >
                          {t("Open")}
                          <span className="material-symbols-outlined text-[14px] rtl-flip">arrow_forward</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Stats mini bento */}
        <section className="grid grid-cols-2 gap-md">
          <div className="bg-surface-container-low rounded-xl p-md flex flex-col gap-sm">
            <span className="text-label-md text-on-surface-variant">{t("Focus Hours")}</span>
            <span className="text-title-md text-on-surface">{totalFocusHours}h</span>
            <div className="h-1 w-full bg-surface-container-high rounded-full">
              <div className="h-full bg-primary-container rounded-full" style={{ width: `${Math.min(totalFocusMinutes / 2, 100)}%` }} />
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-md flex flex-col gap-sm">
            <span className="text-label-md text-on-surface-variant">{t("Tasks Completed")}</span>
            <span className="text-title-md text-on-surface">{completedTasks}/{tasks.length}</span>
            <div className="h-1 w-full bg-surface-container-high rounded-full">
              <div
                className="h-full bg-tertiary-fixed-dim rounded-full"
                style={{ width: `${tasks.length ? (completedTasks / tasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </section>

        {/* Add New Goal */}
        <section className="pt-lg pb-xl">
          <button
            onClick={() => setActiveGoalSheet("new")}
            className="w-full h-16 bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center gap-sm text-on-surface-variant hover:border-primary hover:text-primary transition-all duration-200 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span className="text-title-md">{t("Add New Goal")}</span>
          </button>
        </section>
      </main>

      {activeGoalSheet && (
        <GoalSheet
          goal={activeGoalSheet === "new" ? null : activeGoalSheet}
          learningData={learningData}
          currency={currency}
          onClose={() => setActiveGoalSheet(null)}
        />
      )}
      <BottomNav />
    </div>
  );
}

async function updateProgress(goal) {
  const newProgress = Math.min(100, goal.progress + 10);
  await db.goals.update(goal.id, { progress: newProgress });
}

async function deleteGoal(goal) {
  if (!confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) return;
  await db.goals.delete(goal.id);
}

function GoalSheet({ goal, learningData, currency, onClose }) {
  const { t } = useLanguage();
  const isEdit = !!goal;
  const [trackingMode, setTrackingMode] = useState(
    isFinancialGoal(goal) ? "finance" : goal?.linkedType && goal?.linkedId ? "learning" : "manual"
  );
  const [title, setTitle] = useState(goal?.title || "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate || "");
  const [link, setLink] = useState(
    goal?.linkedType && goal?.linkedId
      ? {
          linkedType: goal.linkedType,
          linkedId: goal.linkedId,
          label: getLinkedGoalLabel(goal.linkedType, goal.linkedId, learningData),
        }
      : null
  );
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [financeType, setFinanceType] = useState(goal?.linkedType === "expense_limit" ? "expense_limit" : "income");
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount ? String(goal.targetAmount) : "");

  const save = async () => {
    if (!title.trim()) return;
    const fallbackDate = isEdit
      ? goal.targetDate || new Date(Date.now() + 86400000 * 30).toISOString().split("T")[0]
      : new Date(Date.now() + 86400000 * 30).toISOString().split("T")[0];
    const payload = {
      title: title.trim(),
      targetDate: targetDate || fallbackDate,
      linkedType: null,
      linkedId: null,
      targetAmount: null,
    };

    if (trackingMode === "learning" && link) {
      payload.linkedType = link.linkedType;
      payload.linkedId = link.linkedId;
    } else if (trackingMode === "finance" && Number(targetAmount) > 0) {
      payload.linkedType = financeType;
      payload.targetAmount = Number(targetAmount);
    }

    if (isEdit) {
      await db.goals.update(goal.id, payload);
    } else {
      payload.progress = 0;
      payload.createdAt = Date.now();
      await db.goals.add(payload);
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={onClose}>
        <div className="w-full max-w-md bg-surface rounded-t-2xl p-lg pb-xl space-y-md" onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-md" />
          <h3 className="text-title-md text-on-surface">{isEdit ? t("Edit Goal") : t("New Goal")}</h3>
          <div className="space-y-sm">
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider">{t("Goal Title")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Learn Spanish"
              className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
            />
          </div>
          <div className="space-y-sm">
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider">{t("Target Date")}</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg outline-none"
            />
          </div>

          <div className="space-y-sm">
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider">{t("Progress Tracking")}</label>

            <div className="flex gap-sm">
              {[
                { key: "manual", label: t("Manual") },
                { key: "learning", label: t("Learning") },
                { key: "finance", label: t("Finance") },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setTrackingMode(m.key)}
                  className={`flex-1 py-2 rounded-xl text-label-md transition-all ${
                    trackingMode === m.key
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {trackingMode === "manual" && (
              <p className="text-body-sm text-on-surface-variant">{t("Update progress yourself with +10% steps.")}</p>
            )}

            {trackingMode === "learning" &&
              (link ? (
                <div className="rounded-xl bg-primary-fixed/30 border border-primary/20 p-md space-y-sm">
                  <div className="flex items-start justify-between gap-sm">
                    <div className="min-w-0">
                      <p className="text-label-md text-primary">{getLinkTypeLabel(link.linkedType)} {t("goal")}</p>
                      <p className="text-body-sm text-on-surface truncate">{link.label}</p>
                    </div>
                    <button
                      onClick={() => setLink(null)}
                      className="text-on-surface-variant hover:text-error shrink-0"
                      aria-label="Remove learning link"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                  <button onClick={() => setShowLinkPicker(true)} className="text-primary text-label-md hover:underline">
                    {t("Change link")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLinkPicker(true)}
                  className="w-full py-3 px-lg rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface flex items-center justify-center gap-sm hover:border-primary hover:text-primary transition-all"
                >
                  <span className="material-symbols-outlined">link</span>
                  {t("Link to Learning")}
                </button>
              ))}

            {trackingMode === "finance" && (
              <div className="space-y-sm">
                <div className="flex gap-sm">
                  <button
                    onClick={() => setFinanceType("income")}
                    className={`flex-1 py-2 rounded-xl text-label-md transition-all flex items-center justify-center gap-1 ${
                      financeType === "income"
                        ? "bg-tertiary-fixed text-on-tertiary-fixed-variant ring-2 ring-tertiary"
                        : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">savings</span>
                    {t("Income Target")}
                  </button>
                  <button
                    onClick={() => setFinanceType("expense_limit")}
                    className={`flex-1 py-2 rounded-xl text-label-md transition-all flex items-center justify-center gap-1 ${
                      financeType === "expense_limit"
                        ? "bg-secondary-container text-on-secondary-container ring-2 ring-secondary"
                        : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">shield</span>
                    {t("Expense Limit")}
                  </button>
                </div>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder={`Target amount (${currency})`}
                  className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
                />
                <p className="text-body-sm text-on-surface-variant">
                  {financeType === "income"
                    ? t("Tracks income you log between now and the target date.")
                    : t("Tracks expenses you log between now and the target date — 100% means you're still fully within budget.")}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={save}
            className="w-full py-4 px-lg rounded-full text-title-md text-on-primary bg-primary active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-lg"
          >
            <span className="material-symbols-outlined icon-filled">check_circle</span>
            {isEdit ? t("Save Changes") : t("Save Goal")}
          </button>
        </div>
      </div>

      {showLinkPicker && (
        <LinkLearningPicker
          initialLink={link}
          onClose={() => setShowLinkPicker(false)}
          onSelect={setLink}
        />
      )}
    </>
  );
}
