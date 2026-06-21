import { useEffect, useState, useCallback } from "react";
import { getSetting, setSetting } from "../db/db";
import { translations } from "../i18n/translations";

const STORAGE_KEY = "language"; // 'en' | 'ar'
const emitter = new EventTarget();
let currentLang = "en";
let initialized = false;

function applyDirection(lang) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ar" ? "rtl" : "ltr";
}

async function initLanguage() {
  if (initialized) return currentLang;
  const saved = await getSetting(STORAGE_KEY, "en");
  currentLang = saved;
  applyDirection(saved);
  initialized = true;
  return saved;
}

export function translate(lang, str) {
  if (lang !== "ar" || !str) return str;
  return translations[str] ?? str;
}

// Reactive hook: call in any component that renders translated text or
// needs the current direction. All instances stay in sync — calling
// setLanguage() from anywhere updates every mounted component.
export function useLanguage() {
  const [lang, setLangState] = useState(currentLang);

  useEffect(() => {
    let mounted = true;
    initLanguage().then((saved) => {
      if (mounted) setLangState(saved);
    });
    const handler = (e) => setLangState(e.detail);
    emitter.addEventListener("change", handler);
    return () => {
      mounted = false;
      emitter.removeEventListener("change", handler);
    };
  }, []);

  const setLanguage = useCallback(async (newLang) => {
    currentLang = newLang;
    applyDirection(newLang);
    await setSetting(STORAGE_KEY, newLang);
    emitter.dispatchEvent(new CustomEvent("change", { detail: newLang }));
  }, []);

  const t = useCallback((str) => translate(lang, str), [lang]);

  return { lang, dir: lang === "ar" ? "rtl" : "ltr", isRtl: lang === "ar", setLanguage, t };
}
