import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './store/useAppStore';

import Layout from './components/Layout';
import Home from './pages/Home';
import Meal from './pages/Meal';
import Workout from './pages/Workout';
import Goal from './pages/Goal';
import Login from './pages/Login';

export default function App() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);

  // Wait for Supabase to restore any existing session before routing.
  if (!authReady) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-400">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!user ? (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="meal" element={<Meal />} />
            <Route path="workout" element={<Workout />} />
            <Route path="goal" element={<Goal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
    </BrowserRouter>
  );
}
