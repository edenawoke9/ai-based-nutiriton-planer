import { useEffect, useState } from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { getAuthToken } from "@/lib/api";

// Routes that do NOT require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/about",
  "/privacy",
  "/terms",
];

// Routes that redirect authenticated users away (no need to see login/signup again)
const AUTH_ONLY_ROUTES = ["/login", "/signup"];

// The root "/" is a smart gate — always redirects based on auth state
const ROOT_ROUTE = "/";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [ready, setReady] = useState(false);

  const currentPath = routerState.location.pathname;
  const isPublic = PUBLIC_ROUTES.includes(currentPath);
  const isAuthOnly = AUTH_ONLY_ROUTES.includes(currentPath);
  const isRoot = currentPath === ROOT_ROUTE;

  useEffect(() => {
    const token = getAuthToken();

    // "/" is a smart redirect gate — never render the landing page directly
    if (isRoot) {
      if (token) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        navigate({ to: "/onboarding", replace: true });
      }
      return;
    }

    if (token && isAuthOnly) {
      // Logged-in user trying to visit /login or /signup → send to dashboard
      navigate({ to: "/dashboard", replace: true });
      return;
    }

    if (!token && !isPublic) {
      // Unauthenticated user trying to visit a protected route → send to login
      navigate({
        to: "/login",
        search: { callbackUrl: currentPath },
        replace: true,
      });
      return;
    }

    setReady(true);
  }, [currentPath, isPublic, isAuthOnly, isRoot, navigate]);

  // Show a spinner while the auth check & redirect is in flight
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-leaf" />
      </div>
    );
  }

  return <>{children}</>;
}
