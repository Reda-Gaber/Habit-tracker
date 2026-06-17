import { useEffect, useState } from "react";
import { db, getSetting, setSetting } from "../db/db";
import { runNotificationEngine } from "../utils/notificationEngine";

const STYLES = {
  success: { bg: "bg-tertiary", text: "text-on-tertiary", icon: "check_circle" },
  danger: { bg: "bg-error", text: "text-on-error", icon: "error" },
  warning: { bg: "bg-secondary", text: "text-on-secondary", icon: "info" },
};

function Toast({ notification, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 20);
    const hide = setTimeout(() => setVisible(false), 2700);
    const done = setTimeout(onDone, 3100);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = STYLES[notification.type] || STYLES.warning;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-sm transition-all duration-300 pointer-events-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
      }`}
    >
      <div className={`${s.bg} ${s.text} rounded-xl shadow-lg px-lg py-md flex items-center gap-md`}>
        <span className="material-symbols-outlined icon-filled shrink-0">{s.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-body-lg font-semibold truncate">{notification.title}</p>
          <p className="text-body-sm opacity-90 truncate">{notification.message}</p>
        </div>
      </div>
    </div>
  );
}

export default function NotificationToastHost() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const checkForNew = async () => {
      await runNotificationEngine();
      const lastId = await getSetting("lastToastedNotificationId", 0);
      const fresh = await db.notifications.where("id").above(lastId).toArray();
      if (fresh.length > 0) {
        fresh.sort((a, b) => a.id - b.id);
        setQueue((q) => [...q, ...fresh]);
        await setSetting("lastToastedNotificationId", fresh[fresh.length - 1].id);
      }
    };

    checkForNew();
    const interval = setInterval(checkForNew, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const current = queue[0] || null;
  if (!current) return null;

  return <Toast key={current.id} notification={current} onDone={() => setQueue((q) => q.slice(1))} />;
}
