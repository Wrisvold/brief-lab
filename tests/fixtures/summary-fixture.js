// A fixed lineage for the summary formatter test. Deterministic ids and times.
import { fileRun } from '../../js/tree.js';
import { makeBrief } from '../../js/model.js';

const settings = { provider: 'gemini', model: 'gemini-2.5-flash', temperature: 0.7, maxOutputTokens: 1024 };

function brief(overrides = {}) {
  const b = makeBrief();
  b.persona.text = 'You are the head of Human Resources.';
  b.task.text = 'Draft an internal announcement about the new remote-work policy.\nKeep it short.';
  b.context.text = 'Company context.';
  b.rules.do = 'State the date.';
  b.criteria.text = 'Under 250 words.\nNames the effective date.';
  for (const [k, v] of Object.entries(overrides)) {
    if (k === 'rules') Object.assign(b.rules, v);
    else Object.assign(b[k], v);
  }
  return b;
}

let n = 0;
const at = () => new Date(Date.UTC(2026, 8, 16, 18, 0, ++n)).toISOString();
const text = (words, seed) => Array.from({ length: words }, (_, i) => `w${(i * 7 + seed) % 23}`).join(' ');

export function summaryFixture() {
  const runs = [];
  const a1 = fileRun(runs, { id: 'a1', brief: brief(), settings, output: text(30, 1), createdAt: at() });
  a1.criteriaChecks = [{ criterion: 'Under 250 words.', met: true }, { criterion: 'Names the effective date.', met: false }];
  const a2 = fileRun(runs, { id: 'a2', sameBriefAs: a1, brief: brief(), settings, output: text(28, 3), createdAt: at() });
  const a3 = fileRun(runs, {
    id: 'a3', parent: a1, brief: brief({ context: { enabled: false } }), settings, output: text(24, 9), createdAt: at(),
    prediction: 'It will guess the audience and get more generic.', similarityToParent: 0.62,
  });
  fileRun(runs, {
    id: 'a4', parent: a1, brief: brief({ rules: { do: '' } }), settings, output: text(30, 2), createdAt: at(), similarityToParent: 0.55,
    blind: { droppedElement: 'rules', studentCall: 'criteria', confidence: 'Medium', reason: '', revealed: true },
  });
  fileRun(runs, {
    id: 'a5', parent: a3, brief: brief({ context: { enabled: false } }), settings: { ...settings, temperature: 0.2 },
    output: text(24, 9), createdAt: at(), similarityToParent: 0.9, note: 'cooler',
  });
  const b1 = fileRun(runs, { id: 'b1', brief: brief({ task: { text: 'Write a two-line memo.' } }), settings, output: 'Memo one.\nMemo two.', createdAt: at() });
  fileRun(runs, {
    id: 'b2', parent: b1, brief: brief({ task: { text: 'Write a two-line memo.' }, steps: { text: '1. Go' } }), settings, output: 'Memo one.\nMemo two.\nGo.',
    createdAt: at(), similarityToParent: 0.8, recorded: { model: 'gemini-2.5-flash', date: '2026-09-01' },
  });
  return runs;
}
