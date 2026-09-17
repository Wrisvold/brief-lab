// Brief Lab — blind.js
// Blind mode, the pure parts: which element to drop, the three outcomes of a reveal,
// and the calibration record. No DOM; tests in tests/blind.test.js.

import { pluggedKeys, copyBrief, elementByKey } from './model.js';
import { BLIND_MIN_PLUGGED, BLIND_NO_DIFFERENCE_THRESHOLD, CONFIDENCE_LEVELS } from './constants.js';

// Elements a blind round may drop: the plugged set minus Task.
// A brief without a task is not a brief, so Task is never dropped.
export function blindCandidates(brief) {
  return pluggedKeys(brief).filter((k) => k !== 'task');
}

// Blind mode needs at least BLIND_MIN_PLUGGED plugged elements and something droppable.
export function canRunBlind(brief) {
  return pluggedKeys(brief).length >= BLIND_MIN_PLUGGED && blindCandidates(brief).length >= 1;
}

// Pick one candidate uniformly at random. `random` returns [0, 1) and is injectable for tests.
// Returns null when nothing can be dropped.
export function chooseDrop(brief, random = Math.random) {
  const candidates = blindCandidates(brief);
  if (candidates.length === 0) return null;
  const i = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[i];
}

// A copy of the brief with one element unplugged (text kept).
export function dropElement(brief, key) {
  const out = copyBrief(brief);
  if (out[key]) out[key].enabled = false;
  return out;
}

// The outcome of a revealed blind run:
//   'noDifference'  similarity to parent >= threshold, whatever the call
//   'identified'    the student named the dropped element
//   'missed'        the student named something else
export function outcomeOf(run, threshold = BLIND_NO_DIFFERENCE_THRESHOLD) {
  if (!run || !run.blind) return null;
  const sim = typeof run.similarityToParent === 'number' ? run.similarityToParent : null;
  if (sim !== null && sim >= threshold) return 'noDifference';
  return run.blind.studentCall === run.blind.droppedElement ? 'identified' : 'missed';
}

// The calibration record over revealed, live (not recorded) blind runs.
// {
//   elements: [{ key, name, dropped, identified, missed, noDifference }],   framework order
//   byConfidence: { Low: { right, wrong }, Medium: {...}, High: {...} },     no-difference rounds excluded
//   rounds: total revealed rounds counted
// }
export function calibration(runs, threshold = BLIND_NO_DIFFERENCE_THRESHOLD) {
  const elements = new Map();
  const byConfidence = {};
  for (const level of CONFIDENCE_LEVELS) byConfidence[level] = { right: 0, wrong: 0 };
  let rounds = 0;

  for (const run of runs) {
    if (!run.blind || !run.blind.revealed || run.recorded) continue;
    const key = run.blind.droppedElement;
    const info = elementByKey(key);
    if (!info) continue;
    if (!elements.has(key)) elements.set(key, { key, name: info.name, dropped: 0, identified: 0, missed: 0, noDifference: 0 });
    const row = elements.get(key);
    const outcome = outcomeOf(run, threshold);
    row.dropped++;
    rounds++;
    if (outcome === 'noDifference') row.noDifference++;
    else if (outcome === 'identified') row.identified++;
    else row.missed++;
    const level = run.blind.confidence;
    if (outcome !== 'noDifference' && byConfidence[level]) {
      if (outcome === 'identified') byConfidence[level].right++;
      else byConfidence[level].wrong++;
    }
  }

  // Framework order, only elements that were dropped at least once.
  const ordered = ['persona', 'task', 'context', 'examples', 'rules', 'criteria', 'steps']
    .filter((k) => elements.has(k))
    .map((k) => elements.get(k));
  return { elements: ordered, byConfidence, rounds };
}
