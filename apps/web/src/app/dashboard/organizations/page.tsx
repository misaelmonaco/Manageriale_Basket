"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { ResourceManager } from "@/components/resource-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch, clientAuth } from "@/lib/api";

type Organization = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  subscription: string;
  settings?: Record<string, unknown>;
};

type OrganizationDetail = Organization & {
  fiscalCode: string | null;
  users: { id: string; firstName: string; lastName: string; email: string }[];
  _count: {
    users: number;
    teams: number;
    players: number;
    coaches: number;
    matches: number;
  };
  teams: {
    id: string;
    name: string;
    category: string;
    season: string;
    _count: { players: number; coaches: number; trainings: number };
  }[];
};

function directorName(organization: OrganizationDetail) {
  const director = organization.users[0];
  return director ? `${director.firstName} ${director.lastName}`.trim() || director.email : "Non assegnato";
}

export default function OrganizationsPage() {
  const [selected, setSelected] = useState<OrganizationDetail | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [detailError, setDetailError] = useState<string | null>(null);

  async function selectOrganization(organization: Organization) {
    setDetailError(null);
    localStorage.setItem("selectedOrganizationId", organization.id);
    localStorage.setItem("selectedOrganizationSlug", organization.slug);
    localStorage.setItem("selectedOrganizationName", organization.name);
    setSelectedSlug(organization.slug);
    window.dispatchEvent(new Event("branding-updated"));

    try {
      const detail = await apiFetch<OrganizationDetail>(
        `/organizations/${organization.id}`,
        clientAuth(),
      );
      setSelected(detail);
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "Unable to load organization details.",
      );
    }
  }

  return (
    <>
      <ResourceManager<Organization>
        title="Organizations"
        description="Provision and supervise tenant clubs on the platform."
        actionLabel="New organization"
        endpoint="/organizations"
        exportFilename="organizations.csv"
        columns={["Club", "Slug", "Email", "Phone", "Plan"]}
        createAllowedRoles={["SUPER_ADMIN"]}
        deleteAllowedRoles={["SUPER_ADMIN"]}
        fields={[
          { name: "name", label: "Club", required: true },
          {
            name: "slug",
            label: "Slug",
            required: true,
            placeholder: "basket-roma",
          },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone" },
          { name: "subscription", label: "Plan", placeholder: "FREE" },
        ]}
        mapRow={(organization, actions) => [
          <button
            key="club"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => void selectOrganization(organization)}
          >
            {organization.name}
          </button>,
          organization.slug,
          organization.email ?? "",
          organization.phone ?? "",
          organization.subscription,
          <div key="actions" className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Details"
              onClick={() => void selectOrganization(organization)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {actions}
          </div>,
        ]}
        exportRows={(organizations) =>
          organizations.map((organization) => ({
            Club: organization.name,
            Slug: organization.slug,
            Email: organization.email ?? "",
            Phone: organization.phone ?? "",
            Plan: organization.subscription,
          }))
        }
      />

      {detailError && (
        <p className="mt-4 text-sm text-primary">{detailError}</p>
      )}
      {selected && (
        <Card className="mt-6 p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Selected organization
              </p>
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <p className="text-sm text-muted-foreground">{selected.slug}</p>
            </div>
            {selectedSlug && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm">
                Slug active: {selectedSlug}
              </p>
            )}
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <p>
              <span className="text-muted-foreground">Dirigente</span>
              <br />
              {directorName(selected)}
            </p>
            <p>
              <span className="text-muted-foreground">Users</span>
              <br />
              {selected._count.users}
            </p>
            <p>
              <span className="text-muted-foreground">Teams</span>
              <br />
              {selected._count.teams}
            </p>
            <p>
              <span className="text-muted-foreground">Players</span>
              <br />
              {selected._count.players}
            </p>
            <p>
              <span className="text-muted-foreground">Coaches</span>
              <br />
              {selected._count.coaches}
            </p>
            <p>
              <span className="text-muted-foreground">Matches</span>
              <br />
              {selected._count.matches}
            </p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Team</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Season</th>
                  <th className="py-2 pr-4 font-medium">Players</th>
                  <th className="py-2 pr-4 font-medium">Coaches</th>
                  <th className="py-2 pr-4 font-medium">Trainings</th>
                </tr>
              </thead>
              <tbody>
                {selected.teams.map((team) => (
                  <tr key={team.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{team.name}</td>
                    <td className="py-2 pr-4">{team.category}</td>
                    <td className="py-2 pr-4">{team.season}</td>
                    <td className="py-2 pr-4">{team._count.players}</td>
                    <td className="py-2 pr-4">{team._count.coaches}</td>
                    <td className="py-2 pr-4">{team._count.trainings}</td>
                  </tr>
                ))}
                {selected.teams.length === 0 && (
                  <tr>
                    <td
                      className="py-6 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      No teams
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
