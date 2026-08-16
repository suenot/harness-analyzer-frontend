import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { UsageDashboard } from '../src/components/UsageDashboard.tsx';
import type { Summary } from '../src/lib/api.ts';

const summary: Summary = {
  generated_at: '2026-08-16T12:00:00.000Z',
  today: '2026-08-16',
  current_month: '2026-08',
  totals: {
    grand_total: 12,
  },
  today_cost: 1,
  week_cost: 5,
  month_cost: 12,
  active_days: 2,
  active_months: 1,
  avg_per_active_day: 6,
  avg_per_active_month: 12,
  median_per_active_day: 6,
  median_per_active_month: 12,
  session_counts: { total: 4, claude: 2, codex: 2 },
};

test('loads device usage only on the hosted private owner dashboard', () => {
  const privateHtml = renderToStaticMarkup(createElement(UsageDashboard, { summary, showDeviceChart: true }));
  const localHtml = renderToStaticMarkup(createElement(UsageDashboard, { summary, showDeviceChart: false }));
  const publicHtml = renderToStaticMarkup(createElement(UsageDashboard, {
    summary,
    ownerHandle: 'suenot',
    visibility: 'totals',
  }));

  assert.match(privateHtml, /Loading device usage/);
  assert.doesNotMatch(localHtml, /Loading device usage/);
  assert.doesNotMatch(publicHtml, /Loading device usage/);
  assert.doesNotMatch(publicHtml, /Fleet by device/);
});
