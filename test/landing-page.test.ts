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
  assert.match(installStrip, /aria-label="installation command" readOnly=""/);
  assert.match(installStrip, /value="npm install -g harness-analyzer"/);
  assert.match(installStrip, /aria-label="Copy installation command"/);
  assert.ok(html.indexOf('aria-labelledby="install-cli-label"') < html.indexOf('<h1'));
  const privacyNote = html.match(/<aside aria-label="What sync uploads".*?<\/aside>/)?.[0];
  assert.ok(privacyNote);
  assert.ok(html.indexOf('aria-label="What sync uploads"') < html.indexOf('aria-label="Set up automatic sync"'));
  assert.match(privacyNote, /per-session usage statistics, project folder names and a private device label/);
  assert.match(privacyNote, /excludes prompts, chat text, file contents and full paths/);
  assert.match(privacyNote, /--include-history/);
  assert.match(privacyNote, /background sync never uses it/);
  const setup = html.match(/<ol aria-label="Set up automatic sync".*?<\/ol>/)?.[0];
  assert.ok(setup);
  assert.match(setup, /href="\/profile"/);
  assert.match(setup, /value="harness-analyzer login"/);
  assert.match(setup, /value="harness-analyzer sync"/);
  assert.match(setup, /value="harness-analyzer background start"/);
  assert.match(setup, /macOS only/);
  assert.equal((setup.match(/aria-label="Copy [^"]+ command"/g) ?? []).length, 3);
  assert.match(html, />Hosted sync</);
  assert.match(html, />Aggregates \+ host label</);
  assert.match(html, /Know what leaves your machine/);
  assert.match(html, /Device labels are never published/);
  assert.doesNotMatch(html, /Harness Analyzer mark/);
  assert.equal(html.match(/<img/g)?.length, 1);
  assert.doesNotMatch(html, />Storage</);
});
