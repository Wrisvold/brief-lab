// Brief Lab — main.js
// Entry point: fills the page shell from copy.js, mounts the field, keeps the assembled
// brief panel live, saves the draft, and wires the top-bar controls.

import {
  APP, EXPLAINERS, FIELD, PROMPT, OUTPUT, TREE, COMPARE, SETTINGS, FOOTER, ERRORS, WALKTHROUGH, fill,
} from './copy.js';
import {
  STORAGE_KEY_DRAFT, STORAGE_KEY_MODE, STORAGE_PREFIX, WALKTHROUGH_TASK_URL,
} from './constants.js';
import { makeBrief, copyBrief, assemble, estimateTokens, briefFromTask, briefHasAnyText } from './model.js';
import { $, el, setText, show, debounce } from './dom.js';
import { local, session } from './storage.js';
import { state, subscribe, notify } from './state.js';
import { mountField } from './field.js';

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
  setText('output-text', OUTPUT.empty);
  $('output-text').classList.add('muted');
  setText('tree-list', TREE.empty);

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

// A status block: title, message, next step. Used for errors and progress.
export function renderStatus(host, entry, values = {}, kind = 'info') {
  if (!entry) {
    host.replaceChildren();
    return;
  }
  host.className = `status status-${kind}`;
  host.replaceChildren(
    el('p', { class: 'status-title', text: fill(entry.title, values) }),
    entry.message ? el('p', { text: fill(entry.message, values) }) : null,
    entry.next ? el('p', { class: 'status-next', text: fill(entry.next, values) }) : null,
  );
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
        // Clipboard blocked: the text is selectable in the panel anyway.
        $('prompt-text').focus();
      }
    },
  });
  $('prompt-actions').replaceChildren(copyButton);
}

// ---------- the draft (what is on the field) ----------

const saveDraft = debounce(() => {
  local.set(STORAGE_KEY_DRAFT, { brief: state.brief, prediction: state.prediction });
}, 300);

function loadDraft() {
  const draft = local.get(STORAGE_KEY_DRAFT, null);
  if (!draft || typeof draft !== 'object') return;
  state.brief = copyBrief(draft.brief);
  state.prediction = String(draft.prediction || '');
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
  notify('brief');
}

function startBlank() {
  state.brief = makeBrief();
  state.prediction = '';
  field.syncInputs();
  field.focusFirstEmpty();
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

// ---------- settings drawer (Phase 2 fills the body) ----------

function mountSettings() {
  const drawer = $('settings');
  const button = $('btn-settings');
  const open = (yes) => {
    show(drawer, yes);
    button.setAttribute('aria-expanded', yes ? 'true' : 'false');
    if (yes) drawer.querySelector('button, input, select, textarea')?.focus();
    else button.focus();
  };
  button.addEventListener('click', () => open(drawer.hasAttribute('hidden')));
  $('settings-actions').replaceChildren(
    el('button', { type: 'button', class: 'button button-quiet button-small', text: SETTINGS.close, onclick: () => open(false) }),
  );
  $('settings-body').replaceChildren(el('p', { class: 'muted', text: SETTINGS.comingLater }));
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
    setText('output-text', OUTPUT.empty);
    $('output-text').classList.add('muted');
    notify('runs');
    notify('brief');
  });
}

// ---------- run (Phase 2 replaces this with the provider call) ----------

function onRun() {
  renderStatus($('output-status'), ERRORS.missingKey, {}, 'error');
}

// ---------- start ----------

renderShell();
loadDraft();

const field = mountField({
  host: $('field-nodes'),
  onChange: (what) => {
    notify('brief');
    if (what !== 'prediction') saveDraft();
    else saveDraft();
  },
  onRun,
});

subscribe((topic) => {
  if (topic === 'brief' || topic === 'runs' || topic === 'settings') {
    field.refresh();
    renderPrompt();
  }
});

mountPromptActions();
mountFieldActions();
mountMode();
mountSettings();
mountClearEverything();
field.syncInputs();
renderPrompt();

if (!local.available()) {
  renderStatus($('output-status'), ERRORS.storageUnavailable, {}, 'warn');
}
