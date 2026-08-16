import type { AuthSession } from '../lib/auth';
import { CLI_INSTALL_COMMAND } from '../lib/cli';
import { SiteHeader } from './SiteHeader';

export type LandingAuthStatus = 'checking' | 'anonymous' | 'authenticated' | 'forbidden' | 'error';

interface LandingPageProps {
  status: LandingAuthStatus;
  session: AuthSession | null;
  message?: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  ownHandle?: string | null;
  showPrivateNavigation?: boolean;
}

export function LandingPage({ status, session, message, onSignIn, onSignOut, ownHandle, showPrivateNavigation }: LandingPageProps) {
  const notice = status === 'forbidden'
    ? 'This account does not have Harness Analyzer access. Switch accounts or ask an administrator for access.'
    : message;

  return (
    <div className="min-h-[100dvh] bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader session={session} publicOnly={!showPrivateNavigation} userHandle={ownHandle} authStatus={status} onSignIn={status === 'forbidden' ? onSignOut : onSignIn} />

      {notice ? (
        <div role="status" className="border-b border-[var(--line-strong)] bg-[#F4E7E2] px-4 py-3 text-center font-mono text-[10px] font-bold uppercase leading-5 tracking-[0.06em] text-[var(--signal)]">
          {notice}
        </div>
      ) : null}

      <main className="mx-auto max-w-[1440px]">
        <section className="flex min-h-[calc(100dvh-65px)] flex-col border-x border-[var(--line-strong)]">
          <aside aria-labelledby="install-cli-label" className="flex min-w-0 shrink-0 flex-col gap-2 border-b border-[var(--line-strong)] bg-[var(--signal)] px-5 py-5 text-white sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-8 lg:px-12 lg:py-6">
            <p id="install-cli-label" className="shrink-0 font-mono text-xs font-bold uppercase tracking-[0.12em]">Install sync CLI</p>
            <div className="min-w-0 max-w-full overflow-x-auto py-1 sm:text-right">
              <code className="block select-all whitespace-nowrap font-mono text-[clamp(0.9rem,4vw,2rem)] font-black leading-[1.2] tracking-[-0.04em]">{CLI_INSTALL_COMMAND}</code>
            </div>
          </aside>

          <div className="grid flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
            <div className="flex min-w-0 flex-col justify-between p-5 sm:p-8 lg:p-12">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">Local usage telemetry</p>
                <h1 className="mt-7 max-w-5xl text-[clamp(3.5rem,9vw,8.5rem)] font-black uppercase leading-[0.82] tracking-[-0.07em]">
                  Know where your agent budget goes.
                </h1>
                <p className="mt-8 max-w-xl text-base leading-7 text-[var(--muted)] md:text-lg">
                  Local cost, token, cache and session analytics for Claude Code and Codex.
                </p>
              </div>
              <a href="#method" className="mt-12 w-fit border-b-2 border-[var(--ink)] pb-1 font-mono text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)] hover:border-[var(--signal)] hover:text-[var(--signal)]">
                See the method
              </a>
            </div>

            <div className="min-h-80 border-t border-[var(--line-strong)] bg-[var(--paper-deep)] lg:border-l lg:border-t-0">
              <dl className="grid h-full grid-cols-2 bg-[var(--line-strong)]">
                {[
                  ['Sources', 'Claude + Codex'],
                  ['Measures', 'USD + tokens'],
                  ['Cache TTL', '5m + 1h'],
                  ['Hosted sync', 'Aggregates + host label'],
                ].map(([label, value], index) => (
                  <div key={label} className={`flex min-h-40 flex-col justify-between bg-[var(--paper)] p-5 sm:p-6 lg:min-h-0 lg:p-8 ${index % 2 === 0 ? 'border-r border-[var(--line-strong)]' : ''} ${index < 2 ? 'border-b border-[var(--line-strong)]' : ''}`}>
                    <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</dt>
                    <dd className="mt-8 text-[clamp(1.15rem,2.2vw,2rem)] font-black uppercase leading-[0.96] tracking-[-0.04em]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section id="capabilities" className="border-x border-t border-[var(--line-strong)] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <h2 className="max-w-4xl text-[clamp(2.75rem,7vw,6.5rem)] font-black uppercase leading-[0.86] tracking-[-0.065em]">From raw logs to decisions.</h2>
          <div className="mt-12 grid border border-[var(--line-strong)] lg:grid-cols-[1.35fr_0.65fr]">
            <article className="min-h-72 bg-[var(--ink)] p-6 text-[var(--paper)] sm:p-8">
              <h3 className="text-3xl font-black uppercase tracking-[-0.05em] sm:text-5xl">Cache economics</h3>
              <p className="mt-5 max-w-lg text-sm leading-6 text-[var(--paper-deep)]">Measure cache savings and estimate the cost of context rebuilt after long coding pauses.</p>
            </article>
            <div className="grid sm:grid-cols-2 lg:grid-cols-1">
              <article className="border-t border-[var(--line-strong)] p-6 sm:border-r sm:border-t-0 lg:border-b lg:border-r-0">
                <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">Session ledger</h3>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Trace projects, models, harnesses and activity without losing full names.</p>
              </article>
              <article className="border-t border-[var(--line-strong)] p-6 sm:border-t-0">
                <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">Range-aware views</h3>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">One selected interval controls hourly activity, peak hours, cache impact and breakdowns.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="method" className="border-x border-t border-[var(--line-strong)] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <h2 className="max-w-4xl text-[clamp(2.5rem,6vw,5.5rem)] font-black uppercase leading-[0.88] tracking-[-0.06em]">Raw telemetry stays on your machine.</h2>
          <p className="mt-7 max-w-2xl text-base leading-7 text-[var(--muted)]">The CLI uploads aggregate statistics plus a private device label for your device chart. Raw sessions, prompts, files and project paths stay local. Device labels are never published.</p>
          <div className="mt-12 grid gap-px border border-[var(--line-strong)] bg-[var(--line-strong)] md:grid-cols-3">
            {[
              ['Read', 'Parse local Claude Code and Codex usage events.'],
              ['Price', 'Apply model-specific input, output and cache rates.'],
              ['Sync', 'Upload aggregate totals and a private device label to your signed-in profile.'],
            ].map(([title, body]) => (
              <article key={title} className="bg-[var(--paper)] p-6 sm:p-8">
                <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">{title}</h3>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto mb-[calc(64px+env(safe-area-inset-bottom))] flex w-full max-w-[1440px] flex-col gap-2 border border-[var(--line-strong)] px-5 py-5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between lg:mb-0">
        <span>Harness Analyzer</span>
        <a href="https://marketmaker.cc" className="hover:text-[var(--signal)]">MarketMaker</a>
      </footer>
    </div>
  );
}
