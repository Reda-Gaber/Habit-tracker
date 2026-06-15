import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSetting, setSetting } from "../db/db";
import BottomNav from "../components/BottomNav";

const STATUS_OPTIONS = [
  { key: "not_started", label: "Not Started", icon: "radio_button_unchecked", iconActive: "radio_button_checked" },
  { key: "in_progress", label: "In Progress", icon: "pending", iconActive: "pending" },
  { key: "completed", label: "Completed", icon: "check_circle", iconActive: "check_circle" },
];

const DURATION_PRESETS = [15, 25, 45, 60];

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
  const [durationMin, setDurationMin] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [customDuration, setCustomDuration] = useState("");
  const intervalRef = useRef(null);
  const timerKey = `timer_lesson_${lessonId}`;

  useEffect(() => {
    if (lesson) setNotes(lesson.notes || "");
  }, [lesson?.id]);

  // On mount: restore any in-flight timer from storage (survives reload/close)
  useEffect(() => {
    (async () => {
      const saved = await getSetting(timerKey, null);
      if (saved && saved.endTime) {
        const remainingMs = saved.endTime - Date.now();
        setDurationMin(saved.durationMin);
        if (remainingMs > 0) {
          setTimeLeft(Math.ceil(remainingMs / 1000));
          setIsRunning(true);
        } else {
          // Timer finished while app was closed
          setTimeLeft(saved.durationMin * 60);
          setIsRunning(false);
          await setSetting(timerKey, null);
          await logSessionDuration(saved.durationMin);
        }
      } else if (saved && typeof saved.remainingSec === "number") {
        // Paused state
        setDurationMin(saved.durationMin);
        setTimeLeft(saved.remainingSec);
      } else if (saved && saved.durationMin) {
        setDurationMin(saved.durationMin);
        setTimeLeft(saved.durationMin * 60);
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
      if (!saved || !saved.endTime) return;
      const remainingMs = saved.endTime - Date.now();
      if (remainingMs <= 0) {
        clearInterval(intervalRef.current);
        setIsRunning(false);
        setTimeLeft(durationMin * 60);
        await setSetting(timerKey, null);
        await logSessionDuration(saved.durationMin);
      } else {
        setTimeLeft(Math.ceil(remainingMs / 1000));
      }
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

  const saveNotes = async (val) => {
    setNotes(val);
    await db.lessons.update(lesson.id, { notes: val });
  };

  const toggleTimer = async () => {
    if (isRunning) {
      // Pause: persist remaining duration as a fresh "not started" state
      clearInterval(intervalRef.current);
      setIsRunning(false);
      await setSetting(timerKey, { durationMin, remainingSec: timeLeft, endTime: null });
    } else {
      const endTime = Date.now() + timeLeft * 1000;
      await setSetting(timerKey, { durationMin, endTime });
      setIsRunning(true);
    }
  };

  const resetTimer = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimeLeft(durationMin * 60);
    await setSetting(timerKey, null);
  };

  const selectDuration = async (mins) => {
    if (isRunning) return;
    setDurationMin(mins);
    setTimeLeft(mins * 60);
    setShowCustomDuration(false);
    await setSetting(timerKey, { durationMin: mins, endTime: null });
  };

  const applyCustomDuration = () => {
    const mins = parseInt(customDuration, 10);
    if (!mins || mins <= 0) return;
    const capped = Math.min(mins, 240);
    selectDuration(capped);
    setCustomDuration("");
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

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const display = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

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
            <h1 className="text-headline-lg-mobile text-white mb-2">{lesson.name}</h1>
            <div className="flex items-center gap-4 text-white/80">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span className="text-label-md">{durationMin} mins</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-lg">
          {/* Status toggle */}
          <div className="bg-white rounded-xl p-lg shadow-card border border-surface-container">
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
          <div className="bg-white rounded-xl p-lg shadow-card border border-surface-container flex items-center gap-lg">
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

          {/* Focus timer */}
          <div className="bg-white rounded-xl p-xl shadow-card border border-surface-container flex flex-col items-center justify-center text-center">
            <div className="mb-lg">
              <span className="material-symbols-outlined text-primary text-[48px] mb-2 icon-filled block">timer</span>
              <h2 className="text-headline-lg-mobile text-on-surface">Deep Work Session</h2>
              <p className="text-on-surface-variant text-body-lg">Focus on {lesson.name}</p>
            </div>
            <div className="text-display-lg mb-md text-primary tracking-tighter">{display}</div>

            {/* Duration picker */}
            <div className="w-full max-w-xs mb-lg">
              <div className="flex gap-sm justify-center mb-sm">
                {DURATION_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => selectDuration(mins)}
                    disabled={isRunning}
                    className={`px-md py-1.5 rounded-full text-label-md transition-all ${
                      durationMin === mins
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {mins}m
                  </button>
                ))}
                <button
                  onClick={() => !isRunning && setShowCustomDuration((v) => !v)}
                  disabled={isRunning}
                  className={`px-md py-1.5 rounded-full text-label-md transition-all ${
                    showCustomDuration || !DURATION_PRESETS.includes(durationMin)
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {!DURATION_PRESETS.includes(durationMin) ? `${durationMin}m` : "Custom"}
                </button>
              </div>
              {showCustomDuration && (
                <div className="flex gap-sm">
                  <input
                    type="number"
                    min="1"
                    max="240"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    placeholder="Minutes"
                    className="flex-1 px-md py-2 bg-surface-container-low border border-outline-variant rounded-xl text-body-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={applyCustomDuration}
                    className="px-lg py-2 bg-primary text-on-primary rounded-xl text-label-md"
                  >
                    Set
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-col w-full max-w-xs gap-md">
              <button
                onClick={toggleTimer}
                className="bg-secondary-container hover:bg-secondary text-white text-title-md py-lg px-xl rounded-full shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">{isRunning ? "pause" : "play_arrow"}</span>
                <span>{isRunning ? "Pause Session" : timeLeft < 25 * 60 ? "Resume Session" : "Start Study Session"}</span>
              </button>
              <button onClick={resetTimer} className="text-on-surface-variant text-label-md hover:underline">
                Reset Timer
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl p-lg shadow-card border border-surface-container">
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
