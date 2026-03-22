function LoadingCard() {
  return (
    <div className="animate-pulse rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 h-5 w-36 rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-10 rounded bg-muted/80" />
        <div className="h-10 rounded bg-muted/70" />
        <div className="h-10 rounded bg-muted/60" />
      </div>
    </div>
  );
}

export default function ProfessorLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="h-8 w-44 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/80" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    </div>
  );
}
