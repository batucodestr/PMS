import AppLayout from "@/components/layout/app-layout";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/layout/protected-route";
import CalendarPage from "@/pages/main/calendar";
import DashboardPage from "@/pages/main/dashboard";
import GuestsPage from "@/pages/main/guests";
import HousekeepingPage from "@/pages/main/housekeeping";
import OperationsPage from "@/pages/main/operations";
import { Error404Page } from "@/pages/main/pages";
import PropertiesPage from "@/pages/main/properties";
import ReservationsPage from "@/pages/main/reservations";
import SettingsPage from "@/pages/main/settings";
import TasksPage from "@/pages/main/tasks";
import { AuthLayout, SignInPage } from "@/pages/others/auth";
import { Navigate, Route, Routes } from "react-router";

export default function App() {
  return (
    <Routes>
      {/* PMS application shell (giriş gerektirir) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Property management */}
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/guests" element={<GuestsPage />} />

          {/* Operations */}
          <Route path="/housekeeping" element={<HousekeepingPage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/tasks" element={<TasksPage />} />

          {/* System */}
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Auth Layout */}
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/signin" element={<SignInPage />} />
        </Route>
      </Route>

      {/* Error pages */}
      <Route path="/error-404" element={<Error404Page />} />
      <Route path="*" element={<Error404Page />} />
    </Routes>
  );
}
