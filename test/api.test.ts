import assert from 'node:assert/strict';
import test from 'node:test';

import { api, ApiError, publicApi, setAccessToken } from '../src/lib/api.ts';

test('collects data through the backend POST endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let request: { input: string | URL | Request; init?: RequestInit } | undefined;

  globalThis.fetch = async (input, init) => {
    request = { input, init };
    return Response.json({ message: 'Data refreshed', sessions: 3 });
  };

  try {
    const result = await api.collectData();

    assert.equal(request?.input, '/api/collect');
    assert.equal(request?.init?.method, 'POST');
    assert.deepEqual(result, { message: 'Data refreshed', sessions: 3 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses the central public registry for profiles, shared pages and leaderboard options', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<string | URL | Request> = [];
  globalThis.fetch = async input => {
    requests.push(input);
    const url = input.toString();
    if (url.includes('leaderboard')) return Response.json({ metric: 'tokens', users: [] });
    if (url.includes('/sessions')) return Response.json({ total: 0, sessions: [] });
    if (url.includes('/projects')) return Response.json([]);
    return Response.json({ handle: 'mark-1', display_name: 'Mark', visibility: 'details', audience: 'public', share_sessions: true, share_projects: true, snapshot: {} });
  };
  try {
    await publicApi.getUser('mark-1');
    await publicApi.getUserSessions('mark-1', { limit: '20', source: 'codex' });
    await publicApi.getUserProjects('mark-1');
    await publicApi.getLeaderboard('tokens', 25);
    assert.deepEqual(requests, [
      'https://harness-analyzer-api.marketmaker.cc/api/public/users/mark-1',
      'https://harness-analyzer-api.marketmaker.cc/api/public/users/mark-1/sessions?limit=20&source=codex',
      'https://harness-analyzer-api.marketmaker.cc/api/public/users/mark-1/projects',
      'https://harness-analyzer-api.marketmaker.cc/api/public/leaderboard?metric=tokens&limit=25',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('updates independent public page settings', async () => {
  const originalFetch = globalThis.fetch;
  let body = '';
  globalThis.fetch = async (_input, init) => {
    body = String(init?.body);
    return Response.json({
      handle: 'mark-1',
      display_name: 'Mark',
      visibility: 'details',
      audience: 'public',
      allowed_emails: [],
      allowed_group_ids: [],
      leaderboard_opt_in: false,
      share_sessions: true,
      share_projects: false,
      snapshot_generated_at: null,
    });
  };
  try {
    await publicApi.updateSharing({ visibility: 'details', share_sessions: true, share_projects: false });
    assert.deepEqual(JSON.parse(body), { visibility: 'details', share_sessions: true, share_projects: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loads available sharing groups using the current access token', async () => {
  const originalFetch = globalThis.fetch;
  let request: { input: string | URL | Request; authorization: string | null } | undefined;
  globalThis.fetch = async (input, init) => {
    request = { input, authorization: new Headers(init?.headers).get('Authorization') };
    return Response.json({ groups: [{ id: 'group-1', name: 'Friends', member_count: 2, is_owner: true }] });
  };
  try {
    setAccessToken('test-token');
    const result = await publicApi.getSharingGroups();
    assert.deepEqual(result.groups.map(group => group.id), ['group-1']);
    assert.equal(request?.input, 'https://harness-analyzer-api.marketmaker.cc/api/me/sharing/groups');
    assert.equal(request?.authorization, 'Bearer test-token');
  } finally {
    setAccessToken(null);
    globalThis.fetch = originalFetch;
  }
});

test('creates and revokes scoped CLI tokens through the public registry', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ input: string | URL | Request; method?: string }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ input, method: init?.method });
    return Response.json(init?.method === 'POST' ? { token: `ha_sync_${'a'.repeat(43)}` } : { ok: true });
  };
  try {
    await publicApi.createSyncToken();
    await publicApi.revokeSyncToken();
    assert.deepEqual(requests, [
      { input: 'https://harness-analyzer-api.marketmaker.cc/api/me/sync-token', method: 'POST' },
      { input: 'https://harness-analyzer-api.marketmaker.cc/api/me/sync-token', method: 'DELETE' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('preserves backend error details and status', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: 'Handle is already reserved' }, { status: 409 });
  try {
    await assert.rejects(
      () => publicApi.updateSharing({ handle: 'taken' }),
      error => error instanceof ApiError && error.status === 409 && error.message.includes('Handle is already reserved'),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requests range-dependent charts with the selected range', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<string | URL | Request> = [];

  globalThis.fetch = async input => {
    requests.push(input);
    return Response.json({});
  };

  try {
    const range = { from: '2026-07-01T10:00', to: '2026-07-31T23:59' };

    await api.getSourceUsage(range);
    await api.getModelUsage(range);
    await api.getHourly(range);
    await api.getCache(range);
    await api.getCacheExpiry(range);
    await api.getHeatmap(range);
    await api.getDevices(range);

    assert.deepEqual(requests, [
      '/api/charts/source-usage?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/model-usage?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/hourly?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/cache?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/cache-expiry?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/heatmap?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
      '/api/charts/devices?from=2026-07-01T10%3A00&to=2026-07-31T23%3A59',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
