// Brief Lab — main.js
// Entry point: fills the page shell from copy.js, mounts the field, the Settings drawer,
// the tree drawer, and the Compare panel; runs the brief against the provider; files runs.

import {
  APP, EXPLAINERS, FIELD, PROMPT, OUTPUT, TREE, COMPARE, SETTINGS, FOOTER, ERRORS, WALKTHROUGH, fill,
} from './copy.js';
import {
  STORAGE_KEY_DRAFT, STORAGE_KEY_MODE, STORAGE_KEY_TREE, STORAGE_PREFIX, STORAGE_WARN_BYTES, WALKTHROUGH_TASK_URL,
} from './constants.js';
import { makeBrief, copyBrief, assemble, estimateTokens, briefFromTask, briefHasAnyText } from './model.js';
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

// Detach from the current node: the next Run starts a new root group.
function newRoot({ clearField = true } = {}) {
  if (clearField) state.brief = makeBrief();
  state.prediction = '';
  state.currentRunId = null;
  field.syncInputs();
  if (clearField) field.focusFirstEmpty();
  renderOutput(null);
  renderStatus($('output-status'), null);
  saveDraft();
  notify('runs');
  notify('brief');
}

// ---------- Run ----------

// mode: 'run' (child of the current node, or a fresh root) | 'again' (same-brief sibling of the current node)
async function onRun(mode = 'run') {
  if (state.busy) return;
  const status = $('output-status');
  const current = currentRun();
  const again = mode === 'again' && current;

  const briefSnapshot = again ? copyBrief(current.brief) : copyBrief(state.brief);
  const prompt = assemble(briefSnapshot);
  if (!prompt) return;
  const key = getKey();
  if (!key) {
    renderStatus(status, ERRORS.missingKey, {}, 'error');
    return;
  }

  const settings = again ? { ...current.settings } : { ...state.settings };
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
    });
    state.currentRunId = run.id;
    state.prediction = '';
    if (again) state.brief = copyBrief(run.brief);
    saveRuns();
    renderOutput(run);
    renderStatus(status, {
      title: fill(OUTPUT.done, {
        provider: providerLabel(settings.provider), model: settings.model, seconds: ((Date.now() - started) / 1000).toFixed(1),
      }),
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

function mountTreeActions() {
  $('tree-actions').replaceChildren(
    el('button', {
      type: 'button',
      class: 'button button-secondary button-small',
      text: TREE.newRoot,
      onclick: () => {
        if (briefHasAnyText(state.brief) && !window.confirm(TREE.newRootConfirm)) return;
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
  );
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
    renderStorageWarning('');
    renderOutput(null);
    compare.close();
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

subscribe((topic) => {
  if (topic === 'brief' || topic === 'runs' || topic === 'settings') {
    field.refresh();
    renderPrompt();
  }
  if (topic === 'runs') {
    tree.render();
    mountTreeActions();
    compare.refresh();
  }
});

mountPromptActions();
mountFieldActions();
mountTreeActions();
mountMode();
mountSettings();
mountClearEverything();
field.syncInputs();
renderPrompt();
tree.render();
renderOutput(currentRun());

if (!local.available()) {
  renderStatus($('output-status'), ERRORS.storageUnavailable, {}, 'warn');
}
