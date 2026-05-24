"use client";

import { CalendarPlus, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { isoDateTime, useResourceOptions } from "@/components/resource-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createResource, deleteResource, listResource } from "@/lib/api";

type Team = { id: string; name: string; season: string };
type Training = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  notes: string | null;
  team: { name: string };
};
type Match = {
  id: string;
  opponentName: string;
  startsAt: string;
  location: string;
  status: string;
  homeTeam: { name: string };
};

const eventTypes = [
  { value: "training", label: "Training" },
  { value: "match", label: "Match" },
];

function canEditCalendar() {
  if (typeof window === "undefined") return false;
  return ["SUPER_ADMIN", "DIRECTOR", "COACH"].includes(localStorage.getItem("role") ?? "");
}

export default function CalendarPage() {
  const teams = useResourceOptions<Team>("/teams", (team) => ({
    value: team.id,
    label: `${team.name} (${team.season})`,
  }));
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eventType, setEventType] = useState("training");
  const [form, setForm] = useState({
    teamId: "",
    title: "",
    opponentName: "",
    startsAt: "",
    endsAt: "",
    location: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const editable = canEditCalendar();

  async function load() {
    setError(null);
    try {
      const [trainingPage, matchPage] = await Promise.all([
        listResource<Training>("/trainings"),
        listResource<Match>("/matches"),
      ]);
      setTrainings(trainingPage.data);
      setMatches(matchPage.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load calendar.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      if (eventType === "training") {
        await createResource("/trainings", {
          teamId: form.teamId,
          title: form.title,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt || form.startsAt).toISOString(),
          location: form.location,
          notes: form.notes || undefined,
        });
      } else {
        await createResource("/matches", {
          homeTeamId: form.teamId,
          opponentName: form.opponentName,
          startsAt: new Date(form.startsAt).toISOString(),
          location: form.location,
        });
      }
      setForm({ teamId: "", title: "", opponentName: "", startsAt: "", endsAt: "", location: "", notes: "" });
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save event.");
    }
  }

  async function remove(path: string) {
    setError(null);
    try {
      await deleteResource(path);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete event.");
    }
  }

  const events = [
    ...trainings.map((training) => ({
      id: training.id,
      type: "Training",
      title: training.title,
      team: training.team.name,
      startsAt: training.startsAt,
      when: `${isoDateTime(training.startsAt)} - ${isoDateTime(training.endsAt)}`,
      location: training.location,
      deletePath: `/trainings/${training.id}`,
    })),
    ...matches.map((match) => ({
      id: match.id,
      type: "Match",
      title: `vs ${match.opponentName}`,
      team: match.homeTeam.name,
      startsAt: match.startsAt,
      when: isoDateTime(match.startsAt),
      location: match.location,
      deletePath: `/matches/${match.id}`,
    })),
  ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <>
      <PageHeader title="Calendar" description="Training sessions and matches by team." />
      {editable && (
        <Card className="mb-6 p-4">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Event type</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                value={eventType}
                onChange={(event) => setEventType(event.target.value)}
              >
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Team</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                value={form.teamId}
                onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))}
                required
              >
                <option value="">Select</option>
                {teams.map((team) => (
                  <option key={team.value} value={team.value}>{team.label}</option>
                ))}
              </select>
            </label>
            {eventType === "training" ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium">Title</span>
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
              </label>
            ) : (
              <label className="block space-y-2">
                <span className="text-sm font-medium">Opponent</span>
                <Input value={form.opponentName} onChange={(event) => setForm((current) => ({ ...current, opponentName: event.target.value }))} required />
              </label>
            )}
            <label className="block space-y-2">
              <span className="text-sm font-medium">Starts at</span>
              <Input type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} required />
            </label>
            {eventType === "training" && (
              <label className="block space-y-2">
                <span className="text-sm font-medium">Ends at</span>
                <Input type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} required />
              </label>
            )}
            <label className="block space-y-2">
              <span className="text-sm font-medium">Location</span>
              <Input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} required />
            </label>
            {eventType === "training" && (
              <label className="block space-y-2">
                <span className="text-sm font-medium">Notes</span>
                <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            )}
            <div className="flex items-end">
              <Button className="w-full">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add event
              </Button>
            </div>
          </form>
        </Card>
      )}
      {error && <p className="mb-4 text-sm text-primary">{error}</p>}
      <div className="grid gap-3">
        {events.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No calendar events</Card>}
        {events.map((event) => (
          <Card key={`${event.type}-${event.id}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase text-muted-foreground">{event.type} - {event.team}</p>
              <h3 className="font-medium">{event.title}</h3>
              <p className="text-sm text-muted-foreground">{event.when} - {event.location}</p>
            </div>
            {editable && (
              <Button variant="ghost" size="icon" aria-label="Delete event" onClick={() => void remove(event.deletePath)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
