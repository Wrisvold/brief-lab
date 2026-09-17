// Brief Lab — constants.js
// Every default, range, model name, and threshold lives here.
// Each one has a plain-language comment above it. Change the value, save, reload.
// Nothing in this file touches the page; it is safe to edit.

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

// Which provider is selected when a student opens the app for the first time.
// Must be one of the keys in PROVIDERS below.
export const DEFAULT_PROVIDER = 'anthropic';

// The two providers the app can call. To change a default model name, edit
// `defaultModel`. Providers retire model names without notice; when that
// happens the app shows a plain message and the student can type a new name
// in Settings without anyone editing this file.
export const PROVIDERS = {
  // Listed first because it is the default; the classes use Claude.
  anthropic: {
    label: 'Claude (Anthropic)',
    // Haiku is the small, fast, inexpensive Claude model; fine for a course.
    // Verify at https://docs.claude.com/en/docs/about-claude/models
    defaultModel: 'claude-haiku-4-5',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    modelListUrl: 'https://docs.claude.com/en/docs/about-claude/models',
  },
  gemini: {
    // Shown in the Settings drawer.
    label: 'Gemini (Google AI Studio)',
    // Model name sent to the provider. Verify at https://ai.google.dev/gemini-api/docs/models
    defaultModel: 'gemini-2.5-flash',
    // Where the request goes. {model} is replaced with the model name.
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    // Where a student gets a free key.
    keyUrl: 'https://aistudio.google.com/apikey',
    // Where current model names are listed (used in the "model retired" message).
    modelListUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  openai: {
    label: 'OpenAI',
    // Verify at https://platform.openai.com/docs/models
    defaultModel: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyUrl: 'https://platform.openai.com/api-keys',
    modelListUrl: 'https://platform.openai.com/docs/models',
  },
};

// The Claude API needs a version header on every request. Anthropic keeps old versions working.
export const ANTHROPIC_VERSION = '2023-06-01';

// ---------------------------------------------------------------------------
// Generation settings
// ---------------------------------------------------------------------------

// Temperature when the app is first opened. Higher = more variation between runs.
export const DEFAULT_TEMPERATURE = 0.7;

// The temperature dial runs from MIN to MAX in steps of STEP.
// Both providers accept values above 1, but the course teaches 0–1.
export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 1;
export const TEMPERATURE_STEP = 0.05;

// Longest reply the model may send, in tokens (roughly 3/4 of a word each).
// 1024 tokens is about 750 words, enough for every walkthrough task.
export const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

// The dial for max output length runs between these two values.
export const MAX_OUTPUT_TOKENS_MIN = 64;
export const MAX_OUTPUT_TOKENS_MAX = 4096;

// The one-word prompt sent by "Test connection".
export const TEST_CONNECTION_PROMPT = 'Reply with the single word: ready';

// ---------------------------------------------------------------------------
// Retry and timing
// ---------------------------------------------------------------------------

// When a provider answers 429 (rate limit), the app waits these many seconds
// before each retry, in order, and shows a countdown. After the last one it stops.
export const RETRY_BACKOFF_SECONDS = [2, 5, 10, 20];

// How long to wait for a provider before treating the call as a network failure (ms).
export const REQUEST_TIMEOUT_MS = 60000;

// Anything that takes longer than this must show a progress state (ms).
export const PROGRESS_THRESHOLD_MS = 300;

// ---------------------------------------------------------------------------
// Blind mode
// ---------------------------------------------------------------------------

// Blind mode needs at least this many plugged elements on the current brief.
// Dropping one element from a two-element brief is too easy to be a test.
export const BLIND_MIN_PLUGGED = 3;

// Similarity (0–1) between a blind run and its parent at or above which the app
// reports "no visible difference" instead of a hit or a miss. Similarity is the
// share of words the two outputs have in common (see js/similarity.js).
// Raise it to make "no visible difference" rarer; lower it to make it more common.
export const BLIND_NO_DIFFERENCE_THRESHOLD = 0.85;

// The confidence choices offered after a blind run, in display order.
export const CONFIDENCE_LEVELS = ['Low', 'Medium', 'High'];

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

// localStorage key for the tree and sessionStorage key for the API key.
export const STORAGE_KEY_TREE = 'brief-lab.tree.v1';
export const STORAGE_KEY_SETTINGS = 'brief-lab.settings.v1';
export const STORAGE_KEY_API_KEY = 'brief-lab.api-key';
export const STORAGE_KEY_MODE = 'brief-lab.mode.v1';
// The unsaved field (element text, plugs, prediction), so a reload does not lose typing.
export const STORAGE_KEY_DRAFT = 'brief-lab.draft.v1';
// Walkthrough progress: which stop the student is on and which run each stop produced.
export const STORAGE_KEY_WALKTHROUGH = 'brief-lab.walkthrough.v1';

// Every key the app writes starts with this; "Clear everything" removes them all.
export const STORAGE_PREFIX = 'brief-lab.';

// When the saved tree grows past this many bytes the app warns and suggests export.
export const STORAGE_WARN_BYTES = 2 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Text estimates
// ---------------------------------------------------------------------------

// Rough token estimate: one token per this many characters of English text.
// It is an estimate for the student's orientation, not a bill.
export const CHARS_PER_TOKEN = 4;

// ---------------------------------------------------------------------------
// Data files
// ---------------------------------------------------------------------------

// The built-in walkthrough task and the recorded runs Ward generates with the app.
export const WALKTHROUGH_TASK_URL = 'data/walkthrough.json';
export const WALKTHROUGH_RECORDED_URL = 'data/walkthrough-recorded.json';

// Version stamp written into every export so a future import can tell what it is reading.
export const EXPORT_FORMAT_VERSION = 1;
