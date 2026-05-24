"use client";

import { Palette, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, clientAuth, type ApiPage } from "@/lib/api";

type BrandingSettings = {
  logoUrl?: string;
  primaryRgb?: string;
  accentRgb?: string;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  settings?: Record<string, unknown> & { branding?: BrandingSettings };
};

function isSuperAdmin() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("role") === "SUPER_ADMIN";
}

function currentOrganizationId() {
  if (typeof window === "undefined") return "";
  return isSuperAdmin()
    ? localStorage.getItem("selectedOrganizationId") || ""
    : localStorage.getItem("organizationId") || "";
}

function normalizeRgb(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function validRgb(value: string) {
  const parts = normalizeRgb(value).split(",").map(Number);
  return parts.length === 3 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
}

function logoFromFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Select an image file."));
      return;
    }
    if (file.size > 600_000) {
      reject(new Error("Logo image must be 600 KB or smaller."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read logo file."));
    reader.readAsDataURL(file);
  });
}

export default function BrandingPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [form, setForm] = useState({ logoUrl: "", primaryRgb: "220,60,45", accentRgb: "40,120,200" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const superAdmin = isSuperAdmin();

  async function loadOrganization(id: string) {
    if (!id) {
      setOrganization(null);
      return;
    }

    const detail = await apiFetch<Organization>(`/organizations/${id}/branding`, clientAuth());
    const branding = detail.settings?.branding ?? {};
    setOrganization(detail);
    setForm({
      logoUrl: branding.logoUrl ?? "",
      primaryRgb: branding.primaryRgb ?? "220,60,45",
      accentRgb: branding.accentRgb ?? "40,120,200",
    });
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const initialId = currentOrganizationId();
        setOrganizationId(initialId);

        if (superAdmin) {
          const response = await apiFetch<ApiPage<Organization>>("/organizations", clientAuth());
          setOrganizations(response.data);
        }

        if (initialId) await loadOrganization(initialId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load branding.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      if (!organizationId) throw new Error("Select an organization first.");
      if (!validRgb(form.primaryRgb) || !validRgb(form.accentRgb)) {
        throw new Error("Use RGB format like 220,60,45 with values from 0 to 255.");
      }

      const settings = {
        ...(organization?.settings ?? {}),
        branding: {
          logoUrl: form.logoUrl.trim() || undefined,
          primaryRgb: normalizeRgb(form.primaryRgb),
          accentRgb: normalizeRgb(form.accentRgb),
        },
      };

      await apiFetch(`/organizations/${organizationId}/settings`, {
        ...clientAuth(),
        method: "PATCH",
        body: JSON.stringify(settings),
      });

      if (organization) {
        localStorage.setItem("selectedOrganizationId", organization.id);
        localStorage.setItem("selectedOrganizationSlug", organization.slug);
        localStorage.setItem("selectedOrganizationName", organization.name);
      }
      await loadOrganization(organizationId);
      window.dispatchEvent(new Event("branding-updated"));
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save branding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Branding" description="Set organization logo and screen colors with RGB values." />
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading</Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              {superAdmin && (
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-sm font-medium">Organization</span>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                    value={organizationId}
                    onChange={(event) => {
                      const id = event.target.value;
                      setOrganizationId(id);
                      const selected = organizations.find((item) => item.id === id);
                      if (selected) {
                        localStorage.setItem("selectedOrganizationId", selected.id);
                        localStorage.setItem("selectedOrganizationSlug", selected.slug);
                        localStorage.setItem("selectedOrganizationName", selected.name);
                      }
                      void loadOrganization(id);
                    }}
                  >
                    <option value="">Select organization</option>
                    {organizations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Logo URL</span>
                <Input
                  value={form.logoUrl}
                  placeholder="https://example.com/logo.png"
                  onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
                />
              </label>
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium">Upload logo</span>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const logoUrl = await logoFromFile(file);
                      setForm((current) => ({ ...current, logoUrl }));
                      setError(null);
                    } catch (uploadError) {
                      setError(uploadError instanceof Error ? uploadError.message : "Unable to load logo.");
                    }
                  }}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Primary RGB</span>
                <Input
                  value={form.primaryRgb}
                  placeholder="220,60,45"
                  onChange={(event) => setForm((current) => ({ ...current, primaryRgb: event.target.value }))}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Accent RGB</span>
                <Input
                  value={form.accentRgb}
                  placeholder="40,120,200"
                  onChange={(event) => setForm((current) => ({ ...current, accentRgb: event.target.value }))}
                />
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-primary">{error}</p>}
            {saved && <p className="mt-4 text-sm text-muted-foreground">Branding saved.</p>}

            <div className="mt-6">
              <Button onClick={() => void save()} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving" : "Save branding"}
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-sm font-medium">Preview</p>
            <div className="rounded-md border border-border p-4">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo preview" className="mb-4 max-h-16 max-w-full object-contain" />
              ) : (
                <div className="mb-4 flex h-16 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                  No logo
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-5 w-5 rounded-full" style={{ backgroundColor: `rgb(${form.primaryRgb})` }} />
                  Primary
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-5 w-5 rounded-full" style={{ backgroundColor: `rgb(${form.accentRgb})` }} />
                  Accent
                </div>
              </div>
              <Button className="mt-4 w-full">
                <Palette className="mr-2 h-4 w-4" />
                Sample action
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
