import type { DeviceUsage } from './api';

export type DeviceMetric = 'usd' | 'tokens' | 'sessions';

export interface DeviceChartRow {
  device: DeviceUsage;
  label: string;
  value: number;
}

export function deviceMetricValue(device: DeviceUsage, metric: DeviceMetric): number {
  if (metric === 'usd') return device.cost;
  return device[metric];
}

export function deviceChartRows(devices: DeviceUsage[], metric: DeviceMetric): DeviceChartRow[] {
  return devices
    .map(device => ({
      device,
      label: device.name.trim() || 'Unnamed device',
      value: deviceMetricValue(device, metric),
    }))
    .filter(row => row.value > 0)
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}

export function latestDeviceSync(devices: DeviceUsage[]): string | null {
  return devices.reduce<string | null>((latest, device) => {
    if (!device.last_synced_at || Number.isNaN(Date.parse(device.last_synced_at))) return latest;
    if (!latest || Date.parse(device.last_synced_at) > Date.parse(latest)) return device.last_synced_at;
    return latest;
  }, null);
}

export function formatDeviceMetric(value: number, metric: DeviceMetric): string {
  if (metric === 'usd') return `$${value.toFixed(2)}`;
  const label = metric === 'tokens' ? 'tokens' : value === 1 ? 'session' : 'sessions';
  return `${Math.round(value).toLocaleString('en-US')} ${label}`;
}
