export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card px-4 py-6 text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo/logo_court_vision.svg" alt="Court Vision logo" className="h-12 w-12 shrink-0 rounded-md object-contain" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">Court Vision</p>
            <p className="mt-1 max-w-2xl">
              Gestionale per societa di basket, squadre, atleti, staff, calendario, pagamenti e documenti.
            </p>
          </div>
        </div>
        <p className="shrink-0 text-xs font-medium uppercase text-muted-foreground">
          Created by Misael Monaco
        </p>
      </div>
    </footer>
  );
}
