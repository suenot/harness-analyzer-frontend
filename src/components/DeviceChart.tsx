import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import { useApi } from '../hooks/useApi';
import { api, type DateRange, type DeviceUsage } from '../lib/api';
import {
  deviceChartRows,
  formatDeviceMetric,
  latestDeviceSync,
  type DeviceMetric,
} from '../lib/device-chart';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const METRICS: Array<{ value: DeviceMetric; label: string }> = [
  { value: 'usd', label: 'USD' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'sessions', label: 'Sessions' },
];

function formatLastSync(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DeviceMetricToggle({ metric, onChange }: { metric: DeviceMetric; onChange: (metric: DeviceMetric) => void }) {
  return (
    <div role="group" aria-label="Device chart metric" className="grid shrink-0 grid-cols-3 gap-px border border-[#111111] bg-[#111111]">
      {METRICS.map(option => {
        const selected = option.value === metric;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className="min-h-11 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]"
            style={{
              background: selected ? '#111111' : '#F4F4F0',
              color: selected ? '#F4F4F0' : '#111111',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function DeviceChart({ range, devices }: { range?: DateRange; devices?: DeviceUsage[] }) {
  const [metric, setMetric] = useState<DeviceMetric>('usd');
  const request = useApi(() => devices ? Promise.resolve(devices) : api.getDevices(range), [devices, range?.from, range?.to]);
  const usage = devices ?? request.data;
  const rows = useMemo(() => deviceChartRows(usage ?? [], metric), [usage, metric]);
  const latestSync = useMemo(() => latestDeviceSync(usage ?? []), [usage]);

  if (!devices && request.loading && !request.data) {
    return <div className="min-h-80 animate-pulse border-2 border-[#111111] bg-[#DEDDD7]" aria-label="Loading device usage" />;
  }

  if (!devices && request.error) {
    return (
      <section className="grid min-h-80 place-items-center border-2 border-[#111111] bg-[#F4F4F0] p-5 text-center">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#BC1010]">Device usage unavailable</p>
          <button type="button" onClick={request.refetch} className="mt-4 min-h-11 bg-[#BC1010] px-4 font-mono text-xs font-bold uppercase text-white hover:bg-[#111111]">Retry</button>
        </div>
      </section>
    );
  }

  const allDevices = usage ?? [];
  const metricLabel = METRICS.find(option => option.value === metric)?.label ?? metric;

  return (
    <section className="border-2 border-[#111111] bg-[#F4F4F0] p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[#111111] pb-3">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-[-0.06em] text-[#111111]">Fleet by device</h3>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#66645F]">
            {allDevices.length} {allDevices.length === 1 ? 'device' : 'devices'}
            {latestSync ? ` / Last sync ${formatLastSync(latestSync)}` : ''}
          </p>
        </div>
        <DeviceMetricToggle metric={metric} onChange={setMetric} />
      </header>

      {allDevices.length === 0 ? (
        <div className="grid min-h-64 place-items-center px-4 text-center">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#111111]">No synced devices yet</p>
            <p className="mt-3 text-sm leading-6 text-[#66645F]">Run "harness-analyzer sync" on a machine to add it to this private chart.</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="grid min-h-64 place-items-center px-4 text-center font-mono text-xs uppercase tracking-[0.1em] text-[#66645F]">
          No {metricLabel.toLowerCase()} usage in this range
        </div>
      ) : (
        <>
          <div className="pt-4" style={{ height: Math.max(288, rows.length * 48) }} aria-label={`${metricLabel} usage by device`}>
            <Bar
            data={{
              labels: rows.map(row => row.label),
              datasets: [{
                label: metricLabel,
                data: rows.map(row => row.value),
                backgroundColor: '#BC1010',
                borderColor: '#111111',
                borderWidth: 1,
                borderRadius: 0,
                maxBarThickness: 30,
              }],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#F4F4F0',
                  borderColor: '#111111',
                  borderWidth: 1,
                  padding: 10,
                  titleColor: '#111111',
                  bodyColor: '#111111',
                  callbacks: {
                    label: (context: TooltipItem<'bar'>) => formatDeviceMetric(rows[context.dataIndex].value, metric),
                    afterLabel: (context: TooltipItem<'bar'>) => {
                      const device = rows[context.dataIndex].device;
                      const system = [device.platform, device.architecture].filter(Boolean).join(' / ');
                      return [
                        formatDeviceMetric(device.cost, 'usd'),
                        formatDeviceMetric(device.tokens, 'tokens'),
                        formatDeviceMetric(device.sessions, 'sessions'),
                        system,
                        `Last sync ${formatLastSync(device.last_synced_at)}`,
                      ].filter(Boolean);
                    },
                  },
                },
              },
              scales: {
                x: {
                  beginAtZero: true,
                  border: { color: '#111111' },
                  grid: { color: '#DEDDD7' },
                  ticks: {
                    color: '#66645F',
                    font: { family: 'IBM Plex Mono, monospace', size: 10 },
                    callback: value => formatDeviceMetric(Number(value), metric),
                  },
                },
                y: {
                  border: { color: '#111111' },
                  grid: { display: false },
                  ticks: {
                    color: '#111111',
                    font: { family: 'IBM Plex Mono, monospace', size: 11, weight: 'bold' },
                  },
                },
              },
            }}
            />
          </div>
          <table className="sr-only">
            <caption>Device usage details</caption>
            <thead><tr><th>Device</th><th>USD</th><th>Tokens</th><th>Sessions</th><th>Last sync</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.device.id}>
                  <th>{row.label}</th>
                  <td>{formatDeviceMetric(row.device.cost, 'usd')}</td>
                  <td>{formatDeviceMetric(row.device.tokens, 'tokens')}</td>
                  <td>{formatDeviceMetric(row.device.sessions, 'sessions')}</td>
                  <td>{formatLastSync(row.device.last_synced_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
