import { useEffect, useState, useCallback } from "react";
import { getSetting, setSetting } from "../db/db";

const STORAGE_KEY = "themeMode"; // 'light' | 'dark' | 'system'

function applyTheme(mode) {
  const root = document.documentElement;
  let isDark = false;
  if (mode === "dark") {
    isDark = true;
  } else if (mode === "system") {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  root.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [mode, setMode] = useState("light");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getSetting(STORAGE_KEY, "light");
      setMode(saved);
      applyTheme(saved);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setThemeMode = useCallback(async (newMode) => {
    setMode(newMode);
    applyTheme(newMode);
    await setSetting(STORAGE_KEY, newMode);
  }, []);

  return { mode, setThemeMode, loaded };
}
