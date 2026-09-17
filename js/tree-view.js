// Brief Lab — tree-view.js
// The tree drawer: root groups side by side, nodes indented by depth, chips, computed
// labels, timestamps, the current node in gold, Load on click, Compare per node,
// and a note field on the current node.

import { ELEMENTS, elementByKey, isPlugged } from './model.js';
import { TREE, fill } from './copy.js';
import { el } from './dom.js';
import { state } from './state.js';
import { buildTree, labelFor, codeOf } from './tree.js';

// The label for a node as words, from the computed label data.
export function labelText(runs, run) {
  const base = baseLabel(runs, run);
  return run.recorded ? `${TREE.recorded} · ${base}` : base;
}

function baseLabel(runs, run) {
  const label = labelFor(runs, run);
  switch (label.kind) {
    case 'full': return TREE.fullBrief;
    case 'same': return TREE.sameBrief;
    case 'unchanged': return TREE.unchanged;
    case 'blind': return label.revealed ? TREE.blindRevealed : TREE.blindUnrevealed;
    case 'changes':
      return label.changes
        .map((c) => {
          const name = elementByKey(c.key).name;
          if (c.type === 'minus') return fill(TREE.minus, { element: name });
          if (c.type === 'plus') return fill(TREE.plus, { element: name });
          return fill(TREE.edited, { element: name });
        })
        .join(', ');
    default: return '';
  }
}

// Seven chips in framework order. Screen readers get the plugged list as text.
export function chipsFor(brief, hidden = false) {
  const plugged = ELEMENTS.filter((e) => isPlugged(brief, e.key)).map((e) => e.name);
  const label = hidden ? TREE.blindUnrevealed : (plugged.length ? `${FIELD_PLUGGED_WORD}: ${plugged.join(', ')}` : '');
  return el('span', { class: 'chips', role: 'img', 'aria-label': label },
    ELEMENTS.map((e) => el('span', { class: hidden ? 'chip is-hidden' : isPlugged(brief, e.key) ? 'chip' : 'chip is-hollow' })));
}
const FIELD_PLUGGED_WORD = 'Plugged';

export function timeOf(run) {
  const d = new Date(run.createdAt);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function firstTaskLine(run) {
  const task = (run.brief.task && run.brief.task.text || '').split(/\r?\n/)[0].trim();
  return task || TREE.fullBrief;
}

export function mountTree({ host, onLoad, onCompare, onNote }) {
  function renderNode(node, depth) {
    const { run } = node;
    const isCurrent = run.id === state.currentRunId;
    const hiddenBrief = Boolean(run.blind && !run.blind.revealed);
    const glyph = run.blind ? (run.blind.revealed ? '◑' : '◐') : run.recorded ? '○' : '●';

    const row = el('div', { class: `tree-row${isCurrent ? ' is-current' : ''}`, style: `--depth:${depth}` }, [
      el('button', {
        type: 'button',
        class: 'tree-node',
        'aria-current': isCurrent ? 'true' : null,
        title: TREE.load,
        onclick: () => onLoad(run),
      }, [
        // The flex row lives on an inner span, not on the <button>: WebKit (Safari) gives
        // flex children of a button no width, which hid the labels entirely.
        el('span', { class: 'tree-node-inner' }, [
          el('span', { class: 'tree-glyph', 'aria-hidden': 'true', text: glyph }),
          el('span', { class: 'tree-code', text: codeOf(state.runs, run) }),
          chipsFor(run.brief, hiddenBrief),
          el('span', { class: 'tree-label', text: labelText(state.runs, run) + (run.note ? ` · ${run.note}` : '') }),
          el('span', { class: 'tree-time', text: timeOf(run) }),
          isCurrent ? el('span', { class: 'tree-current-mark', text: TREE.current }) : null,
        ]),
      ]),
      el('button', {
        type: 'button',
        class: 'button button-quiet button-small tree-compare',
        text: TREE.compare,
        onclick: () => onCompare(run),
      }),
    ]);

    const out = [row];
    if (isCurrent) {
      const noteInput = el('input', {
        type: 'text',
        class: 'tree-note',
        'aria-label': TREE.noteLabel,
        placeholder: TREE.notePlaceholder,
        title: TREE.noteHint,
        maxlength: '80',
        onchange: (e) => onNote(run, e.target.value),
      });
      noteInput.value = run.note || '';
      out.push(el('div', { class: 'tree-note-row', style: `--depth:${depth}` }, [noteInput]));
    }
    for (const child of node.children) out.push(...renderNode(child, depth + 1));
    return out;
  }

  function render() {
    if (state.runs.length === 0) {
      host.replaceChildren(el('p', { class: 'muted', text: TREE.empty }));
      return;
    }
    const groups = buildTree(state.runs);
    host.replaceChildren(
      ...groups.map((g) =>
        el('section', { class: 'tree-group', 'aria-label': fill(TREE.rootLabel, { letter: g.letter }) }, [
          el('h3', { class: 'tree-root' }, [
            el('span', { class: 'tree-glyph', 'aria-hidden': 'true', text: '▸' }),
            fill(TREE.rootLabel, { letter: g.letter }),
            ' ',
            el('span', { class: 'tree-root-task', text: `“${firstTaskLine(g.first)}”` }),
          ]),
          ...g.nodes.flatMap((n) => renderNode(n, 0)),
        ]),
      ),
    );
  }

  return { render };
}
