import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

import { login } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CargoShipBackground from "@/components/CargoShipBackground";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { access, refresh, role, name } = await login({ email, password });
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user_role", role);
      localStorage.setItem("user_name", name);
      localStorage.setItem("user_email", email);

      setAuth(name, role, email);
      navigate("/");
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated background */}
      <CargoShipBackground />

      {/* Magic UI floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <div
          className="orb w-[300px] h-[300px] top-[10%] left-[5%] opacity-30"
          style={{ background: "oklch(0.488 0.243 264.376)", animationDelay: "0s" }}
        />
        <div
          className="orb w-[200px] h-[200px] top-[60%] left-[20%] opacity-20"
          style={{ background: "oklch(0.696 0.17 162.48)", animationDelay: "-4s" }}
        />
        <div
          className="orb w-[250px] h-[250px] top-[30%] right-[10%] opacity-25"
          style={{ background: "oklch(0.627 0.265 303.9)", animationDelay: "-8s" }}
        />
      </div>

      {/* Login form */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 md:justify-start md:pl-16 md:pr-0">
        <div className="login-glass w-full max-w-xl rounded-2xl shadow-2xl p-12 py-20 animate-page">
          {/* Header */}
          <div className="text-center space-y-3 mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              JIVO EXIM
            </h1>
            <p className="text-lg text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-lg">Username</Label>
              <div className="input-glow rounded-md">
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  className="h-12 text-lg bg-background/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-lg">Password</Label>
              <div className="input-glow rounded-md">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="h-12 text-lg bg-background/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-base text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="btn-press w-full h-12 text-lg"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
