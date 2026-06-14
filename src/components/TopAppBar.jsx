import { useNavigate } from "react-router-dom";

export default function TopAppBar({
  title,
  subtitle,
  showBack = false,
  showProfile = false,
  rightIcon = null,
  onRightClick = () => {},
}) {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-surface flex justify-between items-center px-container_margin_mobile h-16">
      <div className="flex items-center gap-md">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200 -ml-2"
            aria-label="Back"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        {showProfile && (
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-fixed flex items-center justify-center border-2 border-primary-container">
            <span className="material-symbols-outlined text-primary">person</span>
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-title-md text-primary leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-label-md text-on-surface-variant">{subtitle}</p>
          )}
        </div>
      </div>
      {rightIcon && (
        <button
          onClick={onRightClick}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors duration-200"
          aria-label="Action"
        >
          <span className="material-symbols-outlined">{rightIcon}</span>
        </button>
      )}
    </header>
  );
}
