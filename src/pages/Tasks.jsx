import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import TopAppBar from "../components/TopAppBar";
import BottomNav from "../components/BottomNav";
import FAB from "../components/FAB";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const PRIORITY_STYLES = {
  high: "bg-error-container text-on-error-container",
  medium: "bg-secondary-fixed text-on-secondary-fixed-variant",
  low: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
};

const CATEGORY_ICONS = {
  Work: "work",
  Personal: "person",
  Health: "favorite",
  Learning: "school",
  Habits: "auto_awesome",
};

function formatDueDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date(todayStr());
  const diffDays = Math.round((date - today) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

export default function Tasks() {
  const navigate = useNavigate();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];

  const todayKey = todayStr();
  const todayTasks = tasks.filter((t) => t.dueDate === todayKey || (t.dueDate < todayKey && !t.completed));
  const upcomingTasks = tasks
    .filter((t) => t.dueDate > todayKey)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));

  const toggleComplete = async (task) => {
    await db.tasks.update(task.id, { completed: !task.completed });
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <TopAppBar title="Task Manager" showProfile rightIcon="notifications" onRightClick={() => navigate("/settings/notifications")} />

      <main className="flex-grow pt-24 pb-32 px-container_margin_mobile max-w-2xl mx-auto w-full">
        {/* Today Section */}
        <section className="mb-xl">
          <div className="flex justify-between items-end mb-md">
            <h2 className="text-headline-lg-mobile text-on-surface">Today</h2>
            <span className="text-label-md text-on-surface-variant mb-1">
              {todayTasks.length} task{todayTasks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-md">
            {todayTasks.length === 0 && (
              <div className="text-center py-lg text-on-surface-variant text-body-sm">
                Nothing due today. Enjoy the calm!
              </div>
            )}
            {todayTasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={() => toggleComplete(task)} onClick={() => navigate(`/tasks/${task.id}/edit`)} />
            ))}
          </div>
        </section>

        {/* Upcoming Section */}
        <section>
          <div className="flex justify-between items-end mb-md">
            <h2 className="text-headline-lg-mobile text-on-surface">Upcoming</h2>
            <span className="text-label-md text-on-surface-variant mb-1">
              {upcomingTasks.length} task{upcomingTasks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-md">
            {upcomingTasks.length === 0 && (
              <div className="text-center py-lg text-on-surface-variant text-body-sm">
                No upcoming tasks scheduled.
              </div>
            )}
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}/edit`)}
                className="bg-surface-container-low border border-transparent p-md flex items-center gap-md rounded-xl hover:bg-surface-container transition-colors duration-200 cursor-pointer"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-fixed">
                    {CATEGORY_ICONS[task.category] || "library_books"}
                  </span>
                </div>
                <div className="flex-grow">
                  <h3 className="text-body-lg text-on-surface">{task.title}</h3>
                  <p className="text-label-md text-on-surface-variant">
                    {formatDueDate(task.dueDate)}
                    {task.hasDueTime && task.dueTime && ` • ${formatTime(task.dueTime)}`}
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant opacity-40">
                  chevron_right
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <FAB onClick={() => navigate("/tasks/new")} />
      <BottomNav />
    </div>
  );
}

function TaskCard({ task, onToggle, onClick }) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className={`bg-surface-container-lowest border border-outline-variant p-md flex items-center gap-md shadow-card rounded-xl ${
          task.completed ? "opacity-60" : ""
        }`}
      >
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={onToggle}
            className="w-6 h-6 rounded-lg border-2 border-primary text-primary focus:ring-primary-container transition-all cursor-pointer accent-primary"
          />
        </div>
        <div className="flex-grow cursor-pointer" onClick={onClick}>
          <h3 className={`text-body-lg text-on-surface ${task.completed ? "line-through" : "font-semibold"}`}>
            {task.title}
          </h3>
          <div className="flex items-center gap-sm mt-xs flex-wrap">
            <span className="material-symbols-outlined text-sm text-on-surface-variant scale-75">
              {CATEGORY_ICONS[task.category] || "label"}
            </span>
            <span className="text-label-md text-on-surface-variant">{task.category}</span>
            {task.priority && (
              <>
                <div className="w-1 h-1 rounded-full bg-outline-variant mx-1" />
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${PRIORITY_STYLES[task.priority]}`}>
                  {task.priority}
                </span>
              </>
            )}
            {task.hasDueTime && task.dueTime && (
              <>
                <div className="w-1 h-1 rounded-full bg-outline-variant mx-1" />
                <span className="text-label-md text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {formatTime(task.dueTime)}
                </span>
              </>
            )}
            {task.dueDate < todayStr() && !task.completed && (
              <span className="text-label-md text-error">• {formatDueDate(task.dueDate)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
