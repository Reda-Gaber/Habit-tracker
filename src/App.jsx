import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { seedIfEmpty, getSetting } from "./db/db";
import { runNotificationChecks } from "./utils/notifications";
import { runRecurringTransactions } from "./utils/recurringEngine";
import { useTheme } from "./utils/theme";
import { useLanguage } from "./utils/language";

import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import HabitDetail from "./pages/HabitDetail";
import Tasks from "./pages/Tasks";
import Goals from "./pages/Goals";
import Finance from "./pages/Finance";
import FinanceStats from "./pages/FinanceStats";
import Learning from "./pages/Learning";
import CourseDetail from "./pages/CourseDetail";
import LessonDetail from "./pages/LessonDetail";
import Stats from "./pages/Stats";
import FocusTime from "./pages/FocusTime";
import AddEditHabit from "./pages/AddEditHabit";
import AddEditTask from "./pages/AddEditTask";
import NotificationSettings from "./pages/NotificationSettings";
import Notifications from "./pages/Notifications";
import NotificationToastHost from "./components/NotificationToastHost";
import Today from "./pages/Today";
import Journal from "./pages/Journal";
import Calendar from "./pages/Calendar";

function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  useTheme();
  useLanguage();

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

  // Generate due recurring transactions (salary, rent, subscriptions...)
  useEffect(() => {
    runRecurringTransactions();
    const interval = setInterval(runRecurringTransactions, 60 * 1000);
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
      {onboarded && <NotificationToastHost />}
      <Routes>
        <Route
          path="/onboarding"
          element={<Onboarding onDone={() => setOnboarded(true)} />}
        />
        <Route path="/" element={onboarded ? <Dashboard /> : <Navigate to="/onboarding" replace />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/habits/new" element={<AddEditHabit />} />
        <Route path="/habits/:id/edit" element={<AddEditHabit />} />
        <Route path="/habits/:id" element={<HabitDetail />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/new" element={<AddEditTask />} />
        <Route path="/tasks/:id/edit" element={<AddEditTask />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/stats/finance" element={<FinanceStats />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/learning/course/:id" element={<CourseDetail />} />
        <Route path="/learning/lesson/:id" element={<LessonDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/stats/focus-time" element={<FocusTime />} />
        <Route path="/settings/notifications" element={<NotificationSettings />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/today" element={<Today />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
