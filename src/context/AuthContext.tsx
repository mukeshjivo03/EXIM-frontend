import { createContext, useContext, useState, type ReactNode } from "react";
import type { Permissions } from "@/api/auth";

interface AuthContextValue {
  permissions: Permissions;
  name: string | null;
  email: string | null;
  isLoggedIn: boolean;
  setAuth: (name: string, permissions: Permissions, email: string) => void;
  clearAuth: () => void;
  /** Check if user has a specific action on a module */
  hasPermission: (module: string, action?: string) => boolean;
  /** Check if user has ANY of the given modules (useful for section visibility) */
  hasAnyModule: (...modules: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredPermissions(): Permissions {
  try {
    const raw = localStorage.getItem("user_permissions");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<Permissions>(getStoredPermissions);
  const [name, setName] = useState<string | null>(localStorage.getItem("user_name"));
  const [email, setEmail] = useState<string | null>(localStorage.getItem("user_email"));

  const isLoggedIn = !!localStorage.getItem("access_token") && Object.keys(permissions).length > 0;

  function setAuth(name: string, permissions: Permissions, email: string) {
    setName(name);
    setPermissions(permissions);
    setEmail(email);
  }

  function clearAuth() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_permissions");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    setPermissions({});
    setName(null);
    setEmail(null);
  }

  function hasPermission(module: string, action?: string): boolean {
    const actions = permissions[module];
    if (!actions) return false;
    if (!action) return true;
    return actions.includes(action);
  }

  function hasAnyModule(...modules: string[]): boolean {
    return modules.some((m) => !!permissions[m]);
  }

  return (
    <AuthContext.Provider value={{ permissions, name, email, isLoggedIn, setAuth, clearAuth, hasPermission, hasAnyModule }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
