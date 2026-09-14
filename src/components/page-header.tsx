export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-4xl leading-none tracking-tight sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rule-dots rounded-2xl border border-dashed border-line p-10 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-paper-2 text-ink-2",
  scheduled: "bg-amber/10 text-amber",
  publishing: "bg-signal/10 text-signal",
  published: "bg-moss/10 text-moss",
  partial: "bg-amber/15 text-amber",
  failed: "bg-danger/10 text-danger",
  pending: "bg-paper-2 text-ink-2",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${STATUS_STYLES[status] ?? ""}`}>
      {status}
    </span>
  );
}
