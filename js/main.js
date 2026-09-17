// Brief Lab — main.js
// Entry point: fills the page shell from copy.js, mounts the field and the Settings
// drawer, runs the brief against the provider, and files each run.

import {
  APP, EXPLAINERS, FIELD, PROMPT, OUTPUT, TREE, COMPARE, SETTINGS, FOOTER, ERRORS, WALKTHROUGH, fill,
} from './copy.js';
import {
  STORAGE_KEY_DRAFT, STORAGE_KEY_MODE, STORAGE_KEY_TREE, STORAGE_PREFIX, WALKTHROUGH_TASK_URL, EXPORT_FORMAT_VERSION,
} from './constants.js';
import {
  ELEMENTS, makeBrief, copyBrief, assemble, estimateTokens, briefFromTask, briefHasAnyText, makeRun, isPlugged,
} from './model.js';
import { $, el, setText, show, debounce } from './dom.js';
import { local, session } from './storage.js';
import { state, subscribe, notify, currentRun } from './state.js';
import { mountField } from './field.js';
import { loadSettings, mountSettingsBody, getKey } from './settings.js';
import { callModel } from './provider.js';
import { renderStatus, errorEntry } from './status.js';

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

// ---------- the assembled-brief panel ----------

function renderPrompt() {
  const prompt = assemble(state.brief);
  const pre = $('prompt-text');
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

// ---------- the output panel ----------

function renderOutput(run) {
  const pre = $('output-text');
  if (!run) {
    pre.textContent = OUTPUT.empty;
    pre.classList.add('muted');
    return;
  }
  pre.textContent = run.output;
  pre.classList.remove('muted');
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

// ---------- runs (flat list until the tree arrives in Phase 3) ----------

function saveRuns() {
  local.set(STORAGE_KEY_TREE, { version: EXPORT_FORMAT_VERSION, runs: state.runs });
}

function loadRuns() {
  const saved = local.get(STORAGE_KEY_TREE, null);
  if (saved && Array.isArray(saved.runs)) state.runs = saved.runs;
  if (state.currentRunId && !state.runs.some((r) => r.id === state.currentRunId)) state.currentRunId = null;
}

function chipsFor(brief) {
  return el('span', { class: 'chips', 'aria-hidden': 'true' },
    ELEMENTS.map((e) => el('span', { class: isPlugged(brief, e.key) ? 'chip' : 'chip is-hollow' })));
}

function runLabel(run) {
  const task = (run.brief.task && run.brief.task.text || '').split(/\r?\n/)[0].trim();
  return task || TREE.fullBrief;
}

function timeOf(run) {
  const d = new Date(run.createdAt);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderRuns() {
  const host = $('tree-list');
  if (state.runs.length === 0) {
    host.replaceChildren(el('p', { class: 'muted', text: TREE.empty }));
    return;
  }
  host.replaceChildren(
    ...state.runs.map((run) => {
      const isCurrent = run.id === state.currentRunId;
      return el('button', {
        type: 'button',
        class: isCurrent ? 'tree-node is-current' : 'tree-node',
        'aria-current': isCurrent ? 'true' : null,
        onclick: () => loadRun(run),
      }, [
        el('span', { class: 'run-row-item' }, [
          chipsFor(run.brief),
          el('span', { class: 'run-label', text: runLabel(run) }),
          el('span', { class: 'run-time', text: timeOf(run) }),
        ]),
      ]);
    }),
  );
}

// Put a run's brief back on the field and show its output. Editing then branches from it.
function loadRun(run) {
  state.brief = copyBrief(run.brief);
  state.prediction = '';
  state.currentRunId = run.id;
  field.syncInputs();
  renderOutput(run);
  renderStatus($('output-status'), null);
  saveDraft();
  notify('runs');
  notify('brief');
}

// ---------- Run ----------

async function onRun() {
  if (state.busy) return;
  const prompt = assemble(state.brief);
  if (!prompt) return;
  const key = getKey();
  const status = $('output-status');
  if (!key) {
    renderStatus(status, ERRORS.missingKey, {}, 'error');
    return;
  }

  const settings = { ...state.settings };
  const parentId = state.currentRunId;
  const prediction = state.prediction;
  const briefSnapshot = copyBrief(state.brief);
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
    const run = makeRun({ parentId, brief: briefSnapshot, settings, prediction, output });
    state.runs.push(run);
    state.currentRunId = run.id;
    state.prediction = '';
    saveRuns();
    renderOutput(run);
    renderStatus(status, {
      title: fill(OUTPUT.done, { provider: providerLabel(settings.provider), model: settings.model, seconds: ((Date.now() - started) / 1000).toFixed(1) }),
    }, {}, 'info');
  } catch (err) {
    renderStatus(status, ...errorEntry(err), 'error');
  } finally {
    state.busy = false;
    field.syncInputs();
    saveDraft();
    notify('runs');
    notify('brief');
  }
}

function providerLabel(provider) {
  return provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : provider;
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
  field.syncInputs();
  saveDraft();
  notify('brief');
}

function startBlank() {
  state.brief = makeBrief();
  state.prediction = '';
  field.syncInputs();
  field.focusFirstEmpty();
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
      el('button', { type: 'button', class: 'menu-item', text: FIELD.startBlank, onclick: guarded(startBlank) }),
    ]),
  );
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) closeMenu();
  });
  $('field-actions').replaceChildren(menu);
}

// ---------- mode ----------

function setMode(mode) {
  state.mode = mode === 'walkthrough' ? 'walkthrough' : 'free';
  local.set(STORAGE_KEY_MODE, state.mode);
  $('mode-walkthrough').setAttribute('aria-pressed', state.mode === 'walkthrough' ? 'true' : 'false');
  $('mode-free').setAttribute('aria-pressed', state.mode === 'free' ? 'true' : 'false');
  const stepper = $('stepper');
  show(stepper, state.mode === 'walkthrough');
  if (state.mode === 'walkthrough' && stepper.childElementCount === 0) {
    stepper.replaceChildren(el('p', { class: 'small muted', text: WALKTHROUGH.comingLater }));
  }
  notify('mode');
}

function mountMode() {
  $('mode-walkthrough').addEventListener('click', () => setMode('walkthrough'));
  $('mode-free').addEventListener('click', () => setMode('free'));
  // Free is the default until the walkthrough exists (Phase 5 changes the first-visit default).
  setMode(local.get(STORAGE_KEY_MODE, 'free'));
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
    field.syncInputs();
    renderStatus($('output-status'), null);
    renderOutput(null);
    mountSettingsBody($('settings-body'));
    notify('runs');
    notify('brief');
  });
}

// ---------- start ----------

renderShell();
loadSettings();
loadDraft();
loadRuns();

const field = mountField({
  host: $('field-nodes'),
  onChange: () => {
    notify('brief');
    saveDraft();
  },
  onRun,
});

subscribe((topic) => {
  if (topic === 'brief' || topic === 'runs' || topic === 'settings') {
    field.refresh();
    renderPrompt();
  }
  if (topic === 'runs') renderRuns();
});

mountPromptActions();
mountFieldActions();
mountMode();
mountSettings();
mountClearEverything();
field.syncInputs();
renderPrompt();
renderRuns();
renderOutput(currentRun());

if (!local.available()) {
  renderStatus($('output-status'), ERRORS.storageUnavailable, {}, 'warn');
}
