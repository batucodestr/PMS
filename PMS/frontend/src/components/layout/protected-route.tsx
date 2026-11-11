import { isAuthenticated } from "@/lib/auth";
import { Navigate, Outlet } from "react-router";

/** Giriş yapılmamışsa içindeki route'lara izin vermez ve /signin'e yönlendirir. */
export function ProtectedRoute() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/signin" replace />;
}

/** Zaten giriş yapılmışsa (ör. /signin) panele yönlendirir. */
export function PublicOnlyRoute() {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
