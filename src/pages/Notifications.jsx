import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import BottomNav from "../components/BottomNav";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "success", label: "Achievements" },
  { key: "warning", label: "Reminders" },
  { key: "danger", label: "Alerts" },
];

function relativeTime(ts) {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function typeStyles(type) {
  if (type === "success") {
    return { bg: "bg-tertiary-fixed/30", border: "border-tertiary/30", icon: "check_circle", iconColor: "text-tertiary" };
  }
  if (type === "danger") {
    return { bg: "bg-error-container/40", border: "border-error/30", icon: "error", iconColor: "text-error" };
  }
  return { bg: "bg-secondary-fixed/30", border: "border-secondary/30", icon: "info", iconColor: "text-secondary" };
}

export default function Notifications() {
  const navigate = useNavigate();
  const notifications = useLiveQuery(() => db.notifications.toArray(), []) || [];
  const [filter, setFilter] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  const sorted = [...notifications].sort((a, b) => b.createdAt - a.createdAt);
  const filtered = sorted.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  const toggleRead = async (n) => {
    await db.notifications.update(n.id, { read: !n.read });
  };

  const deleteOne = async (n) => {
    await db.notifications.delete(n.id);
  };

  const deleteAllShown = async () => {
    if (filtered.length === 0) return;
    if (!confirm(`Delete ${filtered.length} notification${filtered.length !== 1 ? "s" : ""}?`)) return;
    await db.notifications.bulkDelete(filtered.map((n) => n.id));
  };

  const activeFilterLabel = FILTERS.find((f) => f.key === filter)?.label;

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
        <h1 className="text-title-md text-primary">Notifications</h1>
        <div className="flex items-center gap-xs">
          <button
            onClick={() => setShowFilter(true)}
            aria-label="Filter notifications"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">filter_list</span>
          </button>
          <button
            onClick={deleteAllShown}
            aria-label="Delete all shown notifications"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant hover:text-error"
          >
            <span className="material-symbols-outlined">delete_sweep</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-container_margin_mobile pt-4 flex flex-col gap-md">
        {filter !== "all" && (
          <button
            onClick={() => setFilter("all")}
            className="self-start px-md py-1.5 rounded-full bg-primary-container text-on-primary-container text-label-md flex items-center gap-1"
          >
            {activeFilterLabel}
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-2xl text-on-surface-variant text-body-sm">
            {notifications.length === 0 ? "No notifications yet." : "Nothing here for this filter."}
          </div>
        )}

        {filtered.map((n) => {
          const s = typeStyles(n.type);
          return (
            <div
              key={n.id}
              className={`rounded-xl border p-md flex items-start gap-md transition-opacity ${s.bg} ${s.border} ${n.read ? "opacity-60" : ""}`}
            >
              <span className={`material-symbols-outlined icon-filled shrink-0 ${s.iconColor}`}>{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-body-lg text-on-surface font-semibold">{n.title}</p>
                <p className="text-body-sm text-on-surface-variant">{n.message}</p>
                <p className="text-label-md text-on-surface-variant mt-1">{relativeTime(n.createdAt)}</p>
              </div>
              <div className="flex flex-col gap-sm shrink-0">
                <button
                  onClick={() => toggleRead(n)}
                  aria-label={n.read ? "Mark as unread" : "Mark as read"}
                  className="text-on-surface-variant hover:text-primary p-1 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {n.read ? "mark_email_unread" : "mark_email_read"}
                  </span>
                </button>
                <button
                  onClick={() => deleteOne(n)}
                  aria-label="Delete notification"
                  className="text-on-surface-variant hover:text-error p-1 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {showFilter && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={() => setShowFilter(false)}>
          <div className="w-full max-w-md bg-surface rounded-t-2xl p-lg pb-xl space-y-md" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-md" />
            <h3 className="text-title-md text-on-surface">Filter Notifications</h3>
            <div className="flex flex-col gap-sm">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setFilter(f.key);
                    setShowFilter(false);
                  }}
                  className={`w-full flex items-center justify-between p-md rounded-xl transition-colors ${
                    filter === f.key
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span className="text-body-lg">{f.label}</span>
                  {filter === f.key && <span className="material-symbols-outlined">check</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
