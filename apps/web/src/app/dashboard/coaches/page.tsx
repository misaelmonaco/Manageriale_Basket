"use client";

import { KeyRound } from "lucide-react";
import { ResourceManager } from "@/components/resource-manager";
import { Button } from "@/components/ui/button";
import { updateUserPassword } from "@/lib/api";

type Coach = {
  id: string;
  licenseNumber: string | null;
  user: { id: string; firstName: string; lastName: string; email: string };
  teams: unknown[];
};

export default function CoachesPage() {
  async function changePassword(coach: Coach) {
    const password = window.prompt(`New password for ${coach.user.firstName} ${coach.user.lastName}`);
    if (!password) return;
    try {
      await updateUserPassword(coach.user.id, password);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to update password.");
    }
  }

  return (
    <ResourceManager<Coach>
      title="Coaches"
      description="Coach profiles, licenses, and team assignments."
      actionLabel="New coach"
      endpoint="/coaches"
      columns={["Name", "Email", "License", "Teams"]}
      createAllowedRoles={["SUPER_ADMIN", "DIRECTOR"]}
      deleteAllowedRoles={["SUPER_ADMIN", "DIRECTOR"]}
      transformItems={(response) => (Array.isArray(response) ? response : response.data)}
      fields={[
        { name: "firstName", label: "Name", required: true },
        { name: "lastName", label: "Surname" },
        { name: "username", label: "Username" },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "password", label: "Password", type: "password", required: true },
        { name: "licenseNumber", label: "License" },
      ]}
      buildPayload={(values) => ({
        ...Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "")),
        organizationSlug: localStorage.getItem("selectedOrganizationSlug") || undefined,
      })}
      mapRow={(coach, actions) => [
        `${coach.user.firstName} ${coach.user.lastName}`,
        coach.user.email,
        coach.licenseNumber ?? "",
        String(coach.teams.length),
        <div key="actions" className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Change password" onClick={() => void changePassword(coach)}>
            <KeyRound className="h-4 w-4" />
          </Button>
          {actions}
        </div>,
      ]}
    />
  );
}
