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

  const commandMatches = html.match(/npm install -g harness-analyzer/g);
  assert.equal(commandMatches?.length, 1);
  const installStrip = html.match(/<aside aria-labelledby="install-cli-label".*?<\/aside>/)?.[0];
  assert.ok(installStrip);
  assert.match(installStrip, /bg-\[var\(--signal\)\]/);
  assert.match(installStrip, /text-\[clamp\(0\.9rem,4vw,2rem\)\]/);
  assert.match(installStrip, /leading-\[1\.2\]/);
  assert.doesNotMatch(installStrip, /leading-none/);
  assert.ok(html.indexOf('aria-labelledby="install-cli-label"') < html.indexOf('<h1'));
  assert.match(html, />Hosted sync</);
  assert.match(html, />Aggregates \+ host label</);
  assert.match(html, /Raw telemetry stays on your machine/);
  assert.match(html, /Device labels are never published/);
  assert.doesNotMatch(html, /Harness Analyzer mark/);
  assert.equal(html.match(/<img/g)?.length, 1);
  assert.doesNotMatch(html, />Storage</);
});
