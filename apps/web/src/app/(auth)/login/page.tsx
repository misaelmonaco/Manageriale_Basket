"use client";

import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login, register, type RegisterPayload } from "@/lib/api";

const registrationRoles = [
  { value: "PLAYER", label: "Giocatore" },
  { value: "DIRECTOR", label: "Dirigente" },
  { value: "COACH", label: "Coach" },
  { value: "SUPER_ADMIN", label: "SUPER_ADMIN" },
] satisfies { value: RegisterPayload["role"]; label: string }[];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    role: "PLAYER" as RegisterPayload["role"],
    organizationName: "",
    organizationSlug: "",
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);

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

  async function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError("La conferma password non coincide.");
      return;
    }

    setRegisterLoading(true);
    try {
      await register({
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
        firstName: registerForm.firstName || undefined,
        lastName: registerForm.lastName || undefined,
        birthDate: registerForm.birthDate,
        role: registerForm.role,
        organizationName: registerForm.organizationName || undefined,
        organizationSlug: registerForm.organizationSlug || undefined,
      });
      setEmail(registerForm.email);
      setPassword(registerForm.password);
      setRegisterForm((form) => ({
        ...form,
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        birthDate: "",
        organizationName: "",
        organizationSlug: "",
      }));
      setRegisterSuccess(
        "Utente creato nel database. Ora puoi accedere dal form Accesso.",
      );
    } catch (error) {
      setRegisterError(
        error instanceof Error
          ? error.message
          : "Registrazione non riuscita. Controlla i dati inseriti.",
      );
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <Card className="w-full p-6">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">Manageriale Basket</p>
            <h1 className="text-2xl font-semibold">Accesso</h1>
          </div>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <Input
                type="email"
                autoComplete="email"
                placeholder="misaelmonaco@gmail.com"
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
          <Button asChild variant="ghost" className="mt-4 w-full">
            <Link href="/">Indietro</Link>
          </Button>
        </Card>
        <Card className="w-full p-6">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">Nuovo account</p>
            <h2 className="text-2xl font-semibold">Registrazione</h2>
          </div>
          <form className="mt-6 space-y-4" onSubmit={submitRegistration}>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Nome utente</span>
              <Input
                autoComplete="username"
                placeholder="nomeutente"
                value={registerForm.username}
                onChange={(event) =>
                  setRegisterForm((form) => ({
                    ...form,
                    username: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <Input
                type="email"
                autoComplete="email"
                placeholder="utente@email.com"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((form) => ({
                    ...form,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Nome</span>
                <Input
                  autoComplete="given-name"
                  placeholder="Mario"
                  value={registerForm.firstName}
                  onChange={(event) =>
                    setRegisterForm((form) => ({
                      ...form,
                      firstName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Cognome</span>
                <Input
                  autoComplete="family-name"
                  placeholder="Rossi"
                  value={registerForm.lastName}
                  onChange={(event) =>
                    setRegisterForm((form) => ({
                      ...form,
                      lastName: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Password</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((form) => ({
                      ...form,
                      password: event.target.value,
                    }))
                  }
                  required
                  minLength={8}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Conferma password</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Conferma password"
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    setRegisterForm((form) => ({
                      ...form,
                      confirmPassword: event.target.value,
                    }))
                  }
                  required
                  minLength={8}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Data di nascita</span>
                <Input
                  type="date"
                  value={registerForm.birthDate}
                  onChange={(event) =>
                    setRegisterForm((form) => ({
                      ...form,
                      birthDate: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Ruolo</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                  value={registerForm.role}
                  onChange={(event) =>
                    setRegisterForm((form) => ({
                      ...form,
                      role: event.target.value as RegisterPayload["role"],
                    }))
                  }
                  required
                >
                  {registrationRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {registerForm.role === "DIRECTOR" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">
                    Nome organizzazione
                  </span>
                  <Input
                    placeholder="Basket Roma"
                    value={registerForm.organizationName}
                    onChange={(event) =>
                      setRegisterForm((form) => ({
                        ...form,
                        organizationName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">
                    Slug organizzazione
                  </span>
                  <Input
                    pattern="[a-z0-9-]+"
                    placeholder="basket-roma"
                    value={registerForm.organizationSlug}
                    onChange={(event) =>
                      setRegisterForm((form) => ({
                        ...form,
                        organizationSlug: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            )}
            {registerError && (
              <p className="text-sm text-primary">{registerError}</p>
            )}
            {registerSuccess && (
              <p className="text-sm text-emerald-700">{registerSuccess}</p>
            )}
            <Button className="w-full" disabled={registerLoading}>
              <UserPlus className="mr-2 h-4 w-4" />
              {registerLoading ? "Registrazione in corso" : "Registrati"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
