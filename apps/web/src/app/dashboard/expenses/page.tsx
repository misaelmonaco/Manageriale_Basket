"use client";

import { ResourceManager, fromCents, isoDate, toCents } from "@/components/resource-manager";

type Expense = {
  id: string;
  category: string;
  vendor: string;
  amountCents: number;
  spentAt: string;
  notes: string | null;
};

export default function ExpensesPage() {
  return (
    <ResourceManager<Expense>
      title="Expenses"
      description="Director finance controls for club operating costs."
      actionLabel="Record expense"
      endpoint="/expenses"
      columns={["Category", "Vendor", "Amount", "Spent at", "Notes"]}
      createAllowedRoles={["SUPER_ADMIN", "DIRECTOR"]}
      deleteAllowedRoles={["SUPER_ADMIN", "DIRECTOR"]}
      fields={[
        { name: "category", label: "Category", required: true },
        { name: "vendor", label: "Vendor", required: true },
        { name: "amount", label: "Amount", type: "number", min: 0.01, step: 0.01, required: true },
        { name: "spentAt", label: "Spent at", type: "date", required: true },
        { name: "notes", label: "Notes" },
      ]}
      buildPayload={(values) => ({
        category: values.category,
        vendor: values.vendor,
        amountCents: toCents(values.amount ?? "0"),
        spentAt: new Date(values.spentAt ?? "").toISOString(),
        notes: values.notes || undefined,
      })}
      mapRow={(expense, actions) => [
        expense.category,
        expense.vendor,
        fromCents(expense.amountCents),
        isoDate(expense.spentAt),
        expense.notes ?? "",
        actions,
      ]}
    />
  );
}
