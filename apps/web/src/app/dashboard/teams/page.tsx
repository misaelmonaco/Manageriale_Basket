"use client";

import Link from "next/link";
import { ResourceManager } from "@/components/resource-manager";

type Team = {
  id: string;
  name: string;
  category: string;
  season: string;
  _count?: { players: number; coaches: number };
};

export default function TeamsPage() {
  return (
    <ResourceManager<Team>
      title="Teams"
      description="Manage rosters, age groups, seasons, and coaching assignments."
      actionLabel="New team"
      endpoint="/teams"
      exportFilename="teams.csv"
      columns={["Team", "Category", "Season", "Players", "Coaches"]}
      createAllowedRoles={["SUPER_ADMIN", "DIRECTOR", "COACH"]}
      deleteAllowedRoles={["SUPER_ADMIN", "DIRECTOR", "COACH"]}
      fields={[
        { name: "name", label: "Team", required: true },
        {
          name: "category",
          label: "Category",
          required: true,
          placeholder: "Under 18",
        },
        {
          name: "season",
          label: "Season",
          required: true,
          placeholder: "2026",
        },
      ]}
      buildPayload={(values) => ({
        ...Object.fromEntries(
          Object.entries(values).filter(([, value]) => value !== ""),
        ),
        organizationSlug:
          localStorage.getItem("selectedOrganizationSlug") || undefined,
      })}
      mapRow={(team, actions) => [
        <Link
          key="team"
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={`/dashboard/teams/${team.id}`}
        >
          {team.name}
        </Link>,
        team.category,
        team.season,
        String(team._count?.players ?? 0),
        String(team._count?.coaches ?? 0),
        actions,
      ]}
      exportRows={(teams) =>
        teams.map((team) => ({
          Team: team.name,
          Category: team.category,
          Season: team.season,
          Players: team._count?.players ?? 0,
          Coaches: team._count?.coaches ?? 0,
        }))
      }
    />
  );
}
