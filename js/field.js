// Brief Lab — field.js
// The field: seven element nodes with plugs and wires, the Rules sub-fields, and the
// Brief node at the end of the chain (chips, counts, Prediction, Run).
//
// mountField() builds the DOM once. refresh() updates plug states, chips, counts, and
// wires without rebuilding textareas, so typing never loses focus.

import { ELEMENTS, RULES_FIELDS, isPlugged, hasText, assemble, estimateTokens } from './model.js';
import { ELEMENT_HINTS, RULES_HINTS, FIELD, PROMPT, BLIND, fill } from './copy.js';
import { canRunBlind } from './blind.js';
import { el, svgEl, show } from './dom.js';
import { state, fieldChangedSinceRun, currentRun } from './state.js';

// Extension point (deferred, brief section 9): element libraries. A "save this Persona /
// Rules set for reuse" control would attach to each node's head here and store named
// slots in localStorage; loading one would set state.brief[key] and call onChange.
export function mountField({ host, onChange, onRun }) {
  const views = new Map();

  // ---------- element nodes ----------

  for (const element of ELEMENTS) {
    const view = { element, inputs: {} };

    view.plug = el('button', {
      type: 'button',
      class: 'plug',
      'aria-pressed': 'true',
      'aria-label': `${element.name}: ${FIELD.plugToggle}`,
      text: FIELD.plugged,
      onclick: () => {
        const slot = state.brief[element.key];
        slot.enabled = slot.enabled === false;
        onChange('plug', element.key);
      },
    });

    const head = el('div', { class: 'node-head' }, [
      el('span', { class: 'node-name' }, [
        el('span', { class: 'node-number', text: `${element.number} ·` }),
        element.name,
      ]),
      view.plug,
    ]);

    const hint = el('p', { class: 'node-hint', text: ELEMENT_HINTS[element.key] });
    const body = [];

    if (element.key === 'rules') {
      for (const f of RULES_FIELDS) {
        const id = `node-${element.key}-${f.key}`;
        const textarea = el('textarea', {
          id,
          rows: '2',
          oninput: (e) => {
            state.brief.rules[f.key] = e.target.value;
            onChange('text', element.key);
          },
        });
        view.inputs[f.key] = textarea;
        body.push(
          el('div', { class: 'node-subfield' }, [
            el('label', { for: id }, [f.label + ' ', el('span', { class: 'subhint', text: RULES_HINTS[f.key] })]),
            textarea,
          ]),
        );
      }
    } else {
      const id = `node-${element.key}`;
      const textarea = el('textarea', {
        id,
        rows: '3',
        'aria-label': element.name,
        oninput: (e) => {
          state.brief[element.key].text = e.target.value;
          onChange('text', element.key);
        },
      });
      view.inputs.text = textarea;
      body.push(textarea);
    }

    view.emptyNote = el('p', { class: 'node-empty small muted', text: FIELD.emptyNote, hidden: true });
    view.root = el('section', { class: 'node', 'data-element': element.key, 'aria-label': element.name }, [
      head, hint, ...body, view.emptyNote,
    ]);
    views.set(element.key, view);
  }

  // ---------- the Brief node ----------

  const chips = el('span', { class: 'chips', 'aria-hidden': 'true' });
  const pluggedList = el('p', { class: 'small muted plugged-list' });
  const counts = el('p', { class: 'counts' });
  const predictionInput = el('textarea', {
    id: 'prediction',
    rows: '2',
    oninput: (e) => {
      state.prediction = e.target.value;
      onChange('prediction');
    },
  });
  const changedLine = el('p', { class: 'changed-line small', hidden: true });
  const runButton = el('button', {
    type: 'button',
    class: 'button',
    id: 'btn-run',
    text: FIELD.run,
    onclick: () => onRun('run'),
  });
  const runAgainButton = el('button', {
    type: 'button',
    class: 'button button-secondary',
    id: 'btn-run-again',
    text: FIELD.runAgain,
    title: FIELD.runAgainHint,
    hidden: true,
    onclick: () => onRun('again'),
  });
  const runBlindButton = el('button', {
    type: 'button',
    class: 'button button-secondary',
    id: 'btn-run-blind',
    text: FIELD.runBlind,
    hidden: true,
    onclick: () => onRun('blind'),
  });
  const runRow = el('div', { class: 'run-row' }, [runButton, runAgainButton, runBlindButton]);

  // The mask shown over the field while a blind run's brief is hidden.
  const mask = el('div', { class: 'field-mask', hidden: true }, [
    el('p', { class: 'field-mask-title', text: BLIND.maskTitle }),
    el('p', { text: BLIND.hiddenBrief }),
  ]);

  const assemblerRoot = el('section', { class: 'node node-assembler', 'aria-label': FIELD.assemblerName }, [
    el('div', { class: 'node-head' }, [
      el('span', { class: 'node-name' }, [
        el('span', { class: 'node-number', text: '=' }),
        FIELD.assemblerName,
        ' ',
        chips,
      ]),
    ]),
    el('p', { class: 'node-hint', text: FIELD.assemblerHint }),
    pluggedList,
    counts,
    el('div', { class: 'prediction' }, [
      el('label', { for: 'prediction', text: FIELD.predictionLabel }),
      predictionInput,
      el('p', { class: 'small muted', text: FIELD.predictionHint }),
    ]),
    changedLine,
    runRow,
  ]);

  // ---------- wires ----------

  const wires = svgEl('svg', { class: 'wires', 'aria-label': FIELD.wiresLabel, role: 'img' });

  host.replaceChildren(wires, ...[...views.values()].map((v) => v.root), assemblerRoot, mask);

  function drawWires() {
    const hostRect = host.getBoundingClientRect();
    if (hostRect.width === 0) return;
    wires.setAttribute('width', hostRect.width);
    wires.setAttribute('height', host.scrollHeight);
    wires.setAttribute('viewBox', `0 0 ${hostRect.width} ${host.scrollHeight}`);
    wires.replaceChildren();

    const trunkX = hostRect.width - 12;
    const socketY = (rect) => rect.top - hostRect.top + 22;
    const aRect = assemblerRoot.getBoundingClientRect();
    const aY = socketY(aRect);
    const aX = aRect.right - hostRect.left;

    let topY = aY;
    for (const view of views.values()) {
      const r = view.root.getBoundingClientRect();
      const y = socketY(r);
      const x = r.right - hostRect.left;
      topY = Math.min(topY, y);
      const plugged = isPlugged(state.brief, view.element.key);
      if (plugged) {
        wires.appendChild(svgEl('path', { d: `M${x} ${y} H${trunkX}`, class: 'wire wire-on' }));
      } else {
        wires.appendChild(svgEl('path', { d: `M${x} ${y} h10`, class: 'wire wire-off' }));
        wires.appendChild(svgEl('path', { d: `M${x + 22} ${y} H${trunkX}`, class: 'wire wire-off' }));
      }
      wires.appendChild(svgEl('circle', { cx: x, cy: y, r: 4.5, class: plugged ? 'socket socket-on' : 'socket socket-off' }));
    }
    wires.appendChild(svgEl('path', { d: `M${trunkX} ${topY} V${aY} H${aX}`, class: 'wire wire-trunk' }));
    wires.appendChild(svgEl('circle', { cx: aX, cy: aY, r: 5, class: 'socket socket-brief' }));
  }

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => drawWires());
    for (const v of views.values()) ro.observe(v.root);
    ro.observe(assemblerRoot);
    ro.observe(host);
  }
  window.addEventListener('resize', drawWires);

  // ---------- refresh ----------

  function refresh() {
    for (const view of views.values()) {
      const key = view.element.key;
      const slot = state.brief[key];
      const enabled = slot.enabled !== false;
      const plugged = isPlugged(state.brief, key);
      view.root.classList.toggle('is-unplugged', !plugged);
      view.root.classList.toggle('is-off', !enabled);
      view.plug.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      view.plug.textContent = enabled ? FIELD.plugged : FIELD.unplugged;
      show(view.emptyNote, enabled && !hasText(state.brief, key));
    }

    chips.replaceChildren(
      ...ELEMENTS.map((e) => {
        const plugged = isPlugged(state.brief, e.key);
        return el('span', {
          class: plugged ? 'chip' : 'chip is-hollow',
          title: `${e.name}: ${plugged ? FIELD.plugged : FIELD.unplugged}`,
        });
      }),
    );
    const names = ELEMENTS.filter((e) => isPlugged(state.brief, e.key)).map((e) => e.name);
    pluggedList.textContent = names.length ? fill(FIELD.pluggedList, { list: names.join(', ') }) : FIELD.nothingPlugged;

    const prompt = assemble(state.brief);
    counts.textContent = fill(PROMPT.counts, { chars: prompt.length, tokens: estimateTokens(prompt) });

    const changed = fieldChangedSinceRun();
    if (changed === null) {
      show(changedLine, false);
    } else {
      show(changedLine, true);
      changedLine.textContent = changed ? FIELD.changedSinceLastRun : FIELD.unchangedSinceLastRun;
      changedLine.classList.toggle('is-changed', changed);
    }

    runButton.disabled = state.busy || prompt.length === 0;
    runButton.textContent = state.busy ? FIELD.running : FIELD.run;
    // Run again and Run blind are offered only while the field still matches the current node.
    const cur = currentRun();
    show(runAgainButton, changed === false && !state.masked);
    runAgainButton.disabled = state.busy;
    show(runBlindButton, changed === false && !state.masked);
    const blindOk = Boolean(cur) && canRunBlind(cur.brief);
    runBlindButton.disabled = state.busy || !blindOk;
    runBlindButton.title = blindOk ? BLIND.taskNote : fill(BLIND.tooFew, { n: 3 });

    // While a blind brief is hidden, the field is masked and inert.
    host.classList.toggle('is-masked', Boolean(state.masked));
    show(mask, Boolean(state.masked));
    for (const v of views.values()) v.root.toggleAttribute('inert', Boolean(state.masked));
    assemblerRoot.toggleAttribute('inert', Boolean(state.masked));
    if (state.masked) show(changedLine, false);

    drawWires();
  }

  // Push state.brief and state.prediction into the inputs (after Load, Clear, or Import).
  function syncInputs() {
    for (const view of views.values()) {
      const slot = state.brief[view.element.key];
      if (view.element.key === 'rules') {
        for (const f of RULES_FIELDS) view.inputs[f.key].value = slot[f.key] || '';
      } else {
        view.inputs.text.value = slot.text || '';
      }
    }
    predictionInput.value = state.prediction || '';
    refresh();
  }

  function focusFirstEmpty() {
    for (const view of views.values()) {
      const input = view.inputs.text || view.inputs.do;
      if (input && !input.value.trim()) {
        input.focus();
        return;
      }
    }
  }

  return { refresh, syncInputs, focusFirstEmpty, drawWires };
}
