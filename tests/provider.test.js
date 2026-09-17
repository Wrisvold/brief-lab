import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRequest, buildModelListRequest, parseResponse, classifyError, parseModelList,
  callModel, listModels, ProviderError, providerMessage,
} from '../js/provider.js';

const base = { model: 'm-1', key: 'sk-secret', temperature: 0.7, maxOutputTokens: 512, prompt: 'Task: Write.' };

test('buildRequest: Gemini puts the key in a header, never the URL, and sends one user message', () => {
  const r = buildRequest({ provider: 'gemini', ...base });
  assert.ok(r.url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/m-1:generateContent'));
  assert.ok(!r.url.includes('sk-secret'));
  assert.equal(r.headers['x-goog-api-key'], 'sk-secret');
  assert.deepEqual(r.body.contents, [{ role: 'user', parts: [{ text: 'Task: Write.' }] }]);
  assert.equal(r.body.generationConfig.temperature, 0.7);
  assert.equal(r.body.generationConfig.maxOutputTokens, 512);
  assert.ok(!('systemInstruction' in r.body));
});

test('buildRequest: OpenAI uses a bearer header and one user message, no system prompt', () => {
  const r = buildRequest({ provider: 'openai', ...base });
  assert.equal(r.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(r.headers.Authorization, 'Bearer sk-secret');
  assert.deepEqual(r.body.messages, [{ role: 'user', content: 'Task: Write.' }]);
  assert.equal(r.body.model, 'm-1');
  assert.equal(r.body.max_completion_tokens, 512);
});

test('buildRequest: model names are URL-encoded for Gemini', () => {
  const r = buildRequest({ provider: 'gemini', ...base, model: 'weird/name' });
  assert.ok(r.url.includes('weird%2Fname:generateContent'));
});

test('buildModelListRequest carries the key in a header', () => {
  assert.equal(buildModelListRequest({ provider: 'gemini', key: 'k' }).headers['x-goog-api-key'], 'k');
  assert.equal(buildModelListRequest({ provider: 'openai', key: 'k' }).headers.Authorization, 'Bearer k');
});

test('parseResponse reads Gemini and OpenAI replies', () => {
  assert.equal(parseResponse('gemini', { candidates: [{ content: { parts: [{ text: 'Hel' }, { text: 'lo' }] } }] }), 'Hello');
  assert.equal(parseResponse('openai', { choices: [{ message: { content: 'Hi' } }] }), 'Hi');
  assert.equal(parseResponse('openai', { choices: [{ message: { content: [{ type: 'text', text: 'A' }, { text: 'B' }] } }] }), 'AB');
});

test('parseResponse throws emptyResponse on empty or blocked replies', () => {
  for (const json of [{}, { candidates: [] }, { candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }] }, { promptFeedback: { blockReason: 'OTHER' } }]) {
    assert.throws(() => parseResponse('gemini', json), (e) => e instanceof ProviderError && e.kind === 'emptyResponse');
  }
  assert.throws(() => parseResponse('openai', { choices: [{ message: { content: '' } }] }), (e) => e.kind === 'emptyResponse');
  assert.throws(() => parseResponse('openai', null), (e) => e.kind === 'emptyResponse');
});

test('classifyError maps statuses to kinds with a next step', () => {
  const c = (status, json = null, provider = 'gemini') => classifyError({ provider, status, json, model: 'm-1' }).kind;
  assert.equal(c(401), 'invalidKey');
  assert.equal(c(403), 'invalidKey');
  assert.equal(c(404), 'unknownModel');
  assert.equal(c(429), 'rateLimit');
  assert.equal(c(429, { error: { code: 'insufficient_quota', message: 'You exceeded your current quota' } }, 'openai'), 'noQuota');
  assert.equal(c(500), 'providerBusy');
  assert.equal(c(503), 'providerBusy');
  assert.equal(c(400, { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }), 'invalidKey');
  assert.equal(c(400, { error: { message: 'Unsupported value: temperature' } }, 'openai'), 'badRequest');
  assert.equal(c(418), 'unexpected');
  const e = classifyError({ provider: 'gemini', status: 404, json: null, model: 'gone' });
  assert.equal(e.values.model, 'gone');
  assert.ok(e.values.url.startsWith('https://'));
});

test('providerMessage is a short sentence, never a JSON dump', () => {
  assert.equal(providerMessage({ error: { message: '  Too   many\nrequests ' } }), 'Too many requests');
  assert.equal(providerMessage({ error: 'plain' }), 'plain');
  assert.equal(providerMessage(null), '');
  assert.ok(providerMessage({ error: { message: 'x'.repeat(1000) } }).length <= 240);
});

test('parseModelList filters to chat-capable models and sorts', () => {
  const g = parseModelList('gemini', {
    models: [
      { name: 'models/gemini-b', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/embedding-1', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemini-a', supportedGenerationMethods: ['generateContent', 'countTokens'] },
    ],
  });
  assert.deepEqual(g, ['gemini-a', 'gemini-b']);
  const o = parseModelList('openai', { data: [{ id: 'gpt-z' }, { id: 'text-embedding-3' }, { id: 'gpt-a' }, { id: 'whisper-1' }, { id: 'gpt-a' }] });
  assert.deepEqual(o, ['gpt-a', 'gpt-z']);
  assert.deepEqual(parseModelList('gemini', null), []);
  assert.deepEqual(parseModelList('openai', { data: 'nope' }), []);
});

// ---------- callModel with a fake fetch ----------

function fakeFetch(responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return { status: next.status, json: async () => next.json };
  };
  impl.calls = calls;
  return impl;
}

const noSleep = async () => {};
const okGemini = (text) => ({ status: 200, json: { candidates: [{ content: { parts: [{ text }] } }] } });

test('callModel returns the reply on success and reports request progress', async () => {
  const fetchImpl = fakeFetch([okGemini('Done.')]);
  const events = [];
  const out = await callModel({ provider: 'gemini', ...base, fetchImpl, sleep: noSleep, onProgress: (e) => events.push(e) });
  assert.equal(out, 'Done.');
  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(events[0].phase, 'request');
  assert.equal(JSON.parse(fetchImpl.calls[0].init.body).contents[0].parts[0].text, 'Task: Write.');
});

test('callModel refuses to run without a key', async () => {
  await assert.rejects(callModel({ provider: 'gemini', ...base, key: '  ', fetchImpl: fakeFetch([]) }), (e) => e.kind === 'missingKey');
});

test('callModel retries on 429 with the configured backoff and a per-second countdown', async () => {
  const fetchImpl = fakeFetch([{ status: 429, json: null }, { status: 429, json: null }, okGemini('Late.')]);
  const events = [];
  const out = await callModel({
    provider: 'gemini', ...base, fetchImpl, sleep: noSleep, backoff: [2, 5, 10, 20], onProgress: (e) => events.push(e),
  });
  assert.equal(out, 'Late.');
  assert.equal(fetchImpl.calls.length, 3);
  const retries = events.filter((e) => e.phase === 'retry');
  assert.deepEqual(retries.map((e) => e.seconds), [2, 1, 5, 4, 3, 2, 1]);
  assert.deepEqual(retries.map((e) => e.attempt), [1, 1, 2, 2, 2, 2, 2]);
  assert.ok(retries.every((e) => e.total === 5));
});

test('callModel gives up after the last backoff and says so', async () => {
  const fetchImpl = fakeFetch(Array.from({ length: 6 }, () => ({ status: 429, json: null })));
  await assert.rejects(
    callModel({ provider: 'gemini', ...base, fetchImpl, sleep: noSleep, backoff: [1, 1] }),
    (e) => e.kind === 'rateLimit' && e.gaveUp === true && e.values.total === 3,
  );
  assert.equal(fetchImpl.calls.length, 3);
});

test('callModel does not retry on invalid key, unknown model, or bad request', async () => {
  for (const status of [401, 404, 400]) {
    const fetchImpl = fakeFetch([{ status, json: { error: { message: 'no' } } }, okGemini('never')]);
    await assert.rejects(callModel({ provider: 'gemini', ...base, fetchImpl, sleep: noSleep }), (e) => e instanceof ProviderError);
    assert.equal(fetchImpl.calls.length, 1, `status ${status} should not retry`);
  }
});

test('callModel turns a thrown fetch into a network error', async () => {
  const fetchImpl = fakeFetch([new TypeError('Failed to fetch')]);
  await assert.rejects(callModel({ provider: 'openai', ...base, fetchImpl, sleep: noSleep }), (e) => e.kind === 'network');
});

// ---------- Claude (Anthropic) ----------

test('buildRequest: Claude uses x-api-key, the version header, the browser-access header, and max_tokens', () => {
  const r = buildRequest({ provider: 'anthropic', ...base });
  assert.equal(r.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(r.headers['x-api-key'], 'sk-secret');
  assert.equal(r.headers['anthropic-version'], '2023-06-01');
  assert.equal(r.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.ok(!('Authorization' in r.headers));
  assert.equal(r.body.model, 'm-1');
  assert.equal(r.body.max_tokens, 512);
  assert.equal(r.body.temperature, 0.7);
  assert.deepEqual(r.body.messages, [{ role: 'user', content: 'Task: Write.' }]);
  assert.ok(!('system' in r.body));
  // max_tokens is required by the API, so a missing value falls back to the default.
  assert.ok(buildRequest({ provider: 'anthropic', ...base, maxOutputTokens: null }).body.max_tokens > 0);
});

test('parseResponse reads Claude text blocks and rejects empty or refused replies', () => {
  assert.equal(parseResponse('anthropic', { content: [{ type: 'text', text: 'Hel' }, { type: 'text', text: 'lo' }], stop_reason: 'end_turn' }), 'Hello');
  assert.throws(() => parseResponse('anthropic', { content: [], stop_reason: 'refusal' }), (e) => e.kind === 'emptyResponse');
  assert.throws(() => parseResponse('anthropic', {}), (e) => e.kind === 'emptyResponse');
});

test('classifyError maps Claude-specific statuses: 402 billing and 529 overloaded', () => {
  const c = (status, json = null) => classifyError({ provider: 'anthropic', status, json, model: 'm-1' }).kind;
  assert.equal(c(401, { error: { type: 'authentication_error', message: 'invalid x-api-key' } }), 'invalidKey');
  assert.equal(c(402, { error: { type: 'billing_error', message: 'no credit' } }), 'noQuota');
  assert.equal(c(400, { error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } }), 'noQuota');
  assert.equal(c(404, { error: { type: 'not_found_error', message: 'model: nope' } }), 'unknownModel');
  assert.equal(c(429, { error: { type: 'rate_limit_error', message: 'slow down' } }), 'rateLimit');
  assert.equal(c(529, { error: { type: 'overloaded_error', message: 'Overloaded' } }), 'providerBusy');
});

test('parseModelList reads the Claude models list and buildModelListRequest carries the headers', () => {
  assert.deepEqual(parseModelList('anthropic', { data: [{ id: 'claude-sonnet-5', display_name: 'Claude Sonnet 5' }, { id: 'claude-haiku-4-5' }] }), ['claude-haiku-4-5', 'claude-sonnet-5']);
  const r = buildModelListRequest({ provider: 'anthropic', key: 'k' });
  assert.ok(r.url.startsWith('https://api.anthropic.com/v1/models'));
  assert.equal(r.headers['x-api-key'], 'k');
  assert.equal(r.headers['anthropic-dangerous-direct-browser-access'], 'true');
});

test('callModel retries a Claude 529 with backoff', async () => {
  const fetchImpl = fakeFetch([{ status: 529, json: { error: { type: 'overloaded_error', message: 'Overloaded' } } }, { status: 200, json: { content: [{ type: 'text', text: 'Ok.' }] } }]);
  const out = await callModel({ provider: 'anthropic', ...base, fetchImpl, sleep: noSleep, backoff: [1] });
  assert.equal(out, 'Ok.');
  assert.equal(fetchImpl.calls.length, 2);
});

test('listModels returns names or a typed error', async () => {
  const ok = fakeFetch([{ status: 200, json: { data: [{ id: 'gpt-b' }, { id: 'gpt-a' }] } }]);
  assert.deepEqual(await listModels({ provider: 'openai', key: 'k', fetchImpl: ok }), ['gpt-a', 'gpt-b']);
  assert.equal(ok.calls[0].init.method, 'GET');
  const bad = fakeFetch([{ status: 401, json: null }]);
  await assert.rejects(listModels({ provider: 'openai', key: 'k', fetchImpl: bad }), (e) => e.kind === 'invalidKey');
  await assert.rejects(listModels({ provider: 'openai', key: '', fetchImpl: bad }), (e) => e.kind === 'missingKey');
});
