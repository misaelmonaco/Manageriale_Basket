"use client";

import { KeyRound, User } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, clientAuth, updateOwnPassword } from "@/lib/api";

type Profile = {
  id: string;
  organizationId: string | null;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: string;
  organization: { name: string; slug: string } | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setProfile(await apiFetch<Profile>("/auth/me", clientAuth()));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load profile.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("La conferma password non coincide.");
      return;
    }

    setSaving(true);
    try {
      await updateOwnPassword(password);
      setPassword("");
      setConfirmPassword("");
      setSuccess(
        "Password aggiornata. Effettua di nuovo l'accesso al prossimo login.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Password non aggiornata.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" description="Account details and security." />
      {loading && (
        <Card className="p-6 text-sm text-muted-foreground">Loading</Card>
      )}
      {!loading && profile && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Account</h2>
            </div>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">
                  {profile.firstName} {profile.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-words font-medium">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Username</dt>
                <dd className="font-medium">{profile.username ?? ""}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ruolo</dt>
                <dd className="font-medium">{profile.role}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Organizzazione</dt>
                <dd className="font-medium">
                  {profile.organization?.name ?? "Nessuna"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Cambio password</h2>
            </div>
            <form className="space-y-4" onSubmit={submit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Nuova password</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Conferma password</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </label>
              {error && <p className="text-sm text-primary">{error}</p>}
              {success && <p className="text-sm text-emerald-700">{success}</p>}
              <Button className="w-full sm:w-auto" disabled={saving}>
                {saving ? "Salvataggio" : "Aggiorna password"}
              </Button>
            </form>
          </Card>
        </div>
      )}
      {!loading && !profile && !error && (
        <Card className="p-6 text-sm text-muted-foreground">
          No profile data
        </Card>
      )}
      {!loading && error && !profile && (
        <p className="text-sm text-primary">{error}</p>
      )}
    </>
  );
}
