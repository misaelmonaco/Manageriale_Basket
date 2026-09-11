"use client";

import { CheckCircle2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/lib/api";

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Le due password non coincidono.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
      // The reset revoked every active session, so the login page is the only
      // sensible destination.
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Il link non e valido o e scaduto. Richiedine uno nuovo.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md p-6 text-center">
        <h1 className="text-xl font-semibold">Link non valido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apri il link che ti abbiamo inviato via email, oppure richiedine uno nuovo.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/forgot-password">Richiedi un nuovo link</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Nuova password</h1>
      </div>

      {done ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
          <p className="text-sm text-muted-foreground">
            Password aggiornata. Ti stiamo portando alla schermata di accesso.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href="/login">Vai al login</Link>
          </Button>
        </div>
      ) : (
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
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              minLength={8}
            />
          </label>
          {error && <p className="text-sm text-primary">{error}</p>}
          <Button className="w-full" disabled={loading}>
            <KeyRound className="mr-2 h-4 w-4" />
            {loading ? "Salvataggio" : "Imposta la password"}
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-24">
      <Suspense
        fallback={
          <Card className="w-full max-w-md p-6 text-center">
            <p className="text-sm text-muted-foreground">Caricamento...</p>
          </Card>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </main>
  );
}
