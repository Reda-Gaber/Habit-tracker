import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import BottomNav from "../components/BottomNav";

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtHours(mins) {
  const h = mins / 60;
  if (h < 1) return `${mins}m`;
  return `${h.toFixed(1)}h`;
}

export default function FocusTime() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({}); // { subjectId: bool, levelId: bool, courseId: bool }

  const sessions = useLiveQuery(() => db.studySessions.toArray(), []) || [];
  const lessons = useLiveQuery(() => db.lessons.toArray(), []) || [];
  const courses = useLiveQuery(() => db.courses.toArray(), []) || [];
  const levels = useLiveQuery(() => db.levels.toArray(), []) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Weekly comparison
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisWeekMin = sessions
    .filter((s) => new Date(s.date) >= thisWeekStart)
    .reduce((sum, s) => sum + (s.duration || 0), 0);
  const lastWeekMin = sessions
    .filter((s) => new Date(s.date) >= lastWeekStart && new Date(s.date) < thisWeekStart)
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  let weeklyChangeLabel = null;
  if (lastWeekMin > 0) {
    const pct = Math.round(((thisWeekMin - lastWeekMin) / lastWeekMin) * 100);
    weeklyChangeLabel = { pct, up: pct >= 0 };
  } else if (thisWeekMin > 0) {
    weeklyChangeLabel = { pct: 100, up: true };
  }

  // Per-lesson minutes
  const lessonMinutes = {};
  for (const s of sessions) {
    lessonMinutes[s.lessonId] = (lessonMinutes[s.lessonId] || 0) + (s.duration || 0);
  }

  // Build hierarchy: subject -> level -> course -> lessons (only items with time > 0)
  const breakdown = subjects
    .map((subject) => {
      const subjectLevels = levels
        .filter((l) => l.subjectId === subject.id)
        .map((level) => {
          const levelCourses = courses
            .filter((c) => c.levelId === level.id)
            .map((course) => {
              const courseLessons = lessons
                .filter((les) => les.courseId === course.id)
                .map((les) => ({ lesson: les, minutes: lessonMinutes[les.id] || 0 }))
                .filter((x) => x.minutes > 0)
                .sort((a, b) => b.minutes - a.minutes);
              const courseMin = courseLessons.reduce((sum, x) => sum + x.minutes, 0);
              return { course, minutes: courseMin, lessons: courseLessons };
            })
            .filter((c) => c.minutes > 0)
            .sort((a, b) => b.minutes - a.minutes);
          const levelMin = levelCourses.reduce((sum, c) => sum + c.minutes, 0);
          return { level, minutes: levelMin, courses: levelCourses };
        })
        .filter((l) => l.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes);
      const subjectMin = subjectLevels.reduce((sum, l) => sum + l.minutes, 0);
      return { subject, minutes: subjectMin, levels: subjectLevels };
    })
    .filter((s) => s.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

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
        <h1 className="text-title-md text-primary">Focus Time</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-2xl mx-auto px-container_margin_mobile pt-4 flex flex-col gap-lg">
        {/* Summary */}
        <section className="bg-primary-container rounded-xl p-lg text-on-primary-container">
          <p className="text-label-md opacity-80 uppercase tracking-widest mb-1">Total Focus Time</p>
          <p className="text-display-lg mb-sm">{fmtHours(totalMinutes)}</p>
          <div className="flex items-center justify-between text-body-sm">
            <span>This week: {fmtHours(thisWeekMin)}</span>
            {weeklyChangeLabel && (
              <span className={`flex items-center gap-1 ${weeklyChangeLabel.up ? "text-tertiary-fixed" : "text-secondary-fixed-dim"}`}>
                <span className="material-symbols-outlined text-[16px]">
                  {weeklyChangeLabel.up ? "trending_up" : "trending_down"}
                </span>
                {Math.abs(weeklyChangeLabel.pct)}% vs last week
              </span>
            )}
          </div>
        </section>

        {/* Hierarchical breakdown */}
        <section className="space-y-md">
          <h3 className="text-title-md text-on-surface">By Subject</h3>

          {breakdown.length === 0 && (
            <div className="text-center py-lg text-on-surface-variant text-body-sm">
              No study sessions logged yet. Start a study session from any lesson.
            </div>
          )}

          {breakdown.map(({ subject, minutes, levels: subjectLevels }) => {
            const subjectKey = `subject_${subject.id}`;
            const isOpen = expanded[subjectKey];
            return (
              <div key={subject.id} className="bg-surface-container-lowest rounded-xl border border-surface-variant/30 overflow-hidden">
                <button
                  onClick={() => toggle(subjectKey)}
                  className="w-full flex items-center justify-between p-md hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary">{subject.icon}</span>
                    <span className="text-body-lg font-semibold text-on-surface">{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <span className="text-label-md text-primary">{fmtHours(minutes)}</span>
                    <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${isOpen ? "rotate-180" : ""}`}>
                      expand_more
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-md pb-md space-y-sm">
                    {subjectLevels.map(({ level, minutes: levelMin, courses: levelCourses }) => {
                      const levelKey = `level_${level.id}`;
                      const levelOpen = expanded[levelKey];
                      return (
                        <div key={level.id} className="bg-surface-container-low rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggle(levelKey)}
                            className="w-full flex items-center justify-between p-sm pl-lg hover:bg-surface-container transition-colors"
                          >
                            <span className="text-label-md text-on-surface-variant uppercase tracking-wider">{level.name}</span>
                            <div className="flex items-center gap-sm">
                              <span className="text-label-md text-on-surface">{fmtHours(levelMin)}</span>
                              <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${levelOpen ? "rotate-180" : ""}`}>
                                expand_more
                              </span>
                            </div>
                          </button>

                          {levelOpen && (
                            <div className="px-sm pb-sm space-y-1">
                              {levelCourses.map(({ course, minutes: courseMin, lessons: courseLessons }) => {
                                const courseKey = `course_${course.id}`;
                                const courseOpen = expanded[courseKey];
                                return (
                                  <div key={course.id} className="bg-surface-container-lowest rounded-lg overflow-hidden">
                                    <button
                                      onClick={() => toggle(courseKey)}
                                      className="w-full flex items-center justify-between p-sm pl-lg hover:bg-surface-container-low transition-colors"
                                    >
                                      <span className="text-body-sm text-on-surface truncate pr-md">{course.name}</span>
                                      <div className="flex items-center gap-sm shrink-0">
                                        <span className="text-label-md text-on-surface-variant">{fmtHours(courseMin)}</span>
                                        <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform ${courseOpen ? "rotate-180" : ""}`}>
                                          expand_more
                                        </span>
                                      </div>
                                    </button>
                                    {courseOpen && (
                                      <div className="px-sm pb-sm space-y-1">
                                        {courseLessons.map(({ lesson, minutes: lessonMin }) => (
                                          <div
                                            key={lesson.id}
                                            onClick={() => navigate(`/learning/lesson/${lesson.id}`)}
                                            className="flex items-center justify-between py-1.5 pl-lg pr-sm rounded-md hover:bg-surface-container-low transition-colors cursor-pointer"
                                          >
                                            <span className="text-label-md text-on-surface-variant truncate pr-md">{lesson.name}</span>
                                            <span className="text-label-md text-on-surface-variant shrink-0">{fmtHours(lessonMin)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
