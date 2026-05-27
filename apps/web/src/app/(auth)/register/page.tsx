"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { register, type RegisterPayload } from "@/lib/api";

const registrationRoles = [
  { value: "PLAYER", label: "Giocatore" },
  { value: "DIRECTOR", label: "Dirigente" },
  { value: "COACH", label: "Coach" },
  { value: "SUPER_ADMIN", label: "SUPER_ADMIN" },
] satisfies { value: RegisterPayload["role"]; label: string }[];

export default function RegisterPage() {
  const [form, setForm] = useState({
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.password !== form.confirmPassword) {
      setError("La conferma password non coincide.");
      return;
    }

    setLoading(true);
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        birthDate: form.birthDate,
        role: form.role,
        organizationName: form.organizationName || undefined,
        organizationSlug: form.organizationSlug || undefined,
      });
      setForm((current) => ({
        ...current,
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
      setSuccess("Utente creato nel database. Ora puoi accedere.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Registrazione non riuscita. Controlla i dati inseriti.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-2xl p-6">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Manageriale Basket</p>
          <h1 className="text-2xl font-semibold">Registrazione</h1>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Nome utente</span>
            <Input
              autoComplete="username"
              placeholder="nomeutente"
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
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
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
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
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, firstName: event.target.value }))
                }
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Cognome</span>
              <Input
                autoComplete="family-name"
                placeholder="Rossi"
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lastName: event.target.value }))
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
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
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
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((current) => ({ ...current, confirmPassword: event.target.value }))
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
                value={form.birthDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, birthDate: event.target.value }))
                }
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Ruolo</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
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
          {form.role === "DIRECTOR" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Nome organizzazione</span>
                <Input
                  placeholder="Basket Roma"
                  value={form.organizationName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      organizationName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Slug organizzazione</span>
                <Input
                  pattern="[a-z0-9-]+"
                  placeholder="basket-roma"
                  value={form.organizationSlug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      organizationSlug: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          )}
          {error && <p className="text-sm text-primary">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}
          <Button className="w-full" disabled={loading}>
            <UserPlus className="mr-2 h-4 w-4" />
            {loading ? "Registrazione in corso" : "Registrati"}
          </Button>
        </form>
        <Button asChild variant="ghost" className="mt-4 w-full">
          <Link href="/login">Hai già un account? Accedi</Link>
        </Button>
      </Card>
    </main>
  );
}
