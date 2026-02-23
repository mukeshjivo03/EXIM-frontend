import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background shadow-sm dark:shadow-[0_1px_4px_rgba(255,255,255,0.05)]">
      <div className="flex h-14 items-center justify-between px-6">
        <Link to="/" className="text-lg font-bold tracking-wide">
          JIVO EXIM
        </Link>

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
