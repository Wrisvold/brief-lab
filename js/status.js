// Brief Lab — status.js
// Renders a status block (title, message, next step) and turns a ProviderError into
// the matching plain-language entry from copy.js. Nothing raw ever reaches the page.

import { ERRORS, fill } from './copy.js';
import { el } from './dom.js';

// entry: { title, message?, next? }. values fill {placeholders}. kind: info | warn | error.
// busy adds the moving progress bar for anything that takes a while.
export function renderStatus(host, entry, values = {}, kind = 'info', busy = false) {
  if (!host) return;
  if (!entry) {
    host.className = 'status';
    host.replaceChildren();
    return;
  }
  host.className = `status status-${kind}${busy ? ' is-busy' : ''}`;
  host.replaceChildren(...[
    el('p', { class: 'status-title', text: fill(entry.title, values) }),
    entry.message ? el('p', { text: fill(entry.message, values) }) : null,
    entry.next ? el('p', { class: 'status-next', text: fill(entry.next, values) }) : null,
  ].filter(Boolean));
}

// [entry, values] for any error. Unknown errors become ERRORS.unexpected.
export function errorEntry(err) {
  const kind = err && err.kind && ERRORS[err.kind] ? err.kind : 'unexpected';
  const base = ERRORS[kind];
  const values = { detail: '', ...(err && err.values ? err.values : {}) };
  if (kind === 'badRequest' || kind === 'unexpected') {
    values.detail = err && err.detail ? err.detail : '';
    if (!values.detail) {
      return [{ title: base.title, message: kind === 'badRequest' ? '' : base.message, next: base.next }, values];
    }
  }
  if (err && err.gaveUp && base.gaveUp) {
    return [{ title: base.title, message: base.gaveUp, next: '' }, values];
  }
  return [base, values];
}
