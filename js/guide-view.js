// Brief Lab — guide-view.js
// "How to use Brief Lab": an in-app guide for students who arrive with no one beside them.
// A button in the top bar opens it any time; it also opens by itself on the first visit.
// All of its words live in copy.js (GUIDE).

import { GUIDE } from './copy.js';
import { STORAGE_KEY_GUIDE_SEEN } from './constants.js';
import { el, show } from './dom.js';
import { local } from './storage.js';

export function mountGuide({ panel, body, actions, title, button }) {
  let opener = null;
  title.textContent = GUIDE.title;
  button.textContent = GUIDE.button;

  function render() {
    const parts = [el('p', { class: 'guide-lead', text: GUIDE.lead })];
    for (const section of GUIDE.sections) {
      parts.push(el('h3', { text: section.title }));
      for (const p of section.paragraphs || []) parts.push(el('p', { text: p }));
      if (section.steps) {
        parts.push(el('ol', { class: 'guide-steps' }, section.steps.map((s) => el('li', { text: s }))));
      }
      if (section.table) {
        parts.push(el('table', { class: 'guide-table' }, [
          el('thead', {}, [el('tr', {}, section.table.head.map((h) => el('th', { text: h })))]),
          el('tbody', {}, section.table.rows.map((r) => el('tr', {}, r.map((c) => el('td', { text: c }))))),
        ]));
      }
      if (section.after) parts.push(el('p', { class: 'small muted', text: section.after }));
    }
    body.replaceChildren(...parts);
  }

  function open() {
    opener = document.activeElement;
    render();
    show(panel, true);
    panel.querySelector('button')?.focus();
  }

  function close() {
    if (panel.hasAttribute('hidden')) return;
    show(panel, false);
    local.set(STORAGE_KEY_GUIDE_SEEN, true);
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    opener = null;
  }

  actions.replaceChildren(
    el('button', { type: 'button', class: 'button', text: GUIDE.close, onclick: close }),
  );
  button.addEventListener('click', open);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hasAttribute('hidden')) close();
  });

  // First visit: open the guide once. Closing it remembers that in this browser.
  function openIfFirstVisit() {
    if (!local.get(STORAGE_KEY_GUIDE_SEEN, false)) open();
  }

  return { open, close, openIfFirstVisit };
}
