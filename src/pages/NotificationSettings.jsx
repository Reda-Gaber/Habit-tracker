import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSetting, setSetting, exportAllData, importAllData } from "../db/db";
import { requestNotificationPermission, getNotificationPermission } from "../utils/notifications";
import { useTheme } from "../utils/theme";

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? "bg-primary" : "bg-surface-variant"
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [habitReminders, setHabitReminders] = useState(true);
  const [taskAlerts, setTaskAlerts] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);
  const [summaryTime, setSummaryTime] = useState("08:00");
  const [editingTime, setEditingTime] = useState(false);
  const [permission, setPermission] = useState("default");
  const { mode, setThemeMode } = useTheme();
  const [backupStatus, setBackupStatus] = useState(null); // { type: 'success'|'error', message }
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      setHabitReminders(await getSetting("notifHabitReminders", true));
      setTaskAlerts(await getSetting("notifTaskDueAlerts", true));
      setDailySummary(await getSetting("notifDailySummary", true));
      setSummaryTime(await getSetting("notifDailySummaryTime", "08:00"));
      setPermission(getNotificationPermission());
    })();
  }, []);

  const update = async (key, value, setter) => {
    setter(value);
    await setSetting(key, value);
  };

  const enableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  };

  const formatTime = (t) => {
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${period}`;
  };

  const handleExport = async () => {
    try {
      const backup = await exportAllData();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `ritual-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus({ type: "success", message: "Backup file downloaded." });
    } catch {
      setBackupStatus({ type: "error", message: "Could not create backup file." });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Importing will replace ALL current data with the contents of this file. Continue?")) {
      e.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await importAllData(json);
      setBackupStatus({ type: "success", message: "Data restored successfully. Reloading..." });
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setBackupStatus({ type: "error", message: "Invalid or corrupted backup file." });
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col items-center">
      <header className="bg-surface sticky top-0 z-40 flex justify-between items-center w-full max-w-md px-container_margin_mobile h-16">
        <div className="flex items-center gap-md">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="material-symbols-outlined text-on-surface-variant p-2 rounded-full hover:bg-surface-container-low active:scale-95 transition-transform"
          >
            arrow_back
          </button>
          <h1 className="text-title-md text-primary">Settings</h1>
        </div>
      </header>

      <main className="w-full max-w-md px-container_margin_mobile py-lg flex-1">
        <div className="relative w-full h-32 mb-xl rounded-xl overflow-hidden shadow-sm bg-primary-container flex items-center px-lg">
          <div className="relative z-10">
            <h2 className="text-on-primary-container text-title-md">Preferences</h2>
            <p className="text-on-primary-container/80 text-body-sm">Tailor your daily notification ritual</p>
          </div>
        </div>

        {permission !== "granted" && (
          <div className="mb-lg bg-secondary-fixed/30 rounded-xl p-md flex items-center justify-between gap-md">
            <div className="flex items-center gap-md">
              <span className="material-symbols-outlined text-secondary">notifications_active</span>
              <div>
                <p className="text-body-lg text-on-secondary-fixed">
                  {permission === "denied" ? "Notifications blocked" : "Enable notifications"}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {permission === "denied"
                    ? "Allow notifications in your browser settings to receive reminders."
                    : "Allow alerts so reminders can reach you."}
                </p>
              </div>
            </div>
            {permission !== "denied" && (
              <button
                onClick={enableNotifications}
                className="px-lg py-sm bg-primary text-on-primary rounded-full text-label-md active:scale-95 transition-transform shrink-0"
              >
                Enable
              </button>
            )}
          </div>
        )}

        <section className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
          <div className="px-md pt-lg pb-sm">
            <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Alerts &amp; Reminders</span>
          </div>
          <ul className="divide-y divide-surface-variant">
            <li className="flex items-center justify-between p-md hover:bg-surface-container-low transition-colors duration-200">
              <div className="flex flex-col">
                <span className="text-body-lg text-on-surface">Daily Digest</span>
                <span className="text-body-sm text-on-surface-variant">A summary of your planned activities</span>
              </div>
              <Toggle checked={dailySummary} onChange={(v) => update("notifDailySummary", v, setDailySummary)} />
            </li>
            <li className="flex items-center justify-between p-md hover:bg-surface-container-low transition-colors duration-200">
              <div className="flex flex-col">
                <span className="text-body-lg text-on-surface">Habit Reminders</span>
                <span className="text-body-sm text-on-surface-variant">Gentle nudges for your daily rituals</span>
              </div>
              <Toggle checked={habitReminders} onChange={(v) => update("notifHabitReminders", v, setHabitReminders)} />
            </li>
            <li className="flex items-center justify-between p-md hover:bg-surface-container-low transition-colors duration-200">
              <div className="flex flex-col">
                <span className="text-body-lg text-on-surface">Task Deadlines</span>
                <span className="text-body-sm text-on-surface-variant">Alerts when assignments are due</span>
              </div>
              <Toggle checked={taskAlerts} onChange={(v) => update("notifTaskDueAlerts", v, setTaskAlerts)} />
            </li>
          </ul>
        </section>

        <section className="mt-xl">
          <div className="px-md mb-sm">
            <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Scheduled Briefing</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-card p-md flex items-center justify-between border border-surface-variant">
            <div className="flex items-center gap-md">
              <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">light_mode</span>
              </div>
              <div>
                <p className="text-body-lg text-on-surface">Morning Briefing</p>
                <p className="text-body-sm text-on-surface-variant">Daily at {formatTime(summaryTime)}</p>
              </div>
            </div>
            <button
              onClick={() => setEditingTime((v) => !v)}
              className="px-lg py-sm bg-primary-container text-on-primary-container rounded-full text-label-md active:scale-95 transition-transform"
            >
              Edit Time
            </button>
          </div>

          {editingTime && (
            <div className="mt-md p-lg bg-surface-container-lowest rounded-xl border border-primary/10 shadow-lg">
              <div className="flex flex-col items-center gap-md">
                <input
                  type="time"
                  value={summaryTime}
                  onChange={(e) => setSummaryTime(e.target.value)}
                  className="text-display-lg text-primary bg-transparent outline-none text-center"
                />
                <div className="flex gap-md w-full">
                  <button
                    onClick={() => setEditingTime(false)}
                    className="flex-1 py-base border border-outline text-on-surface-variant rounded-full text-label-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await setSetting("notifDailySummaryTime", summaryTime);
                      setEditingTime(false);
                    }}
                    className="flex-1 py-base bg-primary text-on-primary rounded-full text-label-md"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Appearance */}
        <section className="mt-xl">
          <div className="px-md mb-sm">
            <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Appearance</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-card p-md flex items-center gap-sm">
            {[
              { key: "light", label: "Light", icon: "light_mode" },
              { key: "dark", label: "Dark", icon: "dark_mode" },
              { key: "system", label: "System", icon: "settings_suggest" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setThemeMode(opt.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-md rounded-xl transition-all ${
                  mode === opt.key
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined">{opt.icon}</span>
                <span className="text-label-md">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Data Backup */}
        <section className="mt-xl mb-xl">
          <div className="px-md mb-sm">
            <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Data Backup</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-between p-md hover:bg-surface-container-low transition-colors duration-200"
            >
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">download</span>
                </div>
                <div className="text-left">
                  <p className="text-body-lg text-on-surface">Export data</p>
                  <p className="text-body-sm text-on-surface-variant">Save all your data as a JSON file</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
            <div className="border-t border-surface-variant">
              <button
                onClick={handleImportClick}
                className="w-full flex items-center justify-between p-md hover:bg-surface-container-low transition-colors duration-200"
              >
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 bg-secondary-fixed rounded-xl flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined">upload</span>
                  </div>
                  <div className="text-left">
                    <p className="text-body-lg text-on-surface">Import data</p>
                    <p className="text-body-sm text-on-surface-variant">Restore from a JSON backup file</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          {backupStatus && (
            <p className={`mt-sm px-md text-body-sm ${backupStatus.type === "success" ? "text-tertiary" : "text-error"}`}>
              {backupStatus.message}
            </p>
          )}
          <p className="mt-sm px-md text-label-md text-on-surface-variant">
            Importing replaces all current data on this device. Export a backup first if you're unsure.
          </p>
        </section>
      </main>
    </div>
  );
}
