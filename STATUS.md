# STATUS

Kept current at the end of each phase. Newest phase first.

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
