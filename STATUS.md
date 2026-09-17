# STATUS

Kept current at the end of each phase. Newest phase first.

## Phase 1 — The field (done 2026-09-17)

### Done
- `js/field.js`: seven element nodes built once, updated in place (typing never loses focus). Each node
  has its name, hint, text area, and a plug toggle; the Rules node has its three labelled sub-fields.
  Unplugged nodes show a dashed border, an "Unplugged" label, and stay editable with text preserved.
  An element that is plugged but empty shows "Empty. Counts as unplugged."
- Wires: an SVG overlay draws a wire from each node's socket to a trunk that feeds the Brief node.
  Unplugging visibly breaks the wire (dashed, with a gap) and hollows the socket. Redrawn on resize and
  when a text area is resized.
- The Brief node at the end of the chain: seven chips in framework order (filled or hollow), the plugged
  list, character count and token estimate, the Prediction field with its label and hint, the
  "changed since last run" line (appears once a node is loaded, Phase 3), and Run.
- The Assembled brief panel in the output column shows the live monospace prompt with a Copy button.
- Load a task menu: "Load the walkthrough task" (fetches `data/walkthrough.json`) and "Start blank".
  Asks before replacing a non-empty field.
- Draft persistence: the field (text, plugs, prediction) is saved to `localStorage` while typing and
  restored on reload. Clear everything wipes every `brief-lab.` key and resets the field.
- Mode indicator toggles and remembers Walkthrough / Free; Settings drawer opens and closes (body arrives
  in Phase 2). Run currently shows the "No API key yet" message, which stays correct in Phase 2.
- `js/dom.js` (element builder, no innerHTML), `js/storage.js` (try/catch wrappers), `js/state.js`.
- `briefFromTask()` and `briefHasAnyText()` in `model.js`, with tests. 28 tests pass.

### Decisions made on my own (say if any is wrong)
1. **Where the full prompt text lives.** The Brief node on the field carries the chips, counts,
   Prediction, and Run; the full monospace prompt sits in the "Assembled brief" panel at the top of
   the output column, right beside the field. Showing the full text twice felt wasteful.
2. **Nodes stack top-to-bottom** with the wire trunk on the right, rather than left-to-right. Seven
   text areas in a row would not be readable.
3. **Free is the first-visit default** until the walkthrough exists. Phase 5 switches the first
   visit to Walkthrough, as the brief asks.
4. **The draft is saved** to `localStorage` (key `brief-lab.draft.v1`) so a reload does not lose typing.
   The brief only mentions the tree; this seemed like the same intent.

### Model names (your answer to Phase 0 question 1)
Phase 2 will fetch the live model list from the provider with the student's key and offer it as a
pick-list next to the editable name field, so the names in `constants.js` are only a first guess.

### Next
- Phase 2: the provider layer (Settings body, key handling, model list, Test connection, Run against
  Gemini and OpenAI, the error set with retry/backoff and countdown, progress states).

## Phase 0 — Scaffold and the sample task (done 2026-09-17)

### Done
- Folder structure: `index.html`, `styles.css`, `js/`, `data/`, `tests/`, `README.md`, `STATUS.md`.
- `index.html`: the three regions (field, output column with assembled brief above output, tree drawer),
  the mode indicator (Walkthrough / Free), Settings button, Compare overlay and Settings drawer shells,
  footer with Clear everything. Regions each carry a collapsible "What is happening here" panel.
- `styles.css`: GCSU Evergreen palette and the two diff signal colors as CSS variables; serif headings,
  system sans body, monospace for prompt and output; no web fonts. Unplugged-node style uses a dashed
  border and a text label, not color alone.
- `js/constants.js`: every default, model name, range, and threshold, each with a comment.
- `js/copy.js`: all student-facing text, drafted (not placeholders): element hints, six explainers, key-entry
  copy, the full error set, field/tree/compare/blind/calibration labels, eight walkthrough stops.
- `js/model.js`: the seven elements, brief, deep copy, plug logic, the assembler, token estimate, run
  snapshots, criteria splitter. 19 tests in `tests/model.test.js`, including the exact fixture format.
- `tests/copy.test.js`: banned-word check, "prompt engineering" check, 70-word paragraph check, over every
  string in `copy.js` and `data/walkthrough.json`.
- `data/walkthrough.json`: the sample task (Harrow & Vance Supply Co., Hybrid Work Standard). Delivered
  for Ward's review; see the questions below.
- `js/main.js`: fills the shell from copy and shows the seven nodes as placeholders so the page renders.

### Decisions made on my own (say if any is wrong)
1. **Assembled-prompt line format.** Elements are separated by a single newline (as in the brief's fixture,
   no blank lines). A multi-line element continues with two-space indentation under its heading. Examples
   always puts its text on the lines below the heading. Rules sub-fields indent two spaces; their own
   continuation lines indent four.
2. **Rules storage.** The Rules slot stores `do`, `dont`, `fallback` and no `text`; a helper joins them for
   emptiness checks and diffs. The three headings sent to the model are `Do:`, `Don't:`, `If you can't:`.
3. **`package.json` and `tests/`.** Added a minimal `package.json` (`"type": "module"` so Node can run the
   ES-module tests, and a `test` script). It is not a build step and has no dependencies. Tests live in
   `tests/` rather than beside the modules so the hosted folder stays clean.
4. **Run snapshot extras.** Added `sameBriefAs`, `recorded`, and `note` to the run object so same-brief
   siblings, recorded replays, and student notes have a home. `maxOutputTokens` rides in `settings`.
5. **Explainer copy drafted now** rather than left as placeholders, since the tests were cheap to add at
   the same time. Phase 6 will still do the final pass.
6. **Default model names** are `gemini-2.5-flash` and `gpt-4o-mini`. See question 1.

### Questions for Ward
1. Default model names: what does the 5530 notebook use today? I have put names I am confident exist,
   but the brief's example mentions a newer Gemini name. Whatever you give me goes in `constants.js`.
2. The sample task: is Harrow & Vance Supply Co. (Macon, restaurant supply, 340 staff, hybrid standard
   starting Monday 12 January 2027, Tuesday–Thursday on site, $60 stipend, 14 out-of-state remote hires
   left undecided) the right texture? Anything to change before I build the walkthrough on it?
3. Assembled prompt: single newlines between elements (as the fixture shows), or a blank line between
   elements for readability? Single newline is what is built and tested.
4. Temperature dial: the brief says 0–1. Both providers accept up to 2. Keep 0–1?

### Next
- Phase 1: the live field (plugs, wires, Rules sub-fields, live assembled brief with counts, Prediction
  field, changed-since-last-run state, Load a task / Start blank).
