"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, clientAuth, updateResource } from "@/lib/api";

type Organization = {
  id: string;
  name: string;
  slug: string;
  fiscalCode: string | null;
  email: string | null;
  phone: string | null;
  subscription: string;
  users?: { id: string; firstName: string; lastName: string; email: string }[];
};

function selectedOrganizationId() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("selectedOrganizationId") ||
    localStorage.getItem("organizationId") ||
    ""
  );
}

export default function OrganizationSettingsPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    fiscalCode: "",
    email: "",
    phone: "",
    subscription: "",
  });
  const [director, setDirector] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const id = selectedOrganizationId();
      setOrganizationId(id);
      if (!id) {
        setLoading(false);
        setError("Seleziona prima una organizzazione.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const organization = await apiFetch<Organization>(
          `/organizations/${id}`,
          clientAuth(),
        );
        setForm({
          name: organization.name,
          slug: organization.slug,
          fiscalCode: organization.fiscalCode ?? "",
          email: organization.email ?? "",
          phone: organization.phone ?? "",
          subscription: organization.subscription,
        });
        const firstDirector = organization.users?.[0];
        setDirector(
          firstDirector
            ? `${firstDirector.firstName} ${firstDirector.lastName}`.trim() || firstDirector.email
            : "",
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossibile caricare l'organizzazione.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const organization = await updateResource<
        Record<string, string | undefined>,
        Organization
      >(`/organizations/${organizationId}`, {
        name: form.name,
        slug: form.slug,
        fiscalCode: form.fiscalCode || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        subscription: form.subscription || undefined,
      });
      localStorage.setItem("selectedOrganizationId", organization.id);
      localStorage.setItem("selectedOrganizationSlug", organization.slug);
      localStorage.setItem("selectedOrganizationName", organization.name);
      setSaved(true);
      window.dispatchEvent(new Event("branding-updated"));
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Impossibile salvare.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Dati societari e informazioni amministrative."
      />
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading</Card>
      ) : (
        <Card className="p-4">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Nome societa</span>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Dirigente</span>
              <Input value={director || "Non assegnato"} disabled />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Slug</span>
              <Input
                pattern="[a-z0-9-]+"
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Codice fiscale</span>
              <Input
                value={form.fiscalCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fiscalCode: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <Input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Telefono</span>
              <Input
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Piano</span>
              <Input
                value={form.subscription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subscription: event.target.value,
                  }))
                }
              />
            </label>
            <div className="md:col-span-2">
              {error && <p className="mb-3 text-sm text-primary">{error}</p>}
              {saved && (
                <p className="mb-3 text-sm text-emerald-700">
                  Impostazioni salvate.
                </p>
              )}
              <Button disabled={saving || !organizationId}>
                {saving ? "Salvataggio" : "Salva impostazioni"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
