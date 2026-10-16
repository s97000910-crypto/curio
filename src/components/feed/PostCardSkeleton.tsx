export function PostCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 animate-pulse space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)]" />
        <div className="space-y-1.5 flex-1">
          <div className="w-24 h-3 bg-[var(--bg-elevated)] rounded-sm" />
          <div className="w-32 h-2.5 bg-[var(--bg-elevated)] rounded-sm" />
        </div>
      </div>
      <div className="w-3/4 h-4 bg-[var(--bg-elevated)] rounded-sm" />
      <div className="w-full h-16 bg-[var(--bg-elevated)] rounded-sm" />
    </div>
  );
}
