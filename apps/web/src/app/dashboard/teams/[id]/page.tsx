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

type Payment = { id: string; amountCents: number; dueDate: string; status: string };
type TeamPlayer = {
  id: string;
  birthDate: string;
  jerseyNumber: number | null;
  medicalExpiresAt: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; birthDate: string | null } | null;
  payments: Payment[];
};
type TeamDetail = {
  id: string;
  name: string;
  category: string;
  season: string;
  organization: { name: string; slug: string };
  players: TeamPlayer[];
  coaches: { coach: { user: { firstName: string; lastName: string; email: string } } }[];
  _count: { players: number; coaches: number; trainings: number; homeMatches: number };
};

function playerName(player: TeamPlayer) {
  return player.user ? `${player.user.firstName} ${player.user.lastName}` : "Unassigned";
}

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setTeam(await apiFetch<TeamDetail>(`/teams/${params.id}`, clientAuth()));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load team.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [params.id]);

  if (loading) return <Card className="p-6 text-sm text-muted-foreground">Loading</Card>;
  if (error) return <p className="text-sm text-primary">{error}</p>;
  if (!team) return null;

  return (
    <>
      <PageHeader
        title={team.name}
        description={`${team.category} - ${team.season} - ${team.organization.name}`}
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/teams">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Teams
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-sm text-muted-foreground">Players</p><p className="text-2xl font-semibold">{team._count.players}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Coaches</p><p className="text-2xl font-semibold">{team._count.coaches}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Trainings</p><p className="text-2xl font-semibold">{team._count.trainings}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Matches</p><p className="text-2xl font-semibold">{team._count.homeMatches}</p></Card>
      </div>

      <Card className="mb-6 p-4">
        <h2 className="mb-3 text-base font-semibold">Coaches</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {team.coaches.map((item, index) => (
            <div key={index} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">{item.coach.user.firstName} {item.coach.user.lastName}</p>
              <p className="text-muted-foreground">{item.coach.user.email}</p>
            </div>
          ))}
          {team.coaches.length === 0 && <p className="text-sm text-muted-foreground">No coaches assigned</p>}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Birth date</th>
                <th className="px-4 py-3 font-medium">Jersey</th>
                <th className="px-4 py-3 font-medium">Medical expires</th>
                <th className="px-4 py-3 font-medium">Latest payment</th>
              </tr>
            </thead>
            <tbody>
              {team.players.length === 0 && (
                <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>No players</td></tr>
              )}
              {team.players.map((player) => {
                const latestPayment = player.payments[0];
                return (
                  <tr key={player.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      <Link className="text-primary underline-offset-4 hover:underline" href={`/dashboard/players/${player.id}`}>
                        {playerName(player)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{player.user?.email ?? ""}</td>
                    <td className="px-4 py-3">{isoDate(player.birthDate)}</td>
                    <td className="px-4 py-3">{player.jerseyNumber ?? ""}</td>
                    <td className="px-4 py-3">{isoDate(player.medicalExpiresAt)}</td>
                    <td className="px-4 py-3">{latestPayment ? `${fromCents(latestPayment.amountCents)} - ${latestPayment.status}` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
