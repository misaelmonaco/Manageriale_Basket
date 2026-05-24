"use client";

import { ResourceManager, isoDateTime, useResourceOptions } from "@/components/resource-manager";

type Team = { id: string; name: string; season: string };
type Match = {
  id: string;
  opponentName: string;
  startsAt: string;
  location: string;
  status: string;
  homeTeam: { name: string };
};

export default function MatchesPage() {
  const teams = useResourceOptions<Team>("/teams", (team) => ({
    value: team.id,
    label: `${team.name} (${team.season})`,
  }));

  return (
    <ResourceManager<Match>
      title="Matches"
      description="Schedule fixtures, locations, results, and opponent details."
      actionLabel="New match"
      endpoint="/matches"
      columns={["Team", "Opponent", "Date", "Location", "Status"]}
      createAllowedRoles={["SUPER_ADMIN", "DIRECTOR", "COACH"]}
      deleteAllowedRoles={["SUPER_ADMIN", "DIRECTOR", "COACH"]}
      fields={[
        { name: "homeTeamId", label: "Team", type: "select", options: teams, required: true },
        { name: "opponentName", label: "Opponent", required: true },
        { name: "startsAt", label: "Date and time", type: "datetime-local", required: true },
        { name: "location", label: "Location", required: true },
      ]}
      buildPayload={(values) => ({ ...values, startsAt: new Date(values.startsAt ?? "").toISOString() })}
      mapRow={(match, actions) => [
        match.homeTeam.name,
        match.opponentName,
        isoDateTime(match.startsAt),
        match.location,
        match.status,
        actions,
      ]}
    />
  );
}
