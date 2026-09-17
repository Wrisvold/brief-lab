// Brief Lab — blind-view.js
// The response panel under the output for a blind run: the question, the choices
// (the parent's plugged set minus Task), confidence, an optional reason, File your call,
// then Reveal, then the outcome in one of three forms. No running score anywhere.

import { elementByKey } from './model.js';
import { BLIND, fill } from './copy.js';
import { el, show } from './dom.js';
import { CONFIDENCE_LEVELS, BLIND_NO_DIFFERENCE_THRESHOLD } from './constants.js';
import { blindCandidates, outcomeOf } from './blind.js';
import { codeOf } from './tree.js';
import { state } from './state.js';

export function mountBlind({ panel, onFile, onReveal }) {
  function render(run, parent) {
    if (!run || !run.blind || !parent) {
      show(panel, false);
      panel.replaceChildren();
      return;
    }
    show(panel, true);
    const b = run.blind;
    const children = [el('h3', { text: fill(BLIND.roundOf, { code: codeOf(state.runs, parent) }) })];

    if (!b.revealed && !b.studentCall) {
      // Stage 1: the call.
      let call = null;
      let confidence = null;
      const reason = el('input', { type: 'text', maxlength: '160', placeholder: BLIND.reason, 'aria-label': BLIND.reason });
      const fileButton = el('button', { type: 'button', class: 'button', text: BLIND.fileCall, disabled: true });
      const hint = el('p', { class: 'small muted', text: BLIND.chooseBoth });
      const update = () => {
        fileButton.disabled = !(call && confidence);
        hint.textContent = call && confidence ? BLIND.filingIsFinal : BLIND.chooseBoth;
      };
      const choices = el('ul', { class: 'choice-list', role: 'radiogroup', 'aria-label': BLIND.question },
        blindCandidates(parent.brief).map((key) => {
          const input = el('input', { type: 'radio', name: 'blind-call', value: key });
          input.addEventListener('change', () => { call = key; update(); });
          return el('li', {}, [el('label', {}, [input, elementByKey(key).name])]);
        }));
      const levels = el('ul', { class: 'choice-list', role: 'radiogroup', 'aria-label': BLIND.confidence },
        CONFIDENCE_LEVELS.map((level) => {
          const input = el('input', { type: 'radio', name: 'blind-confidence', value: level });
          input.addEventListener('change', () => { confidence = level; update(); });
          return el('li', {}, [el('label', {}, [input, level])]);
        }));
      fileButton.addEventListener('click', () => {
        if (!(call && confidence)) return;
        onFile(run, { studentCall: call, confidence, reason: reason.value.trim() });
      });
      children.push(
        el('p', { class: 'blind-question', text: BLIND.question }),
        choices,
        el('p', { class: 'small muted', text: BLIND.taskNote }),
        el('p', { text: BLIND.confidence }),
        levels,
        reason,
        el('div', { class: 'run-row' }, [fileButton]),
        hint,
      );
    } else if (!b.revealed) {
      // Stage 2: filed, waiting for the reveal.
      children.push(
        el('p', { text: fill(BLIND.filed, { call: elementByKey(b.studentCall).name, confidence: b.confidence }) }),
        b.reason ? el('p', { class: 'small muted', text: fill(BLIND.reasonShown, { reason: b.reason }) }) : null,
        el('div', { class: 'run-row' }, [
          el('button', { type: 'button', class: 'button', text: BLIND.reveal, onclick: () => onReveal(run) }),
        ]),
      );
    } else {
      // Stage 3: revealed.
      const dropped = elementByKey(b.droppedElement).name;
      const call = b.studentCall ? elementByKey(b.studentCall).name : '';
      const outcome = outcomeOf(run);
      const sim = typeof run.similarityToParent === 'number' ? run.similarityToParent.toFixed(2) : '';
      let outcomeText = '';
      if (outcome === 'noDifference') outcomeText = fill(BLIND.outcomeNoDifference, { element: dropped });
      else if (outcome === 'identified') outcomeText = BLIND.outcomeIdentified;
      else outcomeText = fill(BLIND.outcomeMissed, { dropped, call });
      children.push(
        el('div', { class: 'blind-outcome' }, [
          el('p', { text: fill(BLIND.revealedLine, { element: dropped }) }),
          el('p', { text: fill(BLIND.yourCall, { call, confidence: b.confidence }) }),
          sim ? el('p', { class: 'small muted', text: fill(BLIND.similarityLine, { similarity: sim, threshold: BLIND_NO_DIFFERENCE_THRESHOLD }) }) : null,
          el('p', {}, [el('strong', { text: outcomeText })]),
        ]),
        b.reason ? el('p', { class: 'small muted', text: fill(BLIND.reasonShown, { reason: b.reason }) }) : null,
        el('p', { class: 'small muted', text: BLIND.replayNote }),
      );
    }
    panel.replaceChildren(...children.filter(Boolean));
  }

  return { render };
}
