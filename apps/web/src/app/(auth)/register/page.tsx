"use client";

import { Building2, Dumbbell, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { register, type RegisterPayload } from "@/lib/api";
import { cn } from "@/lib/utils";

const registrationRoles = [
  {
    value: "DIRECTOR",
    label: "Societa",
    description: "Creo una nuova organizzazione e la gestisco come dirigente.",
    icon: Building2,
  },
  {
    value: "PLAYER",
    label: "Giocatore",
    description:
      "Mi iscrivo come atleta e posso indicare lo slug della societa.",
    icon: UserPlus,
  },
  {
    value: "COACH",
    label: "Coach",
    description: "Mi iscrivo come allenatore e posso collegarmi a una societa.",
    icon: Dumbbell,
  },
] satisfies {
  value: RegisterPayload["role"];
  label: string;
  description: string;
  icon: typeof Building2;
}[];

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    role: "DIRECTOR" as RegisterPayload["role"],
    organizationName: "",
    organizationSlug: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedRole =
    registrationRoles.find((role) => role.value === form.role) ??
    registrationRoles[0]!;

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
        organizationName:
          form.role === "DIRECTOR"
            ? form.organizationName || undefined
            : undefined,
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
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-24">
      <Card className="relative mt-12 w-full max-w-3xl overflow-visible p-6 pt-24">
        <div className="absolute left-1/2 top-0 flex h-32 w-56 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background px-5 shadow-sm">
          <img src="/logo/logo_court_vision.svg" alt="CourtVision" className="max-h-24 w-full object-contain" />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Registrazione</h1>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {registrationRoles.map((role) => {
            const Icon = role.icon;
            const active = form.role === role.value;
            return (
              <button
                key={role.value}
                type="button"
                className={cn(
                  "rounded-md border border-border p-4 text-left transition hover:bg-muted",
                  active && "border-primary bg-primary/10",
                )}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    role: role.value,
                  }))
                }
              >
                <Icon className="mb-3 h-5 w-5 text-primary" />
                <p className="font-medium">{role.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {role.description}
                </p>
              </button>
            );
          })}
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">{selectedRole.label}</p>
            <p className="mt-1 text-muted-foreground">
              {selectedRole.description}
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Nome utente</span>
            <Input
              autoComplete="username"
              placeholder="nomeutente"
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
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
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
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
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
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
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
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
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
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
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
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
                value={form.birthDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    birthDate: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Slug societa</span>
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
          {form.role === "DIRECTOR" && (
            <label className="block space-y-2">
              <span className="text-sm font-medium">Nome societa</span>
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
          )}
          {error && <p className="text-sm text-primary">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}
          <Button className="w-full" disabled={loading}>
            <UserPlus className="mr-2 h-4 w-4" />
            {loading ? "Registrazione in corso" : "Registrati"}
          </Button>
        </form>
        <Button asChild variant="ghost" className="mt-4 w-full">
          <Link href="/login">Hai gia un account? Accedi</Link>
        </Button>
      </Card>
    </main>
  );
}
