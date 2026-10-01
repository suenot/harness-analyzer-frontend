import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { publicApi, type SharingGroup, type SharingSettings, type SharingVisibility } from '../lib/api';
import { CLI_INSTALL_COMMAND } from '../lib/cli';
import { isValidPublicHandle } from '../lib/navigation';
import { normalizeAllowedEmails, normalizeAllowedGroupIds } from '../lib/sharing';
import { useHarnessAuth } from './AuthGate';

const OPTIONS: Array<{ value: SharingVisibility; title: string; body: string }> = [
  { value: 'private', title: 'Private', body: 'Nothing is available on your public profile. This is the default.' },
  { value: 'totals', title: 'Totals only', body: 'Share total cost, tokens, sessions and activity counts.' },
  { value: 'details', title: 'Totals + details', body: 'Also share aggregate daily, model, harness and hourly charts.' },
];

const EMAIL_PATTERN = /^[^\s@,;\u0000-\u001f\u007f]+@[^\s@,;\u0000-\u001f\u007f]+\.[^\s@,;\u0000-\u001f\u007f]+$/;

function sameRecipients(left: string[], right: string[]): boolean {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((item, index) => item === sortedRight[index]);
}

export function ProfilePage() {
  const { session, logout, updateOwnHandle } = useHarnessAuth();
  const { data, loading, error, refetch } = useApi(() => publicApi.getSharing(), []);
  const [form, setForm] = useState<SharingSettings | null>(null);
  const [persisted, setPersisted] = useState<SharingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [syncToken, setSyncToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [groups, setGroups] = useState<SharingGroup[]>([]);
  const [groupsStatus, setGroupsStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [groupsRetry, setGroupsRetry] = useState(0);

  useEffect(() => { document.title = 'Profile | Harness Analyzer'; }, []);
  useEffect(() => { if (data) { setForm(data); setPersisted(data); } }, [data]);
  useEffect(() => {
    if (form?.audience !== 'selected') return;
    let cancelled = false;
    setGroupsStatus('loading');
    publicApi.getSharingGroups()
      .then(result => { if (!cancelled) { setGroups(result.groups); setGroupsStatus('loaded'); } })
      .catch(() => { if (!cancelled) setGroupsStatus('error'); });
    return () => { cancelled = true; };
  }, [form?.audience, groupsRetry]);

  const normalizedHandle = form?.handle.trim().toLowerCase() || '';
  const handleValid = isValidPublicHandle(normalizedHandle);
  const dirty = useMemo(() => !!form && !!persisted && (
    normalizedHandle !== persisted.handle
    || form.visibility !== persisted.visibility
    || form.audience !== persisted.audience
    || !sameRecipients(normalizeAllowedEmails(form.allowed_emails), normalizeAllowedEmails(persisted.allowed_emails))
    || !sameRecipients(normalizeAllowedGroupIds(form.allowed_group_ids), normalizeAllowedGroupIds(persisted.allowed_group_ids))
    || form.leaderboard_opt_in !== persisted.leaderboard_opt_in
    || form.share_sessions !== persisted.share_sessions
    || form.share_projects !== persisted.share_projects
  ), [form, persisted, normalizedHandle]);
  const selectedNeedsRecipients = !!form && form.visibility !== 'private' && form.audience === 'selected'
    && normalizeAllowedEmails(form.allowed_emails).length + normalizeAllowedGroupIds(form.allowed_group_ids).length === 0;
  const canSave = handleValid && !!form && !selectedNeedsRecipients && (dirty || form.visibility !== 'private');

  const addEmail = () => {
    if (!form) return;
    const email = emailDraft.trim().toLowerCase();
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) { setEmailError('Enter a valid email address.'); return; }
    setForm({ ...form, allowed_emails: normalizeAllowedEmails([...form.allowed_emails, email]) });
    setEmailDraft('');
    setEmailError(null);
    setSaved(false);
  };

  const save = async () => {
    if (!form || !canSave) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const next = await publicApi.updateSharing({
        handle: normalizedHandle,
        visibility: form.visibility,
        audience: form.audience,
        allowed_emails: normalizeAllowedEmails(form.allowed_emails),
        allowed_group_ids: normalizeAllowedGroupIds(form.allowed_group_ids),
        leaderboard_opt_in: form.visibility === 'private' || form.audience === 'selected' ? false : form.leaderboard_opt_in,
        share_sessions: form.visibility === 'details' && form.share_sessions,
        share_projects: form.visibility === 'details' && form.share_projects,
      });
      setForm(next);
      setPersisted(next);
      updateOwnHandle(next.handle);
      setSaved(true);
    } catch (cause) {
      setSaveError(cause instanceof Error && cause.message ? cause.message : 'Sharing settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const copyPublicLink = async () => {
    if (!persisted || persisted.visibility === 'private') return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${persisted.handle}`);
      setCopyStatus(persisted.audience === 'selected' ? 'Shared link copied.' : 'Public link copied.');
    } catch {
      setCopyStatus('Copy failed. Open the profile and copy its address.');
    }
  };

  const createSyncToken = async () => {
    setSyncBusy(true);
    setSyncStatus(null);
    try {
      const result = await publicApi.createSyncToken();
      setSyncToken(result.token);
      setSyncStatus('New token created. Any previous CLI token is now invalid.');
    } catch (cause) {
      setSyncStatus(cause instanceof Error ? cause.message : 'Token creation failed.');
    } finally {
      setSyncBusy(false);
    }
  };

  const copySyncToken = async () => {
    if (!syncToken) return;
    try {
      await navigator.clipboard.writeText(syncToken);
      setSyncStatus('Token copied. Run "harness-analyzer login" and paste it.');
    } catch {
      setSyncStatus('Copy failed. Select the token and copy it manually.');
    }
  };

  const revokeSyncToken = async () => {
    setSyncBusy(true);
    setSyncStatus(null);
    try {
      await publicApi.revokeSyncToken();
      setSyncToken(null);
      setSyncStatus('CLI access revoked.');
    } catch (cause) {
      setSyncStatus(cause instanceof Error ? cause.message : 'Token revocation failed.');
    } finally {
      setSyncBusy(false);
    }
  };

  if (loading && !form) return <div className="min-h-96 animate-pulse border-2 border-[var(--line-strong)] bg-[var(--paper-deep)]" aria-label="Loading profile settings" />;
  if (error || !form) return <section className="grid min-h-96 place-items-center border-2 border-[var(--line-strong)] p-5 text-center"><div><p className="font-mono text-xs font-bold uppercase text-[var(--signal)]">Profile unavailable</p><button type="button" onClick={refetch} className="mt-5 min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase text-white">Retry</button></div></section>;

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="border-2 border-[var(--line-strong)]">
        <header className="border-b-2 border-[var(--line-strong)] p-4 sm:p-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--signal)]">Harness Analyzer / Account</p>
          <h2 className="mt-3 text-[clamp(3rem,10vw,7.5rem)] font-black uppercase leading-[0.82] tracking-[-0.065em]">Profile</h2>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">{session.email}</p>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <section className="border-b-2 border-[var(--line-strong)] p-4 sm:p-6 lg:border-b-0 lg:border-r-2">
            <label htmlFor="public-handle" className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Public handle</label>
            <div className="mt-3 flex border-2 border-[var(--line-strong)] bg-[var(--paper)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--signal)]"><span className="grid w-11 shrink-0 place-items-center border-r border-[var(--line-strong)] font-mono font-bold">@</span><input id="public-handle" value={form.handle} onChange={event => { setSaved(false); setForm({ ...form, handle: event.target.value.toLowerCase() }); }} maxLength={40} autoCapitalize="none" autoCorrect="off" className="min-h-12 min-w-0 flex-1 border-0 bg-transparent px-3 font-mono text-sm outline-none" /></div>
            {!handleValid ? <p className="mt-2 text-xs leading-5 text-[var(--signal)]">Use 2-40 lowercase letters or numbers. Hyphens can separate words.</p> : <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Your profile URL: /u/{normalizedHandle}</p>}
            {persisted && persisted.visibility !== 'private' ? <div className="mt-5 flex flex-wrap gap-2"><a href={`/u/${encodeURIComponent(persisted.handle)}`} className="inline-flex min-h-11 items-center border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)]">View {persisted.audience === 'selected' ? 'shared' : 'public'} profile</a><button type="button" onClick={copyPublicLink} className="min-h-11 border-2 border-[var(--line-strong)] bg-[var(--paper-deep)] px-4 font-mono text-xs font-bold uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)]">Copy link</button><span aria-live="polite" className="w-full text-xs text-[var(--muted)]">{copyStatus}</span></div> : null}
          </section>

          <fieldset className="min-w-0 p-4 sm:p-6">
            <legend className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Sharing</legend>
            <div className="mt-3 grid gap-px border-2 border-[var(--line-strong)] bg-[var(--line-strong)]">
              {OPTIONS.map(option => (
                <label key={option.value} className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 bg-[var(--paper)] p-4 hover:bg-[var(--paper-soft)]">
                  <input type="radio" name="sharing" value={option.value} checked={form.visibility === option.value} onChange={() => { setSaved(false); setForm({ ...form, visibility: option.value, leaderboard_opt_in: option.value === 'private' || form.audience === 'selected' ? false : form.leaderboard_opt_in, share_sessions: option.value === 'details' ? form.share_sessions : false, share_projects: option.value === 'details' ? form.share_projects : false }); }} className="mt-1 h-4 w-4 accent-[var(--signal)]" />
                  <span><strong className="block text-sm font-black uppercase tracking-[0.04em]">{option.title}</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{option.body}</span></span>
                </label>
              ))}
            </div>
            {form.visibility !== 'private' ? <fieldset className="mt-4 border border-[var(--line-strong)] p-3">
              <legend className="px-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Who can view</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer gap-3 border border-[var(--line-strong)] p-3"><input type="radio" name="audience" checked={form.audience === 'public'} onChange={() => { setSaved(false); setForm({ ...form, audience: 'public' }); }} className="mt-0.5 h-4 w-4 accent-[var(--signal)]" /><span><strong className="block text-xs uppercase">Everyone</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Anyone with your link can view.</span></span></label>
                <label className="flex cursor-pointer gap-3 border border-[var(--line-strong)] p-3"><input type="radio" name="audience" checked={form.audience === 'selected'} onChange={() => { setSaved(false); setForm({ ...form, audience: 'selected', leaderboard_opt_in: false }); }} className="mt-0.5 h-4 w-4 accent-[var(--signal)]" /><span><strong className="block text-xs uppercase">Selected people or groups</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">People sign in with a verified email to view.</span></span></label>
              </div>
              {form.audience === 'selected' ? <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="allowed-email" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Friends by email</label>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Access matches the email verified in Auth Service.</p>
                  <div className="mt-2 flex flex-wrap gap-2"><input id="allowed-email" type="email" value={emailDraft} onChange={event => { setEmailDraft(event.target.value); setEmailError(null); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addEmail(); } }} placeholder="friend@example.com" className="min-h-11 min-w-48 flex-1 border-2 border-[var(--line-strong)] bg-[var(--paper)] px-3 text-sm" /><button type="button" onClick={addEmail} className="min-h-11 border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase">Add email</button></div>
                  {emailError ? <p role="alert" className="mt-2 text-xs text-[var(--signal)]">{emailError}</p> : null}
                  {form.allowed_emails.length ? <ul className="mt-2 flex flex-wrap gap-2">{form.allowed_emails.map(email => <li key={email} className="flex items-center gap-2 border border-[var(--line-strong)] bg-[var(--paper-deep)] px-2 py-1 text-xs"><span>{email}</span><button type="button" onClick={() => { setSaved(false); setForm({ ...form, allowed_emails: form.allowed_emails.filter(value => value !== email) }); }} aria-label={`Remove ${email}`} className="min-h-7 px-1 font-bold text-[var(--signal)]">×</button></li>)}</ul> : null}
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Auth Service groups</p>
                  {groupsStatus === 'loading' ? <p className="mt-2 text-xs text-[var(--muted)]">Loading groups…</p> : null}
                  {groupsStatus === 'error' ? <div className="mt-2 flex flex-wrap items-center gap-2"><p role="alert" className="text-xs text-[var(--signal)]">Groups could not be loaded.</p><button type="button" onClick={() => setGroupsRetry(value => value + 1)} className="min-h-9 border border-[var(--line-strong)] px-3 font-mono text-xs font-bold uppercase">Retry</button></div> : null}
                  {groupsStatus === 'loaded' && !groups.length ? <p className="mt-2 text-xs text-[var(--muted)]">You have no available groups.</p> : null}
                  {groups.length ? <div className="mt-2 grid gap-2">{groups.map(group => <label key={group.id} className="flex min-h-11 cursor-pointer items-center gap-3 border border-[var(--line-strong)] p-3"><input type="checkbox" checked={form.allowed_group_ids.includes(group.id)} onChange={event => { setSaved(false); setForm({ ...form, allowed_group_ids: event.target.checked ? normalizeAllowedGroupIds([...form.allowed_group_ids, group.id]) : form.allowed_group_ids.filter(id => id !== group.id) }); }} className="h-4 w-4 accent-[var(--signal)]" /><span className="text-xs"><strong>{group.name}</strong><span className="ml-2 text-[var(--muted)]">{group.member_count} members</span></span></label>)}</div> : null}
                  {form.allowed_group_ids.filter(id => !groups.some(group => group.id === id)).length ? <div className="mt-2"><p className="text-xs text-[var(--muted)]">{groupsStatus === 'loaded' ? 'Saved groups not in the current list:' : 'Saved groups awaiting lookup:'}</p><ul className="mt-2 grid gap-2">{form.allowed_group_ids.filter(id => !groups.some(group => group.id === id)).map(id => <li key={id} className="flex min-h-11 items-center justify-between gap-2 border border-[var(--line-strong)] p-3 text-xs"><span className="break-all">{id}</span><button type="button" onClick={() => { setSaved(false); setForm({ ...form, allowed_group_ids: form.allowed_group_ids.filter(value => value !== id) }); }} className="font-mono font-bold uppercase text-[var(--signal)]">Remove</button></li>)}</ul></div> : null}
                </div>
                {selectedNeedsRecipients ? <p role="alert" className="text-xs text-[var(--signal)]">Add at least one email or group before saving.</p> : null}
              </div> : null}
            </fieldset> : null}
            {form.visibility !== 'private' && form.audience === 'public' ? (
              <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 border border-[var(--line-strong)] p-3"><input type="checkbox" checked={form.leaderboard_opt_in} onChange={event => { setSaved(false); setForm({ ...form, leaderboard_opt_in: event.target.checked }); }} className="mt-0.5 h-4 w-4 accent-[var(--signal)]" /><span><strong className="block text-xs uppercase tracking-[0.06em]">Include me in Users ranking</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Your public link works either way. This separate option adds your handle and ranking value to Users.</span></span></label>
            ) : null}
            <fieldset className={`mt-4 border border-[var(--line-strong)] p-3 ${form.visibility === 'details' ? '' : 'opacity-55'}`}>
              <legend className="px-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Public pages</legend>
              <p className="text-xs leading-5 text-[var(--muted)]">Choose which detailed pages visitors can open. Totals + details is required.</p>
              <div className="mt-3 grid gap-px border border-[var(--line-strong)] bg-[var(--line-strong)] sm:grid-cols-2">
                <label className={`flex min-h-16 items-start gap-3 bg-[var(--paper)] p-3 ${form.visibility === 'details' ? 'cursor-pointer hover:bg-[var(--paper-soft)]' : 'cursor-not-allowed'}`}>
                  <input type="checkbox" checked={form.share_sessions} disabled={form.visibility !== 'details'} onChange={event => { setSaved(false); setForm({ ...form, share_sessions: event.target.checked }); }} className="mt-0.5 h-4 w-4 accent-[var(--signal)]" />
                  <span><strong className="block text-xs uppercase tracking-[0.06em]">Sessions page</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Share source, model, time, tokens and cost. This page never includes prompts or project labels.</span></span>
                </label>
                <label className={`flex min-h-16 items-start gap-3 bg-[var(--paper)] p-3 ${form.visibility === 'details' ? 'cursor-pointer hover:bg-[var(--paper-soft)]' : 'cursor-not-allowed'}`}>
                  <input type="checkbox" checked={form.share_projects} disabled={form.visibility !== 'details'} onChange={event => { setSaved(false); setForm({ ...form, share_projects: event.target.checked }); }} className="mt-0.5 h-4 w-4 accent-[var(--signal)]" />
                  <span><strong className="block text-xs uppercase tracking-[0.06em]">Projects page</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Share project labels and aggregate model and harness usage.</span></span>
                </label>
              </div>
            </fieldset>
            <p className="mt-4 border-l-4 border-[var(--signal)] pl-3 text-xs leading-5 text-[var(--muted)]">Public dashboard snapshots contain aggregates only. Shared pages use sanitized fields and short project labels. Prompts, full paths, files, internal IDs and device labels are never included.</p>
          </fieldset>
        </div>

        <footer className="flex flex-col gap-3 border-t-2 border-[var(--line-strong)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div aria-live="polite" className="min-h-5 text-xs leading-5">{saveError ? <span className="text-[var(--signal)]">{saveError}</span> : saved ? <span>Sharing settings saved.</span> : form.snapshot_generated_at ? <span className="text-[var(--muted)]">Last snapshot {new Date(form.snapshot_generated_at).toLocaleString()}</span> : null}</div>
          <button type="button" onClick={save} disabled={!canSave || saving} className="min-h-12 bg-[var(--signal)] px-6 font-mono text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Publishing' : form.visibility === 'private' ? 'Save privacy' : persisted?.visibility === 'private' ? 'Publish snapshot' : 'Update snapshot'}</button>
        </footer>
      </section>
      <section className="border-2 border-[var(--line-strong)] p-4 sm:p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">CLI sync</p>
        <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">Sync every device</h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">The hosted site cannot read local Claude or Codex files. Install the CLI on each device, connect each one with the same profile token, then run <code className="font-mono font-bold text-[var(--ink)]">harness-analyzer sync</code> on every machine. Each upload includes aggregate statistics and a private device label, normally the hostname, for your device chart. The label is never published.</p>
        <div className="mt-4 border border-[var(--line-strong)] bg-[var(--paper-deep)] p-3 font-mono text-xs leading-6"><div>{CLI_INSTALL_COMMAND}</div><div>harness-analyzer login</div><div>harness-analyzer sync</div></div>
        {syncToken ? <div className="mt-4"><label htmlFor="sync-token" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Shown once</label><input id="sync-token" readOnly value={syncToken} className="mt-2 min-h-11 w-full border-2 border-[var(--line-strong)] bg-[var(--paper)] px-3 font-mono text-xs" /></div> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={createSyncToken} disabled={syncBusy} className="min-h-11 bg-[var(--signal)] px-4 font-mono text-xs font-bold uppercase text-white disabled:opacity-50">{syncToken ? 'Replace token' : 'Create token'}</button>
          {syncToken ? <button type="button" onClick={copySyncToken} className="min-h-11 border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase">Copy token</button> : null}
          <button type="button" onClick={revokeSyncToken} disabled={syncBusy} className="min-h-11 border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase disabled:opacity-50">Revoke CLI access</button>
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-xs text-[var(--muted)]">{syncStatus}</p>
      </section>
      <section className="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--line-strong)] p-4"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Account</p><p className="mt-1 text-sm">Signed in as {session.email}</p></div><button type="button" onClick={logout} className="min-h-11 border-2 border-[var(--line-strong)] px-4 font-mono text-xs font-bold uppercase hover:bg-[var(--ink)] hover:text-[var(--paper)]">Sign out</button></section>
    </div>
  );
}
