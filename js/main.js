// Brief Lab — main.js
// Entry point: fills the page shell from copy.js, mounts the field, the Settings drawer,
// the tree drawer, the Compare panel, blind mode, and the criteria checklist; runs the
// brief against the provider; files runs.

import {
  APP, EXPLAINERS, FIELD, PROMPT, OUTPUT, TREE, COMPARE, SETTINGS, FOOTER, ERRORS, WALKTHROUGH, BLIND, CALIBRATION, fill,
} from './copy.js';
import {
  STORAGE_KEY_DRAFT, STORAGE_KEY_MODE, STORAGE_KEY_TREE, STORAGE_PREFIX, STORAGE_WARN_BYTES, WALKTHROUGH_TASK_URL,
} from './constants.js';
import {
  makeBrief, copyBrief, assemble, estimateTokens, briefFromTask, briefHasAnyText, isPlugged, splitCriteria,
} from './model.js';
import { $, el, setText, show, debounce } from './dom.js';
import { local, session } from './storage.js';
import { state, subscribe, notify, currentRun } from './state.js';
import { mountField } from './field.js';
import { loadSettings, mountSettingsBody, getKey } from './settings.js';
import { callModel } from './provider.js';
import { renderStatus, errorEntry } from './status.js';
import { fileRun, migrate, serialize, deserialize, byteSize, byId, parentOf } from './tree.js';
import { similarity } from './similarity.js';
import { mountTree } from './tree-view.js';
import { mountCompare, defaultPair } from './compare-view.js';
import { chooseDrop, dropElement } from './blind.js';
import { mountBlind } from './blind-view.js';
import { mountCalibration } from './calibration-view.js';
import { mountWalkthrough } from './walkthrough-view.js';
import { formatSummary } from './summary.js';
import { mountGuide } from './guide-view.js';

// ---------- shell ----------

function renderShell() {
  document.title = APP.title;
  setText('app-title', APP.title);
  setText('app-tagline', APP.tagline);
  setText('mode-label', APP.modeLabel);
  setText('mode-walkthrough', APP.modes.walkthrough);
  setText('mode-free', APP.modes.free);
  setText('btn-settings', APP.settings);
  setText('field-title', FIELD.title);
  setText('prompt-title', PROMPT.title);
  setText('output-title', OUTPUT.title);
  setText('tree-title', TREE.title);
  setText('compare-title', COMPARE.title);
  setText('settings-title', SETTINGS.title);
  setText('footer-note', FOOTER.storageNote);
  setText('btn-clear-everything', FOOTER.clearEverything);

  for (const details of document.querySelectorAll('details.explainer[data-explainer]')) {
    const key = details.getAttribute('data-explainer');
    const text = EXPLAINERS[key];
    if (!text) continue;
    details.replaceChildren(
      el('summary', { text: APP.whatIsHappening }),
      el('p', {}, [el('strong', { text: 'What this does. ' }), text.what]),
      el('p', {}, [el('strong', { text: 'Why it matters. ' }), text.why]),
    );
  }
}

// A blind run whose brief is still secret.
function isHidden(run) {
  return Boolean(run && run.blind && !run.blind.revealed);
}

// ---------- the assembled-brief panel ----------

function renderPrompt() {
  const pre = $('prompt-text');
  if (state.masked) {
    pre.textContent = BLIND.hiddenBrief;
    pre.classList.add('muted');
    setText('prompt-counts', '');
    return;
  }
  const prompt = assemble(state.brief);
  pre.textContent = prompt || PROMPT.empty;
  pre.classList.toggle('muted', prompt.length === 0);
  setText('prompt-counts', fill(PROMPT.counts, { chars: prompt.length, tokens: estimateTokens(prompt) }));
}

function mountPromptActions() {
  const copyButton = el('button', {
    type: 'button',
    class: 'button button-quiet button-small',
    text: PROMPT.copy,
    onclick: async () => {
      if (state.masked) return;
      try {
        await navigator.clipboard.writeText(assemble(state.brief));
        copyButton.textContent = PROMPT.copied;
        setTimeout(() => { copyButton.textContent = PROMPT.copy; }, 1500);
      } catch {
        $('prompt-text').focus();
      }
    },
  });
  $('prompt-actions').replaceChildren(copyButton);
}

// ---------- the output panel, criteria checklist, blind panel ----------

function renderOutput(run) {
  const pre = $('output-text');
  if (!run) {
    pre.textContent = OUTPUT.empty;
    pre.classList.add('muted');
  } else {
    pre.textContent = run.output;
    pre.classList.remove('muted');
  }
  // Recorded runs are labelled on every output; never presented as live.
  let label = $('output-recorded');
  if (!label) {
    label = el('p', { id: 'output-recorded', class: 'recorded-label', hidden: true });
    pre.before(label);
  }
  if (run && run.recorded) {
    label.textContent = fill(OUTPUT.recordedLabel, { model: run.recorded.model, date: run.recorded.date });
    show(label, true);
  } else {
    show(label, false);
  }
  renderCriteria(run);
  blind.render(run, run ? parentOf(state.runs, run) : null);
}

// Each criterion as a checkbox the student ticks against the output. Ticks live on the run.
// Hidden while a blind brief is secret (the checklist would reveal whether Criteria is plugged).
function renderCriteria(run) {
  const host = $('criteria');
  if (!run || isHidden(run) || !isPlugged(run.brief, 'criteria')) {
    host.replaceChildren();
    return;
  }
  const items = splitCriteria(run.brief.criteria.text);
  if (items.length === 0) {
    host.replaceChildren();
    return;
  }
  const existing = new Map((run.criteriaChecks || []).map((c) => [c.criterion, c.met]));
  const list = el('ul', { class: 'criteria-list' }, items.map((criterion, i) => {
    const input = el('input', { type: 'checkbox', id: `criterion-${i}` });
    input.checked = existing.get(criterion) === true;
    input.addEventListener('change', () => {
      run.criteriaChecks = items.map((c, j) => ({ criterion: c, met: list.querySelector(`#criterion-${j}`).checked }));
      saveRuns();
      compare.refresh();
    });
    return el('li', {}, [el('label', { for: `criterion-${i}` }, [input, el('span', { text: criterion })])]);
  }));
  host.replaceChildren(
    el('h3', { text: OUTPUT.criteriaTitle }),
    list,
    el('p', { class: 'criteria-note', text: OUTPUT.criteriaNote }),
  );
}

// ---------- the draft (what is on the field) ----------

const saveDraft = debounce(() => {
  local.set(STORAGE_KEY_DRAFT, { brief: state.brief, prediction: state.prediction, currentRunId: state.currentRunId });
}, 300);

function loadDraft() {
  const draft = local.get(STORAGE_KEY_DRAFT, null);
  if (!draft || typeof draft !== 'object') return;
  state.brief = copyBrief(draft.brief);
  state.prediction = String(draft.prediction || '');
  if (typeof draft.currentRunId === 'string') state.currentRunId = draft.currentRunId;
}

// ---------- the tree in storage, with the size guard ----------

function renderStorageWarning(text) {
  let host = $('tree-warning');
  if (!host) {
    host = el('div', { id: 'tree-warning', class: 'tree-warning' });
    $('tree-list').before(host);
  }
  if (!text) {
    host.replaceChildren();
    host.className = 'tree-warning';
    return;
  }
  renderStatus(host, { title: text }, {}, 'warn');
  host.classList.add('tree-warning');
}

function saveRuns() {
  const payload = serialize(state.runs, state.currentRunId);
  const ok = local.set(STORAGE_KEY_TREE, payload);
  if (!ok) {
    renderStorageWarning(TREE.storageFailed);
    return;
  }
  const size = byteSize(payload);
  if (size > STORAGE_WARN_BYTES) {
    renderStorageWarning(fill(TREE.storageWarning, { size: `${(size / (1024 * 1024)).toFixed(1)} MB` }));
  } else {
    renderStorageWarning('');
  }
}

function loadRuns() {
  const saved = local.get(STORAGE_KEY_TREE, null);
  if (!saved) return;
  try {
    // Older saves (Phase 2) were { version, runs } without the export format tag.
    const parsed = saved.format ? deserialize(saved) : { runs: migrate(Array.isArray(saved.runs) ? saved.runs : []), currentRunId: null };
    state.runs = parsed.runs;
  } catch {
    state.runs = [];
  }
  if (state.currentRunId && !byId(state.runs, state.currentRunId)) state.currentRunId = null;
}

// ---------- loading a run onto the field ----------

function loadRun(run) {
  if (isHidden(run)) {
    // Keep the secret: the field shows the parent's brief behind a mask.
    const parent = parentOf(state.runs, run);
    state.brief = copyBrief(parent ? parent.brief : run.brief);
    state.masked = true;
  } else {
    state.brief = copyBrief(run.brief);
    state.masked = false;
  }
  state.prediction = '';
  state.currentRunId = run.id;
  field.syncInputs();
  renderOutput(run);
  renderStatus($('output-status'), null);
  saveDraft();
  notify('runs');
  notify('brief');
}

// Detach from the current node: the next Run starts a new root group.
function newRoot({ clearField = true } = {}) {
  if (clearField) state.brief = makeBrief();
  state.prediction = '';
  state.currentRunId = null;
  state.masked = false;
  field.syncInputs();
  if (clearField) field.focusFirstEmpty();
  renderOutput(null);
  renderStatus($('output-status'), null);
  saveDraft();
  notify('runs');
  notify('brief');
}

// ---------- Run ----------

// mode: 'run'   child of the current node, or a fresh root
//       'again' same-brief sibling of the current node
//       'blind' child of the current node with one plugged element (never Task) dropped and hidden
// Resolves to the new run, or null when nothing ran.
async function onRun(mode = 'run') {
  if (state.busy || state.masked) return null;
  const status = $('output-status');
  const current = currentRun();
  const again = mode === 'again' && current;
  const blindMode = mode === 'blind' && current;
  if (mode === 'blind' && !current) {
    renderStatus(status, { title: BLIND.needsRun }, {}, 'warn');
    return null;
  }

  let briefSnapshot;
  let dropped = null;
  if (blindMode) {
    dropped = chooseDrop(current.brief);
    if (!dropped) {
      renderStatus(status, { title: fill(BLIND.tooFew, { n: 3 }) }, {}, 'warn');
      return null;
    }
    briefSnapshot = dropElement(current.brief, dropped);
  } else if (again) {
    briefSnapshot = copyBrief(current.brief);
  } else {
    briefSnapshot = copyBrief(state.brief);
  }
  const prompt = assemble(briefSnapshot);
  if (!prompt) return null;
  const key = getKey();
  if (!key) {
    renderStatus(status, ERRORS.missingKey, {}, 'error');
    return null;
  }

  const settings = again || blindMode ? { ...current.settings } : { ...state.settings };
  const prediction = state.prediction;
  const started = Date.now();

  state.busy = true;
  notify('brief');
  renderStatus(status, { title: fill(OUTPUT.progress, { provider: providerLabel(settings.provider) }) }, {}, 'info', true);

  try {
    const output = await callModel({
      provider: settings.provider,
      model: settings.model,
      key,
      temperature: settings.temperature,
      maxOutputTokens: settings.maxOutputTokens,
      prompt,
      onProgress: (p) => {
        if (p.phase === 'retry') {
          const text = p.kind === 'providerBusy' ? OUTPUT.progressBusy : OUTPUT.progressRetry;
          renderStatus(status, { title: fill(text, p) }, {}, 'warn', true);
        } else if (p.attempt > 1) {
          renderStatus(status, { title: fill(OUTPUT.progress, { provider: providerLabel(settings.provider) }) }, {}, 'info', true);
        }
      },
    });
    const parent = again ? parentOf(state.runs, current) : current;
    const run = fileRun(state.runs, {
      parent,
      sameBriefAs: again ? current : null,
      brief: briefSnapshot,
      settings,
      prediction,
      output,
      similarityToParent: parent ? similarity(parent.output, output) : null,
      blind: blindMode ? { droppedElement: dropped } : null,
    });
    state.currentRunId = run.id;
    state.prediction = '';
    if (again) state.brief = copyBrief(run.brief);
    if (blindMode) {
      // The field keeps the parent's brief behind a mask until the reveal.
      state.brief = copyBrief(current.brief);
      state.masked = true;
    }
    saveRuns();
    renderOutput(run);
    renderStatus(status, {
      title: fill(OUTPUT.done, {
        provider: providerLabel(settings.provider), model: settings.model, seconds: ((Date.now() - started) / 1000).toFixed(1),
      }),
    }, {}, 'info');
    return run;
  } catch (err) {
    renderStatus(status, ...errorEntry(err), 'error');
    return null;
  } finally {
    state.busy = false;
    field.syncInputs();
    saveDraft();
    notify('runs');
    notify('brief');
  }
}

function providerLabel(provider) {
  return { gemini: 'Gemini', openai: 'OpenAI', anthropic: 'Claude' }[provider] || provider;
}

// ---------- blind mode: file and reveal ----------

function fileCall(run, { studentCall, confidence, reason }) {
  if (!run.blind || run.blind.revealed || run.blind.studentCall) return;
  run.blind.studentCall = studentCall;
  run.blind.confidence = confidence;
  run.blind.reason = reason || '';
  saveRuns();
  renderOutput(run);
  notify('runs');
}

function reveal(run) {
  if (!run.blind || run.blind.revealed) return;
  run.blind.revealed = true;
  saveRuns();
  // Unmask: the field now shows the blind brief with the dropped element unplugged.
  if (state.currentRunId === run.id) {
    state.brief = copyBrief(run.brief);
    state.masked = false;
    field.syncInputs();
  }
  renderOutput(run);
  saveDraft();
  notify('runs');
  notify('brief');
  const parent = parentOf(state.runs, run);
  if (parent) compare.open(parent, run);
}

// ---------- Load a task / Start blank ----------

async function loadWalkthroughTask() {
  let task;
  try {
    const res = await fetch(WALKTHROUGH_TASK_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    task = await res.json();
  } catch {
    renderStatus($('output-status'), ERRORS.taskLoad, {}, 'error');
    return;
  }
  state.brief = briefFromTask(task);
  state.prediction = '';
  state.masked = false;
  field.syncInputs();
  saveDraft();
  notify('brief');
}

function mountFieldActions() {
  const menu = el('details', { class: 'menu' });
  const closeMenu = () => menu.removeAttribute('open');
  const guarded = (fn) => () => {
    closeMenu();
    if (briefHasAnyText(state.brief) && !window.confirm(FIELD.loadConfirm)) return;
    fn();
  };
  menu.append(
    el('summary', { class: 'button button-secondary button-small', text: FIELD.loadTask }),
    el('div', { class: 'menu-list' }, [
      el('button', { type: 'button', class: 'menu-item', text: FIELD.loadWalkthroughTask, onclick: guarded(loadWalkthroughTask) }),
      el('button', { type: 'button', class: 'menu-item', text: FIELD.startBlank, onclick: guarded(() => newRoot()) }),
    ]),
  );
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) closeMenu();
  });
  $('field-actions').replaceChildren(menu);
}

// ---------- tree drawer ----------

// ---------- export, import, lineage summary ----------

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportTree() {
  const stampText = new Date().toISOString().slice(0, 10);
  downloadJson(serialize(state.runs, state.currentRunId), `brief-lab-tree-${stampText}.json`);
}

function importTree() {
  const input = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;
    let parsed;
    try {
      parsed = deserialize(JSON.parse(await file.text()));
    } catch {
      renderStorageWarning(TREE.importFailed);
      return;
    }
    if (state.runs.length > 0 && !window.confirm(TREE.importConfirm)) return;
    state.runs = parsed.runs;
    state.currentRunId = parsed.currentRunId;
    state.masked = isHidden(currentRun());
    const cur = currentRun();
    if (cur) {
      const parent = parentOf(state.runs, cur);
      state.brief = copyBrief(state.masked && parent ? parent.brief : cur.brief);
    }
    state.prediction = '';
    saveRuns();
    field.syncInputs();
    renderOutput(cur);
    renderStatus($('output-status'), { title: fill(TREE.importDone, { n: state.runs.length }) }, {}, 'info');
    saveDraft();
    notify('runs');
    notify('brief');
  });
  document.body.appendChild(input);
  input.click();
}

function showTextPanel(title, text, note) {
  const panel = $('text-panel');
  setText('text-panel-title', title);
  const area = $('text-panel-text');
  area.value = text;
  $('text-panel-actions').replaceChildren(
    note ? el('span', { class: 'small muted', text: note }) : null,
    el('button', { type: 'button', class: 'button button-quiet button-small', text: TREE.close, onclick: () => show(panel, false) }),
  );
  show(panel, true);
  area.focus();
  area.select();
}

async function copySummary() {
  const text = formatSummary({ runs: state.runs, now: new Date(), settings: state.settings });
  try {
    await navigator.clipboard.writeText(text);
    renderStatus($('output-status'), { title: TREE.summaryCopied }, {}, 'info');
  } catch {
    showTextPanel(TREE.summaryTitle, text, TREE.summaryShown);
  }
}

document.addEventListener('keydown', (e) => {
  const panel = $('text-panel');
  if (e.key === 'Escape' && panel && !panel.hasAttribute('hidden')) show(panel, false);
});

function mountTreeActions() {
  const midRound = isHidden(currentRun());
  $('tree-actions').replaceChildren(
    el('button', {
      type: 'button',
      class: 'button button-quiet button-small',
      text: TREE.exportTree,
      title: TREE.exportHint,
      disabled: state.runs.length === 0,
      onclick: exportTree,
    }),
    el('button', { type: 'button', class: 'button button-quiet button-small', text: TREE.importTree, onclick: importTree }),
    el('button', {
      type: 'button',
      class: 'button button-quiet button-small',
      text: TREE.copySummary,
      title: TREE.summaryHint,
      disabled: state.runs.length === 0,
      onclick: copySummary,
    }),
    el('button', {
      type: 'button',
      class: 'button button-secondary button-small',
      text: TREE.newRoot,
      onclick: () => {
        if (briefHasAnyText(state.brief) && !state.masked && !window.confirm(TREE.newRootConfirm)) return;
        newRoot();
      },
    }),
    el('button', {
      type: 'button',
      class: 'button button-secondary button-small',
      text: TREE.compare,
      disabled: state.runs.length < 2,
      onclick: () => {
        const cur = currentRun() || state.runs[state.runs.length - 1];
        if (!cur) return;
        compare.open(...defaultPair(state.runs, cur));
      },
    }),
    el('button', {
      type: 'button',
      class: 'button button-quiet button-small',
      text: TREE.calibration,
      disabled: midRound,
      title: midRound ? CALIBRATION.midRound : '',
      onclick: () => calibrationView.open(),
    }),
  );
}

// ---------- mode ----------

function setMode(mode) {
  state.mode = mode === 'walkthrough' ? 'walkthrough' : 'free';
  local.set(STORAGE_KEY_MODE, state.mode);
  $('mode-walkthrough').setAttribute('aria-pressed', state.mode === 'walkthrough' ? 'true' : 'false');
  $('mode-free').setAttribute('aria-pressed', state.mode === 'free' ? 'true' : 'false');
  show($('stepper'), state.mode === 'walkthrough');
  if (state.mode === 'walkthrough') walkthrough.render();
  notify('mode');
}

function mountMode() {
  $('mode-walkthrough').addEventListener('click', () => setMode('walkthrough'));
  $('mode-free').addEventListener('click', () => setMode('free'));
  // The first visit opens in Walkthrough; after that the last choice is remembered
  // (finishing the walkthrough switches to Free).
  setMode(local.get(STORAGE_KEY_MODE, 'walkthrough'));
}

// ---------- walkthrough helpers ----------

// Put a brief on the field with `parent` as the node the next Run branches from.
// asCurrent: also treat `parent` as the loaded node (so Run again makes its sibling).
function loadBriefWithParent(brief, parent, { asCurrent = false } = {}) {
  state.brief = copyBrief(brief);
  state.prediction = '';
  state.masked = false;
  state.currentRunId = parent ? parent.id : null;
  field.syncInputs();
  renderOutput(asCurrent && parent ? parent : (parent || null));
  renderStatus($('output-status'), null);
  saveDraft();
  notify('runs');
  notify('brief');
}

// File a recorded walkthrough run without calling a provider. Labelled as recorded
// everywhere it appears; never counted in calibration or the noise floor of live runs.
function fileRecorded({ brief, parent, sameBriefAs, output, prediction, meta }) {
  const settings = {
    provider: meta.provider || 'recorded',
    model: meta.model || 'recorded',
    temperature: meta.temperature == null ? state.settings.temperature : meta.temperature,
    maxOutputTokens: meta.maxOutputTokens,
  };
  const run = fileRun(state.runs, {
    parent,
    sameBriefAs,
    brief,
    settings,
    prediction,
    output,
    similarityToParent: parent ? similarity(parent.output, output) : null,
    recorded: { model: meta.model || '', date: meta.date || '' },
  });
  state.currentRunId = run.id;
  state.brief = copyBrief(run.brief);
  state.prediction = '';
  saveRuns();
  field.syncInputs();
  renderOutput(run);
  renderStatus($('output-status'), null);
  saveDraft();
  notify('runs');
  notify('brief');
  return run;
}

// ---------- settings drawer ----------

function mountSettings() {
  const drawer = $('settings');
  const button = $('btn-settings');
  const open = (yes) => {
    show(drawer, yes);
    button.setAttribute('aria-expanded', yes ? 'true' : 'false');
    if (yes) drawer.querySelector('input, select, button, textarea')?.focus();
    else button.focus();
  };
  button.addEventListener('click', () => open(drawer.hasAttribute('hidden')));
  $('settings-actions').replaceChildren(
    el('button', { type: 'button', class: 'button button-quiet button-small', text: SETTINGS.close, onclick: () => open(false) }),
  );
  mountSettingsBody($('settings-body'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hasAttribute('hidden')) open(false);
  });
}

// ---------- clear everything ----------

function mountClearEverything() {
  $('btn-clear-everything').addEventListener('click', () => {
    if (!window.confirm(TREE.clearConfirm)) return;
    local.removeByPrefix(STORAGE_PREFIX);
    session.removeByPrefix(STORAGE_PREFIX);
    state.brief = makeBrief();
    state.prediction = '';
    state.runs = [];
    state.currentRunId = null;
    state.masked = false;
    field.syncInputs();
    renderStatus($('output-status'), null);
    renderStorageWarning('');
    renderOutput(null);
    compare.close();
    calibrationView.close();
    mountSettingsBody($('settings-body'));
    walkthrough.reset();
    notify('runs');
    notify('brief');
  });
}

// ---------- start ----------

renderShell();
loadSettings();
loadDraft();
loadRuns();
state.masked = isHidden(currentRun());
if (state.masked) {
  const parent = parentOf(state.runs, currentRun());
  if (parent) state.brief = copyBrief(parent.brief);
}

const field = mountField({
  host: $('field-nodes'),
  onChange: () => {
    notify('brief');
    saveDraft();
  },
  onRun,
});

const blind = mountBlind({
  panel: $('blind-panel'),
  onFile: fileCall,
  onReveal: reveal,
});

const calibrationView = mountCalibration({
  panel: $('calibration'),
  body: $('calibration-body'),
  actions: $('calibration-actions'),
  title: $('calibration-title'),
});

const tree = mountTree({
  host: $('tree-list'),
  onLoad: loadRun,
  onCompare: (run) => compare.open(...defaultPair(state.runs, run)),
  onNote: (run, text) => {
    run.note = String(text || '').trim();
    saveRuns();
    notify('runs');
  },
});

const compare = mountCompare({
  panel: $('compare'),
  body: $('compare-body'),
  actions: $('compare-actions'),
  onRunAgain: (run) => {
    compare.close();
    loadRun(run);
    onRun('again');
  },
});

const walkthrough = mountWalkthrough({
  host: $('stepper'),
  hasKey: () => Boolean(getKey()),
  loadBriefWithParent,
  runLive: (mode) => onRun(mode),
  fileRecorded,
  openCompare: (left, right) => compare.open(left, right),
  onFinish: () => setMode('free'),
});

subscribe((topic) => {
  if (topic === 'brief' || topic === 'runs' || topic === 'settings') {
    field.refresh();
    renderPrompt();
  }
  if (topic === 'runs') {
    tree.render();
    mountTreeActions();
    compare.refresh();
    if (state.mode === 'walkthrough') walkthrough.render();
  }
  if (topic === 'settings' && state.mode === 'walkthrough') walkthrough.render();
});

const guide = mountGuide({
  panel: $('guide'),
  body: $('guide-body'),
  actions: $('guide-actions'),
  title: $('guide-title'),
  button: $('btn-guide'),
});

mountPromptActions();
mountFieldActions();
mountTreeActions();
walkthrough.init().then(() => {
  mountMode();
  // A first visit opens the guide once the page is ready.
  guide.openIfFirstVisit();
});
mountSettings();
mountClearEverything();
field.syncInputs();
renderPrompt();
tree.render();
renderOutput(currentRun());

if (!local.available()) {
  renderStatus($('output-status'), ERRORS.storageUnavailable, {}, 'warn');
}
