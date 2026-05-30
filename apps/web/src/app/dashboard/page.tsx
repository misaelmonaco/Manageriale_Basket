"use client";

import { CalendarDays, CreditCard, Euro, Shield, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { fromCents, isoDate, isoDateTime } from "@/components/resource-manager";
import { Card } from "@/components/ui/card";
import { apiFetch, clientAuth } from "@/lib/api";

type Role = "SUPER_ADMIN" | "DIRECTOR" | "COACH" | "PLAYER" | "PARENT";
type TeamRef = { id: string; name: string; season: string };
type Organization = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  subscription: string;
  _count: { users: number; teams: number; players: number; coaches: number; matches: number; payments: number };
};
type Training = { id: string; title: string; startsAt: string; endsAt: string; location: string; team: TeamRef };
type Match = { id: string; opponentName: string; startsAt: string; location: string; status: string; homeTeam: TeamRef };
type Payment = { id: string; description: string; amountCents: number; dueDate: string; status: string };
type Overview =
  | { role: "SUPER_ADMIN"; totals: { organizations: number }; organizations: Organization[] }
  | {
      role: "DIRECTOR";
      totals: {
        totalPlayers: number;
        playersWithDuePayments: number;
        matches: number;
        trainings: number;
        paymentAmountCents: number;
        receivedPaymentAmountCents: number;
        pendingPaymentAmountCents: number;
        expenseAmountCents: number;
      };
      matches: Match[];
      trainings: Training[];
    }
  | { role: "COACH"; totals: { trainings: number; matches: number }; trainings: Training[]; matches: Match[] }
  | { role: "PLAYER" | "PARENT"; totals?: { trainings: number; matches: number; payments: number }; trainings: Training[]; matches: Match[]; payments: Payment[] };

function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Users }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
    </Card>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">{children}</p>;
}

function ratioPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function GaugeCard({
  title,
  value,
  total,
  valueLabel,
  totalLabel,
  icon: Icon,
}: {
  title: string;
  value: number;
  total: number;
  valueLabel: string;
  totalLabel: string;
  icon: typeof Users;
}) {
  const percent = ratioPercent(value, total);
  const background = `conic-gradient(hsl(var(--primary)) 0deg ${percent * 1.8}deg, hsl(var(--accent)) ${percent * 1.8}deg 180deg, transparent 180deg 360deg)`;

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{valueLabel}</p>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="mx-auto w-full max-w-[260px]">
        <div className="relative aspect-[2/1] overflow-hidden">
          <div className="absolute inset-0 rounded-t-full" style={{ background }} />
          <div className="absolute inset-x-[13%] bottom-0 aspect-[2/1] rounded-t-full bg-card" />
          <div className="absolute inset-x-0 bottom-1 text-center">
            <p className="text-3xl font-semibold">{percent}%</p>
            <p className="text-xs text-muted-foreground">{totalLabel}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-border p-3">
          <p className="text-muted-foreground">{valueLabel}</p>
          <p className="mt-1 font-semibold">{fromCents(value)}</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-muted-foreground">{totalLabel}</p>
          <p className="mt-1 font-semibold">{fromCents(total)}</p>
        </div>
      </div>
    </Card>
  );
}

function EventList({ title, events, type }: { title: string; events: (Training | Match)[]; type: "training" | "match" }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      <div className="space-y-3">
        {events.map((event) => {
          const isMatch = type === "match";
          const match = event as Match;
          const training = event as Training;
          return (
            <div key={`${type}-${event.id}`} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{isMatch ? `vs ${match.opponentName}` : training.title}</p>
                  <p className="text-muted-foreground">{isMatch ? match.homeTeam.name : training.team.name}</p>
                </div>
                <p className="text-muted-foreground">{isoDateTime(event.startsAt)}</p>
              </div>
              <p className="mt-2 text-muted-foreground">{event.location}</p>
            </div>
          );
        })}
        {events.length === 0 && <Empty>No scheduled items</Empty>}
      </div>
    </Card>
  );
}

function SuperAdminOverview({ overview }: { overview: Extract<Overview, { role: "SUPER_ADMIN" }> }) {
  return (
    <>
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Organizations" value={overview.totals.organizations} icon={Shield} />
        <StatCard label="Teams" value={overview.organizations.reduce((sum, item) => sum + item._count.teams, 0)} icon={Users} />
        <StatCard label="Players" value={overview.organizations.reduce((sum, item) => sum + item._count.players, 0)} icon={Users} />
        <StatCard label="Matches" value={overview.organizations.reduce((sum, item) => sum + item._count.matches, 0)} icon={Trophy} />
      </section>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Users</th>
                <th className="px-4 py-3 font-medium">Teams</th>
                <th className="px-4 py-3 font-medium">Players</th>
                <th className="px-4 py-3 font-medium">Coaches</th>
              </tr>
            </thead>
            <tbody>
              {overview.organizations.map((organization) => (
                <tr key={organization.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{organization.name}</td>
                  <td className="px-4 py-3">{organization.slug}</td>
                  <td className="px-4 py-3">{organization.subscription}</td>
                  <td className="px-4 py-3">{organization._count.users}</td>
                  <td className="px-4 py-3">{organization._count.teams}</td>
                  <td className="px-4 py-3">{organization._count.players}</td>
                  <td className="px-4 py-3">{organization._count.coaches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function DirectorOverview({ overview }: { overview: Extract<Overview, { role: "DIRECTOR" }> }) {
  return (
    <>
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Matches next month" value={overview.totals.matches} icon={Trophy} />
        <StatCard label="Trainings next month" value={overview.totals.trainings} icon={CalendarDays} />
        <StatCard label="Players" value={overview.totals.totalPlayers} icon={Users} />
        <StatCard label="Players with due payments" value={overview.totals.playersWithDuePayments} icon={CreditCard} />
      </section>
      <section className="mb-6 grid gap-4 xl:grid-cols-2">
        <GaugeCard
          title="Payments vs expenses"
          value={overview.totals.paymentAmountCents}
          total={overview.totals.expenseAmountCents}
          valueLabel="Payments"
          totalLabel="Expenses"
          icon={Euro}
        />
        <GaugeCard
          title="Received vs open"
          value={overview.totals.receivedPaymentAmountCents}
          total={overview.totals.receivedPaymentAmountCents + overview.totals.pendingPaymentAmountCents}
          valueLabel="Received"
          totalLabel="Expected"
          icon={CreditCard}
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <EventList title="Matches next month" events={overview.matches} type="match" />
        <EventList title="Trainings next month" events={overview.trainings} type="training" />
      </div>
    </>
  );
}

function CoachOverview({ overview }: { overview: Extract<Overview, { role: "COACH" }> }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <EventList title="Trainings this week" events={overview.trainings} type="training" />
      <EventList title="Upcoming matches" events={overview.matches} type="match" />
    </div>
  );
}

function PlayerOverview({ overview }: { overview: Extract<Overview, { role: "PLAYER" | "PARENT" }> }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <EventList title="Upcoming matches" events={overview.matches} type="match" />
        <EventList title="Upcoming trainings" events={overview.trainings} type="training" />
      </div>
      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold">Payments due</h2>
        <div className="space-y-3">
          {overview.payments.map((payment) => (
            <div key={payment.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{payment.description}</p>
                  <p className="text-muted-foreground">Due {isoDate(payment.dueDate)}</p>
                </div>
                <p className="font-semibold">{fromCents(payment.amountCents)}</p>
              </div>
            </div>
          ))}
          {overview.payments.length === 0 && <Empty>No payments due</Empty>}
        </div>
      </Card>
    </div>
  );
}

function titleForRole(role: Role) {
  if (role === "SUPER_ADMIN") return "Organizations Overview";
  if (role === "DIRECTOR") return "Club Overview";
  if (role === "COACH") return "Coach Overview";
  return "Player Overview";
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setOverview(await apiFetch<Overview>("/overview", clientAuth()));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load overview.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const role = overview?.role ?? ((typeof window === "undefined" ? "DIRECTOR" : localStorage.getItem("role") ?? "DIRECTOR") as Role);

  return (
    <>
      <PageHeader title={titleForRole(role)} description="Operational snapshot for your current role." />
      {loading && <Card className="p-6 text-sm text-muted-foreground">Loading</Card>}
      {error && <p className="text-sm text-primary">{error}</p>}
      {overview?.role === "SUPER_ADMIN" && <SuperAdminOverview overview={overview} />}
      {overview?.role === "DIRECTOR" && <DirectorOverview overview={overview} />}
      {overview?.role === "COACH" && <CoachOverview overview={overview} />}
      {(overview?.role === "PLAYER" || overview?.role === "PARENT") && <PlayerOverview overview={overview} />}
      {!loading && !error && !overview && (
        <Card className="p-6 text-sm text-muted-foreground">
          <Link className="text-primary underline-offset-4 hover:underline" href="/dashboard/calendar">Open calendar</Link>
        </Card>
      )}
    </>
  );
}
