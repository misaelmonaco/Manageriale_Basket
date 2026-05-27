"use client";

import { Download, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  fromCents,
  isoDate,
  toCents,
  useResourceOptions,
} from "@/components/resource-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  apiFetch,
  clientAuth,
  createResource,
  deleteResource,
  type ApiPage,
} from "@/lib/api";
import { downloadCsv } from "@/lib/csv";

type PaymentStatus = "DUE" | "PAID" | "OVERDUE" | "CANCELLED";
type Player = {
  id: string;
  user: { firstName: string; lastName: string; email: string } | null;
};
type Payment = {
  id: string;
  description: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  status: PaymentStatus;
  player: Player;
};

function canManagePayments() {
  if (typeof window === "undefined") return false;
  return ["SUPER_ADMIN", "DIRECTOR"].includes(
    localStorage.getItem("role") ?? "",
  );
}

function playerLabel(player: Player) {
  return player.user
    ? `${player.user.firstName} ${player.user.lastName}`
    : player.id;
}

function statusLabel(status: PaymentStatus) {
  return status === "PAID" ? "Pagato" : "Da pagare";
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const paid = status === "PAID";
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium">
      <span
        className={
          paid
            ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
            : "h-2.5 w-2.5 rounded-full bg-red-500"
        }
      />
      {statusLabel(status)}
    </span>
  );
}

export default function PaymentsPage() {
  const players = useResourceOptions<Player>("/players", (player) => ({
    value: player.id,
    label: playerLabel(player),
  }));
  const playerOptions = useMemo(() => players, [players]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filterPlayerId, setFilterPlayerId] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    playerId: "",
    description: "",
    amount: "",
    dueDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManagePayments();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterPlayerId) params.set("playerId", filterPlayerId);
      const response = await apiFetch<ApiPage<Payment>>(
        `/payments${params.size ? `?${params.toString()}` : ""}`,
        clientAuth(),
      );
      setPayments(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load payments.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filterPlayerId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createResource("/payments", {
        playerId: form.playerId,
        description: form.description,
        amountCents: toCents(form.amount),
        dueDate: new Date(form.dueDate).toISOString(),
      });
      setForm({ playerId: "", description: "", amount: "", dueDate: "" });
      setOpen(false);
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save payment.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(payment: Payment, status: "DUE" | "PAID") {
    setUpdatingId(payment.id);
    setError(null);
    try {
      await apiFetch(`/payments/${payment.id}/status`, {
        ...clientAuth(),
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update payment status.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function remove(payment: Payment) {
    setError(null);
    try {
      await deleteResource(`/payments/${payment.id}`);
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete payment.",
      );
    }
  }

  const action = (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button
        variant="outline"
        disabled={payments.length === 0}
        onClick={() =>
          downloadCsv(
            "payments.csv",
            payments.map((payment) => ({
              Player: playerLabel(payment.player),
              Description: payment.description,
              Amount: fromCents(payment.amountCents),
              "Due date": isoDate(payment.dueDate),
              Status: statusLabel(payment.status),
            })),
          )
        }
      >
        <Download className="mr-2 h-4 w-4" />
        CSV
      </Button>
      {canManage && (
        <Button onClick={() => setOpen((current) => !current)}>
          <Plus className="mr-2 h-4 w-4" />
          {open ? "Close" : "Create payment"}
        </Button>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Payments"
        description="Track player fees, due dates, and collection status."
        action={action}
      />

      <Card className="mb-6 p-4">
        <label className="block max-w-md space-y-2">
          <span className="text-sm font-medium">Filter by player</span>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
            value={filterPlayerId}
            onChange={(event) => setFilterPlayerId(event.target.value)}
          >
            <option value="">All players</option>
            {playerOptions.map((player) => (
              <option key={player.value} value={player.value}>
                {player.label}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {open && canManage && (
        <Card className="mb-6 p-4">
          <form
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
            onSubmit={submit}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium">Player</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                value={form.playerId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    playerId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select</option>
                {playerOptions.map((player) => (
                  <option key={player.value} value={player.value}>
                    {player.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Description</span>
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Amount</span>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Due date</span>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
                required
              />
            </label>
            <div className="flex items-end">
              <Button className="w-full" disabled={saving}>
                {saving ? "Saving" : "Create payment"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error && <p className="mb-4 text-sm text-primary">{error}</p>}
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      No records
                    </td>
                  </tr>
                )}
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      {playerLabel(payment.player)}
                    </td>
                    <td className="px-4 py-3">{payment.description}</td>
                    <td className="px-4 py-3">
                      {fromCents(payment.amountCents)}
                    </td>
                    <td className="px-4 py-3">{isoDate(payment.dueDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={
                              payment.status === "DUE" ? "default" : "outline"
                            }
                            size="sm"
                            disabled={updatingId === payment.id}
                            onClick={() => void updateStatus(payment, "DUE")}
                          >
                            Da pagare
                          </Button>
                          <Button
                            variant={
                              payment.status === "PAID" ? "default" : "outline"
                            }
                            size="sm"
                            disabled={updatingId === payment.id}
                            onClick={() => void updateStatus(payment, "PAID")}
                          >
                            Pagato
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete payment"
                            onClick={() => void remove(payment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
