import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SiteHeader } from '../src/components/SiteHeader.tsx';

test('uses user-scoped navigation and a single email profile link', () => {
  const html = renderToStaticMarkup(createElement(SiteHeader, {
    session: {
      token: 'token',
      user_id: 'user-1',
      email: 'suenot@gmail.com',
      username: 'suenot',
      services: { 'harness-analyzer': 'admin' },
    },
    userHandle: 'suenot',
    activeTab: 'sessions',
  }));

  assert.match(html, /href="\/u\/suenot"/);
  assert.match(html, /href="\/u\/suenot\/sessions"/);
  assert.match(html, /href="\/u\/suenot\/projects"/);
  assert.doesNotMatch(html, />Models</);
  assert.equal(html.match(/href="\/profile"/g)?.length, 1);
  assert.match(html, />suenot@gmail\.com<\/a>/);
  assert.doesNotMatch(html, />Profile<\/a>/);
});

test('shows only public pages enabled by the profile owner', () => {
  const html = renderToStaticMarkup(createElement(SiteHeader, {
    session: null,
    publicOnly: true,
    authStatus: 'anonymous',
    publicUserNavigation: {
      handle: 'mark-1',
      activeTab: 'sessions',
      shareSessions: true,
      shareProjects: false,
    },
  }));

  assert.match(html, /href="\/u\/mark-1"/);
  assert.match(html, /href="\/u\/mark-1\/sessions"/);
  assert.match(html, /href="\/u\/mark-1\/sessions" aria-current="page"/);
  assert.doesNotMatch(html, /href="\/u\/mark-1\/projects"/);
  assert.match(html, /href="\/users"/);
});
