import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as copy from '../js/copy.js';

// Words the course avoids in anything a student can read (brief, section 4.11).
const BANNED = /\b(leverage|leverages|leveraging|seamless|seamlessly|robust|delve|delves|powerful|unlock|unlocks|supercharge|journey)\b/i;
const BANNED_PHRASE = /prompt engineering/i;
const MAX_PARAGRAPH_WORDS = 70;

// Walk every string in an object tree, yielding [path, string].
function* strings(value, path = 'copy') {
  if (typeof value === 'string') {
    yield [path, value];
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* strings(value[i], `${path}[${i}]`);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) yield* strings(v, `${path}.${k}`);
  }
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const walkthrough = JSON.parse(readFileSync(new URL('../data/walkthrough.json', import.meta.url), 'utf8'));

test('fill replaces placeholders and leaves unknown ones alone', () => {
  assert.equal(copy.fill('Hello {name}, {n}%', { name: 'Ward', n: 19 }), 'Hello Ward, 19%');
  assert.equal(copy.fill('Keep {this}', {}), 'Keep {this}');
});

test('no banned words anywhere in copy.js', () => {
  for (const [path, s] of strings(copy)) {
    const m = s.match(BANNED);
    assert.equal(m, null, `${path} contains banned word "${m && m[0]}"`);
    assert.ok(!BANNED_PHRASE.test(s), `${path} says "prompt engineering"`);
  }
});

test('no banned words in the walkthrough task', () => {
  for (const [path, s] of strings(walkthrough, 'walkthrough')) {
    const m = s.match(BANNED);
    assert.equal(m, null, `${path} contains banned word "${m && m[0]}"`);
    assert.ok(!BANNED_PHRASE.test(s), `${path} says "prompt engineering"`);
  }
});

test('every paragraph in copy.js is under 70 words', () => {
  for (const [path, s] of strings(copy)) {
    for (const para of s.split(/\n\s*\n/)) {
      const n = wordCount(para);
      assert.ok(n < MAX_PARAGRAPH_WORDS, `${path} has a paragraph of ${n} words`);
    }
  }
});

test('explainers have both paragraphs for every region', () => {
  for (const key of ['field', 'prompt', 'output', 'tree', 'compare', 'blind']) {
    assert.ok(copy.EXPLAINERS[key], `missing explainer ${key}`);
    assert.ok(copy.EXPLAINERS[key].what.length > 20);
    assert.ok(copy.EXPLAINERS[key].why.length > 20);
  }
});

test('element hints exist for all seven elements and the three Rules sub-fields', () => {
  assert.deepEqual(Object.keys(copy.ELEMENT_HINTS), ['persona', 'task', 'context', 'examples', 'rules', 'criteria', 'steps']);
  assert.deepEqual(Object.keys(copy.RULES_HINTS), ['do', 'dont', 'fallback']);
});

test('walkthrough has eight stops in the specified order', () => {
  assert.equal(copy.WALKTHROUGH.stops.length, 8);
  assert.deepEqual(walkthrough.stopOrder, ['task', 'context', 'rules', 'criteria', 'persona', 'examples', 'steps', 'again']);
  for (const key of ['persona', 'task', 'context', 'examples', 'rules', 'criteria', 'steps']) {
    assert.ok(walkthrough.elements[key], `walkthrough element ${key} missing`);
  }
  assert.ok(walkthrough.elements.rules.do && walkthrough.elements.rules.dont && walkthrough.elements.rules.fallback);
});
