// Brief Lab — model.js
// The data model: the seven elements, the brief, the assembled prompt, and run snapshots.
// This module never touches the page. It is tested by tests/model.test.js.

import { CHARS_PER_TOKEN } from './constants.js';

// The seven elements of the framework, in the fixed order the model receives them.
// Keys are used in code and in saved files; names are shown to students.
// Do not rename, reorder, merge, or add elements — the vocabulary belongs to the course.
export const ELEMENTS = Object.freeze([
  Object.freeze({ key: 'persona', name: 'Persona', short: 'P', number: 1 }),
  Object.freeze({ key: 'task', name: 'Task', short: 'T', number: 2 }),
  Object.freeze({ key: 'context', name: 'Context', short: 'C', number: 3 }),
  Object.freeze({ key: 'examples', name: 'Examples', short: 'E', number: 4 }),
  Object.freeze({ key: 'rules', name: 'Rules', short: 'R', number: 5 }),
  Object.freeze({ key: 'criteria', name: 'Criteria', short: 'Cr', number: 6 }),
  Object.freeze({ key: 'steps', name: 'Steps', short: 'S', number: 7 }),
]);

export const ELEMENT_KEYS = Object.freeze(ELEMENTS.map((e) => e.key));

// The three sub-fields of Rules, in the order they assemble.
export const RULES_FIELDS = Object.freeze([
  Object.freeze({ key: 'do', label: 'Do', heading: 'Do' }),
  Object.freeze({ key: 'dont', label: "Don't / negative space", heading: "Don't" }),
  Object.freeze({ key: 'fallback', label: 'Fallback', heading: "If you can't" }),
]);

export function elementByKey(key) {
  return ELEMENTS.find((e) => e.key === key) || null;
}

// A brief with every slot empty and plugged in.
export function makeBrief() {
  const brief = {};
  for (const el of ELEMENTS) {
    if (el.key === 'rules') {
      brief.rules = { enabled: true, do: '', dont: '', fallback: '' };
    } else {
      brief[el.key] = { enabled: true, text: '' };
    }
  }
  return brief;
}

// Deep copy of a brief. Runs store copies so later edits cannot change history.
// Tolerates a partial or malformed object (missing slots become empty and plugged).
export function copyBrief(brief) {
  const out = makeBrief();
  for (const el of ELEMENTS) {
    const src = brief && brief[el.key];
    if (!src) continue;
    if (el.key === 'rules') {
      out.rules = {
        enabled: src.enabled !== false,
        do: String(src.do || ''),
        dont: String(src.dont || ''),
        fallback: String(src.fallback || ''),
      };
    } else {
      out[el.key] = { enabled: src.enabled !== false, text: String(src.text || '') };
    }
  }
  return out;
}

// The text of a slot as one string. For Rules this is the three sub-fields joined,
// which is only used for "is it empty" checks and diffs, never sent to the model.
export function slotText(brief, key) {
  const slot = brief[key];
  if (!slot) return '';
  if (key === 'rules') {
    return [slot.do, slot.dont, slot.fallback]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join('\n');
  }
  return (slot.text || '').trim();
}

// True when the element has any text at all (plugged or not).
export function hasText(brief, key) {
  return slotText(brief, key).length > 0;
}

// True when the element is plugged in AND has text. An empty slot counts as unplugged.
export function isPlugged(brief, key) {
  const slot = brief[key];
  return Boolean(slot && slot.enabled !== false && hasText(brief, key));
}

// Keys of the plugged elements, in framework order.
export function pluggedKeys(brief) {
  return ELEMENT_KEYS.filter((k) => isPlugged(brief, k));
}

// Indent every line of a block by `spaces` spaces. Blank lines stay blank.
function indent(text, spaces) {
  const pad = ' '.repeat(spaces);
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => (line.trim() === '' ? '' : pad + line.trimEnd()))
    .join('\n');
}

// "Heading: first line" with continuation lines indented two spaces.
function inlineBlock(heading, text) {
  const lines = text.trim().split(/\r?\n/);
  const first = `${heading}: ${lines[0].trim()}`;
  if (lines.length === 1) return first;
  return first + '\n' + indent(lines.slice(1).join('\n'), 2);
}

// The assembled prompt: enabled, non-empty slots in framework order, exact headings.
//
//   Persona: You are ...
//   Task: Draft ...
//   Context: ...
//   Examples:
//     ...
//   Rules:
//     Do: ...
//     Don't: ...
//     If you can't: ...
//   Criteria: ...
//   Steps: ...
//
// Sent to the model as ONE user message, no system prompt: exactly what a person
// typing into a chat window would send.
export function assemble(brief) {
  const blocks = [];
  for (const el of ELEMENTS) {
    if (!isPlugged(brief, el.key)) continue;
    const slot = brief[el.key];
    if (el.key === 'rules') {
      const lines = ['Rules:'];
      for (const f of RULES_FIELDS) {
        const value = (slot[f.key] || '').trim();
        if (!value) continue;
        lines.push(indent(inlineBlock(f.heading, value), 2));
      }
      blocks.push(lines.join('\n'));
    } else if (el.key === 'examples') {
      blocks.push('Examples:\n' + indent(slot.text, 2));
    } else {
      blocks.push(inlineBlock(el.name, slot.text));
    }
  }
  return blocks.join('\n');
}

// Rough token estimate for the student's orientation. Not a bill.
export function estimateTokens(text) {
  const chars = (text || '').length;
  if (chars === 0) return 0;
  return Math.max(1, Math.round(chars / CHARS_PER_TOKEN));
}

// A short id for run nodes. Uses the platform's UUID when available.
export function newId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// A run snapshot. Immutable once the output arrives (callers must not edit it).
//
// {
//   id, parentId,
//   brief (deep copy),
//   settings { provider, model, temperature, maxOutputTokens },
//   prediction (string, optional),
//   output (string),
//   similarityToParent (number | null),
//   blind: { droppedElement, studentCall, confidence, reason, revealed } | null,
//   criteriaChecks: [{ criterion, met }] | null,
//   sameBriefAs (id of the node this is a "run again" of, or null),
//   recorded: { model, date } | null   (set only for replayed walkthrough runs, never live),
//   note (string, a short label the student may add later),
//   createdAt (ISO string)
// }
export function makeRun({
  id = newId(),
  parentId = null,
  brief,
  settings,
  prediction = '',
  output = '',
  similarityToParent = null,
  blind = null,
  criteriaChecks = null,
  sameBriefAs = null,
  recorded = null,
  note = '',
  createdAt = new Date().toISOString(),
}) {
  return {
    id,
    parentId,
    brief: copyBrief(brief),
    settings: {
      provider: settings.provider,
      model: settings.model,
      temperature: Number(settings.temperature),
      maxOutputTokens: settings.maxOutputTokens == null ? null : Number(settings.maxOutputTokens),
    },
    prediction: String(prediction || ''),
    output: String(output || ''),
    similarityToParent,
    blind: blind
      ? {
          droppedElement: blind.droppedElement,
          studentCall: blind.studentCall || null,
          confidence: blind.confidence || null,
          reason: blind.reason || '',
          revealed: Boolean(blind.revealed),
        }
      : null,
    criteriaChecks: criteriaChecks
      ? criteriaChecks.map((c) => ({ criterion: c.criterion, met: Boolean(c.met) }))
      : null,
    sameBriefAs,
    recorded: recorded ? { model: recorded.model, date: recorded.date } : null,
    note: String(note || ''),
    createdAt,
  };
}

// True when two briefs would assemble to the same prompt (same text, same plugs).
export function sameBrief(a, b) {
  return assemble(a) === assemble(b);
}

// Split a Criteria element into checkable lines: one per line break or bullet.
// Leading "-", "*", bullet dots, "1." and "1)" are stripped. Empty lines are dropped.
export function splitCriteria(text) {
  return (text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

// Build a brief from a task file such as data/walkthrough.json:
//   { elements: { persona: { text }, ..., rules: { do, dont, fallback } } }
// Missing elements stay empty. Every element starts plugged in.
export function briefFromTask(task) {
  const brief = makeBrief();
  const elements = (task && task.elements) || {};
  for (const el of ELEMENTS) {
    const src = elements[el.key];
    if (!src) continue;
    if (el.key === 'rules') {
      brief.rules.do = String(src.do || '');
      brief.rules.dont = String(src.dont || '');
      brief.rules.fallback = String(src.fallback || '');
    } else {
      brief[el.key].text = String(src.text || '');
    }
  }
  return brief;
}

// True when any element has text (used to ask before replacing the field).
export function briefHasAnyText(brief) {
  return ELEMENT_KEYS.some((k) => hasText(brief, k));
}
