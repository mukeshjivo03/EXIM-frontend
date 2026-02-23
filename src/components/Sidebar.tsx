import { NavLink, useNavigate } from "react-router-dom";
import { CircleUser, LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { logout as logoutApi } from "@/api/auth";

const adminLinks = [
  { to: "/admin/users", label: "Users" },
];

export default function Sidebar() {
  const { role, name, clearAuth } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "ADM";

  async function handleLogout() {
    try {
      await logoutApi();
    } catch {
      // proceed even if API fails
    }
    clearAuth();
    navigate("/login");
  }

  return (
    <aside className="fixed left-0 top-14 bottom-12 w-56 border-r bg-background/95 dark:bg-card/95 backdrop-blur-sm flex flex-col">
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`
          }
        >
          Home
        </NavLink>

        {isAdmin && (
          <>
            <Separator className="my-3" />

            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Administration
            </span>

            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <CircleUser className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium flex-1">{name}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
