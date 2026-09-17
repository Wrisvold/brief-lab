// Brief Lab — provider.js
// Talks to the model providers directly from the browser with the student's key.
// No proxy, no server. The key travels only in a request header to the chosen
// provider, never in a URL, never in a log.
//
// The pure parts (building a request, reading a reply, sorting an error into a kind,
// reading the model list) take plain data and return plain data, so tests/provider.test.js
// can check them without a network. callModel() wraps them with fetch, a timeout, and
// the retry-with-backoff loop; fetch and sleep are injectable for tests.

import { PROVIDERS, RETRY_BACKOFF_SECONDS, REQUEST_TIMEOUT_MS } from './constants.js';

// Error kinds. Each maps to an entry in copy.js ERRORS.
export const ERROR_KINDS = Object.freeze([
  'missingKey', 'invalidKey', 'unknownModel', 'rateLimit', 'noQuota', 'providerBusy',
  'badRequest', 'network', 'emptyResponse', 'unexpected',
]);

// A typed error the UI can turn into a plain message. `detail` is a short provider
// sentence (never raw JSON) that some messages may quote; `values` fill copy placeholders.
export class ProviderError extends Error {
  constructor(kind, values = {}, detail = '') {
    super(kind);
    this.name = 'ProviderError';
    this.kind = ERROR_KINDS.includes(kind) ? kind : 'unexpected';
    this.values = values;
    this.detail = detail;
  }
}

// ---------------------------------------------------------------------------
// Building requests
// ---------------------------------------------------------------------------

// { url, headers, body } for one user message. The key goes in a header.
export function buildRequest({ provider, model, key, temperature, maxOutputTokens, prompt }) {
  const spec = PROVIDERS[provider];
  if (!spec) throw new ProviderError('unexpected', {}, `unknown provider ${provider}`);
  if (provider === 'gemini') {
    return {
      url: spec.endpoint.replace('{model}', encodeURIComponent(model)),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: Number(temperature),
          ...(maxOutputTokens ? { maxOutputTokens: Number(maxOutputTokens) } : {}),
        },
      },
    };
  }
  if (provider === 'openai') {
    return {
      url: spec.endpoint,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: Number(temperature),
        ...(maxOutputTokens ? { max_completion_tokens: Number(maxOutputTokens) } : {}),
      },
    };
  }
  throw new ProviderError('unexpected', {}, `unknown provider ${provider}`);
}

// { url, headers } for the provider's model list.
export function buildModelListRequest({ provider, key }) {
  if (provider === 'gemini') {
    return {
      url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
      headers: { 'x-goog-api-key': key },
    };
  }
  if (provider === 'openai') {
    return {
      url: 'https://api.openai.com/v1/models',
      headers: { Authorization: `Bearer ${key}` },
    };
  }
  throw new ProviderError('unexpected', {}, `unknown provider ${provider}`);
}

// ---------------------------------------------------------------------------
// Reading replies
// ---------------------------------------------------------------------------

// The reply text, or a ProviderError('emptyResponse') when there is none.
export function parseResponse(provider, json) {
  let text = '';
  if (provider === 'gemini') {
    const candidate = json && Array.isArray(json.candidates) ? json.candidates[0] : null;
    const parts = candidate && candidate.content && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
    text = parts.map((p) => (typeof p.text === 'string' ? p.text : '')).join('');
    if (!text.trim()) {
      const reason = (json && json.promptFeedback && json.promptFeedback.blockReason) || (candidate && candidate.finishReason) || '';
      throw new ProviderError('emptyResponse', {}, reason ? `finish reason: ${reason}` : '');
    }
  } else if (provider === 'openai') {
    const choice = json && Array.isArray(json.choices) ? json.choices[0] : null;
    const content = choice && choice.message ? choice.message.content : '';
    text = typeof content === 'string'
      ? content
      : Array.isArray(content) ? content.map((c) => (c && typeof c.text === 'string' ? c.text : '')).join('') : '';
    if (!text.trim()) {
      const reason = (choice && choice.finish_reason) || '';
      throw new ProviderError('emptyResponse', {}, reason ? `finish reason: ${reason}` : '');
    }
  } else {
    throw new ProviderError('unexpected', {}, `unknown provider ${provider}`);
  }
  return text;
}

// A short provider sentence from an error body, or ''. Never the whole JSON.
export function providerMessage(json) {
  const m = json && json.error && (typeof json.error === 'string' ? json.error : json.error.message);
  if (typeof m !== 'string') return '';
  return m.replace(/\s+/g, ' ').trim().slice(0, 240);
}

// Sort an HTTP failure into an error kind. `json` is the parsed error body if any.
export function classifyError({ provider, status, json, model }) {
  const message = providerMessage(json);
  const lower = message.toLowerCase();
  const code = json && json.error && (json.error.code || json.error.status || json.error.type);
  const codeStr = String(code || '').toLowerCase();

  if (status === 401 || status === 403) return new ProviderError('invalidKey', {}, message);
  if (status === 404) return new ProviderError('unknownModel', { model, url: PROVIDERS[provider].modelListUrl }, message);
  if (status === 429) {
    if (codeStr.includes('insufficient_quota') || lower.includes('quota') && lower.includes('billing')) {
      return new ProviderError('noQuota', {}, message);
    }
    return new ProviderError('rateLimit', {}, message);
  }
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return new ProviderError('providerBusy', {}, message);
  }
  if (status === 400) {
    if (lower.includes('api key') || codeStr.includes('api_key')) return new ProviderError('invalidKey', {}, message);
    if (lower.includes('not found') && lower.includes('model')) {
      return new ProviderError('unknownModel', { model, url: PROVIDERS[provider].modelListUrl }, message);
    }
    return new ProviderError('badRequest', { detail: message }, message);
  }
  return new ProviderError('unexpected', { detail: message }, message);
}

// Model names from a model-list reply, sorted, chat-capable only. Never throws on odd shapes.
export function parseModelList(provider, json) {
  let names = [];
  if (provider === 'gemini') {
    const models = json && Array.isArray(json.models) ? json.models : [];
    names = models
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter(Boolean);
  } else if (provider === 'openai') {
    const models = json && Array.isArray(json.data) ? json.data : [];
    const skip = /embedding|tts|whisper|dall-e|moderation|realtime|audio|transcribe|image|search|instruct|davinci|babbage|codex|computer-use/i;
    names = models.map((m) => String(m.id || '')).filter((id) => id && !skip.test(id));
  }
  return [...new Set(names)].sort();
}

// ---------------------------------------------------------------------------
// Calling the provider
// ---------------------------------------------------------------------------

function defaultSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    if (signal) signal.addEventListener('abort', () => { clearTimeout(t); reject(new ProviderError('network')); }, { once: true });
  });
}

// One HTTP round trip with a timeout. Returns { status, json } or throws ProviderError('network').
async function fetchJson({ url, headers, body, method = 'POST', fetchImpl, timeoutMs, signal }) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } catch {
    throw new ProviderError('network');
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

// Extension points (deferred, brief section 9):
//  - Two providers side by side: call callModel() twice with different provider settings
//    and file the two runs as same-parent siblings; Compare already handles a settings diff.
//  - Multi-turn: buildRequest() takes one prompt on purpose. Brief Lab is single-turn by design;
//    a conversation instrument would need a messages array here and would be its own app.
// Send one prompt. Retries on rate limit and provider trouble with backoff, reporting
// progress through onProgress({ phase, attempt, total, seconds, provider }).
// Resolves to the reply text; rejects with a ProviderError.
export async function callModel({
  provider, model, key, temperature, maxOutputTokens, prompt,
  onProgress = () => {},
  fetchImpl = globalThis.fetch,
  sleep = defaultSleep,
  backoff = RETRY_BACKOFF_SECONDS,
  timeoutMs = REQUEST_TIMEOUT_MS,
  signal = null,
}) {
  if (!key || !String(key).trim()) throw new ProviderError('missingKey');
  const request = buildRequest({ provider, model, key: String(key).trim(), temperature, maxOutputTokens, prompt });
  const total = backoff.length + 1;
  let lastError = null;

  for (let attempt = 1; attempt <= total; attempt++) {
    onProgress({ phase: 'request', attempt, total, provider });
    const { status, json } = await fetchJson({ ...request, fetchImpl, timeoutMs, signal });
    if (status >= 200 && status < 300) return parseResponse(provider, json);

    lastError = classifyError({ provider, status, json, model });
    const retryable = lastError.kind === 'rateLimit' || lastError.kind === 'providerBusy';
    if (!retryable || attempt === total) break;

    const wait = backoff[attempt - 1];
    for (let s = wait; s > 0; s--) {
      onProgress({ phase: 'retry', attempt, total, seconds: s, provider, kind: lastError.kind });
      await sleep(1000, signal);
    }
  }
  if (lastError && (lastError.kind === 'rateLimit' || lastError.kind === 'providerBusy')) {
    lastError.gaveUp = true;
    lastError.values = { ...lastError.values, total };
  }
  throw lastError;
}

// Fetch the provider's model list. Resolves to an array of names; rejects with a ProviderError.
export async function listModels({ provider, key, fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS }) {
  if (!key || !String(key).trim()) throw new ProviderError('missingKey');
  const request = buildModelListRequest({ provider, key: String(key).trim() });
  const { status, json } = await fetchJson({ ...request, method: 'GET', fetchImpl, timeoutMs });
  if (status >= 200 && status < 300) return parseModelList(provider, json);
  throw classifyError({ provider, status, json, model: '' });
}
