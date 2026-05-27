"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import {
  ResourceManager,
  isoDate,
  useResourceOptions,
} from "@/components/resource-manager";
import { Button } from "@/components/ui/button";
import { updateUserPassword } from "@/lib/api";

type Team = { id: string; name: string; season: string };
type Player = {
  id: string;
  birthDate: string;
  jerseyNumber: number | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  team: { name: string } | null;
};

export default function PlayersPage() {
  const teams = useResourceOptions<Team>("/teams", (team) => ({
    value: team.id,
    label: `${team.name} (${team.season})`,
  }));

  async function changePassword(player: Player) {
    if (!player.user) return;
    const password = window.prompt(
      `New password for ${player.user.firstName} ${player.user.lastName}`,
    );
    if (!password) return;
    try {
      await updateUserPassword(player.user.id, password);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to update password.",
      );
    }
  }

  return (
    <ResourceManager<Player>
      title="Players"
      description="Player records, parent links, medical deadlines, and team placement."
      actionLabel="New player"
      endpoint="/players"
      exportFilename="players.csv"
      columns={["Name", "Email", "Team", "Birth date", "Jersey"]}
      createAllowedRoles={["SUPER_ADMIN", "DIRECTOR", "COACH"]}
      deleteAllowedRoles={["SUPER_ADMIN", "DIRECTOR", "COACH"]}
      fields={[
        { name: "firstName", label: "Name", required: true },
        { name: "lastName", label: "Surname" },
        { name: "username", label: "Username" },
        { name: "email", label: "Email", type: "email", required: true },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: true,
        },
        {
          name: "birthDate",
          label: "Birth date",
          type: "date",
          required: true,
        },
        { name: "teamId", label: "Team", type: "select", options: teams },
        { name: "jerseyNumber", label: "Jersey", type: "number", min: 0 },
      ]}
      buildPayload={(values) => ({
        ...Object.fromEntries(
          Object.entries(values).filter(([, value]) => value !== ""),
        ),
        organizationSlug:
          localStorage.getItem("selectedOrganizationSlug") || undefined,
        jerseyNumber: values.jerseyNumber
          ? Number(values.jerseyNumber)
          : undefined,
      })}
      mapRow={(player, actions) => [
        <Link
          key="player"
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={`/dashboard/players/${player.id}`}
        >
          {player.user
            ? `${player.user.firstName} ${player.user.lastName}`
            : "Unassigned"}
        </Link>,
        player.user?.email ?? "",
        player.team?.name ?? "",
        isoDate(player.birthDate),
        player.jerseyNumber ?? "",
        <div key="actions" className="flex items-center gap-1">
          {player.user && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Change password"
              onClick={() => void changePassword(player)}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
          )}
          {actions}
        </div>,
      ]}
      exportRows={(players) =>
        players.map((player) => ({
          Name: player.user
            ? `${player.user.firstName} ${player.user.lastName}`
            : "Unassigned",
          Email: player.user?.email ?? "",
          Team: player.team?.name ?? "",
          "Birth date": isoDate(player.birthDate),
          Jersey: player.jerseyNumber ?? "",
        }))
      }
    />
  );
}
