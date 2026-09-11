"use client";

import { MailCheck, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setError("Non riesco a inviare il link. Riprova tra qualche minuto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-24">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Password dimenticata</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inserisci la tua email: se e associata a un account, ti invieremo un link per reimpostare la password.
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
            <p className="text-sm text-muted-foreground">
              Se l&apos;indirizzo e registrato, il link e in arrivo. Controlla anche la posta indesiderata.
            </p>
          </div>
        ) : (
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
            {error && <p className="text-sm text-primary">{error}</p>}
            <Button className="w-full" disabled={loading}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Invio in corso" : "Invia il link"}
            </Button>
          </form>
        )}

        <div className="mt-4">
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">Torna al login</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
