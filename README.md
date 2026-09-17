# Brief Lab

A static, single-folder web app for building, testing, and reading seven-element briefs.
Built for AIST 6300, Human/AI Communications, in the MS in AI Strategy at Georgia College & State University.

Students assemble a brief from seven elements (Persona, Task, Context, Examples, Rules, Criteria, Steps),
run it against a language model with their own API key, and learn to read the output for the fingerprint
of each element. Every run is filed in a lineage tree. Blind mode drops one element and asks the student
to name it from the output alone. A guided walkthrough builds the framework one element at a time.

No build step. No server. No accounts. Vanilla HTML, CSS, and JavaScript (ES modules).

## Where it is

The current build is published with GitHub Pages at **https://wrisvold.github.io/brief-lab/**.
Every push to `main` updates it within a minute or two. Nothing is stored on the site; each visitor's
runs and key stay in their own browser.

## Hosting

Copy the folder to any static web host. That is the whole deployment.

- The page must be served over `http://` or `https://`, not opened from `file://`, because browsers
  block ES modules and `fetch` of the data files from `file://`. Any static server works. For a local
  check, run `python -m http.server 8765` in the folder and open `http://localhost:8765`.
- On AWS: upload the folder to an S3 bucket with static website hosting (index document `index.html`),
  or put CloudFront in front of it. No server-side code, no environment variables, no build. S3 sets
  the right content types from the file extensions; if you upload another way, make sure `.js` files
  are served as `text/javascript` and `.json` as `application/json`, or the browser refuses them.
- Students' browsers need outbound access to the provider endpoints listed in `js/constants.js`
  (`generativelanguage.googleapis.com` for Gemini, `api.openai.com` for OpenAI, `api.anthropic.com`
  for Claude). Nothing else is contacted.
- Nothing is stored on the server. Runs live in each student's browser (`localStorage`); the API key lives in
  `sessionStorage` and is forgotten when the tab closes.
- Built for current Chrome, Edge, Firefox, and Safari on desktop. Tablets are tolerated; phones are out of scope.

## Folder layout

```
brief-lab/
  index.html          the page shell: three regions, mode indicator, overlays
  styles.css          GCSU Evergreen palette and layout; every color is a CSS variable at the top
  js/
    constants.js      every default, model name, range, and threshold, each with a comment
    copy.js           every word a student can read
    model.js          the seven elements, the brief, the assembler, run snapshots
    main.js           entry point: wires everything together
    provider.js       calls Gemini / OpenAI / Claude from the browser; retries, timeouts, typed errors
    settings.js       the Settings drawer (key in sessionStorage, model list, temperature)
    status.js         renders plain-language status and error blocks
    field.js          the seven nodes, wires, and the Brief node
    tree.js           lineage operations: filing, roots, codes, labels, export/import
    tree-view.js      the tree drawer
    diff.js           word-level diff, text stats, brief and settings diffs
    similarity.js     how alike two outputs are (0-1) and the noise floor
    compare-view.js   the Compare panel
    blind.js          blind mode: drop selection, outcomes, calibration
    blind-view.js     the blind response panel; calibration-view.js the calibration table
    walkthrough.js    the eight stops, the brief per stop, reading and building the recording
    walkthrough-view.js  the stepper
    summary.js        the "Copy lineage summary" formatter
    dom.js, storage.js, state.js   small helpers
  data/
    walkthrough.json           the built-in sample task
    walkthrough-recorded.json  recorded walkthrough runs (you generate this from the app; see below)
  tests/              Node tests for every pure module
  README.md           this file
  STATUS.md           what was done, decisions made along the way, known limitations
```

## Running the tests

Requires Node 20 or newer. From the folder:

```
node --test
```

Every pure module has tests: the assembler (including the exact prompt format), tree operations and
the export/import round trip, diff and similarity, blind selection and outcomes, the walkthrough stops
and recording file, the lineage summary (pinned to a fixed fixture), and the provider layer with a fake
network. The copy tests also check that no student-facing text uses the banned words or the phrase
"prompt engineering," and that every paragraph is under 70 words.

## Changing defaults and model names

Open `js/constants.js`. Every value has a plain-language comment above it. The ones you are most
likely to touch:

- `DEFAULT_PROVIDER`: which provider a student sees first. Claude (`anthropic`), because the classes
  use Claude; Gemini's free tier remains the no-cost option a student can switch to in Settings.
- `PROVIDERS.anthropic.defaultModel` (Claude; Haiku by default), `PROVIDERS.gemini.defaultModel`, and
  `PROVIDERS.openai.defaultModel`: the model name shown before a student picks one. Model names change often, so the Settings drawer has a **List models** button
  that asks the provider for the current names with the student's key; the name field is also free
  text. Change the defaults here when a name is retired, but nothing breaks if you do not.
- `DEFAULT_TEMPERATURE`, `TEMPERATURE_MIN`, `TEMPERATURE_MAX`: the temperature dial.
- `BLIND_NO_DIFFERENCE_THRESHOLD`: the similarity (0 to 1) at or above which a blind round reports
  "no visible difference" instead of a hit or a miss.
- `BLIND_MIN_PLUGGED`: how many plugged elements a node needs before Run blind is offered.
- `RETRY_BACKOFF_SECONDS`: the waits between retries when a provider rate-limits.
- `STORAGE_WARN_BYTES`: when the app warns that the saved tree is getting large.

Save the file and reload the page. No build step.

## Editing copy

Open `js/copy.js`. Every label, hint, explainer, error message, and walkthrough paragraph is a plain
string there. Edit the text between the quotes; leave the names before the colons alone (the code
looks things up by name). Text in curly braces such as `{model}` is filled in by the app; keep it.

Run `node --test` afterwards. The copy tests will tell you if a paragraph has grown past 70 words or
picked up a banned word.

## The sample task

`data/walkthrough.json` holds the walkthrough task: an internal announcement about a hybrid-work policy
change at Harrow & Vance Supply Co., a fictional restaurant-supply distributor in Macon, Georgia. The
company, its people, and its policy are invented. Edit the element text there to change the task; keep
the structure (one entry per element, three sub-fields under `rules`, and `stopOrder`).

## The walkthrough

The stepper adds elements in the order their effect is easiest to see on the sample task (Task,
Context, Rules, Criteria, Persona, Examples, Steps), then runs the full brief again for the noise
floor. The field still shows elements in framework order. The order comes from `stopOrder` in
`data/walkthrough.json`; the stop copy is `WALKTHROUGH.stops` in `js/copy.js`. Progress is kept in
the browser so a reload resumes the same stop; "Start over" restarts from the first stop and keeps the runs
already in the tree. The first visit opens in Walkthrough mode; finishing switches to Free form,
where students work on their own briefs.

## Recording the walkthrough runs

Students who have no key yet can replay a recorded walkthrough. The app ships with
`data/walkthrough-recorded.json` as an empty placeholder, so until you record it, the stepper offers
no replay. Record it with the app itself; do not write outputs by hand.

1. Open the app, put your key in Settings, and switch the mode indicator to **Walkthrough**.
2. Press **Start the walkthrough** and go through all eight stops with **Run this stop** (the last stop is
   Run again). Fill the Prediction box if you want your predictions shown to students.
3. At the last stop, **Run again**, press **Save these runs as the recorded walkthrough (instructor)**. The browser downloads
   `walkthrough-recorded.json`, built from the eight live runs of this walkthrough (provider, model,
   date, temperature, and each stop's output).
4. Replace `data/walkthrough-recorded.json` in the hosted folder with the download.

Every replayed output is labelled "Recorded run · model · date — not live". Recorded runs are never
mixed into the calibration record or into the noise floor of live runs, and any stop can be re-run
live with **Replay live with my key**. To re-record after a model change, repeat the steps; the
button is enabled only when all eight stops have live runs.

## Export, import, and the lineage summary

In the tree drawer:

- **Export tree** downloads every run, including hidden blind rounds with their dropped element, as
  `brief-lab-tree-YYYY-MM-DD.json`. The file is for the student's own records and for you, not for
  classmates.
- **Import tree** replaces the working tree with a file exported earlier (it asks first if runs exist).
- **Copy lineage summary** puts a plain-text block on the clipboard for pasting into an assignment:
  a header with date and settings, each root with the first line of its Task, one line per node
  (code, chips in framework order, what changed, word count, similarity to parent), predictions, blind
  rounds with the call and outcome, criteria checks, and totals. If the clipboard is blocked, the
  text opens in a panel to copy by hand.

Manual check of the round trip (also covered by a test on a fixture): make a few runs, press Export
tree, press Clear everything, press Import tree and choose the file. The tree, the current node, notes,
ticks, and blind rounds come back exactly; Copy lineage summary produces the same text as before.

## Clearing student storage

Students can press "Clear everything" in the footer. It deletes the saved tree, the field draft,
walkthrough progress, and settings from `localStorage` and forgets the key. To do it by hand: open the
browser's developer tools, go to Application (Chrome, Edge) or Storage (Firefox, Safari), and delete
the entries whose names start with `brief-lab.`.

## Known limitations

- Phone screens are out of scope. The layout is built for desktop and tolerates tablets.
- One working tree per browser. Export to keep more than one; import to bring one back.
- A provider that blocks direct browser calls (CORS) cannot be used; the app reports it rather than
  route through a server. Gemini and OpenAI both allow direct calls today.
- Free-tier providers may use what students send to train models. The Settings panel says so.
- Similarity is word overlap, not meaning. Two outputs that say the same thing in different words
  score lower than a reader would judge; the noise-floor note exists so students calibrate against that.
- Some OpenAI reasoning models reject a temperature other than 1; the app shows the provider's
  sentence and suggests setting temperature to 1 or changing the model.
