import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { isPublicTabShared } from '../src/components/PublicProfilePage.tsx';
import type { PublicUserProfile } from '../src/lib/api.ts';

const profile: PublicUserProfile = {
  handle: 'mark-1',
  display_name: 'Mark',
  visibility: 'details',
  audience: 'public',
  share_sessions: true,
  share_projects: false,
  snapshot: {
    schema_version: 1,
    generated_at: '2026-08-16T12:00:00.000Z',
    totals: {
      total_cost: 1, total_tokens: 2, total_sessions: 3, active_days: 1, active_months: 1,
      today_cost: 1, week_cost: 1, month_cost: 1, avg_per_active_day: 1,
      avg_per_active_month: 1, median_per_active_day: 1, median_per_active_month: 1,
    },
  },
};

test('gates each detailed public page independently', () => {
  assert.equal(isPublicTabShared(profile, 'dashboard'), true);
  assert.equal(isPublicTabShared(profile, 'sessions'), true);
  assert.equal(isPublicTabShared(profile, 'projects'), false);
  assert.equal(isPublicTabShared({ ...profile, visibility: 'totals', share_projects: true }, 'projects'), false);
});

test('routes non-owner shared tabs through public loaders only', async () => {
  const [authGate, sessions, projects, profilePage] = await Promise.all([
    readFile(new URL('../src/components/AuthGate.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/SessionTable.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ProjectsTable.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/PublicProfilePage.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(authGate, /PublicProfilePage handle=\{route\.handle\} tab=\{route\.tab\}/);
  assert.doesNotMatch(authGate, /Private detail/);
  assert.match(sessions, /publicHandle \? publicApi\.getUserSessions/);
  assert.match(projects, /publicHandle \? publicApi\.getUserProjects/);
  assert.match(profilePage, /title="Page not shared"/);
  assert.match(profilePage, /onClick=\{auth\.onSignIn\}/);
});

test('keeps owner-only session fields outside the public DTO', async () => {
  const apiSource = await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
  const publicDto = apiSource.match(/export interface PublicSession \{([\s\S]*?)\n\}/)?.[1] || '';
  for (const privateField of ['file', 'title', 'sessionId', 'cwd', 'history']) {
    assert.doesNotMatch(publicDto, new RegExp(`\\b${privateField}\\b`));
  }

  const projectDto = apiSource.match(/export interface PublicProjectEntry \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(projectDto, /label: string/);
  assert.doesNotMatch(projectDto, /\bcwd\b/);

  const profileDto = apiSource.match(/export interface PublicUserProfile \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(profileDto, /audience: SharingAudience/);
  assert.doesNotMatch(profileDto, /allowed_emails|allowed_group_ids/);
});

test('profile controls clear public page flags outside detailed sharing', async () => {
  const profileSource = await readFile(new URL('../src/components/ProfilePage.tsx', import.meta.url), 'utf8');
  assert.match(profileSource, /share_sessions: option\.value === 'details' \? form\.share_sessions : false/);
  assert.match(profileSource, /share_projects: option\.value === 'details' \? form\.share_projects : false/);
  assert.match(profileSource, /disabled=\{form\.visibility !== 'details'\}/);
});
