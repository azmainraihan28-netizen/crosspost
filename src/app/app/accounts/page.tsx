import { requireUser } from "@/lib/session";
import { listAccounts } from "@/lib/data";
import { configuredMap, demoAllowed } from "@/lib/platforms";
import { PLATFORM_IDS, PLATFORMS } from "@/lib/platforms/meta";
import { planOf } from "@/lib/plans";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { DisconnectButton } from "./disconnect-button";

export const metadata = { title: "Accounts" };

export default async function AccountsPage({ searchParams }: PageProps<"/app/accounts">) {
  const user = await requireUser();
  const { error, connected, demo, welcome } = await searchParams;
  const [accounts, configured] = [await listAccounts(user.id), configuredMap()];
  const plan = planOf(user);
  const canDemo = demoAllowed();

  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title={welcome ? "Let's connect your first account." : "Connected accounts"}
        description={`Connect through each network's official sign-in. Your ${plan.name} plan includes ${
          Number.isFinite(plan.accounts) ? plan.accounts : "unlimited"
        } accounts.`}
      />

      {typeof error === "string" && <p className="mb-6 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {typeof connected === "string" && (
        <p className="mb-6 rounded-xl bg-moss/10 px-4 py-3 text-sm text-moss">
          Connected {PLATFORMS[connected as keyof typeof PLATFORMS]?.name ?? connected}
          {demo ? " as a demo account. Add real OAuth credentials in your environment to connect for real." : "."}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLATFORM_IDS.map((id) => {
          const meta = PLATFORMS[id];
          const mine = accounts.filter((a) => a.platform === id);
          const isConfigured = configured[id];
          const available = isConfigured || canDemo;
          return (
            <section key={id} className="card flex flex-col p-5">
              <div className="flex items-start gap-3">
                <PlatformBadge platform={id} size={40} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">{meta.name}</h2>
                  <p className="font-mono text-[11px] text-muted">
                    {meta.charLimit.toLocaleString()} chars{meta.requiresMedia ? " · image required" : ""}
                  </p>
                </div>
                {!isConfigured && (
                  <span className="rounded-full bg-paper-2 px-2 py-0.5 font-mono text-[10px] text-muted uppercase" title="No OAuth credentials configured">
                    {canDemo ? "demo" : "not set up"}
                  </span>
                )}
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {mine.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line bg-paper/60 px-3 py-2">
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <div className="size-8 rounded-full bg-paper-2" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.displayName || a.username}</p>
                      <p className="truncate font-mono text-[11px] text-muted">
                        @{a.username}
                        {a.isDemo && " · demo"}
                        {a.expiresAt && new Date(a.expiresAt) < new Date() && id === "linkedin" && (
                          <span className="text-danger"> · expired, reconnect</span>
                        )}
                      </p>
                    </div>
                    <DisconnectButton id={a.id} />
                  </li>
                ))}
                {mine.length === 0 && <li className="text-sm text-muted">Not connected</li>}
              </ul>

              {available ? (
                // Full navigation (not <Link>) because this redirects to an external OAuth page.
                <a href={`/api/connect/${id}`} className={`${mine.length ? "btn-ghost" : "btn-primary"} mt-4`}>
                  {mine.length ? (id === "facebook" ? "Reconnect / add pages" : "Connect another") : `Connect ${meta.name}`}
                </a>
              ) : (
                <p className="mt-4 text-xs text-muted">Set {id.toUpperCase()}_CLIENT_ID and _CLIENT_SECRET to enable.</p>
              )}
            </section>
          );
        })}
      </div>

      {canDemo && Object.values(configured).some((c) => !c) && (
        <p className="mt-6 max-w-3xl text-sm text-muted">
          <strong className="text-ink-2">Demo mode:</strong> networks without OAuth credentials connect as demo accounts. They simulate
          publishing and generate sample analytics, so you can try the whole flow locally. See the README for registering developer
          apps, and set <code className="font-mono">DEMO_MODE=false</code> in production.
        </p>
      )}
    </>
  );
}
