// Brief Lab — settings.js
// The Settings drawer: provider, API key (sessionStorage only), model name with a live
// model list, temperature, max output length, Test connection.

import {
  PROVIDERS, TEMPERATURE_MIN, TEMPERATURE_MAX, TEMPERATURE_STEP,
  MAX_OUTPUT_TOKENS_MIN, MAX_OUTPUT_TOKENS_MAX, TEST_CONNECTION_PROMPT,
  STORAGE_KEY_API_KEY, STORAGE_KEY_SETTINGS,
} from './constants.js';
import { SETTINGS, ERRORS, fill } from './copy.js';
import { el, show } from './dom.js';
import { local, session } from './storage.js';
import { state, notify, defaultSettings } from './state.js';
import { callModel, listModels } from './provider.js';
import { renderStatus, errorEntry } from './status.js';

// ---------- the key (sessionStorage only, try/catch inside storage.js) ----------

export function getKey() {
  const k = session.get(STORAGE_KEY_API_KEY, '');
  return typeof k === 'string' ? k.trim() : '';
}

function setKey(value) {
  const v = String(value || '').trim();
  if (v) session.set(STORAGE_KEY_API_KEY, v);
  else session.remove(STORAGE_KEY_API_KEY);
}

// ---------- settings persistence (never the key) ----------

export function loadSettings() {
  const saved = local.get(STORAGE_KEY_SETTINGS, null);
  const d = defaultSettings();
  if (!saved || typeof saved !== 'object') return;
  const provider = PROVIDERS[saved.provider] ? saved.provider : d.provider;
  state.settings = {
    provider,
    model: typeof saved.model === 'string' && saved.model.trim() ? saved.model.trim() : PROVIDERS[provider].defaultModel,
    temperature: clamp(Number(saved.temperature), TEMPERATURE_MIN, TEMPERATURE_MAX, d.temperature),
    maxOutputTokens: clamp(Number(saved.maxOutputTokens), MAX_OUTPUT_TOKENS_MIN, MAX_OUTPUT_TOKENS_MAX, d.maxOutputTokens),
  };
  state.modelByProvider = saved.modelByProvider && typeof saved.modelByProvider === 'object' ? { ...saved.modelByProvider } : {};
}

function saveSettings() {
  local.set(STORAGE_KEY_SETTINGS, { ...state.settings, modelByProvider: state.modelByProvider || {} });
}

function clamp(n, min, max, fallback) {
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// ---------- the drawer body ----------

export function mountSettingsBody(body) {
  const s = state.settings;
  state.modelByProvider = state.modelByProvider || {};

  // Provider
  const providerSelect = el('select', { id: 'set-provider' },
    Object.entries(PROVIDERS).map(([key, spec]) => el('option', { value: key, text: spec.label })));
  providerSelect.value = s.provider;

  // Key
  const keyInput = el('input', { id: 'set-key', type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: SETTINGS.apiKeyPlaceholder });
  keyInput.value = getKey();
  const keyNote = el('p', { class: 'settings-hint' });
  const showButton = el('button', { type: 'button', class: 'button button-quiet button-small', text: SETTINGS.keyShow });
  const forgetButton = el('button', { type: 'button', class: 'button button-quiet button-small', text: SETTINGS.clearKey });
  const getKeyLink = el('a', { target: '_blank', rel: 'noopener', text: SETTINGS.keyEntry.getKeyLink });
  const modelListLink = el('a', { target: '_blank', rel: 'noopener', text: SETTINGS.keyEntry.modelListLink });
  const whereLine = el('p');
  // Shown for the paid providers: points a student with no budget at Gemini's free key.
  const noBudgetLine = el('p', { text: SETTINGS.keyEntry.noBudget, hidden: true });

  // Model
  const modelInput = el('input', { id: 'set-model', type: 'text', autocomplete: 'off', spellcheck: 'false' });
  modelInput.value = s.model;
  const listButton = el('button', { type: 'button', class: 'button button-secondary button-small', text: SETTINGS.listModels });
  const modelSelect = el('select', { id: 'set-model-pick', 'aria-label': SETTINGS.modelPick, hidden: true });
  const modelNote = el('p', { class: 'settings-hint', text: SETTINGS.modelHint });
  const listStatus = el('div', { class: 'status', role: 'status', 'aria-live': 'polite' });

  // Temperature
  const tempInput = el('input', { id: 'set-temp', type: 'range', min: String(TEMPERATURE_MIN), max: String(TEMPERATURE_MAX), step: String(TEMPERATURE_STEP) });
  tempInput.value = String(s.temperature);
  const tempValue = el('span', { class: 'temperature-value', text: formatTemp(s.temperature) });

  // Max output
  const maxInput = el('input', { id: 'set-max', type: 'number', min: String(MAX_OUTPUT_TOKENS_MIN), max: String(MAX_OUTPUT_TOKENS_MAX), step: '64' });
  maxInput.value = String(s.maxOutputTokens);

  // Test connection
  const testButton = el('button', { type: 'button', class: 'button button-secondary', text: SETTINGS.testConnection });
  const testStatus = el('div', { class: 'status', role: 'status', 'aria-live': 'polite' });

  function refreshProviderBits() {
    const spec = PROVIDERS[state.settings.provider];
    getKeyLink.href = spec.keyUrl;
    modelListLink.href = spec.modelListUrl;
    whereLine.textContent = {
      gemini: SETTINGS.keyEntry.whereGemini,
      openai: SETTINGS.keyEntry.whereOpenAI,
      anthropic: SETTINGS.keyEntry.whereAnthropic,
    }[state.settings.provider] || '';
    show(noBudgetLine, state.settings.provider !== 'gemini');
    keyNote.textContent = getKey() ? SETTINGS.keyKept : SETTINGS.keyNone;
  }

  providerSelect.addEventListener('change', () => {
    state.modelByProvider[state.settings.provider] = state.settings.model;
    state.settings.provider = providerSelect.value;
    state.settings.model = state.modelByProvider[providerSelect.value] || PROVIDERS[providerSelect.value].defaultModel;
    modelInput.value = state.settings.model;
    show(modelSelect, false);
    listStatus.replaceChildren();
    testStatus.replaceChildren();
    refreshProviderBits();
    saveSettings();
    notify('settings');
  });

  keyInput.addEventListener('input', () => {
    setKey(keyInput.value);
    refreshProviderBits();
    notify('settings');
  });
  showButton.addEventListener('click', () => {
    const showing = keyInput.type === 'text';
    keyInput.type = showing ? 'password' : 'text';
    showButton.textContent = showing ? SETTINGS.keyShow : SETTINGS.keyHide;
  });
  forgetButton.addEventListener('click', () => {
    keyInput.value = '';
    setKey('');
    refreshProviderBits();
    notify('settings');
    keyInput.focus();
  });

  modelInput.addEventListener('input', () => {
    state.settings.model = modelInput.value.trim();
    saveSettings();
    notify('settings');
  });
  modelSelect.addEventListener('change', () => {
    if (!modelSelect.value) return;
    modelInput.value = modelSelect.value;
    state.settings.model = modelSelect.value;
    saveSettings();
    notify('settings');
  });
  listButton.addEventListener('click', async () => {
    listButton.disabled = true;
    renderStatus(listStatus, { title: SETTINGS.listing }, {}, 'info', true);
    try {
      const names = await listModels({ provider: state.settings.provider, key: getKey() });
      modelSelect.replaceChildren(
        el('option', { value: '', text: SETTINGS.modelPick }),
        ...names.map((n) => el('option', { value: n, text: n })),
      );
      modelSelect.value = names.includes(state.settings.model) ? state.settings.model : '';
      show(modelSelect, true);
      renderStatus(listStatus, { title: fill(SETTINGS.listed, { count: names.length }) }, {}, 'info');
    } catch (err) {
      renderStatus(listStatus, ...errorEntry(err), 'error');
    } finally {
      listButton.disabled = false;
    }
  });

  tempInput.addEventListener('input', () => {
    state.settings.temperature = Number(tempInput.value);
    tempValue.textContent = formatTemp(state.settings.temperature);
    saveSettings();
    notify('settings');
  });

  maxInput.addEventListener('change', () => {
    const n = Number(maxInput.value);
    state.settings.maxOutputTokens = clamp(n, MAX_OUTPUT_TOKENS_MIN, MAX_OUTPUT_TOKENS_MAX, defaultSettings().maxOutputTokens);
    maxInput.value = String(state.settings.maxOutputTokens);
    saveSettings();
    notify('settings');
  });

  testButton.addEventListener('click', async () => {
    testButton.disabled = true;
    renderStatus(testStatus, { title: SETTINGS.testing }, {}, 'info', true);
    try {
      await callModel({
        provider: state.settings.provider,
        model: state.settings.model,
        key: getKey(),
        temperature: state.settings.temperature,
        maxOutputTokens: 64,
        prompt: TEST_CONNECTION_PROMPT,
        onProgress: (p) => {
          if (p.phase === 'retry') {
            const entry = p.kind === 'providerBusy' ? ERRORS.providerBusy : ERRORS.rateLimit;
            renderStatus(testStatus, entry, p, 'warn', true);
          }
        },
      });
      renderStatus(testStatus, { title: fill(SETTINGS.testOk, { model: state.settings.model }) }, {}, 'info');
    } catch (err) {
      renderStatus(testStatus, ...errorEntry(err), 'error');
    } finally {
      testButton.disabled = false;
    }
  });

  refreshProviderBits();

  body.replaceChildren(
    el('div', { class: 'settings-field' }, [el('label', { for: 'set-provider', text: SETTINGS.provider }), providerSelect]),
    el('div', { class: 'settings-field' }, [
      el('label', { for: 'set-key', text: SETTINGS.apiKey }),
      el('div', { class: 'settings-row' }, [keyInput, showButton, forgetButton]),
      keyNote,
    ]),
    el('div', { class: 'settings-copy' }, [
      el('p', { text: SETTINGS.keyEntry.whatIsAKey }),
      whereLine,
      noBudgetLine,
      el('p', {}, [getKeyLink, modelListLink]),
      el('p', { text: SETTINGS.keyEntry.stays }),
      el('p', { text: SETTINGS.keyEntry.training }),
    ]),
    el('div', { class: 'settings-field' }, [
      el('label', { for: 'set-model', text: SETTINGS.model }),
      el('div', { class: 'settings-row' }, [modelInput, listButton]),
      modelSelect,
      modelNote,
      listStatus,
    ]),
    el('div', { class: 'settings-field' }, [
      el('label', { for: 'set-temp' }, [SETTINGS.temperature + ' ', tempValue]),
      tempInput,
      el('p', { class: 'settings-hint', text: SETTINGS.temperatureHint }),
    ]),
    el('div', { class: 'settings-field' }, [
      el('label', { for: 'set-max', text: SETTINGS.maxOutput }),
      maxInput,
      el('p', { class: 'settings-hint', text: SETTINGS.maxOutputHint }),
    ]),
    el('div', { class: 'settings-field' }, [testButton, testStatus]),
  );
}

function formatTemp(n) {
  return Number(n).toFixed(2).replace(/0$/, '');
}
