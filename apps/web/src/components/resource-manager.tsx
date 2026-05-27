"use client";

import { Plus, Search, Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createResource,
  deleteResource,
  listArrayResource,
  listResource,
  type ApiPage,
} from "@/lib/api";

export type FieldOption = { value: string; label: string };

export type FieldConfig = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "datetime-local"
    | "select";
  required?: boolean;
  min?: number;
  step?: number;
  placeholder?: string;
  options?: FieldOption[];
};

type ResourceManagerProps<TItem extends { id: string }> = {
  title: string;
  description: string;
  actionLabel: string;
  endpoint: string;
  columns: string[];
  fields: FieldConfig[];
  mapRow: (item: TItem, actions: React.ReactNode) => React.ReactNode[];
  buildPayload?: (values: Record<string, string>) => Record<string, unknown>;
  updatePath?: (item: TItem) => string;
  createAllowedRoles?: string[];
  deleteAllowedRoles?: string[];
  transformItems?: (response: ApiPage<TItem> | TItem[]) => TItem[];
};

function getRole() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("role") ?? "";
}

function defaultPayload(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== ""),
  );
}

export function ResourceManager<TItem extends { id: string }>({
  title,
  description,
  actionLabel,
  endpoint,
  columns,
  fields,
  mapRow,
  buildPayload = defaultPayload,
  updatePath,
  createAllowedRoles,
  deleteAllowedRoles,
  transformItems,
}: ResourceManagerProps<TItem>) {
  const [items, setItems] = useState<TItem[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const role = getRole();
  const canCreate = !createAllowedRoles || createAllowedRoles.includes(role);
  const canDelete = !deleteAllowedRoles || deleteAllowedRoles.includes(role);

  const emptyValues = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.name, ""])),
    [fields],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await listResource<TItem>(endpoint);
      setItems(transformItems ? transformItems(response) : response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setValues(emptyValues);
    void load();
  }, [emptyValues, endpoint]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createResource(endpoint, buildPayload(values));
      setValues(emptyValues);
      setOpen(false);
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: TItem) {
    const confirmed = window.confirm("Eliminare questo elemento?");
    if (!confirmed) return;

    setError(null);
    try {
      await deleteResource(
        updatePath ? updatePath(item) : `${endpoint}/${item.id}`,
      );
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete.",
      );
    }
  }

  const action = canCreate ? (
    <Button onClick={() => setOpen((current) => !current)}>
      {open ? (
        <X className="mr-2 h-4 w-4" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      {open ? "Close" : actionLabel}
    </Button>
  ) : undefined;

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(normalized),
    );
  }, [items, query]);

  const rows = filteredItems.map((item) =>
    mapRow(
      item,
      canDelete ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete"
          onClick={() => void remove(item)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null,
    ),
  );

  return (
    <>
      <PageHeader title={title} description={description} action={action} />
      {open && (
        <Card className="mb-6 p-4">
          <form
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={submit}
          >
            {fields.map((field) => (
              <label key={field.name} className="block space-y-2">
                <span className="text-sm font-medium">{field.label}</span>
                {field.type === "select" ? (
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                    value={values[field.name] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    required={field.required}
                  >
                    <option value="">Select</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={field.type ?? "text"}
                    value={values[field.name] ?? ""}
                    min={field.min}
                    step={field.step}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    required={field.required}
                  />
                )}
              </label>
            ))}
            <div className="flex items-end">
              <Button className="w-full" disabled={saving}>
                {saving ? "Saving" : actionLabel}
              </Button>
            </div>
          </form>
        </Card>
      )}
      {error && <p className="mb-4 text-sm text-primary">{error}</p>}
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading</Card>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cerca"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              {filteredItems.length} di {items.length}
            </p>
          </div>
          <DataTable columns={[...columns, ""]} rows={rows} />
        </>
      )}
    </>
  );
}

export function useResourceOptions<TItem>(
  endpoint: string,
  map: (item: TItem) => FieldOption,
) {
  const [options, setOptions] = useState<FieldOption[]>([]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const response = await listResource<TItem & { id: string }>(endpoint);
        setOptions(response.data.map(map));
      } catch {
        try {
          const response = await listArrayResource<TItem>(endpoint);
          setOptions(response.map(map));
        } catch {
          setOptions([]);
        }
      }
    }

    void loadOptions();
  }, [endpoint]);

  return options;
}

export function toCents(value: string) {
  return Math.round(Number(value || "0") * 100);
}

export function fromCents(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value / 100);
}

export function isoDate(value: string | Date | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("it-IT");
}

export function isoDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
