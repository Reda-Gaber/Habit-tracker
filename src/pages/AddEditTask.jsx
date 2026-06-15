import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db/db";

const CATEGORIES = ["Work", "Personal", "Health", "Learning", "Habits"];
const PRIORITIES = [
  { key: "low", label: "Low", classes: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
  { key: "medium", label: "Medium", classes: "bg-secondary-fixed text-on-secondary-fixed-variant" },
  { key: "high", label: "High", classes: "bg-error-container text-on-error-container" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? "bg-primary" : "bg-surface-variant"
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function AddEditTask() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(todayStr());
  const [hasDueTime, setHasDueTime] = useState(false);
  const [dueTime, setDueTime] = useState("09:00");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("Personal");

  useEffect(() => {
    if (isEdit) {
      db.tasks.get(Number(id)).then((t) => {
        if (t) {
          setTitle(t.title);
          setDueDate(t.dueDate);
          setHasDueTime(!!t.hasDueTime);
          setDueTime(t.dueTime || "09:00");
          setPriority(t.priority);
          setCategory(t.category);
        }
      });
    }
  }, [id]);

  const save = async () => {
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      dueDate,
      hasDueTime,
      dueTime: hasDueTime ? dueTime : null,
      priority,
      category,
    };
    if (isEdit) {
      await db.tasks.update(Number(id), data);
    } else {
      await db.tasks.add({ ...data, completed: false, createdAt: Date.now() });
    }
    navigate("/tasks");
  };

  const remove = async () => {
    await db.tasks.delete(Number(id));
    navigate("/tasks");
  };

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <div className="sticky top-0 bg-surface z-40 px-container_margin_mobile pt-md pb-sm">
        <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-6" />
        <div className="w-full flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="text-title-md text-on-surface">{isEdit ? "Edit Task" : "New Task"}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-container_margin_mobile pb-xl space-y-xl">
        <section className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Task Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
          />
        </section>

        <section className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Due Date</label>
          <div className="flex items-center gap-md px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
            <span className="material-symbols-outlined text-on-surface-variant">event</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 text-body-lg w-full outline-none"
            />
          </div>
        </section>

        <section className="space-y-sm">
          <div className="flex items-center justify-between px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
            <div className="flex items-center gap-md">
              <span className="material-symbols-outlined text-on-surface-variant">schedule</span>
              <div>
                <p className="text-body-lg text-on-surface">Set a specific time</p>
                <p className="text-label-md text-on-surface-variant">Get reminded at an exact time</p>
              </div>
            </div>
            <Toggle checked={hasDueTime} onChange={setHasDueTime} />
          </div>
          {hasDueTime && (
            <div className="flex items-center gap-md px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
              <span className="material-symbols-outlined text-on-surface-variant">access_time</span>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="bg-transparent border-none p-0 focus:ring-0 text-body-lg w-full outline-none"
              />
            </div>
          )}
        </section>

        <section className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Priority</label>
          <div className="flex gap-sm">
            {PRIORITIES.map((p) => (
              <button
                key={p.key}
                onClick={() => setPriority(p.key)}
                className={`flex-1 py-3 rounded-xl text-label-md font-bold uppercase tracking-wider transition-all ${
                  priority === p.key ? p.classes + " ring-2 ring-primary" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Category</label>
          <div className="flex gap-sm flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-lg py-2 rounded-full text-label-md transition-all ${
                  category === c ? "bg-primary-container text-on-primary-container" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="p-lg bg-surface border-t border-outline-variant shrink-0 flex gap-md">
        {isEdit && (
          <button
            onClick={remove}
            className="py-4 px-lg rounded-full text-title-md text-error border border-error active:scale-[0.98] transition-all flex items-center justify-center gap-sm"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        )}
        <button
          onClick={save}
          className="flex-1 py-4 px-lg rounded-full text-title-md text-on-secondary bg-secondary-container hover:bg-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-lg"
        >
          <span className="material-symbols-outlined icon-filled">check_circle</span>
          Save Task
        </button>
      </div>
    </div>
  );
}
