// Brief Lab — walkthrough.js
// The guided first session, pure parts: the eight stops, the brief each stop puts on the
// field, and reading the recorded-runs file. No DOM; tests in tests/walkthrough.test.js.
//
// Stops add elements in the order their effect is easiest to see on the sample task
// (Task, Context, Rules, Criteria, Persona, Examples, Steps), then run the full brief
// again for the noise floor. The field still shows elements in framework order.

import { makeBrief, briefFromTask, ELEMENT_KEYS } from './model.js';

export const RECORDING_FORMAT = 'brief-lab-walkthrough-recording';
export const STOP_COUNT = 8;
export const AGAIN_STOP = 7;

// The element added at each stop, from the task file's stopOrder. The last entry is 'again'.
export function stopOrder(task) {
  const order = task && Array.isArray(task.stopOrder) ? task.stopOrder : [];
  const elements = order.filter((k) => ELEMENT_KEYS.includes(k));
  return [...elements, 'again'];
}

// The element keys plugged at a stop (stop 7 = everything, same as stop 6).
export function elementsAtStop(task, stop) {
  const order = stopOrder(task);
  const upTo = Math.min(stop, order.length - 2);
  return order.slice(0, upTo + 1).filter((k) => k !== 'again');
}

// The brief for a stop: the task file's text for every element reached so far, plugged;
// the rest empty (an empty slot counts as unplugged, so the field visibly grows).
export function briefForStop(task, stop) {
  const full = briefFromTask(task);
  const brief = makeBrief();
  for (const key of elementsAtStop(task, stop)) {
    if (key === 'rules') brief.rules = { ...full.rules };
    else brief[key] = { ...full[key] };
  }
  return brief;
}

// True when the stop is the "run again" stop.
export function isAgainStop(stop) {
  return stop === AGAIN_STOP;
}

// Read the recorded-runs file. Returns { ok, reason, stops: Map(stop -> { output }) , meta }.
// A placeholder file (empty outputs) is "ok" with zero usable stops.
export function readRecording(json, taskId = null) {
  if (!json || typeof json !== 'object') return { ok: false, reason: 'not an object', stops: new Map(), meta: null };
  if (json.format !== RECORDING_FORMAT) return { ok: false, reason: 'wrong format', stops: new Map(), meta: null };
  if (taskId && json.taskId && json.taskId !== taskId) return { ok: false, reason: 'different task', stops: new Map(), meta: null };
  const meta = {
    provider: String(json.provider || ''),
    model: String(json.model || ''),
    date: String(json.date || ''),
    temperature: json.temperature == null ? null : Number(json.temperature),
    maxOutputTokens: json.maxOutputTokens == null ? null : Number(json.maxOutputTokens),
    recordedBy: String(json.recordedBy || ''),
  };
  const stops = new Map();
  for (const entry of Array.isArray(json.stops) ? json.stops : []) {
    const stop = Number(entry && entry.stop);
    const output = entry && typeof entry.output === 'string' ? entry.output : '';
    if (Number.isInteger(stop) && stop >= 0 && stop < STOP_COUNT && output.trim()) {
      stops.set(stop, { output, prediction: String(entry.prediction || '') });
    }
  }
  return { ok: true, reason: '', stops, meta };
}

// Build the recorded-runs file from the eight walkthrough runs (in stop order).
// Used by the instructor control that downloads the recording.
export function buildRecording({ taskId, runs, recordedBy = '' }) {
  const first = runs.find(Boolean);
  return {
    format: RECORDING_FORMAT,
    version: 1,
    taskId,
    recordedBy,
    provider: first ? first.settings.provider : '',
    model: first ? first.settings.model : '',
    date: new Date().toISOString().slice(0, 10),
    temperature: first ? first.settings.temperature : null,
    maxOutputTokens: first ? first.settings.maxOutputTokens : null,
    stops: runs.map((run, i) => ({ stop: i, output: run ? run.output : '', prediction: run ? run.prediction : '' })),
  };
}
