import { useNavigate } from "react-router-dom";
import { setSetting } from "../db/db";
import { requestNotificationPermission } from "../utils/notifications";

export default function Onboarding({ onDone }) {
  const navigate = useNavigate();

  const handleStart = async () => {
    await setSetting("onboardingComplete", true);
    // Ask for notification permission right away
    requestNotificationPermission();
    onDone();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-primary relative overflow-hidden">
      {/* Background atmospheric blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-primary-container opacity-30 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[60%] bg-tertiary-container opacity-15 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-container_margin_mobile">
        <div className="w-full max-w-md flex flex-col items-center text-center space-y-lg">
          {/* Illustrative graphic */}
          <div className="relative w-full aspect-square max-w-[320px] mb-md">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[40px] flex items-center justify-center overflow-hidden shadow-2xl">
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="absolute w-[200px] h-[200px] bg-white opacity-20 rounded-full blur-3xl" />
                <span className="material-symbols-outlined text-white text-[72px] icon-filled relative z-10">
                  self_improvement
                </span>
                <div className="absolute top-8 right-8 p-3 bg-white/10 backdrop-blur-md border border-white/30 rounded-xl">
                  <span className="material-symbols-outlined text-white text-[28px] icon-filled">
                    auto_awesome
                  </span>
                </div>
                <div className="absolute bottom-10 left-10 p-3 bg-white/10 backdrop-blur-md border border-white/30 rounded-xl">
                  <span className="material-symbols-outlined text-white text-[28px]">school</span>
                </div>
              </div>
            </div>
          </div>

          {/* Text content */}
          <div className="space-y-sm">
            <h1 className="text-display-lg text-white tracking-tight !text-[40px] !leading-tight">
              Habit &amp; Learning Tracker
            </h1>
            <p className="text-body-lg text-primary-fixed-dim max-w-md mx-auto opacity-90">
              Master your rituals. Expand your mind.
            </p>
          </div>
        </div>

        {/* Teaser stat cards */}
        <div className="mt-xl w-full max-w-md grid grid-cols-2 gap-md">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-lg rounded-xl flex flex-col justify-between h-32">
            <span className="text-label-md text-primary-fixed uppercase tracking-widest">
              Rituals
            </span>
            <div className="flex items-end justify-between">
              <span className="text-headline-lg text-white">85%</span>
              <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="bg-tertiary-fixed-dim h-full w-[85%]" />
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-lg rounded-xl flex flex-col justify-between h-32 mt-lg">
            <span className="text-label-md text-primary-fixed uppercase tracking-widest">
              Learning
            </span>
            <div className="flex items-end justify-between">
              <span className="text-headline-lg text-white">12h</span>
              <span className="material-symbols-outlined text-tertiary-fixed-dim">
                trending_up
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full px-container_margin_mobile pb-xl pt-lg flex flex-col items-center">
        <button
          onClick={handleStart}
          className="group relative w-full max-w-md bg-white text-primary text-title-md py-lg px-xl rounded-full shadow-[0_12px_32px_rgba(0,16,92,0.3)] transition-all duration-300 active:scale-95 flex items-center justify-center gap-sm overflow-hidden"
        >
          <span className="relative z-10">Get Started</span>
          <span className="material-symbols-outlined relative z-10 group-active:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </button>
        <p className="mt-md text-label-md text-primary-fixed-dim opacity-60">
          Your data stays on this device
        </p>
      </footer>
    </div>
  );
}
