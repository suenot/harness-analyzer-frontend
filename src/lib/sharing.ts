import type { PublicSnapshotV1, SharingSettings } from './api';

export function normalizeAllowedEmails(emails: string[]): string[] {
  return [...new Set(emails.map(email => email.trim().toLowerCase()).filter(Boolean))];
}

export function normalizeAllowedGroupIds(groupIds: string[]): string[] {
  return [...new Set(groupIds.map(id => id.trim()).filter(Boolean))];
}

export type PublicationStage = 'reserve' | 'export' | 'snapshot' | 'publish';

export class SharingPublicationError extends Error {
  constructor(
    public readonly stage: PublicationStage,
    public readonly safeSettings: SharingSettings | null,
    public readonly cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : 'Sharing update failed.');
    this.name = 'SharingPublicationError';
  }
}

interface SharingClients {
  updateSharing: (settings: Partial<SharingSettings>) => Promise<SharingSettings>;
  exportSnapshot: (level: 'totals' | 'details') => Promise<PublicSnapshotV1>;
  publishSnapshot: (snapshot: PublicSnapshotV1) => Promise<unknown>;
}

export async function saveSharingSettings(
  desired: SharingSettings,
  clients: SharingClients,
): Promise<SharingSettings> {
  const handle = desired.handle.trim().toLowerCase();
  const recipients = {
    audience: desired.audience,
    allowed_emails: normalizeAllowedEmails(desired.allowed_emails),
    allowed_group_ids: normalizeAllowedGroupIds(desired.allowed_group_ids),
  };
  if (desired.visibility === 'private') {
    return clients.updateSharing({
      handle,
      ...recipients,
      visibility: 'private',
      leaderboard_opt_in: false,
      share_sessions: false,
      share_projects: false,
    });
  }

  let reserved: SharingSettings;
  try {
    reserved = await clients.updateSharing({
      handle,
      ...recipients,
      visibility: 'private',
      leaderboard_opt_in: false,
      share_sessions: false,
      share_projects: false,
    });
  } catch (cause) {
    throw new SharingPublicationError('reserve', null, cause);
  }

  let snapshot: PublicSnapshotV1;
  try {
    snapshot = await clients.exportSnapshot(desired.visibility);
  } catch (cause) {
    throw new SharingPublicationError('export', reserved, cause);
  }
  try {
    await clients.publishSnapshot(snapshot);
  } catch (cause) {
    throw new SharingPublicationError('snapshot', reserved, cause);
  }
  try {
    return await clients.updateSharing({
      handle,
      ...recipients,
      visibility: desired.visibility,
      leaderboard_opt_in: desired.audience === 'public' && desired.leaderboard_opt_in,
      share_sessions: desired.visibility === 'details' && desired.share_sessions,
      share_projects: desired.visibility === 'details' && desired.share_projects,
    });
  } catch (cause) {
    throw new SharingPublicationError('publish', reserved, cause);
  }
}
