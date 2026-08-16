import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { LandingPage } from '../src/components/LandingPage.tsx';

test('shows how to install the aggregate sync CLI on the public landing page', () => {
  const html = renderToStaticMarkup(createElement(LandingPage, {
    status: 'anonymous',
    session: null,
    onSignIn: () => {},
    onSignOut: () => {},
  }));

  assert.match(html, /npm install -g harness-analyzer/);
  assert.match(html, />Hosted sync</);
  assert.match(html, />Aggregates only</);
  assert.match(html, /Raw telemetry stays on your machine/);
  assert.doesNotMatch(html, />Storage</);
});
