import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DeviceChart } from '../src/components/DeviceChart.tsx';
import type { DeviceUsage } from '../src/lib/api.ts';
import {
  deviceChartRows,
  formatDeviceMetric,
  latestDeviceSync,
} from '../src/lib/device-chart.ts';

const devices: DeviceUsage[] = [
  {
    id: 'private-device-id-a',
    name: 'worker-01',
    platform: 'linux',
    architecture: 'x64',
    last_synced_at: '2026-08-16T10:00:00.000Z',
    cost: 8.5,
    tokens: 3200,
    sessions: 4,
  },
  {
    id: 'private-device-id-b',
    name: 'worker-02',
    platform: 'linux',
    architecture: 'arm64',
    last_synced_at: '2026-08-16T12:00:00.000Z',
    cost: 2,
    tokens: 9100,
    sessions: 8,
  },
];

test('sorts device rows by the selected metric without exposing IDs as labels', () => {
  assert.deepEqual(deviceChartRows(devices, 'usd').map(row => [row.label, row.value]), [
    ['worker-01', 8.5],
    ['worker-02', 2],
  ]);
  assert.deepEqual(deviceChartRows(devices, 'tokens').map(row => [row.label, row.value]), [
    ['worker-02', 9100],
    ['worker-01', 3200],
  ]);
  assert.equal(latestDeviceSync(devices), '2026-08-16T12:00:00.000Z');
});

test('formats all supported device metrics', () => {
  assert.equal(formatDeviceMetric(8.5, 'usd'), '$8.50');
  assert.equal(formatDeviceMetric(9100, 'tokens'), '9,100 tokens');
  assert.equal(formatDeviceMetric(1, 'sessions'), '1 session');
  assert.equal(formatDeviceMetric(8, 'sessions'), '8 sessions');
});

test('renders a private fleet chart with device names and no internal IDs', () => {
  const html = renderToStaticMarkup(createElement(DeviceChart, { devices }));

  assert.match(html, /Fleet by device/);
  assert.match(html, /2 devices/);
  assert.match(html, /Device chart metric/);
  assert.match(html, /worker-01/);
  assert.match(html, /worker-02/);
  assert.doesNotMatch(html, /private-device-id/);
});
