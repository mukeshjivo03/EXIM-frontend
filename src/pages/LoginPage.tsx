import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

import { login } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

      setAuth(name, role);
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
      {/* Animated background — covers full screen */}
      <CargoShipBackground />

      {/* Login form — centered on mobile, left-aligned on desktop */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 md:justify-start md:pl-16 md:pr-0">
        <Card className="w-full max-w-xl shadow-lg p-12 py-20">
          <CardHeader className="text-center space-y-3">
            <CardTitle className="text-4xl">JIVO EXIM</CardTitle>
            <CardDescription className="text-lg">Sign in to your account</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-lg">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  className="h-12 text-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-lg">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="h-12 text-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-base text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
