// Brief Lab — tree.js
// Operations on the flat list of runs that make up the lineage tree: filing a run,
// finding parents and children, grouping by root, computing node codes and labels,
// finding same-brief siblings, and export/import. No DOM; tests in tests/tree.test.js.

import { ELEMENT_KEYS, assemble, copyBrief, isPlugged, newId, makeRun } from './model.js';
import { elementDisplayText } from './diff.js';
import { EXPORT_FORMAT_VERSION } from './constants.js';

export const EXPORT_FORMAT = 'brief-lab-tree';

// ---------- lookups ----------

export function byId(runs, id) {
  return id ? runs.find((r) => r.id === id) || null : null;
}

export function parentOf(runs, run) {
  return run ? byId(runs, run.parentId) : null;
}

export function childrenOf(runs, id) {
  return sortByTime(runs.filter((r) => r.parentId === id));
}

// Follow parent links to the top. Guards against cycles.
export function rootOf(runs, run) {
  let cur = run;
  const seen = new Set();
  while (cur && cur.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    const p = byId(runs, cur.parentId);
    if (!p) break;
    cur = p;
  }
  return cur;
}

function sortByTime(list) {
  return list
    .map((run, index) => ({ run, index }))
    .sort((a, b) => (a.run.createdAt < b.run.createdAt ? -1 : a.run.createdAt > b.run.createdAt ? 1 : a.index - b.index))
    .map((x) => x.run);
}

// ---------- roots and codes ----------

// Every run carries rootId: the group it belongs to. Runs saved before rootId existed
// (or imported without one) get the id of their top ancestor.
export function migrate(runs) {
  for (const run of runs) {
    if (!run.rootId) {
      const top = rootOf(runs, run);
      run.rootId = top && top.rootId ? top.rootId : (top ? top.id : run.id);
    }
    if (run.sameBriefAs === undefined) run.sameBriefAs = null;
    if (run.note === undefined) run.note = '';
  }
  return runs;
}

// Root groups in order of first appearance: [{ rootId, letter, runs }]. Letters A, B, ... AA.
export function rootGroups(runs) {
  const ordered = sortByTime(runs);
  const groups = [];
  const index = new Map();
  for (const run of ordered) {
    let g = index.get(run.rootId);
    if (!g) {
      g = { rootId: run.rootId, letter: letterFor(groups.length), runs: [] };
      index.set(run.rootId, g);
      groups.push(g);
    }
    g.runs.push(run);
  }
  return groups;
}

export function letterFor(n) {
  let s = '';
  let x = n;
  do {
    s = String.fromCharCode(65 + (x % 26)) + s;
    x = Math.floor(x / 26) - 1;
  } while (x >= 0);
  return s;
}

// 'A3': root letter plus the run's 1-based position in its group, by time.
export function codeOf(runs, run) {
  for (const g of rootGroups(runs)) {
    const i = g.runs.indexOf(run);
    if (i >= 0) return `${g.letter}${i + 1}`;
  }
  return '?';
}

// Nested tree per root group: [{ rootId, letter, first, nodes: [{ run, children }] }]
export function buildTree(runs) {
  return rootGroups(runs).map((g) => {
    const inGroup = new Set(g.runs.map((r) => r.id));
    const build = (run) => ({ run, children: childrenOf(runs, run.id).filter((c) => inGroup.has(c.id)).map(build) });
    const tops = g.runs.filter((r) => !r.parentId || !inGroup.has(r.parentId));
    return { rootId: g.rootId, letter: g.letter, first: g.runs[0], nodes: tops.map(build) };
  });
}

// ---------- filing ----------

// Create and file a run. `parent` is the node loaded on the field (null for a fresh root).
// `sameBriefAs` marks a "run again" sibling: it shares the parent and root of that node.
export function fileRun(runs, { parent = null, sameBriefAs = null, rootId = null, ...fields }) {
  const run = makeRun({ ...fields, parentId: parent ? parent.id : null, sameBriefAs: sameBriefAs ? sameBriefAs.id : null });
  if (sameBriefAs) {
    run.parentId = sameBriefAs.parentId;
    run.rootId = sameBriefAs.rootId;
  } else if (parent) {
    run.rootId = parent.rootId || rootOf(runs, parent).id;
  } else {
    run.rootId = rootId || run.id;
  }
  runs.push(run);
  return run;
}

// ---------- labels ----------

// A computed label for a node, as data the view turns into words:
//   { kind: 'full' }                       first run of its root
//   { kind: 'same' }                       identical brief to the node it was run again from
//   { kind: 'changes', changes: [...] }    vs. parent: [{ type: 'minus'|'plus'|'edited', key }]
//   { kind: 'unchanged' }                  a child whose brief equals its parent's (no sameBriefAs link)
//   { kind: 'blind', revealed: bool }      a blind run (Phase 4)
export function labelFor(runs, run) {
  if (run.blind) return { kind: 'blind', revealed: Boolean(run.blind.revealed) };
  if (run.sameBriefAs) return { kind: 'same' };
  const parent = parentOf(runs, run);
  if (!parent) return { kind: 'full' };
  const changes = [];
  for (const key of ELEMENT_KEYS) {
    const before = isPlugged(parent.brief, key);
    const after = isPlugged(run.brief, key);
    if (before && !after) changes.push({ type: 'minus', key });
    else if (!before && after) changes.push({ type: 'plus', key });
    else if (before && after && elementDisplayText(parent.brief, key) !== elementDisplayText(run.brief, key)) changes.push({ type: 'edited', key });
  }
  return changes.length ? { kind: 'changes', changes } : { kind: 'unchanged' };
}

// ---------- same-brief siblings (the noise floor) ----------

function settingsKey(s) {
  return `${s.provider}|${s.model}|${Number(s.temperature)}`;
}

// Every run (including `run`) whose assembled brief and generation settings match.
// Recorded runs are excluded from live groups and vice versa.
export function sameBriefGroup(runs, run) {
  const prompt = assemble(run.brief);
  const key = settingsKey(run.settings);
  const recorded = Boolean(run.recorded);
  return sortByTime(runs.filter((r) => Boolean(r.recorded) === recorded && settingsKey(r.settings) === key && assemble(r.brief) === prompt));
}

// ---------- export / import ----------
// Extension points (deferred, brief section 9):
//  - Import brief (blind): a "sealed brief" export would carry one run with element text
//    obfuscated and one element pre-dropped; `format` would be 'brief-lab-sealed-brief' and
//    deserialize() would file it as a hidden blind node. The format tag keeps the two apart.
//  - Named trees / multiple projects: serialize() already takes an `extra` object; a name
//    and a storage key per tree would let several trees live side by side in localStorage.

export function serialize(runs, currentRunId = null, extra = {}) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    currentRunId,
    runs: runs.map((r) => structuredCloneRun(r)),
    ...extra,
  };
}

// Throws an Error with a short reason when the object is not a Brief Lab export.
export function deserialize(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('not an object');
  if (obj.format !== EXPORT_FORMAT) throw new Error('not a Brief Lab tree');
  if (!Array.isArray(obj.runs)) throw new Error('no runs');
  const runs = obj.runs.map((r) => structuredCloneRun(r));
  const ids = new Set();
  for (const r of runs) {
    if (!r.id || typeof r.id !== 'string') throw new Error('a run has no id');
    if (ids.has(r.id)) throw new Error('duplicate run id');
    ids.add(r.id);
  }
  for (const r of runs) if (r.parentId && !ids.has(r.parentId)) r.parentId = null;
  migrate(runs);
  const currentRunId = typeof obj.currentRunId === 'string' && ids.has(obj.currentRunId) ? obj.currentRunId : null;
  return { runs, currentRunId };
}

// A plain deep copy with the run's known fields only.
function structuredCloneRun(r) {
  return {
    id: r.id,
    parentId: r.parentId || null,
    rootId: r.rootId || null,
    brief: copyBrief(r.brief),
    settings: {
      provider: r.settings ? r.settings.provider : null,
      model: r.settings ? r.settings.model : null,
      temperature: r.settings ? Number(r.settings.temperature) : null,
      maxOutputTokens: r.settings && r.settings.maxOutputTokens != null ? Number(r.settings.maxOutputTokens) : null,
    },
    prediction: String(r.prediction || ''),
    output: String(r.output || ''),
    similarityToParent: typeof r.similarityToParent === 'number' ? r.similarityToParent : null,
    blind: r.blind
      ? {
          droppedElement: r.blind.droppedElement,
          studentCall: r.blind.studentCall || null,
          confidence: r.blind.confidence || null,
          reason: String(r.blind.reason || ''),
          revealed: Boolean(r.blind.revealed),
        }
      : null,
    criteriaChecks: Array.isArray(r.criteriaChecks) ? r.criteriaChecks.map((c) => ({ criterion: String(c.criterion), met: Boolean(c.met) })) : null,
    sameBriefAs: r.sameBriefAs || null,
    recorded: r.recorded ? { model: r.recorded.model, date: r.recorded.date } : null,
    note: String(r.note || ''),
    createdAt: r.createdAt,
  };
}

// Size in bytes of the JSON form (for the storage guard).
export function byteSize(obj) {
  const json = JSON.stringify(obj);
  if (typeof TextEncoder === 'function') return new TextEncoder().encode(json).length;
  return json.length;
}

export { newId };
