export type CsvRow = Record<
  string,
  string | number | boolean | null | undefined
>;

function escapeCsv(value: string | number | boolean | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  if (rows.length === 0) return;

  const firstRow = rows[0];
  if (!firstRow) return;

  const headers = Object.keys(firstRow);
  const content = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header])).join(","),
    ),
  ].join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
