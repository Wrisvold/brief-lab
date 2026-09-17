// Brief Lab — compare-view.js
// The Compare panel: two nodes side by side in the order the brief asks for:
// 1 brief diff, 2 settings diff, 3 output diff with stats, 4 noise-floor note
// (or the offer to Run again), 5 predictions.

import { COMPARE, FIELD, BLIND, fill } from './copy.js';
import { el, show } from './dom.js';
import { state } from './state.js';
import { byId, codeOf, parentOf, sameBriefGroup } from './tree.js';
import { briefDiff, settingsDiff, diffWords, textStats, BREAK } from './diff.js';
import { noiseFloor } from './similarity.js';
import { labelText, chipsFor } from './tree-view.js';

// Diff runs -> a fragment with .diff-added / .diff-removed spans. Paragraph breaks become <br>.
export function renderDiffRuns(runs) {
  const frag = document.createDocumentFragment();
  for (const run of runs) {
    const parts = [];
    let words = [];
    const flush = () => {
      if (words.length) {
        parts.push(words.join(' '));
        words = [];
      }
    };
    for (const token of run.tokens) {
      if (token === BREAK) {
        flush();
        parts.push(el('br'));
      } else {
        words.push(token);
      }
    }
    flush();
    const children = [];
    for (const p of parts) {
      if (typeof p === 'string') children.push(p + ' ');
      else children.push(p);
    }
    if (run.type === 'equal') {
      for (const c of children) frag.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    } else {
      frag.appendChild(el('span', { class: run.type === 'added' ? 'diff-added' : 'diff-removed' }, children));
    }
  }
  return frag;
}

// "Criteria checks on A1: 4 of 5 met (unmet: ...)" or null when the run has no checks.
function criteriaLine(run, code) {
  const checks = Array.isArray(run.criteriaChecks) ? run.criteriaChecks : null;
  if (!checks || checks.length === 0) return null;
  const met = checks.filter((c) => c.met).length;
  const unmet = checks.filter((c) => !c.met).map((c) => `“${c.criterion}”`);
  const text = fill(COMPARE.criteriaLine, { code, met, total: checks.length })
    + (unmet.length ? fill(COMPARE.criteriaUnmet, { list: unmet.join(', ') }) : '');
  return el('p', { class: 'small', text: text });
}

export function mountCompare({ panel, body, actions, onRunAgain, onClose }) {
  let leftId = null;
  let rightId = null;

  actions.replaceChildren(
    el('button', { type: 'button', class: 'button button-quiet button-small', text: COMPARE.close, onclick: () => close() }),
  );

  function optionLabel(run) {
    return `${codeOf(state.runs, run)} · ${labelText(state.runs, run)}`;
  }

  function picker(labelText_, value, onPick) {
    const select = el('select', { 'aria-label': labelText_ });
    for (const run of state.runs) select.appendChild(el('option', { value: run.id, text: optionLabel(run) }));
    select.value = value || '';
    select.addEventListener('change', () => onPick(select.value));
    return el('label', { class: 'compare-pick' }, [el('span', { text: labelText_ }), select]);
  }

  function section(title, children) {
    return el('section', { class: 'compare-section' }, [el('h3', { text: title }), ...children]);
  }

  function statusWord(status) {
    return {
      plugged: COMPARE.statusPlugged,
      unplugged: COMPARE.statusUnplugged,
      edited: COMPARE.statusEdited,
      same: COMPARE.statusSame,
      absent: COMPARE.statusAbsent,
    }[status] || '';
  }

  function render() {
    const left = byId(state.runs, leftId);
    const right = byId(state.runs, rightId);
    const head = el('div', { class: 'compare-head' }, [
      picker(COMPARE.pickLeft, leftId, (id) => { leftId = id; render(); }),
      picker(COMPARE.pickRight, rightId, (id) => { rightId = id; render(); }),
    ]);
    if (!left || !right) {
      body.replaceChildren(head);
      return;
    }
    if (left === right) {
      body.replaceChildren(head, el('p', { class: 'muted', text: COMPARE.sameNode }));
      return;
    }
    const lCode = codeOf(state.runs, left);
    const rCode = codeOf(state.runs, right);
    const hidden = (run) => Boolean(run.blind && !run.blind.revealed);

    // 1. Brief diff
    const briefRows = [];
    if (hidden(left) || hidden(right)) {
      briefRows.push(el('p', { class: 'muted', text: BLIND.hiddenBrief }));
    } else {
      const d = briefDiff(left.brief, right.brief);
      briefRows.push(
        el('div', { class: 'compare-chips' }, [
          el('span', {}, [el('strong', { text: lCode + ' ' }), chipsFor(left.brief)]),
          el('span', {}, [el('strong', { text: rCode + ' ' }), chipsFor(right.brief)]),
        ]),
      );
      const changed = d.filter((x) => x.status !== 'same' && x.status !== 'absent');
      if (changed.length === 0) briefRows.push(el('p', { class: 'muted', text: COMPARE.noBriefChange }));
      const droppedKey = (run) => (run.blind && run.blind.revealed ? run.blind.droppedElement : null);
      const droppedKeys = new Set([droppedKey(left), droppedKey(right)].filter(Boolean));
      for (const x of d) {
        if (x.status === 'absent' && !droppedKeys.has(x.key)) continue;
        const isDropped = droppedKeys.has(x.key);
        const row = el('div', { class: `compare-element is-${x.status}${isDropped ? ' is-dropped' : ''}` }, [
          el('div', { class: 'compare-element-head' }, [
            el('strong', { text: x.name }),
            el('span', { class: 'muted small', text: ` · ${statusWord(x.status)}` }),
            isDropped ? el('span', { class: 'dropped-mark', text: ` · ${BLIND.droppedMark}` }) : null,
          ]),
        ]);
        if (x.status === 'edited') {
          row.appendChild(el('div', { class: 'mono compare-text' }, [renderDiffRuns(x.diff)]));
        } else if (x.status === 'plugged') {
          row.appendChild(el('div', { class: 'mono compare-text' }, [el('span', { class: 'diff-added', text: x.rightText })]));
        } else if (x.status === 'unplugged') {
          row.appendChild(el('div', { class: 'mono compare-text' }, [el('span', { class: 'diff-removed', text: x.leftText })]));
        }
        briefRows.push(row);
      }
    }

    // 2. Settings diff
    const sd = settingsDiff(left.settings, right.settings);
    const settingsRows = sd.length === 0
      ? [el('p', { class: 'muted', text: COMPARE.noSettingsChange })]
      : [el('ul', { class: 'compare-settings' }, sd.map((s) => el('li', {}, [
          el('strong', { text: s.label + ': ' }),
          el('span', { class: 'diff-removed', text: s.left }),
          ' → ',
          el('span', { class: 'diff-added', text: s.right }),
        ])))];

    // 3. Output diff with stats
    const ls = textStats(left.output);
    const rs = textStats(right.output);
    const outputRows = [
      el('div', { class: 'compare-stats' }, [
        el('span', {}, [el('strong', { text: lCode + ': ' }), fill(COMPARE.stats, ls)]),
        el('span', {}, [el('strong', { text: rCode + ': ' }), fill(COMPARE.stats, rs)]),
      ]),
      ...[[left, lCode], [right, rCode]].map(([run, code]) => criteriaLine(run, code)).filter(Boolean),
      el('p', { class: 'small muted', text: COMPARE.legend }),
      el('div', { class: 'mono compare-text compare-output' }, [renderDiffRuns(diffWords(left.output, right.output))]),
    ];

    // 4. Noise floor
    const groupR = sameBriefGroup(state.runs, right);
    const groupL = sameBriefGroup(state.runs, left);
    const group = groupR.length >= 2 ? groupR : groupL.length >= 2 ? groupL : null;
    const noiseRows = [];
    if (group) {
      const nf = noiseFloor(group.map((r) => r.output));
      noiseRows.push(
        el('p', { class: 'gold-mark', text: fill(COMPARE.noiseFloorNote, { percent: nf.percent }) }),
        el('p', { class: 'small muted', text: fill(COMPARE.noiseFloorRuns, { runs: nf.runs }) }),
      );
    } else {
      noiseRows.push(
        el('p', { text: COMPARE.runAgainOffer }),
        el('button', {
          type: 'button',
          class: 'button button-secondary',
          text: `${FIELD.runAgain} · ${rCode}`,
          disabled: state.busy || Boolean(right.recorded),
          onclick: () => onRunAgain(right),
        }),
      );
    }

    // 5. Predictions
    const predictionRows = [];
    for (const [run, code] of [[left, lCode], [right, rCode]]) {
      if (run.prediction) {
        predictionRows.push(el('div', { class: 'compare-prediction' }, [
          el('strong', { text: fill(COMPARE.predictionOf, { code }) }),
          el('p', { text: run.prediction }),
        ]));
      }
    }
    if (predictionRows.length === 0) predictionRows.push(el('p', { class: 'muted', text: COMPARE.noPrediction }));

    body.replaceChildren(
      head,
      section(COMPARE.briefDiff, briefRows),
      section(COMPARE.settingsDiff, settingsRows),
      section(COMPARE.outputDiff, outputRows),
      section(COMPARE.noiseFloor, noiseRows),
      section(COMPARE.predictions, predictionRows),
    );
  }

  let opener = null;

  function open(left, right) {
    leftId = left ? left.id : null;
    rightId = right ? right.id : null;
    opener = document.activeElement;
    render();
    show(panel, true);
    panel.querySelector('button, select')?.focus();
  }

  function close() {
    if (panel.hasAttribute('hidden')) return;
    show(panel, false);
    // Return focus to where the student was (keyboard users lose their place otherwise).
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    opener = null;
    if (onClose) onClose();
  }

  // Re-render if open (after a new run lands, for example).
  function refresh() {
    if (!panel.hasAttribute('hidden')) render();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hasAttribute('hidden')) close();
  });

  return { open, close, refresh, isOpen: () => !panel.hasAttribute('hidden') };
}

// Default pair for a node: its parent on the left, the node on the right.
// A node with no parent compares against the current node, or the previous run.
export function defaultPair(runs, run) {
  const parent = parentOf(runs, run);
  if (parent) return [parent, run];
  const other = runs.find((r) => r.id === state.currentRunId && r !== run) || runs.find((r) => r !== run) || null;
  return [other, run];
}
