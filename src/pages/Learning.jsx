import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import TopAppBar from "../components/TopAppBar";
import BottomNav from "../components/BottomNav";
import FAB from "../components/FAB";
import {
  AddLearningMenu,
  AddSubjectSheet,
  AddLevelSheet,
  AddCourseSheet,
  AddLessonSheet,
} from "../components/LearningForms";

export default function Learning() {
  const navigate = useNavigate();
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [activeLevelId, setActiveLevelId] = useState(null);
  const [activeSheet, setActiveSheet] = useState(null); // null | 'menu' | 'subject' | 'level' | 'course' | 'lesson'

  const activeSubject = subjects.find((s) => s.id === (activeSubjectId ?? subjects[0]?.id));

  const levels = useLiveQuery(
    () => (activeSubject ? db.levels.where("subjectId").equals(activeSubject.id).sortBy("order") : []),
    [activeSubject?.id]
  ) || [];

  const currentLevel = levels.find((l) => l.id === (activeLevelId ?? levels[0]?.id));

  const courses = useLiveQuery(
    () => (currentLevel ? db.courses.where("levelId").equals(currentLevel.id).sortBy("order") : []),
    [currentLevel?.id]
  ) || [];

  const allLessons = useLiveQuery(() => db.lessons.toArray(), []) || [];

  const courseProgress = (courseId) => {
    const lessons = allLessons.filter((l) => l.courseId === courseId);
    if (lessons.length === 0) return 0;
    const completed = lessons.filter((l) => l.status === "completed").length;
    return Math.round((completed / lessons.length) * 100);
  };

  const allLevelsForSubject = useLiveQuery(
    () => (activeSubject ? db.levels.where("subjectId").equals(activeSubject.id).toArray() : []),
    [activeSubject?.id]
  ) || [];
  const levelIds = allLevelsForSubject.map((l) => l.id);
  const allCoursesForSubject = useLiveQuery(
    () => (levelIds.length ? db.courses.where("levelId").anyOf(levelIds).toArray() : []),
    [JSON.stringify(levelIds)]
  ) || [];
  const lessonsForSubject = allLessons.filter((les) => allCoursesForSubject.some((c) => c.id === les.courseId));
  const totalLessons = lessonsForSubject.length;
  const completedLessons = lessonsForSubject.filter((l) => l.status === "completed").length;
  const overallPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (overallPct / 100) * circumference;

  const inProgressLesson = currentLevel
    ? allLessons.find((l) => l.status === "in_progress" && courses.some((c) => c.id === l.courseId))
    : null;
  const inProgressCourse = inProgressLesson ? courses.find((c) => c.id === inProgressLesson.courseId) : null;

  if (!activeSubject) {
    return (
      <div className="bg-background min-h-screen pb-24">
        <TopAppBar title="Knowledge Hub" showProfile />
        <main className="pt-24 px-container_margin_mobile text-center text-on-surface-variant">
          No subjects yet. Tap + to add your first subject.
        </main>
        <FAB onClick={() => setActiveSheet("menu")} />
        {activeSheet && (
          <LearningSheets activeSheet={activeSheet} setActiveSheet={setActiveSheet} />
        )}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface min-h-screen pb-32">
      <TopAppBar title="Knowledge Hub" showProfile rightIcon="notifications" onRightClick={() => navigate("/settings/notifications")} />

      <main className="px-container_margin_mobile pt-20 max-w-2xl mx-auto py-lg flex flex-col gap-xl">
        {subjects.length > 1 && (
          <div className="flex gap-sm overflow-x-auto no-scrollbar -mx-container_margin_mobile px-container_margin_mobile">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSubjectId(s.id);
                  setActiveLevelId(null);
                }}
                className={`px-lg py-2 rounded-full text-label-md whitespace-nowrap transition-all duration-200 ${
                  s.id === activeSubject.id
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <section className="bg-surface-container-lowest rounded-xl p-lg shadow-card border border-surface-variant/20 flex flex-col md:flex-row items-center gap-lg">
          <div className="relative flex items-center justify-center w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="text-surface-container stroke-current" cx="50" cy="50" fill="transparent" r="42" strokeWidth="8" />
              <circle
                className="text-primary stroke-current progress-ring-circle"
                cx="50"
                cy="50"
                fill="transparent"
                r="42"
                strokeLinecap="round"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-headline-lg text-primary">{overallPct}%</span>
              <span className="text-label-md text-on-surface-variant">TOTAL</span>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-xs px-3 py-1 bg-primary-fixed text-on-primary-fixed-variant rounded-full text-label-md mb-2">
              <span className="material-symbols-outlined text-[14px]">{activeSubject.icon}</span>
              {activeSubject.name}
            </div>
            <h2 className="text-headline-lg-mobile text-on-surface mb-1">{activeSubject.name}</h2>
            <p className="text-on-surface-variant text-body-sm">
              {totalLessons} lessons across {levels.length} levels.
            </p>
          </div>
        </section>

        <nav className="flex items-center gap-sm overflow-x-auto no-scrollbar -mx-container_margin_mobile px-container_margin_mobile">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => setActiveLevelId(level.id)}
              className={`px-lg py-2 rounded-full text-label-md transition-all duration-200 whitespace-nowrap ${
                level.id === (activeLevelId ?? levels[0]?.id)
                  ? "bg-primary-container text-on-primary-container shadow-sm"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {level.name}
            </button>
          ))}
        </nav>

        <section className="flex flex-col gap-md">
          <div className="flex justify-between items-end">
            <h3 className="text-title-md text-on-surface">Curriculum</h3>
          </div>

          {courses.length === 0 && (
            <div className="text-center py-lg text-on-surface-variant text-body-sm">
              No courses in this level yet.
            </div>
          )}

          {courses.map((course) => {
            const lessons = allLessons.filter((l) => l.courseId === course.id);
            const pct = courseProgress(course.id);
            return (
              <div
                key={course.id}
                onClick={() => {
                  const firstLesson = lessons[0];
                  if (firstLesson) navigate(`/learning/lesson/${firstLesson.id}`);
                }}
                className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant/30 flex items-start gap-md hover:shadow-md transition-shadow duration-300 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined">account_tree</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-on-surface text-[16px] font-semibold">{course.name}</h4>
                      <p className="text-on-surface-variant text-label-md">{lessons.length} lessons</p>
                    </div>
                    <span className="text-label-md text-primary">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant p-1">chevron_right</span>
              </div>
            );
          })}

          {inProgressLesson && (
            <div
              onClick={() => navigate(`/learning/lesson/${inProgressLesson.id}`)}
              className="mt-lg p-lg rounded-xl bg-primary-fixed relative overflow-hidden group cursor-pointer"
            >
              <div className="relative z-10 flex flex-col gap-sm">
                <h4 className="text-title-md text-on-primary-fixed-variant">Ready for a focus session?</h4>
                <p className="text-on-primary-fixed-variant opacity-80 text-body-sm max-w-[220px]">
                  {inProgressCourse?.name}: {inProgressLesson.name}
                </p>
                <button className="mt-base bg-primary text-on-primary text-label-md px-lg py-2 rounded-full w-max active:scale-95 transition-transform duration-200">
                  Resume Learning
                </button>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-[120px]">auto_awesome</span>
              </div>
            </div>
          )}
        </section>
      </main>

      <FAB onClick={() => setActiveSheet("menu")} />
      {activeSheet && (
        <LearningSheets activeSheet={activeSheet} setActiveSheet={setActiveSheet} />
      )}
      <BottomNav />
    </div>
  );
}

function LearningSheets({ activeSheet, setActiveSheet }) {
  const close = () => setActiveSheet(null);

  if (activeSheet === "menu") {
    return <AddLearningMenu onClose={close} onPick={(key) => setActiveSheet(key)} />;
  }
  if (activeSheet === "subject") return <AddSubjectSheet onClose={close} />;
  if (activeSheet === "level") return <AddLevelSheet onClose={close} />;
  if (activeSheet === "course") return <AddCourseSheet onClose={close} />;
  if (activeSheet === "lesson") return <AddLessonSheet onClose={close} />;
  return null;
}
