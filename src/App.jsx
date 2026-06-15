import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { db, seedIfEmpty, getSetting } from "./db/db";
import { runNotificationChecks } from "./utils/notifications";

import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import Tasks from "./pages/Tasks";
import Goals from "./pages/Goals";
import Learning from "./pages/Learning";
import CourseDetail from "./pages/CourseDetail";
import LessonDetail from "./pages/LessonDetail";
import Stats from "./pages/Stats";
import AddEditHabit from "./pages/AddEditHabit";
import AddEditTask from "./pages/AddEditTask";
import NotificationSettings from "./pages/NotificationSettings";

function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      const done = await getSetting("onboardingComplete", false);
      setOnboarded(!!done);
      setReady(true);
    })();
  }, []);

  // Periodic notification checks (habit reminders, daily digest, task alerts)
  useEffect(() => {
    runNotificationChecks();
    const interval = setInterval(runNotificationChecks, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary-fixed border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/onboarding"
          element={<Onboarding onDone={() => setOnboarded(true)} />}
        />
        <Route path="/" element={onboarded ? <Dashboard /> : <Navigate to="/onboarding" replace />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/habits/new" element={<AddEditHabit />} />
        <Route path="/habits/:id/edit" element={<AddEditHabit />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/new" element={<AddEditTask />} />
        <Route path="/tasks/:id/edit" element={<AddEditTask />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/learning/course/:id" element={<CourseDetail />} />
        <Route path="/learning/lesson/:id" element={<LessonDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings/notifications" element={<NotificationSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
