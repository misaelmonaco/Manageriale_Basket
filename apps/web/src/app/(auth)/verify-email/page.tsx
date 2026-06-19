"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { verifyEmail } from "@/lib/api";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus("error");
        return;
      }

      try {
        await verifyEmail(token);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    }

    void verify();
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-24">
      <Card className="w-full max-w-md p-6 text-center">
        {status === "loading" && <p className="text-sm text-muted-foreground">Verifica email in corso...</p>}
        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
            <h1 className="text-xl font-semibold">Email verificata</h1>
            <p className="mt-2 text-sm text-muted-foreground">Ora puoi accedere al tuo account.</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="text-xl font-semibold">Link non valido</h1>
            <p className="mt-2 text-sm text-muted-foreground">Il link e scaduto o non e corretto. Puoi richiederne uno nuovo dalla schermata di accesso.</p>
          </>
        )}
        <Button asChild className="mt-6 w-full">
          <Link href="/login">Vai al login</Link>
        </Button>
      </Card>
    </main>
  );
}
