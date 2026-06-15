import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";

const SUBJECT_ICONS = ["translate", "code", "calculate", "palette", "music_note", "fitness_center", "science", "menu_book"];

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={onClose}>
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

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-sm">
      <label className="text-label-md text-on-surface-variant uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
      />
    </div>
  );
}

function PrimaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 px-lg rounded-full text-title-md text-on-primary bg-primary active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-lg"
    >
      <span className="material-symbols-outlined icon-filled">check_circle</span>
      {children}
    </button>
  );
}

// ---------------- Quick Add Menu ----------------
export function AddLearningMenu({ onClose, onPick }) {
  const items = [
    { key: "subject", icon: "category", label: "New Subject", desc: "e.g. Spanish, Data Science" },
    { key: "level", icon: "stairs", label: "New Level", desc: "e.g. Beginner, Advanced" },
    { key: "course", icon: "account_tree", label: "New Course", desc: "e.g. Grammar Essentials" },
    { key: "lesson", icon: "menu_book", label: "New Lesson", desc: "e.g. Present Simple Tense" },
  ];

  return (
    <Sheet title="Add to Learning Path" onClose={onClose}>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onPick(item.key)}
          className="w-full flex items-center gap-md p-md rounded-xl bg-surface-container-low active:scale-[0.98] transition-transform"
        >
          <span className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined">{item.icon}</span>
          </span>
          <div className="text-left">
            <p className="text-body-lg text-on-surface">{item.label}</p>
            <p className="text-label-md text-on-surface-variant">{item.desc}</p>
          </div>
        </button>
      ))}
    </Sheet>
  );
}

// ---------------- Add Subject ----------------
export function AddSubjectSheet({ onClose }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(SUBJECT_ICONS[0]);
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];

  const save = async () => {
    if (!name.trim()) return;
    await db.subjects.add({
      name: name.trim(),
      icon,
      color: subjects.length % 2 === 0 ? "primary" : "secondary",
      order: subjects.length + 1,
    });
    onClose();
  };

  return (
    <Sheet title="New Subject" onClose={onClose}>
      <TextField label="Subject Name" value={name} onChange={setName} placeholder="e.g. Spanish" />
      <div className="space-y-sm">
        <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Icon</label>
        <div className="grid grid-cols-4 gap-md">
          {SUBJECT_ICONS.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className={`aspect-square flex items-center justify-center rounded-xl transition-all ${
                icon === ic
                  ? "bg-primary-fixed text-on-primary-fixed-variant border-2 border-primary"
                  : "bg-surface-container-lowest text-on-surface-variant border border-outline-variant hover:bg-surface-container"
              }`}
            >
              <span className={`material-symbols-outlined ${icon === ic ? "icon-filled" : ""}`}>{ic}</span>
            </button>
          ))}
        </div>
      </div>
      <PrimaryButton onClick={save}>Save Subject</PrimaryButton>
    </Sheet>
  );
}

// ---------------- Add Level ----------------
export function AddLevelSheet({ onClose }) {
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? null);
  const [name, setName] = useState("");

  const levels = useLiveQuery(
    () => (subjectId ? db.levels.where("subjectId").equals(subjectId).toArray() : []),
    [subjectId]
  ) || [];

  const save = async () => {
    if (!name.trim() || !subjectId) return;
    await db.levels.add({
      subjectId,
      name: name.trim(),
      order: levels.length + 1,
    });
    onClose();
  };

  if (subjects.length === 0) {
    return (
      <Sheet title="New Level" onClose={onClose}>
        <p className="text-body-sm text-on-surface-variant text-center py-lg">
          Add a Subject first before creating levels.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet title="New Level" onClose={onClose}>
      <div className="space-y-sm">
        <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Subject</label>
        <div className="flex gap-sm flex-wrap">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setSubjectId(s.id)}
              className={`px-lg py-2 rounded-full text-label-md transition-all ${
                subjectId === s.id ? "bg-primary text-on-primary" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <TextField label="Level Name" value={name} onChange={setName} placeholder="e.g. Beginner, Advanced" />
      <PrimaryButton onClick={save}>Save Level</PrimaryButton>
    </Sheet>
  );
}

// ---------------- Add Course ----------------
export function AddCourseSheet({ onClose }) {
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? null);
  const [levelId, setLevelId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const levels = useLiveQuery(
    () => (subjectId ? db.levels.where("subjectId").equals(subjectId).sortBy("order") : []),
    [subjectId]
  ) || [];

  const activeLevelId = levelId ?? levels[0]?.id ?? null;

  const courses = useLiveQuery(
    () => (activeLevelId ? db.courses.where("levelId").equals(activeLevelId).toArray() : []),
    [activeLevelId]
  ) || [];

  const save = async () => {
    if (!name.trim() || !activeLevelId) return;
    await db.courses.add({
      levelId: activeLevelId,
      name: name.trim(),
      description: description.trim(),
      order: courses.length + 1,
    });
    onClose();
  };

  if (subjects.length === 0) {
    return (
      <Sheet title="New Course" onClose={onClose}>
        <p className="text-body-sm text-on-surface-variant text-center py-lg">
          Add a Subject and Level first before creating courses.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet title="New Course" onClose={onClose}>
      <div className="space-y-sm">
        <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Subject</label>
        <div className="flex gap-sm flex-wrap">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSubjectId(s.id);
                setLevelId(null);
              }}
              className={`px-lg py-2 rounded-full text-label-md transition-all ${
                subjectId === s.id ? "bg-primary text-on-primary" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {levels.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant text-center py-md">
          This subject has no levels yet. Add a level first.
        </p>
      ) : (
        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Level</label>
          <div className="flex gap-sm flex-wrap">
            {levels.map((l) => (
              <button
                key={l.id}
                onClick={() => setLevelId(l.id)}
                className={`px-lg py-2 rounded-full text-label-md transition-all ${
                  activeLevelId === l.id ? "bg-primary-container text-on-primary-container" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <TextField label="Course Name" value={name} onChange={setName} placeholder="e.g. Grammar Essentials" />
      <TextField label="Description (optional)" value={description} onChange={setDescription} placeholder="Short description" />

      <PrimaryButton onClick={save}>Save Course</PrimaryButton>
    </Sheet>
  );
}

// ---------------- Add Lesson ----------------
export function AddLessonSheet({ onClose }) {
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? null);
  const [levelId, setLevelId] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [name, setName] = useState("");

  const levels = useLiveQuery(
    () => (subjectId ? db.levels.where("subjectId").equals(subjectId).sortBy("order") : []),
    [subjectId]
  ) || [];
  const activeLevelId = levelId ?? levels[0]?.id ?? null;

  const courses = useLiveQuery(
    () => (activeLevelId ? db.courses.where("levelId").equals(activeLevelId).sortBy("order") : []),
    [activeLevelId]
  ) || [];
  const activeCourseId = courseId ?? courses[0]?.id ?? null;

  const lessons = useLiveQuery(
    () => (activeCourseId ? db.lessons.where("courseId").equals(activeCourseId).toArray() : []),
    [activeCourseId]
  ) || [];

  const save = async () => {
    if (!name.trim() || !activeCourseId) return;
    await db.lessons.add({
      courseId: activeCourseId,
      name: name.trim(),
      status: "not_started",
      notes: "",
      completedAt: null,
      order: lessons.length + 1,
    });
    onClose();
  };

  if (subjects.length === 0) {
    return (
      <Sheet title="New Lesson" onClose={onClose}>
        <p className="text-body-sm text-on-surface-variant text-center py-lg">
          Add a Subject, Level, and Course first before creating lessons.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet title="New Lesson" onClose={onClose}>
      <div className="space-y-sm">
        <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Subject</label>
        <div className="flex gap-sm flex-wrap">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSubjectId(s.id);
                setLevelId(null);
                setCourseId(null);
              }}
              className={`px-lg py-2 rounded-full text-label-md transition-all ${
                subjectId === s.id ? "bg-primary text-on-primary" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {levels.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant text-center py-md">No levels in this subject yet.</p>
      ) : (
        <div className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Level</label>
          <div className="flex gap-sm flex-wrap">
            {levels.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setLevelId(l.id);
                  setCourseId(null);
                }}
                className={`px-lg py-2 rounded-full text-label-md transition-all ${
                  activeLevelId === l.id ? "bg-primary-container text-on-primary-container" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {levels.length > 0 && (
        courses.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant text-center py-md">No courses in this level yet.</p>
        ) : (
          <div className="space-y-sm">
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Course</label>
            <div className="flex gap-sm flex-wrap">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCourseId(c.id)}
                  className={`px-lg py-2 rounded-full text-label-md transition-all ${
                    activeCourseId === c.id ? "bg-secondary-fixed text-on-secondary-fixed-variant" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      <TextField label="Lesson Name" value={name} onChange={setName} placeholder="e.g. Present Simple Tense" />

      <PrimaryButton onClick={save}>Save Lesson</PrimaryButton>
    </Sheet>
  );
}
