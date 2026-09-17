// Brief Lab — calibration-view.js
// The calibration record: per element, how often it was dropped, identified, or made no
// visible difference; plus one line on high-confidence calls. A table, not a score.

import { CALIBRATION, fill } from './copy.js';
import { el, show } from './dom.js';
import { state } from './state.js';
import { calibration } from './blind.js';

export function mountCalibration({ panel, body, actions, title }) {
  title.textContent = CALIBRATION.title;
  actions.replaceChildren(
    el('button', { type: 'button', class: 'button button-quiet button-small', text: CALIBRATION.close, onclick: () => close() }),
  );

  function render() {
    const c = calibration(state.runs);
    const children = [el('p', { text: CALIBRATION.intro })];
    if (c.elements.length === 0) {
      children.push(el('p', { class: 'muted', text: CALIBRATION.empty }));
    } else {
      children.push(
        el('table', { class: 'calibration-table' }, [
          el('thead', {}, [
            el('tr', {}, [
              el('th', { text: CALIBRATION.element }),
              el('th', { class: 'num', text: CALIBRATION.dropped }),
              el('th', { class: 'num', text: CALIBRATION.identified }),
              el('th', { class: 'num', text: CALIBRATION.missed }),
              el('th', { class: 'num', text: CALIBRATION.noDifference }),
            ]),
          ]),
          el('tbody', {}, c.elements.map((row) =>
            el('tr', {}, [
              el('td', { text: row.name }),
              el('td', { class: 'num', text: String(row.dropped) }),
              el('td', { class: 'num', text: String(row.identified) }),
              el('td', { class: 'num', text: String(row.missed) }),
              el('td', { class: 'num', text: String(row.noDifference) }),
            ]))),
        ]),
      );
      const high = c.byConfidence.High || { right: 0, wrong: 0 };
      const total = high.right + high.wrong;
      children.push(el('p', { text: total > 0 ? fill(CALIBRATION.byConfidence, { right: high.right, total }) : CALIBRATION.byConfidenceNone }));
      children.push(el('p', { class: 'small muted', text: fill(CALIBRATION.rounds, { n: c.rounds }) }));
    }
    children.push(el('p', { class: 'small muted', text: CALIBRATION.recordedNote }));
    body.replaceChildren(...children);
  }

  function open() {
    render();
    show(panel, true);
    panel.querySelector('button')?.focus();
  }

  function close() {
    show(panel, false);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hasAttribute('hidden')) close();
  });

  return { open, close };
}
