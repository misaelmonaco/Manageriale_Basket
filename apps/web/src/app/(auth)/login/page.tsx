"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function storeSession(session: Awaited<ReturnType<typeof login>>) {
    localStorage.setItem("accessToken", session.accessToken);
    localStorage.setItem("refreshToken", session.refreshToken);
    localStorage.setItem("role", session.user.role);
    localStorage.setItem("organizationId", session.user.organizationId ?? "");
    localStorage.removeItem("selectedOrganizationId");
    localStorage.removeItem("selectedOrganizationSlug");
    localStorage.removeItem("selectedOrganizationName");
    localStorage.setItem("firstName", session.user.firstName);
    localStorage.setItem("lastName", session.user.lastName);
    localStorage.setItem("email", session.user.email);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await login(email, password);
      storeSession(session);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Email o password non corretti.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-24">
      <Card className="relative mt-12 w-full max-w-md overflow-visible p-6 pt-24">
        <div className="absolute left-1/2 top-0 flex h-32 w-56 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background px-5 shadow-sm">
          <img src="/logo/logo_court_vision.jpg" alt="CourtVision" className="max-h-24 w-full object-contain" />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Accesso</h1>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Email</span>
            <Input
              type="email"
              autoComplete="email"
              placeholder="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Password</span>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>
          {error && <p className="text-sm text-primary">{error}</p>}
          <Button className="w-full" disabled={loading}>
            <LogIn className="mr-2 h-4 w-4" />
            {loading ? "Accesso in corso" : "Accedi"}
          </Button>
        </form>
        <div className="mt-4 grid gap-2">
          <Button asChild variant="ghost" className="w-full">
            <Link href="/register">Crea un nuovo account</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Indietro</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
