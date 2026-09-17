// Brief Lab — summary.js
// "Copy lineage summary": a plain-text block for pasting into an assignment.
// Pure; tests in tests/summary.test.js pin the output for a fixed fixture.
//
//   Brief Lab lineage — 2026-09-16 14:02 — Gemini gemini-2.5-flash, temp 0.7
//   Root A: "Draft an internal announcement about the new remote-work policy"
//     A1  [P T C E R Cr S]  ●●●○●●○   full brief                          512 words
//     A2  [P T C E R Cr S]  ●●●○●●○   same brief (run again)              498 words  sim 0.81 to A1
//     A3  [P T C E R Cr S]  ●●○○●●○   – Context                           470 words  sim 0.62 to A1
//         prediction: "It will guess the audience and get more generic."
//     A4  [P T C E R Cr S]  ●●●○●●○   BLIND · dropped Rules · call: Criteria (Med) · MISSED
//   Criteria checks on A1: 4 of 5 met (unmet: "names the effective date")
//   Nodes: 4 · Blind rounds: 1 · Noise floor (same-brief): ~19%

import { ELEMENTS, isPlugged, elementByKey } from './model.js';
import { rootGroups, buildTree, codeOf, labelFor, byId, sameBriefGroup } from './tree.js';
import { textStats } from './diff.js';
import { noiseFloor } from './similarity.js';
import { outcomeOf } from './blind.js';

const FILLED = '●';
const HOLLOW = '○';
const HIDDEN = '▒';
const DOT = ' · ';
const HEADER_CHIPS = '[' + ELEMENTS.map((e) => e.short).join(' ') + ']';

function pad(text, width) {
  const s = String(text);
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function padLeft(text, width) {
  const s = String(text);
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

function stamp(date) {
  const d = date instanceof Date ? date : new Date(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function providerName(provider) {
  return { gemini: 'Gemini', openai: 'OpenAI', anthropic: 'Claude' }[provider] || String(provider || '');
}

function chips(run) {
  if (run.blind && !run.blind.revealed) return HIDDEN.repeat(ELEMENTS.length);
  return ELEMENTS.map((e) => (isPlugged(run.brief, e.key) ? FILLED : HOLLOW)).join('');
}

function firstTaskLine(run) {
  return ((run.brief.task && run.brief.task.text) || '').split(/\r?\n/)[0].trim();
}

function shortConfidence(c) {
  return c === 'Medium' ? 'Med' : (c || '');
}

function labelWords(runs, run) {
  const label = labelFor(runs, run);
  switch (label.kind) {
    case 'full': return 'full brief';
    case 'same': return 'same brief (run again)';
    case 'unchanged': return 'same as parent';
    case 'changes':
      return label.changes.map((c) => {
        const name = elementByKey(c.key).name;
        return c.type === 'minus' ? `– ${name}` : c.type === 'plus' ? `+ ${name}` : `edited ${name}`;
      }).join(', ');
    case 'blind': {
      const b = run.blind;
      if (!b.revealed) return 'BLIND' + DOT + 'unrevealed';
      const dropped = elementByKey(b.droppedElement).name;
      const call = b.studentCall ? elementByKey(b.studentCall).name : '?';
      const outcome = outcomeOf(run);
      const word = outcome === 'noDifference' ? 'NO VISIBLE DIFFERENCE' : outcome === 'identified' ? 'IDENTIFIED' : 'MISSED';
      return `BLIND${DOT}dropped ${dropped}${DOT}call: ${call} (${shortConfidence(b.confidence)})${DOT}${word}`;
    }
    default: return '';
  }
}

// Settings that differ from the header settings, as a short suffix.
function settingsSuffix(run, header) {
  const parts = [];
  if (run.settings.provider !== header.provider || run.settings.model !== header.model) {
    parts.push(`${providerName(run.settings.provider)} ${run.settings.model}`);
  }
  if (Number(run.settings.temperature) !== Number(header.temperature)) parts.push(`temp ${run.settings.temperature}`);
  return parts.length ? `  (${parts.join(', ')})` : '';
}

// The settings shown in the header: those of the most recent live run, else the given defaults.
export function headerSettings(runs, fallback) {
  const live = runs.filter((r) => !r.recorded);
  const last = live.length ? live[live.length - 1] : runs[runs.length - 1];
  return last ? last.settings : fallback;
}

export function formatSummary({ runs, now = new Date(), settings = null }) {
  const header = headerSettings(runs, settings || { provider: '', model: '', temperature: '' });
  const lines = [];
  lines.push(`Brief Lab lineage — ${stamp(now)} — ${providerName(header.provider)} ${header.model}, temp ${header.temperature}`);

  const criteriaLines = [];
  let blindRounds = 0;
  const noiseGroups = new Map();

  const walk = (node, depth, group) => {
    const run = node.run;
    const code = codeOf(runs, run);
    const indent = '  ' + '  '.repeat(depth);
    const words = textStats(run.output).words;
    let line = `${indent}${pad(code, 4)}${HEADER_CHIPS}  ${chips(run)}   ${pad(labelWords(runs, run), 36)}${padLeft(words, 5)} words`;
    if (run.recorded) line += `  RECORDED ${run.recorded.model} ${run.recorded.date}`;
    const simTarget = run.sameBriefAs ? byId(runs, run.sameBriefAs) : byId(runs, run.parentId);
    if (simTarget && typeof run.similarityToParent === 'number' && !run.sameBriefAs) {
      line += `  sim ${run.similarityToParent.toFixed(2)} to ${codeOf(runs, simTarget)}`;
    } else if (simTarget && run.sameBriefAs) {
      const group = sameBriefGroup(runs, run);
      const nf = noiseFloor(group.map((r) => r.output));
      if (nf) line += `  sim ${nf.meanSimilarity.toFixed(2)} to ${codeOf(runs, simTarget)}`;
    }
    line += settingsSuffix(run, header);
    if (run.note) line += `  note: ${run.note}`;
    lines.push(line.replace(/\s+$/, ''));
    if (run.prediction) lines.push(`${indent}    prediction: "${run.prediction.replace(/\s+/g, ' ').trim()}"`);
    if (run.blind && run.blind.revealed) blindRounds++;
    if (Array.isArray(run.criteriaChecks) && run.criteriaChecks.length) {
      const met = run.criteriaChecks.filter((c) => c.met).length;
      const unmet = run.criteriaChecks.filter((c) => !c.met).map((c) => `"${c.criterion}"`);
      criteriaLines.push(`Criteria checks on ${code}: ${met} of ${run.criteriaChecks.length} met${unmet.length ? ` (unmet: ${unmet.join(', ')})` : ''}`);
    }
    if (!run.recorded) {
      const g = sameBriefGroup(runs, run);
      if (g.length >= 2) noiseGroups.set(g[0].id, g);
    }
    for (const child of node.children) walk(child, depth + 1, group);
  };

  for (const g of buildTree(runs)) {
    lines.push(`Root ${g.letter}: "${firstTaskLine(g.first)}"`);
    for (const node of g.nodes) walk(node, 0, g);
  }

  lines.push(...criteriaLines);

  let noise = 'none';
  if (noiseGroups.size) {
    const percents = [...noiseGroups.values()].map((g) => noiseFloor(g.map((r) => r.output)).percent);
    const avg = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
    noise = `~${avg}%`;
  }
  lines.push(`Nodes: ${runs.length}${DOT}Blind rounds: ${blindRounds}${DOT}Noise floor (same-brief): ${noise}`);
  return lines.join('\n');
}

export { rootGroups };
