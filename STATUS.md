# STATUS

Kept current at the end of each phase. Newest phase first.

## Phase 4 — Blind mode and the criteria checklist (done 2026-09-17)

### Done
- `js/blind.js` (pure, 6 tests): candidates = plugged set minus Task; `canRunBlind` (at least
  `BLIND_MIN_PLUGGED` plugged and something droppable); `chooseDrop` uniform over candidates with an
  injectable random (tested: never Task, never an unplugged element, every candidate reachable);
  `dropElement` (copy with one element unplugged, text kept); `outcomeOf` (no visible difference at or
  above the threshold whatever the call, else identified or missed); `calibration` (per element
  dropped / identified / missed / no-difference, accuracy by confidence with no-difference rounds left
  out of the denominator, unrevealed and recorded rounds excluded). 72 tests pass in all.
- **Run blind** on the field, shown beside Run again while the field matches the current node, enabled
  when the current node has three or more plugged elements. It clones the current node's brief, drops
  the drawn element, runs with the node's settings, files the child with `blind.droppedElement`, and
  hides the brief: the field shows the parent's brief blurred behind a "Brief hidden" mask and is
  inert; the Assembled brief panel and the criteria checklist are hidden too (the checklist would give
  away whether Criteria is plugged); the tree shows the node with hidden chips and "blind · unrevealed".
- Response panel under the output (`js/blind-view.js`): the question, the parent's candidates as
  radio choices, the Task note, Low / Medium / High, an optional one-line reason, **File your call**
  (enabled only with an element and a confidence; "Filing is final"), then **Reveal**, then the outcome
  block: what was dropped, the call, similarity vs threshold, and one of the three statements. The
  replay note says a second blind run may draw the same element.
- Reveal unmasks the field with the blind brief loaded (dropped element unplugged), re-labels the node
  "blind · revealed", and opens Compare against the parent with the dropped element's row outlined in
  gold and marked "dropped in this blind round".
- **Calibration record** from the tree drawer (disabled mid-round): a table per element plus the
  high-confidence line and the rounds counted. No totals, no score.
- **Criteria checklist**: when the current run's brief has a plugged Criteria element, each line or
  bullet is a checkbox under the output; ticks are stored on the run (`criteriaChecks`) and Compare
  shows "Criteria checks on A1: 4 of 5 met (unmet: ...)" per side. The rewrite-it line sits under
  the list.
- Reloading mid-round restores the mask (the current node is a hidden blind run, so the field shows
  the parent's brief).
- Checked in the browser with a seeded blind child (similarity 0.93): mask, panel, file, reveal with
  the no-visible-difference outcome despite a wrong call, Compare highlight, tree label, checklist
  ticks persisted, calibration table.

### Decisions made on my own (say if any is wrong)
1. **Blind runs need a current node** with output; a round always compares against that parent. The
   button is offered only while the field still matches the node (same rule as Run again).
2. **The mask shows the parent's brief blurred**, not a blank field, so the student keeps the context
   of what was on the field before the drop. Text is unreadable and the nodes are inert.
3. **Loading a hidden node from the tree** keeps the secret: the field masks and the response panel
   returns. Compare with a hidden node shows the outputs but replaces the brief diff with the
   hidden-brief line.
4. **Accuracy by confidence** excludes no-visible-difference rounds from both numerator and
   denominator, since those rounds are neither right nor wrong.
5. **Criteria ticks are per run**, so a same-brief sibling starts unticked.

### Next
- Phase 5: the walkthrough (stepper, eight stops, recorded-run schema and replay, "Replay live with my
  key", hand-off to Free mode, README instructions for recording).

## Phase 3 — The tree and Compare (done 2026-09-17)

### Done
- `js/tree.js` (pure, 9 tests): filing a run as a child, a fresh root, or a same-brief sibling; root
  groups side by side with letters (A, B, ...) and node codes (A3); nested tree building; computed
  labels (full brief / same brief / – Context, + Steps, edited Rules / same as parent / blind);
  same-brief groups for the noise floor (identical assembled brief and identical provider, model,
  temperature); export `serialize()` and import `deserialize()` with an exact round-trip test and
  validation (format tag, unique ids, dangling parents repaired); migration for runs saved before roots.
- `js/diff.js` (pure): word-level LCS diff that keeps paragraph breaks, `textStats` (words,
  paragraphs, list items), `briefDiff` per element (plugged / unplugged / edited / same / absent, with
  the inline word diff for edited elements, Rules compared as its three labelled sub-fields), and
  `settingsDiff`.
- `js/similarity.js` (pure): Sorensen-Dice overlap of word bags, 0–1, symmetric, 1.0 for identical
  text; `percentDifferent`; `noiseFloor` (mean pairwise similarity across same-brief runs).
  15 diff and similarity tests. 66 tests pass in all.
- Tree drawer (`js/tree-view.js`): root groups with the first line of the Task, nodes indented by
  depth, glyph, code, seven chips, computed label, time, current node in gold with a note field
  (notes are stored on the run and shown in the label), Load on click, a Compare button per node,
  New root and Compare in the drawer header.
- Compare panel (`js/compare-view.js`) over the field, dismissible with Close or Escape, with two
  node pickers (default: parent on the left, node on the right) and the five sections in the §4.6
  order: brief diff with chips side by side, settings diff (e.g. Temperature 0.7 → 0.2), output diff
  with a stats line per side and a colour legend, noise-floor note ("differed by about N%") when either
  node has same-brief siblings or the Run again offer when neither does, and predictions.
- Run again: a same-brief sibling of the current node (same parent, same root, same settings),
  offered on the field only while the field still matches the current node, and from the Compare
  panel. `similarityToParent` is stored on every run with a parent.
- New root (drawer header, and Start blank) clears the field and detaches from the current node, so
  the next Run starts a new top-level group. Nothing is deleted.
- Storage: the tree is saved in the export format under `brief-lab.tree.v1`; a warning appears in the
  drawer past 2 MB, and a different warning if the browser refuses the write. Clear everything closes
  Compare and resets the drawer.
- Checked in the browser with a seeded four-node tree (two roots, one same-brief pair, one child):
  tree layout, load, labels, both noise-floor paths, settings diff, and the brief/output diffs.

### Decisions made on my own (say if any is wrong)
1. **Root groups carry their own id** (`rootId` on every run). A "Run again" sibling of a root-level
   run stays in the same group, matching the tree rows in your brief (A1 and A2 both under Root A).
2. **Same-brief siblings** are any runs anywhere in the tree with the identical assembled brief and
   identical provider, model, and temperature, not only direct siblings. A temperature change breaks
   the group, so the noise floor is never computed across different settings.
3. **Similarity is Sorensen-Dice on word bags** ("the share of words the two outputs have in common,
   counting repeats"). It is explained in one sentence at the top of `similarity.js`.
4. **Default Compare pair** is parent-on-the-left, node-on-the-right; a root-level node is compared
   with the current node (or the previous run) since it has no parent.
5. **Start blank now also detaches** from the current node (same as New root). Loading the walkthrough
   task does not, so a student can branch a loaded node onto the sample task if they choose.
6. **Notes** are limited to 80 characters and appear after the computed label in the row.

### Next
- Phase 4: blind mode (drop selection with tests, hidden nodes, the response panel, File your call,
  reveal with three outcomes, the calibration record) and the criteria checklist.

## Phase 2 — The provider layer (done 2026-09-17)

### Done
- `js/provider.js`: direct browser calls to Gemini and OpenAI with the key in a request header (never a
  URL). Pure, tested pieces: `buildRequest`, `parseResponse`, `classifyError`, `parseModelList`,
  `providerMessage`. `callModel()` adds a timeout and the retry loop: on 429 or a 5xx it waits
  2 / 5 / 10 / 20 s (from `constants.js`), reports a per-second countdown, and gives up after the last
  wait with its own message. Invalid key, unknown model, and bad request never retry.
  16 tests in `tests/provider.test.js` with a fake fetch; 44 tests pass in all.
- Error set, each with title, plain message, and next step (`copy.js` ERRORS): missing key, invalid key
  (401/403, and Gemini's 400 "API key not valid"), unknown model (404, with the provider's model-list
  link), rate limit (with countdown and give-up text), no quota (OpenAI `insufficient_quota`), provider
  busy (5xx), bad request (quotes the provider's one-sentence message, never JSON), network, empty
  response, unexpected. `js/status.js` maps an error to its entry.
- Settings drawer (`js/settings.js`): provider, API key (password field, Show/Hide, Forget key,
  sessionStorage only), the key-entry copy with Get-a-key and model-list links, model name (editable)
  with **List models** (fetches the provider's live list with the key and offers it as a pick-list),
  temperature dial 0–1 with the "Higher = more variation" label, max output length, Test connection.
  Settings (never the key) persist in `localStorage`; the last model used per provider is remembered.
- Run: progress state from click to reply (moving bar, "Waiting for Gemini...", countdown on retry),
  then a run node (`makeRun`) with `parentId` = the node loaded on the field, filed in `state.runs`,
  saved to `localStorage`, and shown as a flat list in the Tree panel (chips, first line of Task,
  time; click to load). Loading a run puts its brief on the field and turns on the "changed since
  last run" line.
- Checked in the browser against the real Gemini endpoint with a bogus key: CORS is fine, and List
  models, Test connection, and Run each show the invalid-key message with no raw error text.
  **Not yet checked with a valid key** (I have none); please run Test connection with yours.

### Decisions made on my own (say if any is wrong)
1. **Model-agnostic Settings.** Per your note, the model name field is free text and "List models"
   pulls the current names from the provider. `constants.js` defaults are only what appears before a
   student lists. Gemini list = models that support `generateContent`; OpenAI list = ids minus
   embeddings, audio, image, moderation, and similar.
2. **OpenAI request** uses `max_completion_tokens` (the current name; `max_tokens` is rejected by newer
   models). If a model rejects `temperature`, the student sees "bad request" with the provider's
   sentence and the suggestion to set temperature to 1.
3. **5xx from the provider** is retried with the same backoff as 429, under its own message.
4. **Test connection** sends the one-line prompt in `constants.js` with a 64-token cap.
5. The browser's own console line for a failed HTTP request ("Failed to load resource: 400") cannot be
   suppressed by page code; nothing the app itself logs.

### Next
- Phase 3: tree operations with tests, the tree drawer, load/branch/revert/new root, Run again and
  same-brief labelling, Compare in the §4.6 order, diff and similarity modules, storage size guard.

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
