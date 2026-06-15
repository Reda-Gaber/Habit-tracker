import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import TopAppBar from "../components/TopAppBar";
import BottomNav from "../components/BottomNav";

function formatTarget(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const PROGRESS_COLOR = (p) => (p >= 75 ? "bg-tertiary" : p >= 40 ? "bg-primary" : "bg-secondary");
const PROGRESS_TEXT = (p) => (p >= 75 ? "text-tertiary" : p >= 40 ? "text-primary" : "text-secondary");

export default function Goals() {
  const navigate = useNavigate();
  const goals = useLiveQuery(() => db.goals.toArray(), []) || [];
  const [showAdd, setShowAdd] = useState(false);

  const avgProgress = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : 0;

  const studySessions = useLiveQuery(() => db.studySessions.toArray(), []) || [];
  const totalFocusMinutes = studySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const completedTasks = tasks.filter((t) => t.completed).length;

  return (
    <div className="bg-background text-on-background min-h-screen pb-24">
      <TopAppBar title="Your Goals" showProfile rightIcon="notifications" onRightClick={() => navigate("/settings/notifications")} />

      <main className="px-container_margin_mobile mt-20 space-y-xl max-w-2xl mx-auto">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl bg-primary h-48 flex items-end p-lg">
          <div className="relative z-10">
            <h2 className="text-headline-lg-mobile text-white">Keep Pushing.</h2>
            <p className="text-body-sm text-on-primary-container opacity-90 mt-1">
              You are {avgProgress}% closer to your milestones.
            </p>
          </div>
        </section>

        {/* Goals list */}
        <section className="space-y-md">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-title-md text-on-surface">Active Pursuits</h3>
            <span className="text-label-md text-on-surface-variant uppercase tracking-widest">
              {goals.length} In Progress
            </span>
          </div>

          {goals.length === 0 && (
            <div className="text-center py-lg text-on-surface-variant text-body-sm">
              No goals yet — add one to start planning ahead.
            </div>
          )}

          {goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-surface-container-lowest rounded-xl shadow-card p-lg flex flex-col gap-md transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 rounded-xl bg-secondary-container/10 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[28px] icon-filled">flag</span>
                  </div>
                  <div>
                    <h4 className="text-title-md text-on-surface">{goal.title}</h4>
                    <p className="text-label-md text-on-surface-variant">Target: {formatTarget(goal.targetDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <span className={`text-headline-lg-mobile ${PROGRESS_TEXT(goal.progress)}`}>{goal.progress}%</span>
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
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${PROGRESS_COLOR(goal.progress)}`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                    <span className="text-label-md text-on-surface-variant">
                      {Math.round((100 - goal.progress) / 10)} sub-tasks remaining
                    </span>
                  </div>
                  <button
                    onClick={() => updateProgress(goal)}
                    className="text-primary text-label-md hover:underline"
                  >
                    +10% Progress
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Stats mini bento */}
        <section className="grid grid-cols-2 gap-md">
          <div className="bg-surface-container-low rounded-xl p-md flex flex-col gap-sm">
            <span className="text-label-md text-on-surface-variant">Focus Hours</span>
            <span className="text-title-md text-on-surface">{totalFocusHours}h</span>
            <div className="h-1 w-full bg-surface-container-high rounded-full">
              <div className="h-full bg-primary-container rounded-full" style={{ width: `${Math.min(totalFocusMinutes / 2, 100)}%` }} />
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-md flex flex-col gap-sm">
            <span className="text-label-md text-on-surface-variant">Tasks Completed</span>
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
            onClick={() => setShowAdd(true)}
            className="w-full h-16 bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center gap-sm text-on-surface-variant hover:border-primary hover:text-primary transition-all duration-200 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span className="text-title-md">Add New Goal</span>
          </button>
        </section>
      </main>

      {showAdd && <AddGoalSheet onClose={() => setShowAdd(false)} />}
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

function AddGoalSheet({ onClose }) {
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const save = async () => {
    if (!title.trim()) return;
    await db.goals.add({
      title: title.trim(),
      targetDate: targetDate || new Date(Date.now() + 86400000 * 30).toISOString().split("T")[0],
      progress: 0,
      createdAt: Date.now(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-t-2xl p-lg pb-xl space-y-md" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-md" />
        <h3 className="text-title-md text-on-surface">New Goal</h3>
        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Goal Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Learn Spanish"
            className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
          />
        </div>
        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg outline-none"
          />
        </div>
        <button
          onClick={save}
          className="w-full py-4 px-lg rounded-full text-title-md text-on-primary bg-primary active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-lg"
        >
          <span className="material-symbols-outlined icon-filled">check_circle</span>
          Save Goal
        </button>
      </div>
    </div>
  );
}
