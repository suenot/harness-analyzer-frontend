import { useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { publicApi, type PublicSnapshotTotals, type PublicUserProfile, type Summary } from '../lib/api';
import type { UserTab } from '../lib/navigation';
import { ProjectsTable } from './ProjectsTable';
import { PublicShell, PublicState, type PublicAuthProps } from './PublicShell';
import { SessionTable } from './SessionTable';
import { UsageDashboard } from './UsageDashboard';

export function publicTotalsToSummary(totals: PublicSnapshotTotals, generatedAt: string): Summary {
  return {
    generated_at: generatedAt,
    today: generatedAt.slice(0, 10),
    current_month: generatedAt.slice(0, 7),
    totals: { grand_total: totals.total_cost },
    today_cost: totals.today_cost,
    week_cost: totals.week_cost,
    month_cost: totals.month_cost,
    active_days: totals.active_days,
    active_months: totals.active_months,
    avg_per_active_day: totals.avg_per_active_day,
    avg_per_active_month: totals.avg_per_active_month,
    median_per_active_day: totals.median_per_active_day,
    median_per_active_month: totals.median_per_active_month,
    session_counts: { total: totals.total_sessions },
  };
}

export function isPublicTabShared(profile: PublicUserProfile, tab: UserTab): boolean {
  if (tab === 'dashboard') return true;
  return profile.visibility === 'details'
    && (tab === 'sessions' ? profile.share_sessions : profile.share_projects);
}

export function PublicProfilePage({ handle, tab = 'dashboard', auth }: { handle: string; tab?: UserTab; auth: PublicAuthProps }) {
  const { data, loading, error, refetch } = useApi(() => publicApi.getUser(handle), [handle]);
  useEffect(() => {
    const page = tab === 'dashboard' ? `@${handle}` : `${tab[0].toUpperCase()}${tab.slice(1)} by @${handle}`;
    document.title = `${page} | Harness Analyzer`;
  }, [handle, tab]);

  if (loading && !data) return <PublicShell auth={auth}><div className="min-h-[70dvh] animate-pulse border-2 border-[var(--line-strong)] bg-[var(--paper-deep)]" aria-label="Loading public profile" /></PublicShell>;
  if (error || !data) {
    const unavailable = !!error && /(?:\(40[34]\)|API error: 40[34])$/.test(error);
    return <PublicShell auth={auth}><PublicState eyebrow="Harness Analyzer / Shared profile" title={unavailable ? 'Profile unavailable' : 'Statistics unavailable'} body={unavailable ? 'This profile may be private, shared with selected people or groups, or missing.' : 'Statistics could not be loaded. Try again shortly.'} action={unavailable ? <div className="flex flex-wrap gap-2">{auth.status === 'anonymous' ? <button type="button" onClick={auth.onSignIn} className="min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase text-white">Sign in to check access</button> : null}<a href="/users" className="inline-flex min-h-11 items-center border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase">Browse users</a></div> : <button type="button" onClick={refetch} className="min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase text-white">Retry</button>} /></PublicShell>;
  }

  const audienceNote = data.audience === 'selected' ? <p className="mb-4 border-l-4 border-[var(--signal)] bg-[var(--paper-deep)] p-3 text-xs leading-5">This profile is shared with selected people and groups.</p> : null;

  const userNavigation = {
    handle: data.handle,
    activeTab: tab,
    shareSessions: data.visibility === 'details' && data.share_sessions,
    shareProjects: data.visibility === 'details' && data.share_projects,
  };
  if (!isPublicTabShared(data, tab)) {
    return (
      <PublicShell auth={auth} userNavigation={userNavigation}>
        <PublicState
          eyebrow={`@${data.handle} / ${data.audience === 'selected' ? 'Shared' : 'Public'} profile`}
          title="Page not shared"
          body={`This user has not shared their ${tab} page.`}
          action={<a href={`/u/${encodeURIComponent(data.handle)}`} className="inline-flex min-h-11 items-center border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase">View {data.audience === 'selected' ? 'shared' : 'public'} dashboard</a>}
        />
      </PublicShell>
    );
  }

  if (tab === 'sessions') {
    return <PublicShell auth={auth} userNavigation={userNavigation}>{audienceNote}<SessionTable publicHandle={data.handle} /></PublicShell>;
  }
  if (tab === 'projects') {
    return <PublicShell auth={auth} userNavigation={userNavigation}>{audienceNote}<ProjectsTable publicHandle={data.handle} /></PublicShell>;
  }

  const summary = publicTotalsToSummary(data.snapshot.totals, data.snapshot.generated_at);
  return (
    <PublicShell auth={auth} userNavigation={userNavigation}>
      {audienceNote}
      <UsageDashboard
        summary={summary}
        details={data.visibility === 'details' ? data.snapshot.details : undefined}
        ownerHandle={data.handle}
        visibility={data.visibility}
      />
    </PublicShell>
  );
}
