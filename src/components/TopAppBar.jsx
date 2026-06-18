import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import GlobalSearch from "./GlobalSearch";

export default function TopAppBar({
  title,
  subtitle,
  showBack = false,
  showProfile = false,
}) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const notifications = useLiveQuery(() => db.notifications.toArray(), []) || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-40 bg-surface flex justify-between items-center px-container_margin_mobile h-16">
        <div className="flex items-center gap-md">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200 -ml-2"
              aria-label="Back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          {showProfile && (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-fixed flex items-center justify-center border-2 border-primary-container">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-title-md text-primary leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-label-md text-on-surface-variant">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-xs">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200"
            aria-label="Search"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
          <button
            onClick={() => navigate("/settings/notifications")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface" />
            )}
          </button>
        </div>
      </header>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}
