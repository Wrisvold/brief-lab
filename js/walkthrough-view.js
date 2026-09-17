// Brief Lab — walkthrough-view.js
// The stepper: eight stops, one paragraph each, the element pre-filled from the task file,
// Run (live) or Replay (recorded), then a "what changed" pointer at Compare and Next.
// Progress lives in localStorage so a reload resumes the same stop. The walkthrough builds
// a real lineage in the tree; at the end the field and tree are simply left as they are.

import { WALKTHROUGH, ERRORS, fill } from './copy.js';
import { STORAGE_KEY_WALKTHROUGH, WALKTHROUGH_TASK_URL, WALKTHROUGH_RECORDED_URL } from './constants.js';
import { el, show } from './dom.js';
import { local } from './storage.js';
import { state } from './state.js';
import { byId, parentOf } from './tree.js';
import { briefForStop, isAgainStop, readRecording, buildRecording, STOP_COUNT } from './walkthrough.js';

export function mountWalkthrough({ host, hasKey, loadBriefWithParent, runLive, fileRecorded, openCompare, onFinish, showError }) {
  let task = null;
  let recording = { ok: false, stops: new Map(), meta: null };
  let progress = loadProgress();
  let busy = false;

  function loadProgress() {
    const p = local.get(STORAGE_KEY_WALKTHROUGH, null);
    if (!p || typeof p !== 'object') return { started: false, finished: false, stop: 0, runIds: [] };
    return {
      started: Boolean(p.started),
      finished: Boolean(p.finished),
      stop: Number.isInteger(p.stop) ? Math.max(0, Math.min(STOP_COUNT - 1, p.stop)) : 0,
      runIds: Array.isArray(p.runIds) ? p.runIds.slice(0, STOP_COUNT) : [],
    };
  }

  function saveProgress() {
    local.set(STORAGE_KEY_WALKTHROUGH, progress);
  }

  async function loadFiles() {
    try {
      const res = await fetch(WALKTHROUGH_TASK_URL, { cache: 'no-cache' });
      task = res.ok ? await res.json() : null;
    } catch {
      task = null;
    }
    try {
      const res = await fetch(WALKTHROUGH_RECORDED_URL, { cache: 'no-cache' });
      recording = res.ok ? readRecording(await res.json(), task ? task.id : null) : recording;
    } catch {
      /* no recording; the stepper says so */
    }
  }

  // The run filed for a stop, if it still exists in the tree.
  function runForStop(stop) {
    return byId(state.runs, progress.runIds[stop] || null);
  }

  // Put a stop's brief on the field with the right parent, without running.
  function enterStop(stop) {
    progress.stop = stop;
    progress.started = true;
    if (isAgainStop(stop)) {
      const prev = runForStop(stop - 1);
      loadBriefWithParent(prev ? prev.brief : briefForStop(task, stop), prev, { asCurrent: true });
    } else {
      loadBriefWithParent(briefForStop(task, stop), stop > 0 ? runForStop(stop - 1) : null, { asCurrent: false });
    }
    saveProgress();
    render();
  }

  async function runStop(stop) {
    if (busy) return;
    busy = true;
    render();
    try {
      const run = await runLive(isAgainStop(stop) ? 'again' : 'run');
      if (run) {
        progress.runIds[stop] = run.id;
        saveProgress();
      }
    } finally {
      busy = false;
      render();
    }
  }

  function replayStop(stop) {
    const entry = recording.stops.get(stop);
    if (!entry) return;
    const prev = stop > 0 ? runForStop(stop - 1) : null;
    const brief = isAgainStop(stop) && prev ? prev.brief : briefForStop(task, stop);
    const run = fileRecorded({
      brief,
      parent: isAgainStop(stop) ? (prev ? parentOf(state.runs, prev) : null) : prev,
      sameBriefAs: isAgainStop(stop) ? prev : null,
      output: entry.output,
      prediction: entry.prediction,
      meta: recording.meta,
    });
    progress.runIds[stop] = run.id;
    saveProgress();
    render();
  }

  function next(stop) {
    if (stop + 1 < STOP_COUNT) enterStop(stop + 1);
  }

  function finish() {
    progress.finished = true;
    saveProgress();
    render();
    onFinish();
  }

  function startOver() {
    if (progress.started && !window.confirm(WALKTHROUGH.startOverConfirm)) return;
    progress = { started: true, finished: false, stop: 0, runIds: [] };
    enterStop(0);
  }

  function allLive() {
    for (let i = 0; i < STOP_COUNT; i++) {
      const r = runForStop(i);
      if (!r || r.recorded) return false;
    }
    return true;
  }

  function downloadRecording() {
    const runs = Array.from({ length: STOP_COUNT }, (_, i) => runForStop(i));
    const file = buildRecording({ taskId: task.id, runs });
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: 'walkthrough-recorded.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function reset() {
    progress = { started: false, finished: false, stop: 0, runIds: [] };
    local.remove(STORAGE_KEY_WALKTHROUGH);
    render();
  }

  // ---------- rendering ----------

  function render() {
    if (!task) {
      host.replaceChildren(el('p', { class: 'small muted', text: ERRORS.taskLoad.title + ' ' + ERRORS.taskLoad.next }));
      return;
    }
    const stops = WALKTHROUGH.stops;
    const current = progress.stop;

    const list = el('ol', { class: 'stepper-stops' }, stops.map((s, i) => {
      const done = Boolean(runForStop(i));
      const reachable = progress.started && (done || i === 0 || Boolean(runForStop(i - 1)));
      return el('li', {}, [
        el('button', {
          type: 'button',
          class: `stepper-stop${i === current && progress.started ? ' is-current' : ''}${done ? ' is-done' : ''}`,
          'aria-current': i === current && progress.started ? 'step' : null,
          disabled: !reachable || busy,
          text: `${i} · ${s.title}${done ? ' ✓' : ''}`,
          onclick: () => enterStop(i),
        }),
      ]);
    }));

    const copyCol = el('div', { class: 'stepper-copy' });
    const actions = el('div', { class: 'stepper-actions' });

    if (!progress.started) {
      copyCol.append(el('h3', { text: WALKTHROUGH.title }), el('p', { text: WALKTHROUGH.intro }));
      actions.append(el('button', { type: 'button', class: 'button', text: WALKTHROUGH.start, onclick: () => { progress.started = true; enterStop(0); } }));
      if (!hasKey()) actions.append(el('p', { class: 'small muted', text: WALKTHROUGH.noKeyOffer }));
    } else {
      const s = stops[current];
      const run = runForStop(current);
      copyCol.append(el('h3', { text: `${fill(WALKTHROUGH.stopLabel, { n: current })} · ${s.title}` }), el('p', { text: s.copy }));
      if (run) {
        copyCol.append(el('p', { class: 'stepper-after', text: s.after }));
        if (run.recorded) copyCol.append(el('p', { class: 'small muted', text: WALKTHROUGH.recordedNotice }));
        const parent = isAgainStop(current) ? runForStop(current - 1) : parentOf(state.runs, run);
        if (parent) {
          actions.append(el('button', { type: 'button', class: 'button button-secondary', text: WALKTHROUGH.openCompare, onclick: () => openCompare(parent, run) }));
        }
        if (run.recorded) {
          actions.append(el('button', { type: 'button', class: 'button button-secondary', text: WALKTHROUGH.replayLive, disabled: busy || !hasKey(), onclick: () => { enterStop(current); runStop(current); } }));
        }
        if (current + 1 < STOP_COUNT) {
          actions.append(el('button', { type: 'button', class: 'button', text: WALKTHROUGH.next, disabled: busy, onclick: () => next(current) }));
        } else if (!progress.finished) {
          actions.append(el('button', { type: 'button', class: 'button', text: WALKTHROUGH.finish, onclick: finish }));
        } else {
          copyCol.append(el('p', { class: 'stepper-after', text: WALKTHROUGH.end }));
        }
        if (current === STOP_COUNT - 1) {
          const canSave = allLive();
          actions.append(el('button', {
            type: 'button', class: 'button button-quiet button-small', text: WALKTHROUGH.saveRecording,
            title: canSave ? WALKTHROUGH.saveRecordingHint : WALKTHROUGH.needsAllLive, disabled: !canSave, onclick: downloadRecording,
          }));
        }
      } else {
        actions.append(el('button', { type: 'button', class: 'button', text: WALKTHROUGH.runThisStop, disabled: busy, onclick: () => runStop(current) }));
        if (recording.stops.has(current)) {
          actions.append(el('button', { type: 'button', class: 'button button-secondary', text: WALKTHROUGH.replayRecorded, disabled: busy, onclick: () => replayStop(current) }));
        } else if (!hasKey()) {
          actions.append(el('p', { class: 'small muted', text: WALKTHROUGH.noRecording }));
        }
        if (!hasKey() && recording.stops.has(current)) actions.append(el('p', { class: 'small muted', text: WALKTHROUGH.noKeyOffer }));
      }
      actions.append(el('button', { type: 'button', class: 'button button-quiet button-small', text: WALKTHROUGH.startOver, disabled: busy, onclick: startOver }));
    }

    host.replaceChildren(list, el('div', { class: 'stepper-body' }, [copyCol, actions]));
  }

  async function init() {
    await loadFiles();
    render();
  }

  return { init, render, reset, startOver, isStarted: () => progress.started };
}
