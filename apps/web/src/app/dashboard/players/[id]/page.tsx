"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { fromCents, isoDate } from "@/components/resource-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch, clientAuth } from "@/lib/api";

type Payment = { id: string; description: string; amountCents: number; dueDate: string; paidAt: string | null; status: string };
type PlayerDetail = {
  id: string;
  birthDate: string;
  jerseyNumber: number | null;
  medicalExpiresAt: string | null;
  assignmentStatus: string;
  user: { id: string; username: string | null; firstName: string; lastName: string; email: string; birthDate: string | null; isActive: boolean } | null;
  organization: { name: string; slug: string } | null;
  team: { id: string; name: string; category: string; season: string } | null;
  parents: { parent: { firstName: string; lastName: string; email: string } }[];
  payments: Payment[];
};

function statusClass(status: string) {
  return status === "PAID" ? "bg-emerald-500" : "bg-red-500";
}

function PaymentStatus({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium">
      <span className={`h-2.5 w-2.5 rounded-full ${statusClass(status)}`} />
      {status === "PAID" ? "Pagato" : "Da pagare"}
    </span>
  );
}

export default function PlayerDetailPage() {
  const params = useParams<{ id: string }>();
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setPlayer(await apiFetch<PlayerDetail>(`/players/${params.id}`, clientAuth()));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load player.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [params.id]);

  if (loading) return <Card className="p-6 text-sm text-muted-foreground">Loading</Card>;
  if (error) return <p className="text-sm text-primary">{error}</p>;
  if (!player) return null;

  const fullName = player.user ? `${player.user.firstName} ${player.user.lastName}` : "Unassigned player";

  return (
    <>
      <PageHeader
        title={fullName}
        description={player.team ? `${player.team.name} - ${player.team.category} - ${player.team.season}` : "No team assigned"}
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/players">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Players
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-4 text-base font-semibold">Biographical data</h2>
            <dl className="grid gap-3 text-sm">
              <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{player.user?.email ?? ""}</dd></div>
              <div><dt className="text-muted-foreground">Username</dt><dd className="font-medium">{player.user?.username ?? ""}</dd></div>
              <div><dt className="text-muted-foreground">Birth date</dt><dd className="font-medium">{isoDate(player.birthDate)}</dd></div>
              <div><dt className="text-muted-foreground">Jersey number</dt><dd className="font-medium">{player.jerseyNumber ?? ""}</dd></div>
              <div><dt className="text-muted-foreground">Medical expires</dt><dd className="font-medium">{isoDate(player.medicalExpiresAt)}</dd></div>
              <div><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{player.assignmentStatus}</dd></div>
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="mb-4 text-base font-semibold">Team</h2>
            {player.team ? (
              <div className="text-sm">
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/dashboard/teams/${player.team.id}`}>
                  {player.team.name}
                </Link>
                <p className="text-muted-foreground">{player.team.category} - {player.team.season}</p>
                <p className="mt-3 text-muted-foreground">{player.organization?.name ?? ""}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No team assigned</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-4 text-base font-semibold">Parents</h2>
            <div className="space-y-2">
              {player.parents.map((link, index) => (
                <div key={index} className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">{link.parent.firstName} {link.parent.lastName}</p>
                  <p className="text-muted-foreground">{link.parent.email}</p>
                </div>
              ))}
              {player.parents.length === 0 && <p className="text-sm text-muted-foreground">No parents linked</p>}
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="text-base font-semibold">Payments</h2>
          </div>
          <div className="space-y-3 p-4 sm:hidden">
            {player.payments.length === 0 && <p className="text-sm text-muted-foreground">No payments</p>}
            {player.payments.map((payment) => (
              <div key={payment.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{payment.description}</p>
                    <p className="text-muted-foreground">Due {isoDate(payment.dueDate)}</p>
                  </div>
                  <p className="shrink-0 font-semibold">{fromCents(payment.amountCents)}</p>
                </div>
                <div className="mt-3">
                  <PaymentStatus status={payment.status} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {player.payments.length === 0 && (
                  <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>No payments</td></tr>
                )}
                {player.payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{payment.description}</td>
                    <td className="px-4 py-3">{fromCents(payment.amountCents)}</td>
                    <td className="px-4 py-3">{isoDate(payment.dueDate)}</td>
                    <td className="px-4 py-3">
                      <PaymentStatus status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
