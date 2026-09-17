import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, diffWords, textStats, briefDiff, settingsDiff, BREAK } from '../js/diff.js';
import { similarity, percentDifferent, noiseFloor, words } from '../js/similarity.js';
import { makeBrief } from '../js/model.js';

// ---------- diff ----------

test('tokenize keeps words and paragraph breaks, drops spaces', () => {
  assert.deepEqual(tokenize('a  b\n\nc d\n'), ['a', 'b', BREAK, 'c', 'd', BREAK]);
  assert.deepEqual(tokenize(''), []);
});

test('diffWords: identical texts are one equal run', () => {
  assert.deepEqual(diffWords('the cat sat', 'the cat sat'), [{ type: 'equal', tokens: ['the', 'cat', 'sat'] }]);
});

test('diffWords marks additions and removals at word level', () => {
  const d = diffWords('the cat sat on the mat', 'the dog sat on a mat');
  assert.deepEqual(d, [
    { type: 'equal', tokens: ['the'] },
    { type: 'removed', tokens: ['cat'] },
    { type: 'added', tokens: ['dog'] },
    { type: 'equal', tokens: ['sat', 'on'] },
    { type: 'removed', tokens: ['the'] },
    { type: 'added', tokens: ['a'] },
    { type: 'equal', tokens: ['mat'] },
  ]);
});

test('diffWords handles empty sides', () => {
  assert.deepEqual(diffWords('', 'a b'), [{ type: 'added', tokens: ['a', 'b'] }]);
  assert.deepEqual(diffWords('a b', ''), [{ type: 'removed', tokens: ['a', 'b'] }]);
  assert.deepEqual(diffWords('', ''), []);
});

test('diffWords reconstructs both sides', () => {
  const a = 'Starting Monday, January 12, 2027, office staff work on site.\n\nNothing changes for crews.';
  const b = 'Starting Monday, January 12, 2027, headquarters staff will work on site three days.\n\nNothing changes for warehouse crews.';
  const d = diffWords(a, b);
  const left = d.filter((r) => r.type !== 'added').flatMap((r) => r.tokens);
  const right = d.filter((r) => r.type !== 'removed').flatMap((r) => r.tokens);
  assert.deepEqual(left, tokenize(a));
  assert.deepEqual(right, tokenize(b));
});

test('diffWords copes with a few thousand tokens', () => {
  const a = Array.from({ length: 1500 }, (_, i) => `w${i % 97}`).join(' ');
  const b = a.replace(/w5 /g, 'w5 extra ');
  const d = diffWords(a, b);
  assert.ok(d.some((r) => r.type === 'added'));
  assert.ok(!d.some((r) => r.type === 'removed'));
});

test('textStats counts words, paragraphs, and list items', () => {
  const t = 'One two three.\n\n- a\n- b\n1. c\n\nLast para here.';
  assert.deepEqual(textStats(t), { words: 12, paragraphs: 3, listItems: 3 });
  assert.deepEqual(textStats(''), { words: 0, paragraphs: 0, listItems: 0 });
});

test('briefDiff reports plugged, unplugged, edited, same, absent per element', () => {
  const a = makeBrief();
  const b = makeBrief();
  a.task.text = 'Write.'; b.task.text = 'Write.';
  a.context.text = 'Old.'; b.context.text = 'Old.'; b.context.enabled = false;
  b.steps.text = '1. Go';
  a.rules.do = 'Be brief.'; b.rules.do = 'Be very brief.';
  const d = briefDiff(a, b);
  const status = Object.fromEntries(d.map((x) => [x.key, x.status]));
  assert.deepEqual(status, {
    persona: 'absent', task: 'same', context: 'unplugged', examples: 'absent', rules: 'edited', criteria: 'absent', steps: 'plugged',
  });
  const rules = d.find((x) => x.key === 'rules');
  assert.equal(rules.leftText, 'Do: Be brief.');
  assert.ok(rules.diff.some((r) => r.type === 'added' && r.tokens.includes('very')));
  assert.equal(d[0].name, 'Persona');
});

test('settingsDiff lists only what differs', () => {
  const a = { provider: 'gemini', model: 'm', temperature: 0.7, maxOutputTokens: 1024 };
  assert.deepEqual(settingsDiff(a, { ...a }), []);
  const d = settingsDiff(a, { ...a, temperature: 0.2, model: 'n' });
  assert.deepEqual(d.map((x) => x.key), ['model', 'temperature']);
  assert.equal(d[1].left, '0.7');
  assert.equal(d[1].right, '0.2');
});

// ---------- similarity ----------

test('words lower-cases and strips punctuation', () => {
  assert.deepEqual(words('Hello, World! It\'s 12.'), ['hello', 'world', "it's", '12']);
});

test('similarity is 1 for identical text, symmetric, 0 with nothing shared', () => {
  const a = 'Starting Monday, office staff will work on site.';
  assert.equal(similarity(a, a), 1);
  assert.equal(similarity(a, 'STARTING monday office staff will work on site'), 1);
  const b = 'Nothing changes for warehouse crews.';
  assert.equal(similarity(a, b), similarity(b, a));
  assert.equal(similarity('alpha beta', 'gamma delta'), 0);
  assert.equal(similarity('', ''), 1);
  assert.equal(similarity('a', ''), 0);
});

test('similarity counts repeats and lands between 0 and 1', () => {
  // bags: {a:2,b:1} and {a:1,c:1}: shared 1, sizes 3 and 2 -> 2*1/5
  assert.equal(similarity('a a b', 'a c'), 0.4);
  const s = similarity('the cat sat on the mat', 'the dog sat on the mat');
  assert.ok(s > 0.8 && s < 1);
});

test('percentDifferent and noiseFloor', () => {
  assert.equal(percentDifferent(0.81), 19);
  assert.equal(noiseFloor(['only one']), null);
  const nf = noiseFloor(['a b c d', 'a b c e', 'a b c d']);
  assert.equal(nf.pairs, 3);
  assert.equal(nf.runs, 3);
  assert.ok(nf.meanSimilarity > 0.8 && nf.meanSimilarity < 1);
  assert.equal(nf.percent, percentDifferent(nf.meanSimilarity));
});
