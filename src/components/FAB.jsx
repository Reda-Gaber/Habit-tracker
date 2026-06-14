export default function FAB({ onClick, icon = "add", label = "Quick Add" }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="fixed bottom-24 right-lg w-14 h-14 bg-primary text-on-primary rounded-full shadow-fab flex items-center justify-center z-50 active:scale-95 transition-transform duration-200"
    >
      <span className="material-symbols-outlined text-3xl">{icon}</span>
    </button>
  );
}
