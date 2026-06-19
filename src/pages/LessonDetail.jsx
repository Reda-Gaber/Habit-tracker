import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSetting, setSetting } from "../db/db";
import BottomNav from "../components/BottomNav";
import LinkedGoalBadge from "../components/LinkedGoalBadge";

const STATUS_OPTIONS = [
  { key: "not_started", label: "Not Started", icon: "radio_button_unchecked", iconActive: "radio_button_checked" },
  { key: "in_progress", label: "In Progress", icon: "pending", iconActive: "pending" },
  { key: "completed", label: "Completed", icon: "check_circle", iconActive: "check_circle" },
];

export default function LessonDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const lessonId = Number(id);

  const lesson = useLiveQuery(() => db.lessons.get(lessonId), [lessonId]);
  const course = useLiveQuery(
    () => (lesson ? db.courses.get(lesson.courseId) : null),
    [lesson?.courseId]
  );
  const allLessonsInCourse = useLiveQuery(
    () => (lesson ? db.lessons.where("courseId").equals(lesson.courseId).toArray() : []),
    [lesson?.courseId]
  ) || [];

  const [notes, setNotes] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const intervalRef = useRef(null);
  const timerKey = `stopwatch_lesson_${lessonId}`;

  useEffect(() => {
    if (lesson) setNotes(lesson.notes || "");
  }, [lesson?.id]);

  // On mount: restore any in-flight stopwatch from storage (survives reload/close)
  useEffect(() => {
    (async () => {
      const saved = await getSetting(timerKey, null);
      if (saved && saved.startTime) {
        // Running: elapsed = accumulated (paused time) + time since startTime
        const elapsed = (saved.accumulatedSec || 0) + Math.floor((Date.now() - saved.startTime) / 1000);
        setElapsedSec(elapsed);
        setIsRunning(true);
      } else if (saved && typeof saved.accumulatedSec === "number") {
        // Paused: just show accumulated time
        setElapsedSec(saved.accumulatedSec);
        setIsRunning(false);
      } else {
        setElapsedSec(0);
        setIsRunning(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Tick loop while running
  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(async () => {
      const saved = await getSetting(timerKey, null);
      if (!saved || !saved.startTime) return;
      const elapsed = (saved.accumulatedSec || 0) + Math.floor((Date.now() - saved.startTime) / 1000);
      setElapsedSec(elapsed);
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  if (!lesson || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-fixed border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const courseLessonsTotal = allLessonsInCourse.length;
  const courseLessonsDone = allLessonsInCourse.filter((l) => l.status === "completed").length;
  const coursePct = courseLessonsTotal ? Math.round((courseLessonsDone / courseLessonsTotal) * 100) : 0;
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (coursePct / 100) * circumference;

  const setStatus = async (status) => {
    await db.lessons.update(lesson.id, {
      status,
      completedAt: status === "completed" ? Date.now() : lesson.completedAt,
    });
  };

  const startEditingName = () => {
    setNameDraft(lesson.name);
    setEditingName(true);
  };

  const saveLessonName = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== lesson.name) {
      await db.lessons.update(lesson.id, { name: trimmed });
    }
    setEditingName(false);
  };

  const saveNotes = async (val) => {
    setNotes(val);
    await db.lessons.update(lesson.id, { notes: val });
  };

  const startStopwatch = async () => {
    await setSetting(timerKey, { startTime: Date.now(), accumulatedSec: elapsedSec });
    setIsRunning(true);
  };

  const pauseStopwatch = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    await setSetting(timerKey, { startTime: null, accumulatedSec: elapsedSec });
  };

  const stopAndSave = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    const totalSec = elapsedSec;
    await setSetting(timerKey, null);
    setElapsedSec(0);
    if (totalSec >= 60) {
      await logSessionDuration(Math.round(totalSec / 60));
    }
  };

  const discardSession = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setElapsedSec(0);
    await setSetting(timerKey, null);
  };

  const logSessionDuration = async (mins) => {
    await db.studySessions.add({
      lessonId: lesson.id,
      duration: mins,
      date: new Date().toISOString().split("T")[0],
    });
    const current = await db.lessons.get(lesson.id);
    if (current && current.status === "not_started") {
      await db.lessons.update(lesson.id, { status: "in_progress" });
    }
  };

  const hours = Math.floor(elapsedSec / 3600);
  const minutes = Math.floor((elapsedSec % 3600) / 60);
  const seconds = elapsedSec % 60;
  const display = hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="bg-background text-on-background font-body-lg min-h-screen pb-24">
      {/* Back header */}
      <header className="bg-surface sticky top-0 z-40 flex justify-between items-center w-full px-container_margin_mobile h-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 p-2 -ml-2 rounded-full"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-label-md">Back to Course</span>
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-container_margin_mobile pt-4 flex flex-col gap-xl">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl h-48 flex flex-col justify-end p-lg bg-gradient-to-br from-primary to-on-primary-fixed-variant">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="relative z-10">
            <span className="bg-primary-container text-on-primary-container text-label-md px-3 py-1 rounded-full mb-2 inline-block">
              {course.name}
            </span>
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveLessonName()}
                  className="flex-1 text-headline-lg-mobile text-on-surface bg-surface rounded-lg px-3 py-1 outline-none ring-2 ring-primary"
                />
                <button onClick={saveLessonName} aria-label="Save lesson name" className="text-white bg-primary rounded-full p-1.5">
                  <span className="material-symbols-outlined text-[20px]">check</span>
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  aria-label="Cancel"
                  className="text-white bg-black/30 rounded-full p-1.5"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-headline-lg-mobile text-white">{lesson.name}</h1>
                <button onClick={startEditingName} aria-label="Edit lesson name" className="text-white/80 hover:text-white">
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
              </div>
            )}
            <div className="flex items-center gap-4 text-white/80">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">timer</span>
                <span className="text-label-md">Stopwatch session</span>
              </div>
            </div>
          </div>
        </section>

        <LinkedGoalBadge linkedType="lesson" linkedId={lesson.id} />

        <div className="grid grid-cols-1 gap-lg">
          {/* Status toggle */}
          <div className="bg-surface-container-lowest rounded-xl p-lg shadow-card border border-surface-container">
            <h3 className="text-title-md mb-md text-on-surface">Lesson Status</h3>
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const active = lesson.status === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setStatus(opt.key)}
                    className={`w-full flex items-center justify-between p-md rounded-lg transition-colors ${
                      active
                        ? "border-2 border-primary bg-primary-container/10 text-on-primary-fixed-variant"
                        : "border border-outline-variant hover:bg-surface-container text-on-surface"
                    }`}
                  >
                    <span className="text-label-md">{opt.label}</span>
                    <span className={`material-symbols-outlined text-[20px] ${active ? "icon-filled" : ""}`}>
                      {active ? opt.iconActive : opt.icon}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Course progress mini card */}
          <div className="bg-surface-container-lowest rounded-xl p-lg shadow-card border border-surface-container flex items-center gap-lg">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-surface-container-high" cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" strokeWidth="6" />
                <circle
                  className="text-primary"
                  cx="32"
                  cy="32"
                  fill="transparent"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-label-md text-on-surface-variant">
                {coursePct}%
              </div>
            </div>
            <div>
              <p className="text-label-md text-on-surface-variant">Course Progress</p>
              <p className="text-title-md text-primary">
                {coursePct === 100 ? "Course complete!" : coursePct >= 50 ? "Almost there!" : "Keep going!"}
              </p>
            </div>
          </div>

          {/* Stopwatch */}
          <div className="bg-surface-container-lowest rounded-xl p-xl shadow-card border border-surface-container flex flex-col items-center justify-center text-center">
            <div className="mb-lg">
              <span className={`material-symbols-outlined text-primary text-[48px] mb-2 block ${isRunning ? "icon-filled" : ""}`}>timer</span>
              <h2 className="text-headline-lg-mobile text-on-surface">Study Session</h2>
              <p className="text-on-surface-variant text-body-lg">Focus on {lesson.name}</p>
            </div>
            <div className="text-display-lg mb-xl text-primary tracking-tighter tabular-nums">{display}</div>

            <div className="flex flex-col w-full max-w-xs gap-md">
              {!isRunning && elapsedSec === 0 && (
                <button
                  onClick={startStopwatch}
                  className="bg-secondary-container hover:bg-secondary text-white text-title-md py-lg px-xl rounded-full shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                  <span>Start Studying</span>
                </button>
              )}

              {isRunning && (
                <button
                  onClick={pauseStopwatch}
                  className="bg-secondary-container hover:bg-secondary text-white text-title-md py-lg px-xl rounded-full shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">pause</span>
                  <span>Pause</span>
                </button>
              )}

              {!isRunning && elapsedSec > 0 && (
                <>
                  <button
                    onClick={startStopwatch}
                    className="border-2 border-primary text-primary text-title-md py-lg px-xl rounded-full active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">play_arrow</span>
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={stopAndSave}
                    className="bg-primary text-on-primary text-title-md py-lg px-xl rounded-full shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined icon-filled">check_circle</span>
                    <span>Stop &amp; Save</span>
                  </button>
                  <button onClick={discardSession} className="text-on-surface-variant text-label-md hover:underline">
                    Discard
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-surface-container-lowest rounded-xl p-lg shadow-card border border-surface-container">
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-title-md text-on-surface">Study Notes</h3>
              <span className="material-symbols-outlined text-on-surface-variant">edit</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => saveNotes(e.target.value)}
              className="w-full h-40 bg-surface-container-low border-none rounded-xl p-md text-body-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary transition-all resize-none"
              placeholder="Key takeaways from the session..."
            />
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
