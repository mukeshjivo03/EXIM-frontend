import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useHasPermission } from "@/hooks/useHasPermission";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Optional: list of permission resource keys required (user needs at least one) */
  requiredModules?: string[];
  /** Permission action to check for requiredModules. Default is "view". */
  requiredAction?: string;
}

export default function ProtectedRoute({
  children,
  requiredModules,
  requiredAction = "view",
}: ProtectedRouteProps) {
  const { isLoggedIn } = useAuth();
  const { hasPermission } = useHasPermission();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (
    requiredModules &&
    requiredModules.length > 0 &&
    !requiredModules.some((module) => hasPermission(module, requiredAction))
  ) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
