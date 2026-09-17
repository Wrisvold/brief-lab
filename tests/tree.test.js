import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fileRun, parentOf, childrenOf, rootOf, rootGroups, buildTree, codeOf, labelFor, sameBriefGroup,
  serialize, deserialize, migrate, letterFor, byteSize, EXPORT_FORMAT,
} from '../js/tree.js';
import { makeBrief } from '../js/model.js';

const settings = { provider: 'gemini', model: 'm', temperature: 0.7, maxOutputTokens: 1024 };

function brief(overrides = {}) {
  const b = makeBrief();
  b.task.text = 'Draft an announcement.';
  b.context.text = 'Company context.';
  b.rules.do = 'State the date.';
  for (const [k, v] of Object.entries(overrides)) {
    if (k === 'rules') Object.assign(b.rules, v);
    else Object.assign(b[k], v);
  }
  return b;
}

let clock = 0;
function at() {
  clock += 1;
  return new Date(Date.UTC(2026, 8, 16, 14, 0, clock)).toISOString();
}

function fixture() {
  const runs = [];
  const a1 = fileRun(runs, { brief: brief(), settings, output: 'Full one.', createdAt: at() });
  const a2 = fileRun(runs, { sameBriefAs: a1, brief: brief(), settings, output: 'Full two.', createdAt: at() });
  const a3 = fileRun(runs, { parent: a1, brief: brief({ context: { enabled: false } }), settings, output: 'No context.', createdAt: at(), prediction: 'More generic.' });
  const a4 = fileRun(runs, { parent: a3, brief: brief({ context: { enabled: false }, steps: { text: '1. Go' } }), settings, output: 'Steps.', createdAt: at() });
  const b1 = fileRun(runs, { brief: brief({ task: { text: 'Write a memo.' } }), settings, output: 'Memo.', createdAt: at() });
  return { runs, a1, a2, a3, a4, b1 };
}

test('fileRun: a fresh run is its own root; a child inherits the root; run-again shares the parent', () => {
  const { runs, a1, a2, a3, a4, b1 } = fixture();
  assert.equal(a1.parentId, null);
  assert.equal(a1.rootId, a1.id);
  assert.equal(a2.parentId, null);
  assert.equal(a2.rootId, a1.id);
  assert.equal(a2.sameBriefAs, a1.id);
  assert.equal(a3.parentId, a1.id);
  assert.equal(a3.rootId, a1.id);
  assert.equal(a4.rootId, a1.id);
  assert.equal(b1.rootId, b1.id);
  assert.equal(runs.length, 5);
  assert.equal(parentOf(runs, a4), a3);
  assert.deepEqual(childrenOf(runs, a1.id), [a3]);
  assert.equal(rootOf(runs, a4), a1);
});

test('root groups sit side by side with letters, and codes count within a group', () => {
  const { runs, a1, a2, a3, a4, b1 } = fixture();
  const groups = rootGroups(runs);
  assert.deepEqual(groups.map((g) => g.letter), ['A', 'B']);
  assert.deepEqual(groups[0].runs, [a1, a2, a3, a4]);
  assert.equal(codeOf(runs, a1), 'A1');
  assert.equal(codeOf(runs, a2), 'A2');
  assert.equal(codeOf(runs, a4), 'A4');
  assert.equal(codeOf(runs, b1), 'B1');
  assert.equal(letterFor(25), 'Z');
  assert.equal(letterFor(26), 'AA');
});

test('buildTree nests children under parents inside each root group', () => {
  const { runs, a1, a2, a3, a4, b1 } = fixture();
  const tree = buildTree(runs);
  assert.equal(tree.length, 2);
  assert.deepEqual(tree[0].nodes.map((n) => n.run), [a1, a2]);
  assert.deepEqual(tree[0].nodes[0].children.map((n) => n.run), [a3]);
  assert.deepEqual(tree[0].nodes[0].children[0].children.map((n) => n.run), [a4]);
  assert.deepEqual(tree[1].nodes.map((n) => n.run), [b1]);
  assert.equal(tree[0].first, a1);
});

test('labelFor computes full / same / changes / unchanged / blind', () => {
  const { runs, a1, a2, a3, a4 } = fixture();
  assert.deepEqual(labelFor(runs, a1), { kind: 'full' });
  assert.deepEqual(labelFor(runs, a2), { kind: 'same' });
  assert.deepEqual(labelFor(runs, a3), { kind: 'changes', changes: [{ type: 'minus', key: 'context' }] });
  assert.deepEqual(labelFor(runs, a4), { kind: 'changes', changes: [{ type: 'plus', key: 'steps' }] });
  const edited = fileRun(runs, { parent: a1, brief: brief({ rules: { do: 'State the date exactly.' } }), settings, createdAt: at() });
  assert.deepEqual(labelFor(runs, edited), { kind: 'changes', changes: [{ type: 'edited', key: 'rules' }] });
  const twin = fileRun(runs, { parent: a1, brief: brief(), settings, createdAt: at() });
  assert.deepEqual(labelFor(runs, twin), { kind: 'unchanged' });
  const blind = fileRun(runs, { parent: a1, brief: brief(), settings, createdAt: at(), blind: { droppedElement: 'context' } });
  assert.deepEqual(labelFor(runs, blind), { kind: 'blind', revealed: false });
});

test('sameBriefGroup finds identical briefs with identical settings, across the tree', () => {
  const { runs, a1, a2, a3 } = fixture();
  assert.deepEqual(sameBriefGroup(runs, a1), [a1, a2]);
  assert.deepEqual(sameBriefGroup(runs, a2), [a1, a2]);
  assert.deepEqual(sameBriefGroup(runs, a3), [a3]);
  const hotter = fileRun(runs, { sameBriefAs: a1, brief: brief(), settings: { ...settings, temperature: 0.9 }, createdAt: at() });
  assert.ok(!sameBriefGroup(runs, a1).includes(hotter));
  const recorded = fileRun(runs, { parent: null, brief: brief(), settings, createdAt: at(), recorded: { model: 'm', date: '2026-09-01' } });
  assert.ok(!sameBriefGroup(runs, a1).includes(recorded));
});

test('export then import round-trips exactly', () => {
  const { runs, a3 } = fixture();
  runs[0].note = 'baseline';
  runs[2].criteriaChecks = [{ criterion: 'Under 250 words.', met: true }];
  runs[3].blind = { droppedElement: 'steps', studentCall: 'rules', confidence: 'Low', reason: '', revealed: true };
  const exported = serialize(runs, a3.id);
  assert.equal(exported.format, EXPORT_FORMAT);
  const json = JSON.stringify(exported);
  const back = deserialize(JSON.parse(json));
  assert.deepEqual(back.runs, runs);
  assert.equal(back.currentRunId, a3.id);
  assert.deepEqual(JSON.parse(JSON.stringify(serialize(back.runs, back.currentRunId))).runs, JSON.parse(json).runs);
});

test('deserialize rejects things that are not a tree and repairs dangling parents', () => {
  assert.throws(() => deserialize(null));
  assert.throws(() => deserialize({ format: 'other', runs: [] }));
  assert.throws(() => deserialize({ format: EXPORT_FORMAT, runs: 'x' }));
  assert.throws(() => deserialize({ format: EXPORT_FORMAT, runs: [{ id: 'a', brief: {}, settings: {} }, { id: 'a', brief: {}, settings: {} }] }));
  const back = deserialize({ format: EXPORT_FORMAT, currentRunId: 'zzz', runs: [{ id: 'a', parentId: 'missing', brief: {}, settings: {}, createdAt: at() }] });
  assert.equal(back.runs[0].parentId, null);
  assert.equal(back.runs[0].rootId, 'a');
  assert.equal(back.currentRunId, null);
});

test('migrate assigns rootId from the top ancestor for older saved runs', () => {
  const runs = [
    { id: 'x', parentId: null, brief: {}, settings: {}, createdAt: at() },
    { id: 'y', parentId: 'x', brief: {}, settings: {}, createdAt: at() },
  ];
  migrate(runs);
  assert.equal(runs[0].rootId, 'x');
  assert.equal(runs[1].rootId, 'x');
  assert.equal(runs[1].sameBriefAs, null);
  assert.equal(runs[1].note, '');
});

test('byteSize measures the JSON form', () => {
  assert.equal(byteSize({ a: 'é' }), JSON.stringify({ a: 'é' }).length + 1);
});
