import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import BottomNav from "../components/BottomNav";
import FAB from "../components/FAB";
import { useLanguage } from "../utils/language";

const MOODS = [
  { key: "great", emoji: "😄", label: "Great" },
  { key: "good", emoji: "🙂", label: "Good" },
  { key: "okay", emoji: "😐", label: "Okay" },
  { key: "bad", emoji: "🙁", label: "Bad" },
  { key: "awful", emoji: "😣", label: "Awful" },
];

function moodEmoji(key) {
  return MOODS.find((m) => m.key === key)?.emoji || "📝";
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(dateStr, t = (s) => s) {
  const d = new Date(dateStr);
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return t("Today");
  if (dateStr === yesterday) return t("Yesterday");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function Journal() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const entries = useLiveQuery(() => db.journalEntries.toArray(), []) || [];
  const [activeEntry, setActiveEntry] = useState(null); // null | "new" | entry object

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const todayEntry = sorted.find((e) => e.date === todayStr());

  const moodCounts = MOODS.map((m) => ({ ...m, count: entries.filter((e) => e.mood === m.key).length }));
  const totalEntries = entries.length;

  const deleteEntry = async (entry) => {
    if (!confirm("Delete this journal entry?")) return;
    await db.journalEntries.delete(entry.id);
  };

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
        <h1 className="text-title-md text-primary">{t("Journal")}</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-2xl mx-auto px-container_margin_mobile pt-4 flex flex-col gap-lg">
        {totalEntries > 0 && (
          <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant shadow-card">
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider mb-md">{t("Mood Overview")}</p>
            <div className="flex justify-between">
              {moodCounts.map((m) => (
                <div key={m.key} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-label-md text-on-surface-variant">{m.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {!todayEntry && (
          <button
            onClick={() => setActiveEntry("new")}
            className="w-full h-16 bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center gap-sm text-on-surface-variant hover:border-primary hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined">edit_note</span>
            <span className="text-title-md">{t("Write today's entry")}</span>
          </button>
        )}

        {sorted.length === 0 && (
          <div className="text-center py-xl text-on-surface-variant text-body-sm">
            {t("No journal entries yet. Tap above to write your first one.")}
          </div>
        )}

        <section className="space-y-md">
          {sorted.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setActiveEntry(entry)}
              className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant/30 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-md mb-sm">
                <div className="flex items-center gap-sm">
                  <span className="text-2xl shrink-0">{moodEmoji(entry.mood)}</span>
                  <p className="text-body-sm text-on-surface font-semibold">{formatDateLabel(entry.date, t)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEntry(entry);
                  }}
                  aria-label="Delete entry"
                  className="text-on-surface-variant hover:text-error p-1 rounded-full transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <p className="text-body-sm text-on-surface-variant line-clamp-3">{entry.text}</p>
            </div>
          ))}
        </section>
      </main>

      <FAB onClick={() => setActiveEntry("new")} />

      {activeEntry && (
        <EntrySheet entry={activeEntry === "new" ? null : activeEntry} onClose={() => setActiveEntry(null)} />
      )}

      <BottomNav />
    </div>
  );
}

function EntrySheet({ entry, onClose }) {
  const { t } = useLanguage();
  const isEdit = !!entry;
  const [mood, setMood] = useState(entry?.mood || "good");
  const [text, setText] = useState(entry?.text || "");
  const [date] = useState(entry?.date || todayStr());

  const save = async () => {
    if (!text.trim()) return;
    if (isEdit) {
      await db.journalEntries.update(entry.id, { mood, text: text.trim() });
    } else {
      await db.journalEntries.add({ date, mood, text: text.trim(), createdAt: Date.now() });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface rounded-t-2xl p-lg pb-xl space-y-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-md" />
        <h3 className="text-title-md text-on-surface">{isEdit ? formatDateLabel(entry.date, t) : t("Today's Entry")}</h3>

        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">{t("How was it?")}</label>
          <div className="flex justify-between">
            {MOODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMood(m.key)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  mood === m.key ? "bg-primary-container scale-110" : "hover:bg-surface-container-low"
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-label-md text-on-surface-variant">{t(m.label)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">{t("What happened?")}</label>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("Write about your day...")}
            rows={6}
            className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none resize-none"
          />
        </div>

        <button
          onClick={save}
          className="w-full py-4 px-lg rounded-full text-title-md text-on-primary bg-primary active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-lg"
        >
          <span className="material-symbols-outlined icon-filled">check_circle</span>
          {isEdit ? t("Save Changes") : t("Save Entry")}
        </button>
      </div>
    </div>
  );
}
