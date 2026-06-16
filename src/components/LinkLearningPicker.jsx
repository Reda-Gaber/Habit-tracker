import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { getLinkTypeLabel, getLinkedGoalLabel } from "../utils/goalProgress";

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface rounded-t-2xl p-lg pb-xl space-y-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-md" />
        <h3 className="text-title-md text-on-surface">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-lg py-2 rounded-full text-label-md transition-all ${
        active
          ? "bg-primary text-on-primary"
          : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
      }`}
    >
      {children}
    </button>
  );
}

export default function LinkLearningPicker({ onClose, onSelect, initialLink = null }) {
  const subjects = useLiveQuery(() => db.subjects.orderBy("order").toArray(), []) || [];
  const allLevels = useLiveQuery(() => db.levels.toArray(), []) || [];
  const allCourses = useLiveQuery(() => db.courses.toArray(), []) || [];
  const allLessons = useLiveQuery(() => db.lessons.toArray(), []) || [];

  const resolveInitial = () => {
    if (!initialLink?.linkedType || !initialLink?.linkedId) {
      return { subjectId: subjects[0]?.id ?? null, levelId: null, courseId: null, lessonId: null };
    }
    const { linkedType, linkedId } = initialLink;
    if (linkedType === "lesson") {
      const lesson = allLessons.find((l) => l.id === linkedId);
      const course = lesson ? allCourses.find((c) => c.id === lesson.courseId) : null;
      const level = course ? allLevels.find((l) => l.id === course.levelId) : null;
      return {
        subjectId: level?.subjectId ?? subjects[0]?.id ?? null,
        levelId: level?.id ?? null,
        courseId: course?.id ?? null,
        lessonId: lesson?.id ?? null,
      };
    }
    if (linkedType === "course") {
      const course = allCourses.find((c) => c.id === linkedId);
      const level = course ? allLevels.find((l) => l.id === course.levelId) : null;
      return {
        subjectId: level?.subjectId ?? subjects[0]?.id ?? null,
        levelId: level?.id ?? null,
        courseId: course?.id ?? null,
        lessonId: null,
      };
    }
    if (linkedType === "level") {
      const level = allLevels.find((l) => l.id === linkedId);
      return {
        subjectId: level?.subjectId ?? subjects[0]?.id ?? null,
        levelId: level?.id ?? null,
        courseId: null,
        lessonId: null,
      };
    }
    if (linkedType === "subject") {
      return { subjectId: linkedId, levelId: null, courseId: null, lessonId: null };
    }
    return { subjectId: subjects[0]?.id ?? null, levelId: null, courseId: null, lessonId: null };
  };

  const initial = resolveInitial();
  const [subjectId, setSubjectId] = useState(initial.subjectId);
  const [levelId, setLevelId] = useState(initial.levelId);
  const [courseId, setCourseId] = useState(initial.courseId);
  const [lessonId, setLessonId] = useState(initial.lessonId);

  const levels = allLevels.filter((l) => l.subjectId === subjectId).sort((a, b) => a.order - b.order);
  const activeLevelId = levelId ?? levels[0]?.id ?? null;
  const courses = allCourses.filter((c) => c.levelId === activeLevelId).sort((a, b) => a.order - b.order);
  const activeCourseId = courseId ?? courses[0]?.id ?? null;
  const lessons = allLessons.filter((l) => l.courseId === activeCourseId).sort((a, b) => a.order - b.order);

  const learningData = { subjects, levels: allLevels, courses: allCourses, lessons: allLessons };

  const buildLink = (type, id) => ({
    linkedType: type,
    linkedId: id,
    label: getLinkedGoalLabel(type, id, learningData),
  });

  const linkTarget = (() => {
    if (lessonId) return buildLink("lesson", lessonId);
    if (courseId) return buildLink("course", courseId);
    if (levelId) return buildLink("level", levelId);
    if (subjectId) return buildLink("subject", subjectId);
    return null;
  })();

  const confirm = () => {
    if (!linkTarget) return;
    onSelect(linkTarget);
    onClose();
  };

  if (subjects.length === 0) {
    return (
      <Sheet title="Link to Learning" onClose={onClose}>
        <p className="text-body-sm text-on-surface-variant text-center py-lg">
          Add a Subject in Learning first before linking a goal.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet title="Link to Learning" onClose={onClose}>
      <p className="text-body-sm text-on-surface-variant">
        Pick how far to drill down, then link. Progress updates automatically from completed lessons.
      </p>

      <div className="space-y-sm">
        <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Subject</label>
        <div className="flex gap-sm flex-wrap">
          {subjects.map((s) => (
            <Chip
              key={s.id}
              active={subjectId === s.id}
              onClick={() => {
                setSubjectId(s.id);
                setLevelId(null);
                setCourseId(null);
                setLessonId(null);
              }}
            >
              {s.name}
            </Chip>
          ))}
        </div>
        {subjectId && (
          <button
            onClick={() => {
              onSelect(buildLink("subject", subjectId));
              onClose();
            }}
            className="text-primary text-label-md hover:underline"
          >
            Link at Subject level
          </button>
        )}
      </div>

      {levels.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant text-center py-md">No levels in this subject yet.</p>
      ) : (
        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Level</label>
          <div className="flex gap-sm flex-wrap">
            {levels.map((l) => (
              <Chip
                key={l.id}
                active={activeLevelId === l.id && levelId === l.id}
                onClick={() => {
                  setLevelId(l.id);
                  setCourseId(null);
                  setLessonId(null);
                }}
              >
                {l.name}
              </Chip>
            ))}
          </div>
          {levelId && (
            <button
              onClick={() => {
                onSelect(buildLink("level", levelId));
                onClose();
              }}
              className="text-primary text-label-md hover:underline"
            >
              Link at Level
            </button>
          )}
        </div>
      )}

      {levelId && courses.length === 0 && (
        <p className="text-body-sm text-on-surface-variant text-center py-md">No courses in this level yet.</p>
      )}

      {courses.length > 0 && levelId && (
        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Course</label>
          <div className="flex gap-sm flex-wrap">
            {courses.map((c) => (
              <Chip
                key={c.id}
                active={activeCourseId === c.id && courseId === c.id}
                onClick={() => {
                  setCourseId(c.id);
                  setLessonId(null);
                }}
              >
                {c.name}
              </Chip>
            ))}
          </div>
          {courseId && (
            <button
              onClick={() => {
                onSelect(buildLink("course", courseId));
                onClose();
              }}
              className="text-primary text-label-md hover:underline"
            >
              Link at Course
            </button>
          )}
        </div>
      )}

      {courseId && lessons.length === 0 && (
        <p className="text-body-sm text-on-surface-variant text-center py-md">No lessons in this course yet.</p>
      )}

      {lessons.length > 0 && courseId && (
        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Lesson</label>
          <div className="space-y-sm">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => setLessonId(lesson.id)}
                className={`w-full flex items-center gap-md p-md rounded-xl text-left transition-all ${
                  lessonId === lesson.id
                    ? "bg-primary-fixed border-2 border-primary"
                    : "bg-surface-container-low border border-outline-variant"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    lesson.status === "completed" ? "text-tertiary icon-filled" : "text-on-surface-variant"
                  }`}
                >
                  {lesson.status === "completed" ? "check_circle" : "menu_book"}
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm text-on-surface truncate">{lesson.name}</p>
                  <p className="text-label-md text-on-surface-variant capitalize">{lesson.status.replace("_", " ")}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {linkTarget && (
        <div className="rounded-xl bg-surface-container-low p-md space-y-xs">
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Will link to</p>
          <p className="text-body-sm text-on-surface">{linkTarget.label}</p>
          <p className="text-label-md text-primary">{getLinkTypeLabel(linkTarget.linkedType)} goal</p>
        </div>
      )}

      <button
        onClick={confirm}
        disabled={!linkTarget}
        className="w-full py-4 px-lg rounded-full text-title-md text-on-primary bg-primary active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-lg disabled:opacity-50"
      >
        <span className="material-symbols-outlined icon-filled">link</span>
        Confirm Link
      </button>
    </Sheet>
  );
}
