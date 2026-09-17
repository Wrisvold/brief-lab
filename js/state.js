// Brief Lab — state.js
// The one object the page renders from, plus a tiny subscribe/notify so regions can
// redraw when something changes. No DOM here.

import { makeBrief, sameBrief } from './model.js';
import {
  DEFAULT_PROVIDER, PROVIDERS, DEFAULT_TEMPERATURE, DEFAULT_MAX_OUTPUT_TOKENS,
} from './constants.js';

export function defaultSettings() {
  return {
    provider: DEFAULT_PROVIDER,
    model: PROVIDERS[DEFAULT_PROVIDER].defaultModel,
    temperature: DEFAULT_TEMPERATURE,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  };
}

export const state = {
  // What is on the field right now (editable).
  brief: makeBrief(),
  prediction: '',
  // The run node loaded on the field, if any. The next Run branches from it.
  currentRunId: null,
  // Every run, flat. Parent links make the tree (Phase 3).
  runs: [],
  // 'walkthrough' or 'free'.
  mode: 'free',
  settings: defaultSettings(),
  // True while a provider call is in flight.
  busy: false,
};

const listeners = new Set();

// fn(topic, state) is called after every notify(). Topics are short strings such as
// 'brief', 'runs', 'mode', 'settings'; renderers may ignore the ones they do not care about.
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify(topic = 'change') {
  for (const fn of listeners) fn(topic, state);
}

export function currentRun() {
  if (!state.currentRunId) return null;
  return state.runs.find((r) => r.id === state.currentRunId) || null;
}

// null when nothing is loaded; otherwise whether the field differs from the current node.
export function fieldChangedSinceRun() {
  const run = currentRun();
  if (!run) return null;
  return !sameBrief(state.brief, run.brief);
}
