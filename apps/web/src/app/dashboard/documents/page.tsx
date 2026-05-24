"use client";

import { Download, FileText, Send, Upload } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { isoDateTime } from "@/components/resource-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, clientAuth, createResource } from "@/lib/api";

type DocumentAudience = "DIRECTORS" | "COACHES" | "PLAYERS" | "COACHES_PLAYERS" | "ALL";
type Role = "SUPER_ADMIN" | "DIRECTOR" | "COACH" | "PLAYER" | "PARENT";
type DocumentItem = {
  id: string;
  name: string;
  mimeType: string;
  storageKey: string;
  audience: DocumentAudience;
  createdAt: string;
  uploadedBy: { firstName: string; lastName: string; email: string; role: Role };
};

const audiences: { value: DocumentAudience; label: string }[] = [
  { value: "COACHES", label: "Coach" },
  { value: "PLAYERS", label: "Giocatori" },
  { value: "COACHES_PLAYERS", label: "Coach e giocatori" },
  { value: "ALL", label: "Tutti" },
  { value: "DIRECTORS", label: "Solo dirigenti" },
];

function getRole() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("role") as Role | "";
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function uploadedBy(document: DocumentItem) {
  return `${document.uploadedBy.firstName} ${document.uploadedBy.lastName}`.trim() || document.uploadedBy.email;
}

function audienceLabel(audience: DocumentAudience) {
  return audiences.find((item) => item.value === audience)?.label ?? audience;
}

function DownloadButton({ document }: { document: DocumentItem }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={document.storageKey} download={document.name}>
        <Download className="mr-2 h-4 w-4" />
        Download
      </a>
    </Button>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [form, setForm] = useState({ name: "", audience: "COACHES_PLAYERS" as DocumentAudience, file: null as File | null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = getRole();
  const canForward = role === "SUPER_ADMIN" || role === "DIRECTOR";
  const canUpload = canForward || role === "PLAYER";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDocuments(await apiFetch<DocumentItem[]>("/documents", clientAuth()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.file) {
      setError("Select a file first.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createResource("/documents", {
        name: form.name || form.file.name,
        mimeType: form.file.type || "application/octet-stream",
        storageKey: await readFile(form.file),
        audience: canForward ? form.audience : "DIRECTORS",
      });
      setForm({ name: "", audience: "COACHES_PLAYERS", file: null });
      const fileInput = document.getElementById("document-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to upload document.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Documents"
        description={canForward ? "Forward documents and information to coaches and players." : "Read shared documents and download files."}
      />

      {canUpload && (
        <Card className="mb-6 p-4">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Title</span>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Document title" />
            </label>
            {canForward && (
              <label className="block space-y-2">
                <span className="text-sm font-medium">Accessibility</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                  value={form.audience}
                  onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value as DocumentAudience }))}
                >
                  {audiences.map((audience) => (
                    <option key={audience.value} value={audience.value}>
                      {audience.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block space-y-2">
              <span className="text-sm font-medium">File</span>
              <Input id="document-file" type="file" onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} required />
            </label>
            <div className="flex items-end">
              <Button className="w-full" disabled={saving}>
                {canForward ? <Send className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                {saving ? "Saving" : canForward ? "Forward" : "Upload"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error && <p className="mb-4 text-sm text-primary">{error}</p>}
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading</Card>
      ) : canForward ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Accessibility</th>
                  <th className="px-4 py-3 font-medium">Uploaded by</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                      No documents
                    </td>
                  </tr>
                )}
                {documents.map((document) => (
                  <tr key={document.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{document.name}</td>
                    <td className="px-4 py-3">{audienceLabel(document.audience)}</td>
                    <td className="px-4 py-3">{uploadedBy(document)}</td>
                    <td className="px-4 py-3">{isoDateTime(document.createdAt)}</td>
                    <td className="px-4 py-3 text-right"><DownloadButton document={document} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <Card key={document.id} className="flex flex-col gap-4 p-4">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold">{document.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Shared by {uploadedBy(document)}</p>
                <p className="text-sm text-muted-foreground">{isoDateTime(document.createdAt)}</p>
              </div>
              <div className="mt-auto">
                <DownloadButton document={document} />
              </div>
            </Card>
          ))}
          {documents.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No forwarded documents</Card>}
        </div>
      )}
    </>
  );
}
