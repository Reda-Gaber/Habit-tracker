import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { getGoalProgress, getGoalsLinkedTo } from "../utils/goalProgress";

/**
 * Shows a small "Linked Goal" card when a goal points at this exact
 * linkedType/linkedId. Tapping it jumps back to the Goals page.
 * Renders nothing if no goal is linked here.
 */
export default function LinkedGoalBadge({ linkedType, linkedId }) {
  const navigate = useNavigate();
  const goals = useLiveQuery(() => db.goals.toArray(), []) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];
  const levels = useLiveQuery(() => db.levels.toArray(), []) || [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) || [];
  const lessons = useLiveQuery(() => db.lessons.toArray(), []) || [];

  const linkedGoals = getGoalsLinkedTo(goals, linkedType, linkedId);
  if (linkedGoals.length === 0) return null;

  const learningData = { subjects, levels, courses, lessons };

  return (
    <div className="flex flex-col gap-sm">
      {linkedGoals.map((goal) => {
        const pct = getGoalProgress(goal, learningData);
        return (
          <button
            key={goal.id}
            onClick={() => navigate("/goals")}
            className="w-full flex items-center gap-md p-md rounded-xl bg-primary-fixed/30 border border-primary/20 text-left hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-primary icon-filled shrink-0">flag</span>
            <div className="flex-1 min-w-0">
              <p className="text-label-md text-primary uppercase tracking-wider">Linked Goal</p>
              <p className="text-body-sm text-on-surface truncate">{goal.title}</p>
            </div>
            <span className="text-title-md text-primary shrink-0">{pct}%</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0">chevron_right</span>
          </button>
        );
      })}
    </div>
  );
}
