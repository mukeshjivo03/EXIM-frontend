import { createContext, useContext, useState, type ReactNode } from "react";

type Role = "ADM" | "FTR" | "MNG";

interface AuthContextValue {
  role: Role | null;
  name: string | null;
  isLoggedIn: boolean;
  setAuth: (name: string, role: Role) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredRole(): Role | null {
  const r = localStorage.getItem("user_role");
  if (r === "ADM" || r === "FTR" || r === "MNG") return r;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(getStoredRole);
  const [name, setName] = useState<string | null>(localStorage.getItem("user_name"));

  const isLoggedIn = !!localStorage.getItem("access_token") && role !== null;

  function setAuth(name: string, role: Role) {
    setName(name);
    setRole(role);
  }

  function clearAuth() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    setRole(null);
    setName(null);
  }

  return (
    <AuthContext.Provider value={{ role, name, isLoggedIn, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
