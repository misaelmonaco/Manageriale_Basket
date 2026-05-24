export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-normal text-accent">{title}</h2>
        <p className="mt-1 text-sm text-accent">{description}</p>
      </div>
      {action}
    </div>
  );
}
