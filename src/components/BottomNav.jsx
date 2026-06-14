import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", icon: "home", label: "Home", end: true },
  { to: "/goals", icon: "event_repeat", label: "Goals" },
  { to: "/tasks", icon: "task_alt", label: "Tasks" },
  { to: "/learning", icon: "school", label: "Learning" },
  { to: "/stats", icon: "insights", label: "Stats" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 h-20 bg-surface-container-lowest shadow-nav rounded-t-xl">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-full p-2 active:scale-95 transition-transform duration-200 ${
              isActive
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant"
            }`
          }
        >
          {({ isActive }) => (
            <span
              className={`material-symbols-outlined ${isActive ? "icon-filled" : ""}`}
            >
              {item.icon}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
