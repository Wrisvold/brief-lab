import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ELEMENTS, ELEMENT_KEYS, makeBrief, copyBrief, assemble, isPlugged, pluggedKeys,
  estimateTokens, makeRun, sameBrief, splitCriteria,
} from '../js/model.js';

function fullBrief() {
  const b = makeBrief();
  b.persona.text = 'You are the head of Human Resources.';
  b.task.text = 'Draft a short internal announcement.';
  b.context.text = 'The company has 340 employees.\nSome will be unhappy.';
  b.examples.text = 'Example opening:\n"Starting Monday, ..."';
  b.rules.do = 'State the date exactly.';
  b.rules.dont = 'Do not promise anything about pay.';
  b.rules.fallback = 'If the policy does not cover a case, say so.';
  b.criteria.text = 'Under 250 words.\nNames the effective date.';
  b.steps.text = '1. Lead with the change.\n2. Say who is affected.';
  return b;
}

// The fixture format from the brief (section 4.2). Success criterion 3 compares against this.
const FULL_FIXTURE = [
  'Persona: You are the head of Human Resources.',
  'Task: Draft a short internal announcement.',
  'Context: The company has 340 employees.',
  '  Some will be unhappy.',
  'Examples:',
  '  Example opening:',
  '  "Starting Monday, ..."',
  'Rules:',
  '  Do: State the date exactly.',
  "  Don't: Do not promise anything about pay.",
  "  If you can't: If the policy does not cover a case, say so.",
  'Criteria: Under 250 words.',
  '  Names the effective date.',
  'Steps: 1. Lead with the change.',
  '  2. Say who is affected.',
].join('\n');

test('seven elements, fixed names and order', () => {
  assert.deepEqual(ELEMENTS.map((e) => e.name), ['Persona', 'Task', 'Context', 'Examples', 'Rules', 'Criteria', 'Steps']);
  assert.deepEqual(ELEMENT_KEYS, ['persona', 'task', 'context', 'examples', 'rules', 'criteria', 'steps']);
});

test('assembler: full brief matches the fixture exactly', () => {
  assert.equal(assemble(fullBrief()), FULL_FIXTURE);
});

test('assembler: empty brief assembles to an empty string', () => {
  assert.equal(assemble(makeBrief()), '');
});

test('assembler: empty slots are omitted', () => {
  const b = makeBrief();
  b.task.text = 'Draft a memo.';
  b.criteria.text = 'Short.';
  assert.equal(assemble(b), 'Task: Draft a memo.\nCriteria: Short.');
});

test('assembler: unplugged slots are omitted but their text is kept', () => {
  const b = fullBrief();
  b.context.enabled = false;
  const out = assemble(b);
  assert.ok(!out.includes('Context:'));
  assert.equal(b.context.text, 'The company has 340 employees.\nSome will be unhappy.');
  assert.ok(out.startsWith('Persona:'));
  assert.ok(out.includes('Task:'));
});

test('assembler: order is framework order regardless of fill order', () => {
  const b = makeBrief();
  b.steps.text = 'Go.';
  b.persona.text = 'You are a clerk.';
  b.task.text = 'Write.';
  assert.equal(assemble(b), 'Persona: You are a clerk.\nTask: Write.\nSteps: Go.');
});

test('assembler: Rules sub-fields merge under one heading, missing sub-fields skipped', () => {
  const b = makeBrief();
  b.task.text = 'Write.';
  b.rules.dont = 'Never promise a date.';
  assert.equal(assemble(b), "Task: Write.\nRules:\n  Don't: Never promise a date.");
  b.rules.do = 'Be brief.';
  b.rules.fallback = 'Say so.';
  assert.equal(assemble(b), "Task: Write.\nRules:\n  Do: Be brief.\n  Don't: Never promise a date.\n  If you can't: Say so.");
});

test('assembler: Rules with all sub-fields empty counts as unplugged', () => {
  const b = makeBrief();
  b.task.text = 'Write.';
  b.rules.do = '   ';
  assert.equal(isPlugged(b, 'rules'), false);
  assert.equal(assemble(b), 'Task: Write.');
});

test('assembler: whitespace-only text counts as empty; surrounding whitespace trimmed', () => {
  const b = makeBrief();
  b.task.text = '  Write a memo.  \n';
  b.context.text = '   \n  ';
  assert.equal(assemble(b), 'Task: Write a memo.');
});

test('assembler: Windows line endings are normalised', () => {
  const b = makeBrief();
  b.task.text = 'Write.';
  b.steps.text = 'One.\r\nTwo.';
  assert.equal(assemble(b), 'Task: Write.\nSteps: One.\n  Two.');
});

test('assembler: Examples block puts every line under the heading', () => {
  const b = makeBrief();
  b.task.text = 'Write.';
  b.examples.text = 'A\nB';
  assert.equal(assemble(b), 'Task: Write.\nExamples:\n  A\n  B');
});

test('isPlugged and pluggedKeys', () => {
  const b = fullBrief();
  assert.deepEqual(pluggedKeys(b), ELEMENT_KEYS);
  b.examples.enabled = false;
  b.steps.text = '';
  assert.deepEqual(pluggedKeys(b), ['persona', 'task', 'context', 'rules', 'criteria']);
  assert.equal(isPlugged(b, 'examples'), false);
  assert.equal(isPlugged(b, 'steps'), false);
});

test('copyBrief is a deep copy', () => {
  const a = fullBrief();
  const b = copyBrief(a);
  b.task.text = 'Changed.';
  b.rules.do = 'Changed.';
  b.persona.enabled = false;
  assert.equal(a.task.text, 'Draft a short internal announcement.');
  assert.equal(a.rules.do, 'State the date exactly.');
  assert.equal(a.persona.enabled, true);
});

test('copyBrief tolerates a partial or malformed object', () => {
  const b = copyBrief({ task: { text: 'x' }, rules: { do: 'y' } });
  assert.equal(b.task.text, 'x');
  assert.equal(b.task.enabled, true);
  assert.equal(b.rules.do, 'y');
  assert.equal(b.rules.dont, '');
  assert.equal(b.persona.text, '');
  assert.equal(copyBrief(null).task.text, '');
});

test('makeRun stores a deep copy of the brief and normalises settings', () => {
  const brief = fullBrief();
  const run = makeRun({
    parentId: null,
    brief,
    settings: { provider: 'gemini', model: 'm', temperature: '0.7', maxOutputTokens: '1024' },
    prediction: 'It will be generic.',
    output: 'Hello.',
  });
  brief.task.text = 'Changed after the run.';
  assert.equal(run.brief.task.text, 'Draft a short internal announcement.');
  assert.equal(run.settings.temperature, 0.7);
  assert.equal(run.settings.maxOutputTokens, 1024);
  assert.equal(run.blind, null);
  assert.equal(run.criteriaChecks, null);
  assert.equal(run.recorded, null);
  assert.equal(typeof run.id, 'string');
  assert.ok(run.id.length > 8);
  assert.ok(!Number.isNaN(Date.parse(run.createdAt)));
});

test('makeRun copies the blind record', () => {
  const run = makeRun({
    brief: fullBrief(),
    settings: { provider: 'gemini', model: 'm', temperature: 0.7 },
    blind: { droppedElement: 'context' },
  });
  assert.deepEqual(run.blind, {
    droppedElement: 'context', studentCall: null, confidence: null, reason: '', revealed: false,
  });
});

test('sameBrief compares assembled prompts', () => {
  const a = fullBrief();
  const b = fullBrief();
  assert.equal(sameBrief(a, b), true);
  b.context.enabled = false;
  assert.equal(sameBrief(a, b), false);
});

test('estimateTokens is rough and never zero for non-empty text', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('a'), 1);
  assert.equal(estimateTokens('x'.repeat(400)), 100);
});

test('splitCriteria splits on lines and strips bullets and numbers', () => {
  assert.deepEqual(splitCriteria('Under 250 words.\n- Names the date.\n* Says who.\n• Dot.\n1. One\n2) Two\n\n'), [
    'Under 250 words.', 'Names the date.', 'Says who.', 'Dot.', 'One', 'Two',
  ]);
  assert.deepEqual(splitCriteria(''), []);
});
