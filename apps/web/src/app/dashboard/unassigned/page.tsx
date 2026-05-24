"use client";

import { UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch, clientAuth, type ApiPage } from "@/lib/api";

type ProfileType = "PLAYER" | "COACH";
type Organization = { id: string; name: string; slug: string };
type Team = { id: string; name: string; season: string; organizationId: string };
type Svincolato = {
  id: string;
  type: ProfileType;
  assignmentStatus: "ASSIGNED" | "UNASSIGNED";
  user: { firstName: string; lastName: string; email: string };
  organization?: Organization | null;
  team?: Team | null;
  teams?: { team: Team }[];
};

type UnassignedResponse = {
  players: Omit<Svincolato, "type">[];
  coaches: Omit<Svincolato, "type">[];
};

type RowState = { organizationId?: string; organizationSlug?: string; teamId?: string };

function role() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("role") ?? "";
}

export default function UnassignedPage() {
  const [profiles, setProfiles] = useState<Svincolato[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teamsByProfile, setTeamsByProfile] = useState<Record<string, Team[]>>({});
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSuperAdmin = role() === "SUPER_ADMIN";

  const rows = useMemo(
    () =>
      profiles.map((profile) => ({
        ...profile,
        teamLabel:
          profile.type === "PLAYER"
            ? profile.team?.name ?? ""
            : profile.teams?.map((item) => item.team.name).join(", ") ?? "",
      })),
    [profiles],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<UnassignedResponse>("/unassigned", clientAuth());
      setProfiles([
        ...response.players.map((player) => ({ ...player, type: "PLAYER" as const })),
        ...response.coaches.map((coach) => ({ ...coach, type: "COACH" as const })),
      ]);

      if (isSuperAdmin) {
        const organizationPage = await apiFetch<ApiPage<Organization>>("/organizations", clientAuth());
        setOrganizations(organizationPage.data);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load svincolati.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTeams(profileId: string, organization?: Organization) {
    try {
      const auth = clientAuth();
      const response = await apiFetch<ApiPage<Team>>("/teams", {
        ...auth,
        organizationSlug: organization?.slug ?? auth.organizationSlug,
      });
      setTeamsByProfile((current) => ({ ...current, [profileId]: response.data }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load teams.");
      setTeamsByProfile((current) => ({ ...current, [profileId]: [] }));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function assign(profile: Svincolato) {
    const state = rowState[profile.id] ?? {};
    if (!state.teamId) {
      setError("Select a team before assigning.");
      return;
    }

    setSavingId(profile.id);
    setError(null);
    try {
      await apiFetch(`/unassigned/${profile.id}/assign-team`, {
        ...clientAuth(),
        method: "POST",
        body: JSON.stringify({
          profileType: profile.type,
          organizationId: isSuperAdmin ? state.organizationId : undefined,
          teamId: state.teamId,
        }),
      });
      await load();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Unable to assign profile.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <PageHeader title="Svincolati" description="Players and coaches waiting for organization or team assignment." />
      {error && <p className="mb-4 text-sm text-primary">{error}</p>}
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Current team</th>
                  <th className="px-4 py-3 font-medium">Assign</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>
                      No svincolati
                    </td>
                  </tr>
                )}
                {rows.map((profile) => {
                  const state = rowState[profile.id] ?? {};
                  const teams = teamsByProfile[profile.id] ?? [];
                  return (
                    <tr key={`${profile.type}-${profile.id}`} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">
                        {profile.user.firstName} {profile.user.lastName}
                      </td>
                      <td className="px-4 py-3">{profile.type}</td>
                      <td className="px-4 py-3">{profile.user.email}</td>
                      <td className="px-4 py-3">{profile.organization?.name ?? "Svincolato"}</td>
                      <td className="px-4 py-3">{profile.teamLabel}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {isSuperAdmin && (
                            <select
                              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                              value={state.organizationId ?? ""}
                              onChange={(event) => {
                                const organization = organizations.find((item) => item.id === event.target.value);
                                setRowState((current) => ({
                                  ...current,
                                  [profile.id]: {
                                    organizationId: organization?.id,
                                    organizationSlug: organization?.slug,
                                    teamId: "",
                                  },
                                }));
                                void loadTeams(profile.id, organization);
                              }}
                            >
                              <option value="">Organization</option>
                              {organizations.map((organization) => (
                                <option key={organization.id} value={organization.id}>
                                  {organization.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {!isSuperAdmin && teams.length === 0 && (
                            <Button variant="outline" size="sm" onClick={() => void loadTeams(profile.id)}>
                              Load teams
                            </Button>
                          )}
                          <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                            value={state.teamId ?? ""}
                            onFocus={() => {
                              if (!isSuperAdmin && teams.length === 0) void loadTeams(profile.id);
                            }}
                            onChange={(event) =>
                              setRowState((current) => ({
                                ...current,
                                [profile.id]: { ...current[profile.id], teamId: event.target.value },
                              }))
                            }
                          >
                            <option value="">Team</option>
                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name} ({team.season})
                              </option>
                            ))}
                          </select>
                          <Button size="sm" disabled={savingId === profile.id} onClick={() => void assign(profile)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            {savingId === profile.id ? "Assigning" : "Assign"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
