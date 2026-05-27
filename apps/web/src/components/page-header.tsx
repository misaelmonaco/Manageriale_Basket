export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="break-words text-xl font-semibold tracking-normal text-foreground sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="flex w-full shrink-0 sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
    </div>
  );
}
