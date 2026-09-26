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
  assert.match(installStrip, /<code[^>]*aria-label="installation command"[^>]*>npm install -g harness-analyzer<\/code>/);
  assert.match(installStrip, /copy-command-text/);
  assert.doesNotMatch(installStrip, /<input/);
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
  assert.ok(html.indexOf('<dl') < html.indexOf('aria-label="Set up automatic sync"'));
  assert.match(setup, /href="\/profile"/);
  assert.match(setup, />harness-analyzer login<\/code>/);
  assert.match(setup, />harness-analyzer sync<\/code>/);
  assert.match(setup, />harness-analyzer background start<\/code>/);
  assert.match(setup, /macOS only/);
  assert.equal((setup.match(/aria-label="Copy [^"]+ command"/g) ?? []).length, 3);
  assert.match(html, />Hosted sync</);
  assert.match(html, />Sessions \+ device</);
  assert.match(html, /Know what leaves your machine/);
  assert.match(html, /Device labels are never published/);
  assert.match(html, /Upload private session usage statistics and a device label/);
  assert.doesNotMatch(html, /Harness Analyzer mark/);
  assert.equal(html.match(/<img/g)?.length, 1);
  assert.doesNotMatch(html, />Storage</);
});
