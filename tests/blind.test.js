import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blindCandidates, canRunBlind, chooseDrop, dropElement, outcomeOf, calibration } from '../js/blind.js';
import { makeBrief, pluggedKeys } from '../js/model.js';
import { BLIND_NO_DIFFERENCE_THRESHOLD, BLIND_MIN_PLUGGED } from '../js/constants.js';

function brief() {
  const b = makeBrief();
  b.persona.text = 'You are HR.';
  b.task.text = 'Draft.';
  b.context.text = 'Context.';
  b.rules.do = 'Do this.';
  b.criteria.text = 'Short.';
  b.steps.text = '1. Go';
  b.steps.enabled = false;
  return b;
}

test('blindCandidates: plugged elements minus Task, never unplugged ones', () => {
  assert.deepEqual(blindCandidates(brief()), ['persona', 'context', 'rules', 'criteria']);
  const b = makeBrief();
  b.task.text = 'Draft.';
  assert.deepEqual(blindCandidates(b), []);
});

test('canRunBlind needs the minimum plugged count and a droppable element', () => {
  assert.equal(BLIND_MIN_PLUGGED >= 2, true);
  assert.equal(canRunBlind(brief()), true);
  const b = makeBrief();
  b.task.text = 'Draft.';
  b.context.text = 'Context.';
  assert.equal(canRunBlind(b), BLIND_MIN_PLUGGED <= 2);
  assert.equal(canRunBlind(makeBrief()), false);
});

test('chooseDrop never picks Task or an unplugged element, and covers every candidate', () => {
  const b = brief();
  const seen = new Set();
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 400; i++) {
    const k = chooseDrop(b, random);
    assert.notEqual(k, 'task');
    assert.notEqual(k, 'steps');
    assert.ok(pluggedKeys(b).includes(k));
    seen.add(k);
  }
  assert.deepEqual([...seen].sort(), ['context', 'criteria', 'persona', 'rules']);
  assert.equal(chooseDrop(b, () => 0), 'persona');
  assert.equal(chooseDrop(b, () => 0.999999), 'criteria');
  assert.equal(chooseDrop(makeBrief()), null);
});

test('dropElement unplugs one element in a copy and keeps its text', () => {
  const b = brief();
  const d = dropElement(b, 'context');
  assert.equal(d.context.enabled, false);
  assert.equal(d.context.text, 'Context.');
  assert.equal(b.context.enabled, true);
  assert.deepEqual(pluggedKeys(d), ['persona', 'task', 'rules', 'criteria']);
});

test('outcomeOf: no visible difference at or above the threshold regardless of the call', () => {
  const t = BLIND_NO_DIFFERENCE_THRESHOLD;
  const run = (sim, call, dropped = 'context') => ({ similarityToParent: sim, blind: { droppedElement: dropped, studentCall: call } });
  assert.equal(outcomeOf(run(t, 'rules')), 'noDifference');
  assert.equal(outcomeOf(run(t, 'context')), 'noDifference');
  assert.equal(outcomeOf(run(0.99, 'context')), 'noDifference');
  assert.equal(outcomeOf(run(t - 0.01, 'context')), 'identified');
  assert.equal(outcomeOf(run(t - 0.01, 'rules')), 'missed');
  assert.equal(outcomeOf(run(null, 'context')), 'identified');
  assert.equal(outcomeOf({ blind: null }), null);
  assert.equal(outcomeOf(run(0.5, 'context'), 0.4), 'noDifference');
});

test('calibration counts per element and by confidence; excludes unrevealed and recorded rounds', () => {
  const mk = (dropped, call, confidence, sim, extra = {}) => ({
    similarityToParent: sim,
    blind: { droppedElement: dropped, studentCall: call, confidence, reason: '', revealed: true },
    recorded: null,
    ...extra,
  });
  const runs = [
    mk('context', 'context', 'High', 0.5),
    mk('context', 'rules', 'High', 0.5),
    mk('context', 'rules', 'Low', 0.95),
    mk('steps', 'examples', 'Low', 0.93),
    mk('persona', 'persona', 'Medium', 0.6),
    mk('persona', 'persona', 'High', 0.6, { blind: { droppedElement: 'persona', studentCall: 'persona', confidence: 'High', revealed: false } }),
    mk('persona', 'persona', 'High', 0.6, { recorded: { model: 'm', date: 'd' } }),
    { blind: null },
  ];
  const c = calibration(runs);
  assert.equal(c.rounds, 5);
  assert.deepEqual(c.elements.map((e) => e.key), ['persona', 'context', 'steps']);
  const ctx = c.elements.find((e) => e.key === 'context');
  assert.deepEqual(ctx, { key: 'context', name: 'Context', dropped: 3, identified: 1, missed: 1, noDifference: 1 });
  const steps = c.elements.find((e) => e.key === 'steps');
  assert.deepEqual([steps.dropped, steps.identified, steps.missed, steps.noDifference], [1, 0, 0, 1]);
  assert.deepEqual(c.byConfidence.High, { right: 1, wrong: 1 });
  assert.deepEqual(c.byConfidence.Medium, { right: 1, wrong: 0 });
  assert.deepEqual(c.byConfidence.Low, { right: 0, wrong: 0 });
  assert.deepEqual(calibration([]).elements, []);
});
