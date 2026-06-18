import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../db/db";

function highlight(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

async function runSearch(q) {
  const query = q.trim().toLowerCase();
  if (!query) return null;

  const [tasks, goals, subjects, levels, courses, lessons, transactions] = await Promise.all([
    db.tasks.toArray(),
    db.goals.toArray(),
    db.subjects.toArray(),
    db.levels.toArray(),
    db.courses.toArray(),
    db.lessons.toArray(),
    db.transactions.toArray(),
  ]);

  const match = (str) => str?.toLowerCase().includes(query);

  return {
    tasks: tasks.filter((t) => match(t.title) || match(t.category) || match(t.note)).slice(0, 5),
    goals: goals.filter((g) => match(g.title)).slice(0, 5),
    lessons: lessons
      .filter((l) => match(l.name))
      .map((l) => {
        const course = courses.find((c) => c.id === l.courseId);
        const level = course ? levels.find((lv) => lv.id === course.levelId) : null;
        const subject = level ? subjects.find((s) => s.id === level.subjectId) : null;
        return { ...l, _course: course, _subject: subject };
      })
      .slice(0, 5),
    courses: courses
      .filter((c) => match(c.name))
      .map((c) => {
        const level = levels.find((lv) => lv.id === c.levelId);
        const subject = level ? subjects.find((s) => s.id === level.subjectId) : null;
        return { ...c, _subject: subject };
      })
      .slice(0, 4),
    transactions: transactions.filter((t) => match(t.category) || match(t.note)).slice(0, 4),
  };
}

export default function GlobalSearch({ onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await runSearch(query);
      setResults(r);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const go = (path) => { onClose(); navigate(path); };

  const hasResults = results && (
    results.tasks.length + results.goals.length +
    results.lessons.length + results.courses.length +
    results.transactions.length > 0
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background" onClick={onClose}>
      <div className="flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
        {/* Search bar */}
        <div className="flex items-center gap-md px-container_margin_mobile h-16 bg-surface border-b border-outline-variant shrink-0">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, goals, lessons..."
            className="flex-1 text-body-lg text-on-surface bg-transparent outline-none placeholder:text-outline"
          />
          {query ? (
            <button onClick={() => setQuery("")} className="text-on-surface-variant">
              <span className="material-symbols-outlined">close</span>
            </button>
          ) : (
            <button onClick={onClose} className="text-on-surface-variant">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-container_margin_mobile py-md space-y-lg">
          {!query && (
            <p className="text-center text-on-surface-variant text-body-sm pt-xl">
              Start typing to search across everything
            </p>
          )}

          {loading && (
            <div className="flex justify-center pt-xl">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && results && !hasResults && (
            <p className="text-center text-on-surface-variant text-body-sm pt-xl">
              No results for "{query}"
            </p>
          )}

          {!loading && results?.tasks.length > 0 && (
            <section className="space-y-xs">
              <p className="text-label-md text-on-surface-variant uppercase tracking-wider px-1">Tasks</p>
              {results.tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => go(`/tasks/${t.id}/edit`)}
                  className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-lowest border border-surface-variant/30 text-left hover:border-primary transition-colors"
                >
                  <span className={`material-symbols-outlined shrink-0 ${t.completed ? "text-tertiary" : "text-on-surface-variant"}`}>
                    {t.completed ? "task_alt" : "circle"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-body-sm truncate ${t.completed ? "line-through text-on-surface-variant" : "text-on-surface"}`}>
                      {highlight(t.title, query)}
                    </p>
                    {t.category && <p className="text-label-md text-on-surface-variant">{highlight(t.category, query)}</p>}
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0">chevron_right</span>
                </button>
              ))}
            </section>
          )}

          {!loading && results?.goals.length > 0 && (
            <section className="space-y-xs">
              <p className="text-label-md text-on-surface-variant uppercase tracking-wider px-1">Goals</p>
              {results.goals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => go("/goals")}
                  className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-lowest border border-surface-variant/30 text-left hover:border-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-primary shrink-0 icon-filled">flag</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-on-surface truncate">{highlight(g.title, query)}</p>
                    <p className="text-label-md text-on-surface-variant">{g.progress ?? 0}% complete</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0">chevron_right</span>
                </button>
              ))}
            </section>
          )}

          {!loading && (results?.courses.length > 0 || results?.lessons.length > 0) && (
            <section className="space-y-xs">
              <p className="text-label-md text-on-surface-variant uppercase tracking-wider px-1">Learning</p>
              {results.courses.map((c) => (
                <button
                  key={`course-${c.id}`}
                  onClick={() => go(`/learning/course/${c.id}`)}
                  className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-lowest border border-surface-variant/30 text-left hover:border-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-secondary shrink-0">menu_book</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-on-surface truncate">{highlight(c.name, query)}</p>
                    {c._subject && <p className="text-label-md text-on-surface-variant">{c._subject.name}</p>}
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0">chevron_right</span>
                </button>
              ))}
              {results.lessons.map((l) => (
                <button
                  key={`lesson-${l.id}`}
                  onClick={() => go(`/learning/lesson/${l.id}`)}
                  className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-lowest border border-surface-variant/30 text-left hover:border-primary transition-colors"
                >
                  <span className={`material-symbols-outlined shrink-0 ${
                    l.status === "completed" ? "text-tertiary" : l.status === "in_progress" ? "text-primary" : "text-on-surface-variant"
                  }`}>
                    {l.status === "completed" ? "check_circle" : l.status === "in_progress" ? "play_circle" : "radio_button_unchecked"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-on-surface truncate">{highlight(l.name, query)}</p>
                    <p className="text-label-md text-on-surface-variant truncate">
                      {[l._subject?.name, l._course?.name].filter(Boolean).join(" › ")}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0">chevron_right</span>
                </button>
              ))}
            </section>
          )}

          {!loading && results?.transactions.length > 0 && (
            <section className="space-y-xs">
              <p className="text-label-md text-on-surface-variant uppercase tracking-wider px-1">Transactions</p>
              {results.transactions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => go("/finance")}
                  className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-lowest border border-surface-variant/30 text-left hover:border-primary transition-colors"
                >
                  <span className={`material-symbols-outlined shrink-0 ${t.type === "income" ? "text-tertiary" : "text-error"}`}>
                    {t.type === "income" ? "arrow_downward" : "arrow_upward"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-on-surface truncate">
                      {highlight(t.category, query)}{t.note ? ` · ${highlight(t.note, query)}` : ""}
                    </p>
                    <p className="text-label-md text-on-surface-variant">{t.date}</p>
                  </div>
                  <span className={`text-title-md shrink-0 ${t.type === "income" ? "text-tertiary" : "text-error"}`}>
                    {t.type === "income" ? "+" : "-"}{t.amount}
                  </span>
                </button>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
