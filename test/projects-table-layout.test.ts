import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const projectsTableSource = readFile(
  new URL('../src/components/ProjectsTable.tsx', import.meta.url),
  'utf8',
);
const projectDetailsSource = readFile(
  new URL('../src/components/ProjectDetails.tsx', import.meta.url),
  'utf8',
);

test('lays out project summaries as a responsive one, two and three column grid', async () => {
  const source = await projectsTableSource;

  assert.match(
    source,
    /<ul className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Projects">/,
  );
  assert.match(source, /expanded \? 'md:col-span-2 xl:col-span-3' : 'md:aspect-square'/);
});

test('uses the same responsive square-card geometry while project data loads', async () => {
  const source = await projectsTableSource;

  assert.match(
    source,
    /className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading projects"/,
  );
  assert.match(source, /className="flex animate-pulse flex-col border border-\[#1B1B1B\] md:aspect-square"/);
  assert.match(source, /className="h-11 shrink-0 border-t border-\[#1B1B1B\] bg-\[#DEDDD7\]"/);
});

test('keeps card metrics compact in a two by two grid', async () => {
  const source = await projectsTableSource;

  assert.match(source, /<dl className="mt-auto grid min-w-0 grid-cols-2/);
  assert.match(source, /Array\.from\(\{ length: 4 \}/);
});

test('keeps project title descenders inside the two-line clamp', async () => {
  const source = await projectsTableSource;

  assert.match(source, /line-clamp-2 block break-words text-xl font-black leading-tight/);
  assert.doesNotMatch(source, /line-clamp-2 block break-words text-xl font-black leading-none/);
});

test('renders expanded details inline as a readable full-width panel', async () => {
  const source = await projectsTableSource;

  assert.match(source, /aria-controls=\{expanded \? detailsId : undefined\}/);
  assert.match(source, /\{expanded && <ProjectDetails id=\{detailsId\} project=\{project\} \/>\}/);
});

test('gives expanded charts a readable two-column desktop layout', async () => {
  const source = await projectDetailsSource;

  assert.match(source, /className="mt-4 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2"/);
});
