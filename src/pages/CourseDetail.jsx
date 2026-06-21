import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import BottomNav from "../components/BottomNav";
import LinkedGoalBadge from "../components/LinkedGoalBadge";
import { useLanguage } from "../utils/language";

const STATUS_STYLES = {
  completed: { icon: "check_circle", classes: "text-tertiary icon-filled" },
  in_progress: { icon: "pending", classes: "text-primary icon-filled" },
  not_started: { icon: "radio_button_unchecked", classes: "text-outline" },
};

const STATUS_LABELS = {
  completed: "Completed",
  in_progress: "In Progress",
  not_started: "Not Started",
};

export default function CourseDetail() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { id } = useParams();
  const courseId = Number(id);

  const course = useLiveQuery(() => db.courses.get(courseId), [courseId]);
  const level = useLiveQuery(
    () => (course ? db.levels.get(course.levelId) : null),
    [course?.levelId]
  );
  const subject = useLiveQuery(
    () => (level ? db.subjects.get(level.subjectId) : null),
    [level?.subjectId]
  );
  const lessons = useLiveQuery(
    () => db.lessons.where("courseId").equals(courseId).sortBy("order"),
    [courseId]
  ) || [];

  const completed = lessons.filter((l) => l.status === "completed").length;
  const pct = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const startEditingName = () => {
    setNameDraft(course.name);
    setEditingName(true);
  };

  const saveCourseName = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== course.name) {
      await db.courses.update(course.id, { name: trimmed });
    }
    setEditingName(false);
  };

  const deleteCourse = async () => {
    if (!confirm(`Delete course "${course.name}" and all its lessons? This cannot be undone.`)) return;
    await db.lessons.where("courseId").equals(courseId).delete();
    await db.courses.delete(courseId);
    navigate("/learning");
  };

  const deleteLesson = async (lesson) => {
    if (!confirm(`Delete lesson "${lesson.name}"?`)) return;
    await db.lessons.delete(lesson.id);
    await db.studySessions.where("lessonId").equals(lesson.id).delete();
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-fixed border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

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
        <button
          onClick={deleteCourse}
          aria-label="Delete course"
          className="p-2 -mr-2 rounded-full text-on-surface-variant hover:text-error hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-container_margin_mobile pt-4 flex flex-col gap-lg">
        {/* Course header */}
        <section className="bg-surface-container-lowest rounded-xl p-lg shadow-card border border-surface-variant/20">
          {subject && level && (
            <div className="flex items-center gap-xs mb-sm">
              <span className="px-3 py-1 bg-primary-fixed text-on-primary-fixed-variant rounded-full text-label-md">
                {subject.name}
              </span>
              <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-label-md">
                {level.name}
              </span>
            </div>
          )}
          {editingName ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCourseName()}
                className="flex-1 text-headline-lg-mobile text-on-surface bg-surface-container-low rounded-lg px-3 py-1 outline-none ring-2 ring-primary"
              />
              <button onClick={saveCourseName} aria-label="Save course name" className="text-on-primary bg-primary rounded-full p-1.5">
                <span className="material-symbols-outlined text-[20px]">check</span>
              </button>
              <button
                onClick={() => setEditingName(false)}
                aria-label="Cancel"
                className="text-on-surface-variant bg-surface-container-high rounded-full p-1.5"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-headline-lg-mobile text-on-surface">{course.name}</h1>
              <button onClick={startEditingName} aria-label="Edit course name" className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            </div>
          )}
          {course.description && (
            <p className="text-on-surface-variant text-body-sm mb-md">{course.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-label-md text-on-surface-variant">
              {completed}/{lessons.length} lessons completed
            </span>
            <span className="text-label-md text-primary">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mt-sm">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </section>

        <LinkedGoalBadge linkedType="course" linkedId={courseId} />

        {/* Lessons */}
        <section className="flex flex-col gap-md">
          <h3 className="text-title-md text-on-surface">{t("Lessons")}</h3>

          {lessons.length === 0 && (
            <div className="text-center py-lg text-on-surface-variant text-body-sm">
              No lessons in this course yet.
            </div>
          )}

          {lessons.map((lesson, idx) => {
            const status = STATUS_STYLES[lesson.status] || STATUS_STYLES.not_started;
            return (
              <div
                key={lesson.id}
                className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant/30 flex items-center gap-md hover:shadow-md transition-shadow duration-300"
              >
                <div
                  onClick={() => navigate(`/learning/lesson/${lesson.id}`)}
                  className="flex items-center gap-md flex-1 cursor-pointer min-w-0"
                >
                  <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-label-md text-on-surface-variant shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-on-surface text-[15px] font-semibold truncate">{lesson.name}</h4>
                    <p className="text-on-surface-variant text-label-md">{STATUS_LABELS[lesson.status] || "Not Started"}</p>
                  </div>
                  <span className={`material-symbols-outlined text-[22px] shrink-0 ${status.classes}`}>{status.icon}</span>
                </div>
                <button
                  onClick={() => deleteLesson(lesson)}
                  aria-label="Delete lesson"
                  className="text-on-surface-variant hover:text-error p-1 rounded-full transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            );
          })}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
