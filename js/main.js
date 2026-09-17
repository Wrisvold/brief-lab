// Brief Lab — main.js
// Entry point. Phase 0: fills the page shell from copy.js and shows the seven element
// nodes as read-only placeholders. Phase 1 replaces the placeholders with the live field.

import { APP, ELEMENT_HINTS, RULES_HINTS, EXPLAINERS, FIELD, PROMPT, OUTPUT, TREE, COMPARE, SETTINGS, FOOTER } from './copy.js';
import { ELEMENTS, RULES_FIELDS } from './model.js';

// ---------- tiny DOM helpers (no innerHTML with model text, ever) ----------

function $(id) {
  return document.getElementById(id);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function setText(id, text) {
  const node = $(id);
  if (node) node.textContent = text;
}

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
  setText('prompt-text', PROMPT.empty);
  setText('output-text', OUTPUT.empty);
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

// ---------- field placeholders (Phase 0) ----------

function renderNodePlaceholder(element) {
  const head = el('div', { class: 'node-head' }, [
    el('span', { class: 'node-name' }, [
      el('span', { class: 'node-number', text: `${element.number} ·` }),
      element.name,
    ]),
    el('button', { type: 'button', class: 'plug', 'aria-pressed': 'true', text: FIELD.plugged }),
  ]);
  const hint = el('p', { class: 'node-hint', text: ELEMENT_HINTS[element.key] });
  const body = [];
  if (element.key === 'rules') {
    for (const f of RULES_FIELDS) {
      const id = `node-${element.key}-${f.key}`;
      body.push(
        el('div', { class: 'node-subfield' }, [
          el('label', { for: id }, [f.label + ' ', el('span', { class: 'subhint', text: RULES_HINTS[f.key] })]),
          el('textarea', { id, rows: '2', 'aria-label': `${element.name}: ${f.label}` }),
        ]),
      );
    }
  } else {
    body.push(el('textarea', { id: `node-${element.key}`, rows: '3', 'aria-label': element.name }));
  }
  return el('section', { class: 'node', 'data-element': element.key }, [head, hint, ...body]);
}

function renderField() {
  const host = $('field-nodes');
  host.replaceChildren(...ELEMENTS.map(renderNodePlaceholder));
}

// ---------- start ----------

renderShell();
renderField();
