import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSummary, headerSettings } from '../js/summary.js';
import { summaryFixture } from './fixtures/summary-fixture.js';
import { serialize, deserialize } from '../js/tree.js';

const NOW = new Date(2026, 8, 16, 14, 2);

// The content set from the brief (section 4.10): header with date and settings, roots with the
// first Task line, per node: code, chips in framework order, computed label, word count,
// similarity, predictions, blind rounds with call and outcome, criteria checks, totals.
const EXPECTED = [
  'Brief Lab lineage — 2026-09-16 14:02 — Gemini gemini-2.5-flash, temp 0.7',
  'Root A: "Draft an internal announcement about the new remote-work policy."',
  '  A1  [P T C E R Cr S]  ●●●○●●○   full brief                             30 words',
  '    A3  [P T C E R Cr S]  ●●○○●●○   – Context                              24 words  sim 0.62 to A1',
  '        prediction: "It will guess the audience and get more generic."',
  '      A5  [P T C E R Cr S]  ●●○○●●○   same as parent                         24 words  sim 0.90 to A3  (temp 0.2)  note: cooler',
  '    A4  [P T C E R Cr S]  ●●●○○●○   BLIND · dropped Rules · call: Criteria (Med) · MISSED   30 words  sim 0.55 to A1',
  '  A2  [P T C E R Cr S]  ●●●○●●○   same brief (run again)                 28 words  sim 0.86 to A1',
  'Root B: "Write a two-line memo."',
  '  B1  [P T C E R Cr S]  ●●●○●●○   full brief                              4 words',
  '    B2  [P T C E R Cr S]  ●●●○●●●   + Steps                                 5 words  RECORDED gemini-2.5-flash 2026-09-01  sim 0.80 to B1',
  'Criteria checks on A1: 1 of 2 met (unmet: "Names the effective date.")',
  'Nodes: 7 · Blind rounds: 1 · Noise floor (same-brief): ~14%',
].join('\n');

test('formatSummary output is stable for the fixed fixture', () => {
  assert.equal(formatSummary({ runs: summaryFixture(), now: NOW }), EXPECTED);
});

test('formatSummary is unchanged after an export/import round trip', () => {
  const runs = summaryFixture();
  const back = deserialize(JSON.parse(JSON.stringify(serialize(runs, null))));
  assert.equal(formatSummary({ runs: back.runs, now: NOW }), EXPECTED);
});

test('formatSummary handles an empty tree and hides unrevealed blind briefs', () => {
  const empty = formatSummary({ runs: [], now: NOW, settings: { provider: 'openai', model: 'gpt-x', temperature: 0.5 } });
  assert.equal(empty, [
    'Brief Lab lineage — 2026-09-16 14:02 — OpenAI gpt-x, temp 0.5',
    'Nodes: 0 · Blind rounds: 0 · Noise floor (same-brief): none',
  ].join('\n'));

  const runs = summaryFixture();
  const a4 = runs.find((r) => r.id === 'a4');
  a4.blind.revealed = false;
  const text = formatSummary({ runs, now: NOW });
  assert.ok(text.includes('▒▒▒▒▒▒▒   BLIND · unrevealed'));
  assert.ok(!text.includes('dropped Rules'));
  assert.ok(text.includes('Blind rounds: 0'));
});

test('headerSettings prefers the most recent live run', () => {
  const runs = summaryFixture();
  assert.equal(headerSettings(runs, null).temperature, 0.7);
  assert.deepEqual(headerSettings([], { provider: 'p', model: 'm', temperature: 1 }), { provider: 'p', model: 'm', temperature: 1 });
});
