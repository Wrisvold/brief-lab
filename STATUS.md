# STATUS

Kept current at the end of each phase. Newest phase first.

## Cross-browser check (2026-09-17)

Run with Playwright from a scratch folder (not part of the repo): the same scripted session in
WebKit 26.6 (Safari's engine, on Windows), Microsoft Edge 153, and Playwright's Firefox build.
The session covers first visit, loading the task, unplugging, Settings, Run without a key, a seeded
tree, Compare, the blind mask and `inert`, the lineage summary, fonts, and the palette.

- **WebKit (Safari engine): all 20 checks pass, no errors** after one fix. The tree row labels
  ("full brief", "– Context", "same brief") had zero width at the drawer's fixed 320 px width in
  every browser: glyph, code, seven chips, and time filled the line and the label was squeezed out.
  Chromium still returned the text to scripts, WebKit did not, which is how it surfaced. Fix: the row's
  flex layout moved from the `<button>` to an inner span, and the label now wraps to a full line of
  its own when less than 120 px is left. Checked visually in WebKit and Edge.
- **Edge 153: all 20 checks pass, no errors.** The only console line was a 404 for `favicon.ico`,
  silenced with an empty icon link in `index.html`.
- **Firefox 156 (the real browser, installed with winget and driven through Selenium): all 20
  checks pass, no errors.** Playwright's own Firefox build would not start on this machine
  ("side-by-side configuration is incorrect", even with the Visual C++ runtime present), so the
  check was re-run against stock Firefox instead, which is the better test anyway. The three-column
  layout, wires, dashed unplugged nodes, Compare, the blind mask, and `inert` all behave as in Edge
  and WebKit. The lineage summary fell back to the text panel because headless Firefox blocks the
  clipboard; that is the designed fallback.

All four target engines (Chromium/Edge, WebKit/Safari, Firefox) have now been checked by script on
Windows. What has not been seen is Safari itself on a Mac; the engine is the same, the shell is not.

Still outstanding: the recorded walkthrough file and a live run with a real key.

## QA pass by John Ledford (merged 2026-09-17)

Branch `fix/qa-pass-2026-09`, four commits, reviewed and fast-forwarded into main. All 82 tests pass.

- `status.js`: null placeholders were passed straight into `replaceChildren`, which rendered the
  text "nullnull" when a status had no message or next line. Now filtered out.
- `styles.css`: the tree row's time and "current" mark no longer shrink and overlap the Compare button.
- `compare-view.js`: the default Compare pair for a run-again node puts the node it was run again
  from on the left, not that node's parent.
- `field.js`: the wire drawing area now always covers the Brief node's right edge.

API-key handling was re-checked at merge time: the key lives in `sessionStorage` only, is never
written to `localStorage`, exports, or the summary, never appears in a URL, is never logged, and is
sent only as a request header to the two hard-coded provider endpoints. Johnny's branch made no
changes there and none were needed.

Since then: Ward ran the app live with a real Gemini key (List models, Test connection, runs, and the
student features all worked), and the Firefox / Safari / Edge engines were checked by script (see
above). The one item still open is the recorded walkthrough file: `data/walkthrough-recorded.json`
is still the empty placeholder until Ward runs all eight stops and presses the instructor save button
(steps in README, "Recording the walkthrough runs"). The separate checklist for John was removed on
2026-09-17 because nothing left on it needs a second person.

## Phase 6 — Export and polish (done 2026-09-17)

### Done
- **Export tree / Import tree** in the tree drawer. Export downloads `brief-lab-tree-YYYY-MM-DD.json`
  (every run, hidden blind rounds included). Import reads a file, validates it, asks before replacing
  a non-empty tree, restores the current node (masked if it was a hidden blind run), and reports the
  count. The exact round trip is tested on a fixture (`tests/tree.test.js`) and the manual check is
  documented in README.
- **Copy lineage summary** (`js/summary.js`, pure, 4 tests pinned to a fixed fixture in
  `tests/fixtures/summary-fixture.js`): header with date and settings, roots with the first Task line,
  per node the code, seven chips in framework order (▒ for a hidden blind brief), the computed label,
  word count, similarity to parent (or to the run-again sibling), settings that differ from the header,
  notes, predictions, blind rounds with the call and outcome, criteria checks, and totals. Copies to the
  clipboard; if the clipboard is blocked (as in some embedded browsers) the text opens in a panel,
  selected. The summary is unchanged by an export/import round trip (tested).
- Explainer and UI copy pass: two unused strings removed; all paragraphs under 70 words, no banned
  words, no "prompt engineering" (`tests/copy.test.js`). 82 tests pass.
- Accessibility: overlays return focus to the control that opened them; chip groups carry the plugged
  list as an accessible label; every control is a real button, select, or input; Escape closes every
  overlay; `:focus-visible` outline on everything; unplugged nodes use a dashed border plus a text
  label, never color alone; gold appears only as a border or background.
  Contrast (WCAG AA, computed): evergreen on white 7.5:1, ink-soft on ice 5.3:1, diff blue on its
  tint 5.6:1, diff red on its tint 4.9:1.
- Extension-point comments for the deferred items (brief §9) in `field.js` (element libraries),
  `blind.js` (weakened-element rounds), `tree.js` (import brief (blind), named trees), `provider.js`
  (two providers side by side, multi-turn).
- README rewritten for hosting, defaults, copy, the sample task, the walkthrough, recording, export /
  import / summary, clearing storage, and known limitations.

### Success criteria (brief §7), as of this build
1. Field with seven nodes, no console errors, no key: **yes** (checked in the in-app Chromium browser).
2. Walkthrough end to end on recorded runs, eight nodes in lineage, every output labelled: **yes**
   (checked with a temporary recording; the shipped file is the empty placeholder until Ward records).
3. Test connection and full-brief Run with a valid Gemini key; prompt matches the fixture: **prompt
   format tested; live call not yet checked** (no key in this session).
4. Unplug + run → child; Compare in order: brief diff, output diff, noise-floor note or offer: **yes**.
5. Run again → same-brief sibling; noise-floor percentage: **yes** (seeded pair).
6. Blind on a four-element brief; three outcomes; no-visible-difference regardless of call; Task never
   dropped: **yes** (tests + seeded browser check).
7. New root creates a second group without deleting the first: **yes**.
8. 404 / 429 / missing key each with their own plain message; 429 countdown and retries: **messages
   and retry loop tested with a fake network; invalid key checked live against Gemini; 404 and 429
   not yet seen live**.
9. Export → clear → import restores exactly: **tested on a fixture; manual check documented**.
10. Copy lineage summary produces the §4.10 content set: **yes** (pinned test).
11. `node --test` passes: **yes, 82 tests**.
12. Copy rules: **yes** (tested).
13. Model name and blind threshold editable on one commented line: **yes** (`constants.js`).

### Not checked by me
- Firefox and Safari. Everything used (ES modules, `inert`, `ResizeObserver`, `<details>`,
  `:focus-visible`, `structuredClone`-free code) is supported in current versions, but I only had a
  Chromium-based browser here. Please open it once in each.
- Any successful provider call, the model list with a real key, the recording download, and the
  Export / Import file dialogs (the embedded browser cannot drive file pickers).

### Decisions made on my own (say if any is wrong)
1. **Import replaces** the working tree rather than merging, since the brief describes one working
   tree plus export/import. Merging would need id conflict rules; named trees are deferred.
2. **The summary header** uses the settings of the most recent live run (or the current settings when
   there are no runs); nodes whose settings differ get a short suffix such as "(temp 0.2)".
3. **Summary similarity for a run-again sibling** is the mean pairwise similarity of its same-brief
   group, shown "to" the node it was run again from.

## Phase 5 — The walkthrough (done 2026-09-17)

### Done
- `js/walkthrough.js` (pure, 6 tests): the stop order from `data/walkthrough.json` (Task, Context,
  Rules, Criteria, Persona, Examples, Steps, then Run again); `briefForStop` (the task file's text for
  every element reached so far, plugged; the rest empty so the field visibly grows); `readRecording`
  (validates the recorded file, ignores empty stops); `buildRecording` (the file from eight runs).
  78 tests pass in all.
- The stepper (`js/walkthrough-view.js`) above the field in Walkthrough mode: eight stop chips
  (done ones ticked, current in evergreen with a gold ring), the stop's paragraph, then **Run this
  stop** (live) or **Replay the recorded run** when the recording has that stop, then the stop's
  "what changed" pointer with **Open Compare** (parent vs. this stop), **Replay live with my key**
  for recorded stops, and **Next stop** / **Finish**. Stop 7 is a Run again of stop 6 (a same-brief
  sibling) and points at the noise-floor note. The Persona stop's copy makes the §1.8 point: what
  changed (tone, address, structure) and what did not (the numbers).
- Entering a stop loads its brief onto the field with the previous stop's run as the parent, so the
  walkthrough builds a real lineage: A1 → A2 → ... → A7, with A8 beside A7 as "same brief".
- Recorded runs: `data/walkthrough-recorded.json` ships as an empty placeholder (schema, eight empty
  stops, a `_readme` line). Replays are filed as runs with `recorded: { model, date }`, labelled
  "Recorded run · model · date — not live" above the output and "recorded ·" in the tree, excluded
  from calibration and from live same-brief groups. **Save these runs as the recorded walkthrough
  (instructor)** at stop 7 downloads the file built from the eight live runs; enabled only when all
  eight are live. README says how.
- Progress (stop, run per stop) is kept in `localStorage`; a reload resumes. **Start over** restarts
  from stop 0 and keeps runs in the tree. **Finish** switches the mode to Free and leaves the field and
  tree as they are. The first visit now opens in Walkthrough; the last mode chosen is remembered.
- Checked in the browser with a temporary filled recording (restored to the placeholder before
  commit): start, eight replays, the field growing one element per stop, eight nodes in the right
  lineage, the recorded label on every output, Finish to Free mode. Live stops need your key.

### Decisions made on my own (say if any is wrong)
1. **The recording is produced by a button in the app**, not by hand-editing an export: at stop 7,
   with eight live runs, "Save these runs as the recorded walkthrough (instructor)" downloads
   `walkthrough-recorded.json`. This keeps the instruction script-free and uses the app's own data.
   The button is visible to students too, but disabled unless all eight stops are live and it only
   downloads a file.
2. **Elements not yet reached are empty**, not pre-filled and unplugged, so the field shows the brief
   growing. The full text arrives one element per stop.
3. **Replaying stop 7** files the recorded run as a same-brief sibling of stop 6, mirroring what
   Run again does live; the noise-floor note then works on recorded pairs too (recorded with
   recorded only).
4. **Stops are reachable out of order only backwards**: a chip is enabled when that stop or the one
   before it has a run. Jumping back reloads that stop's brief with its parent, so a re-run branches
   correctly.

### Next
- Phase 6: export/import controls with the round-trip test, Copy lineage summary with formatter
  tests, explainer copy pass, accessibility and cross-browser checks, final README and STATUS.

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
