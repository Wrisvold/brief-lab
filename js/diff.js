// Brief Lab — diff.js
// Word-level diff of two texts, plain text statistics, and the brief/settings diffs
// the Compare panel shows. No DOM here; tests in tests/diff.test.js.

import { ELEMENTS, RULES_FIELDS, isPlugged, slotText } from './model.js';

// A paragraph break is its own token so the diff keeps line structure.
export const BREAK = '\n';

// Words and paragraph breaks. Runs of spaces vanish; runs of newlines become one BREAK.
export function tokenize(text) {
  const out = [];
  for (const chunk of String(text || '').split(/(\n+)/)) {
    if (!chunk) continue;
    if (chunk[0] === '\n') {
      out.push(BREAK);
    } else {
      for (const w of chunk.split(/\s+/)) if (w) out.push(w);
    }
  }
  return out;
}

// Longest-common-subsequence diff over tokens. Returns runs: [{ type, tokens }]
// with type 'equal' | 'removed' (only in a) | 'added' (only in b).
export function diffWords(aText, bText) {
  const a = tokenize(aText);
  const b = tokenize(bText);
  const n = a.length;
  const m = b.length;

  // Trim the common head and tail first; most outputs share their openings.
  let head = 0;
  while (head < n && head < m && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < n - head && tail < m - head && a[n - 1 - tail] === b[m - 1 - tail]) tail++;

  const midA = a.slice(head, n - tail);
  const midB = b.slice(head, m - tail);
  const ops = [];
  for (let i = 0; i < head; i++) ops.push(['equal', a[i]]);
  for (const op of lcsOps(midA, midB)) ops.push(op);
  for (let i = n - tail; i < n; i++) ops.push(['equal', a[i]]);

  // Merge consecutive ops of the same type into runs.
  const runs = [];
  for (const [type, token] of ops) {
    const last = runs[runs.length - 1];
    if (last && last.type === type) last.tokens.push(token);
    else runs.push({ type, tokens: [token] });
  }
  return runs;
}

function lcsOps(a, b) {
  const n = a.length;
  const m = b.length;
  if (n === 0) return b.map((t) => ['added', t]);
  if (m === 0) return a.map((t) => ['removed', t]);
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] = a[i] === b[j]
        ? table[(i + 1) * width + j + 1] + 1
        : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push(['equal', a[i]]);
      i++;
      j++;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      ops.push(['removed', a[i]]);
      i++;
    } else {
      ops.push(['added', b[j]]);
      j++;
    }
  }
  while (i < n) ops.push(['removed', a[i++]]);
  while (j < m) ops.push(['added', b[j++]]);
  return ops;
}

// Words, paragraphs (blank-line separated blocks), and list items (lines starting
// with a bullet or a number).
export function textStats(text) {
  const t = String(text || '');
  const wordsCount = t.split(/\s+/).filter(Boolean).length;
  const paragraphs = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;
  const listItems = t.split(/\n/).filter((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line)).length;
  return { words: wordsCount, paragraphs, listItems };
}

// What changed between two briefs, element by element, in framework order.
// status: 'same' | 'plugged' (left off, right on) | 'unplugged' (left on, right off)
//       | 'edited' (on both sides, text differs) | 'absent' (off both sides)
// For 'edited', `diff` is diffWords(leftText, rightText). Rules compares its three
// sub-fields as one labelled block.
export function briefDiff(left, right) {
  return ELEMENTS.map((e) => {
    const l = isPlugged(left, e.key);
    const r = isPlugged(right, e.key);
    const lt = elementDisplayText(left, e.key);
    const rt = elementDisplayText(right, e.key);
    let status = 'same';
    if (!l && !r) status = 'absent';
    else if (!l && r) status = 'plugged';
    else if (l && !r) status = 'unplugged';
    else if (lt !== rt) status = 'edited';
    return {
      key: e.key,
      name: e.name,
      leftPlugged: l,
      rightPlugged: r,
      leftText: lt,
      rightText: rt,
      status,
      diff: status === 'edited' ? diffWords(lt, rt) : null,
    };
  });
}

// The text of an element as the student sees it; Rules gets its sub-field labels.
export function elementDisplayText(brief, key) {
  if (key !== 'rules') return slotText(brief, key);
  const slot = brief.rules || {};
  return RULES_FIELDS
    .map((f) => ((slot[f.key] || '').trim() ? `${f.heading}: ${slot[f.key].trim()}` : ''))
    .filter(Boolean)
    .join('\n');
}

// [{ key, label, left, right }] for the settings that differ. Empty when identical.
export function settingsDiff(a, b) {
  const out = [];
  const pairs = [
    ['provider', 'Provider'],
    ['model', 'Model'],
    ['temperature', 'Temperature'],
    ['maxOutputTokens', 'Max output'],
  ];
  for (const [key, label] of pairs) {
    const l = a && a[key] != null ? String(a[key]) : '';
    const r = b && b[key] != null ? String(b[key]) : '';
    if (l !== r) out.push({ key, label, left: l, right: r });
  }
  return out;
}
