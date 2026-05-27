import type React from "react";
import { Card } from "@/components/ui/card";

export function DataTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {rows.length === 0 && (
          <Card className="p-5 text-center text-sm text-muted-foreground">No records</Card>
        )}
        {rows.map((row, rowIndex) => (
          <Card key={rowIndex} className="p-4">
            <dl className="space-y-3 text-sm">
              {row.map((cell, cellIndex) => {
                const label = columns[cellIndex] ?? "";
                if (!label) {
                  return (
                    <div key={cellIndex} className="flex justify-end border-t border-border pt-3">
                      {cell}
                    </div>
                  );
                }
                return (
                  <div key={cellIndex} className="grid gap-1">
                    <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 break-words text-foreground">{cell}</dd>
                  </div>
                );
              })}
            </dl>
          </Card>
        ))}
      </div>
      <Card className="hidden overflow-hidden sm:block">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-medium">{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={columns.length}>
                  No records
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-border">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </>
  );
}
