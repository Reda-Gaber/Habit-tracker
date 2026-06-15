import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db/db";

const ICONS = [
  "self_improvement",
  "menu_book",
  "fitness_center",
  "water_drop",
  "psychology",
  "palette",
  "nightlight_round",
  "sunny",
  "eco",
  "directions_run",
];

const COLORS = [
  { key: "primary", hex: "#bac3ff" },
  { key: "secondary", hex: "#ffb59f" },
  { key: "tertiary", hex: "#78dc77" },
  { key: "info", hex: "#b4e4ff" },
  { key: "warm", hex: "#ffd9b4" },
];

const DAYS = [
  { label: "M", full: "Mon", dow: 1 },
  { label: "T", full: "Tue", dow: 2 },
  { label: "W", full: "Wed", dow: 3 },
  { label: "T", full: "Thu", dow: 4 },
  { label: "F", full: "Fri", dow: 5 },
  { label: "S", full: "Sat", dow: 6 },
  { label: "S", full: "Sun", dow: 0 },
];

export default function AddEditHabit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState("primary");
  const [frequency, setFrequency] = useState("daily");
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [reminderTime, setReminderTime] = useState("07:30");

  useEffect(() => {
    if (isEdit) {
      db.habits.get(Number(id)).then((h) => {
        if (h) {
          setName(h.name);
          setIcon(h.icon || ICONS[0]);
          setColor(h.color || "primary");
          setFrequency(h.frequency || "daily");
          setDays(h.days || [0, 1, 2, 3, 4, 5, 6]);
          setReminderTime(h.reminderTime || "07:30");
        }
      });
    }
  }, [id]);

  const toggleDay = (dow) => {
    setDays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]));
  };

  const save = async () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), icon, color, frequency, days, reminderTime };
    if (isEdit) {
      await db.habits.update(Number(id), data);
    } else {
      await db.habits.add({ ...data, createdAt: Date.now() });
    }
    navigate("/habits");
  };

  const remove = async () => {
    await db.habits.delete(Number(id));
    await db.habitLogs.where("habitId").equals(Number(id)).delete();
    navigate("/habits");
  };

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-surface z-40 px-container_margin_mobile pt-md pb-sm">
        <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-6" />
        <div className="w-full flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="text-title-md text-on-surface">{isEdit ? "Edit Ritual" : "New Ritual"}</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-container_margin_mobile pb-xl space-y-xl">
        {/* Name */}
        <section className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Habit Name</label>
          <div className="relative">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What is your new ritual?"
              className="w-full px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-lg placeholder:text-outline outline-none"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <span className="material-symbols-outlined text-primary icon-filled">auto_awesome</span>
            </div>
          </div>
        </section>

        {/* Icon picker */}
        <section className="space-y-sm">
          <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Visual Anchor</label>
          <div className="grid grid-cols-5 gap-md">
            {ICONS.map((ic) => (
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
        </section>

        {/* Frequency & Days */}
        <section className="space-y-md">
          <div className="flex justify-between items-center">
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Frequency</label>
            <div className="flex bg-surface-container-high p-1 rounded-full">
              <button
                onClick={() => {
                  setFrequency("daily");
                  setDays([0, 1, 2, 3, 4, 5, 6]);
                }}
                className={`px-4 py-1.5 rounded-full text-label-md transition-all ${
                  frequency === "daily" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setFrequency("weekly")}
                className={`px-4 py-1.5 rounded-full text-label-md transition-all ${
                  frequency === "weekly" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"
                }`}
              >
                Specific
              </button>
            </div>
          </div>
          <div className="flex justify-between gap-2">
            {DAYS.map((d) => {
              const active = days.includes(d.dow);
              return (
                <div key={d.dow} className={`flex flex-col items-center gap-2 flex-1 ${!active ? "opacity-40" : ""}`}>
                  <button
                    onClick={() => toggleDay(d.dow)}
                    className={`w-full aspect-square flex items-center justify-center rounded-lg text-title-md transition-all ${
                      active ? "bg-primary-container text-on-primary-container" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    {d.label}
                  </button>
                  <span className={`text-label-md ${active ? "text-primary" : ""}`}>{d.full}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Reminder & Color */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <section className="space-y-sm">
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Reminder Time</label>
            <div className="flex items-center gap-md px-lg py-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
              <span className="material-symbols-outlined text-on-surface-variant">schedule</span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-transparent border-none p-0 focus:ring-0 text-body-lg w-full outline-none"
              />
            </div>
          </section>

          <section className="space-y-sm">
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Color Tag</label>
            <div className="flex items-center h-[60px] gap-4 px-lg py-2 bg-surface-container-lowest border border-outline-variant rounded-xl justify-between">
              {COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 active:scale-95 ${
                    color === c.key ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Quote */}
        <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-primary-fixed/30 flex items-center justify-center">
          <div className="z-10 text-center px-lg">
            <p className="text-body-sm text-primary italic">"A small seed today is a forest tomorrow."</p>
          </div>
        </div>
      </div>

      {/* Footer */}
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
          Save Habit
        </button>
      </div>
    </div>
  );
}
