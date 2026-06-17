import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import TopAppBar from "../components/TopAppBar";
import BottomNav from "../components/BottomNav";
import FAB from "../components/FAB";
import LinkedGoalBadge from "../components/LinkedGoalBadge";
import {
  AddLearningMenu,
  AddSubjectSheet,
  AddLevelSheet,
  AddCourseSheet,
  AddLessonSheet,
} from "../components/LearningForms";

export default function Learning() {
  const navigate = useNavigate();
  const location = useLocation();
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];
  const [activeSubjectId, setActiveSubjectId] = useState(location.state?.subjectId ?? null);
  const [activeLevelId, setActiveLevelId] = useState(location.state?.levelId ?? null);
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

  const deleteSubject = async (subject) => {
    if (!confirm(`Delete "${subject.name}" and everything inside it (levels, courses, lessons)? This cannot be undone.`)) return;
    const subjLevels = await db.levels.where("subjectId").equals(subject.id).toArray();
    const subjLevelIds = subjLevels.map((l) => l.id);
    const subjCourses = subjLevelIds.length ? await db.courses.where("levelId").anyOf(subjLevelIds).toArray() : [];
    const subjCourseIds = subjCourses.map((c) => c.id);
    if (subjCourseIds.length) {
      await db.lessons.where("courseId").anyOf(subjCourseIds).delete();
      await db.courses.where("id").anyOf(subjCourseIds).delete();
    }
    if (subjLevelIds.length) {
      await db.levels.where("id").anyOf(subjLevelIds).delete();
    }
    await db.subjects.delete(subject.id);
    setActiveSubjectId(null);
    setActiveLevelId(null);
  };

  const deleteLevel = async (level) => {
    if (!confirm(`Delete level "${level.name}" and all its courses/lessons? This cannot be undone.`)) return;
    const levelCourses = await db.courses.where("levelId").equals(level.id).toArray();
    const levelCourseIds = levelCourses.map((c) => c.id);
    if (levelCourseIds.length) {
      await db.lessons.where("courseId").anyOf(levelCourseIds).delete();
      await db.courses.where("id").anyOf(levelCourseIds).delete();
    }
    await db.levels.delete(level.id);
    setActiveLevelId(null);
  };

  const deleteCourse = async (course) => {
    if (!confirm(`Delete course "${course.name}" and all its lessons? This cannot be undone.`)) return;
    await db.lessons.where("courseId").equals(course.id).delete();
    await db.courses.delete(course.id);
  };

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
      <TopAppBar title="Knowledge Hub" showProfile />

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
            <div className="flex items-center justify-center md:justify-start gap-sm mb-2">
              <div className="inline-flex items-center gap-xs px-3 py-1 bg-primary-fixed text-on-primary-fixed-variant rounded-full text-label-md">
                <span className="material-symbols-outlined text-[14px]">{activeSubject.icon}</span>
                {activeSubject.name}
              </div>
              <button
                onClick={() => deleteSubject(activeSubject)}
                aria-label="Delete subject"
                className="text-on-surface-variant hover:text-error p-1 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
            <h2 className="text-headline-lg-mobile text-on-surface mb-1">{activeSubject.name}</h2>
            <p className="text-on-surface-variant text-body-sm">
              {totalLessons} lessons across {levels.length} levels.
            </p>
          </div>
        </section>

        <LinkedGoalBadge linkedType="subject" linkedId={activeSubject.id} />

        <nav className="flex items-center gap-sm overflow-x-auto no-scrollbar -mx-container_margin_mobile px-container_margin_mobile">
          {levels.map((level) => {
            const isActive = level.id === (activeLevelId ?? levels[0]?.id);
            return (
              <div key={level.id} className="flex items-center">
                <button
                  onClick={() => setActiveLevelId(level.id)}
                  className={`px-lg py-2 rounded-full text-label-md transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "bg-primary-container text-on-primary-container shadow-sm rounded-r-none"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {level.name}
                </button>
                {isActive && (
                  <button
                    onClick={() => deleteLevel(level)}
                    aria-label="Delete level"
                    className="px-1.5 py-1 rounded-full rounded-l-none bg-primary-container text-on-primary-container hover:text-error transition-colors"
                  >
                    <span 
                    style={{ background: "#ad2929", borderRadius: "50%", padding: "3px" }}
                    className="material-symbols-outlined text-[14px]"
                    >
                      close</span>
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        {currentLevel && <LinkedGoalBadge linkedType="level" linkedId={currentLevel.id} />}

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
                onClick={() => navigate(`/learning/course/${course.id}`)}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCourse(course);
                  }}
                  aria-label="Delete course"
                  className="text-on-surface-variant hover:text-error p-1 -ml-1 rounded-full transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
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
