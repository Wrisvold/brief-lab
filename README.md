# Brief Lab

A static, single-folder web app for building, testing, and reading seven-element briefs.
Built for AIST 6300, Human/AI Communications, in the MS in AI Strategy at Georgia College & State University.

Students assemble a brief from seven elements (Persona, Task, Context, Examples, Rules, Criteria, Steps),
run it against a language model with their own API key, and learn to read the output for the fingerprint
of each element. Every run is filed in a lineage tree. Blind mode drops one element and asks the student
to name it from the output alone.

No build step. No server. No accounts. Vanilla HTML, CSS, and JavaScript (ES modules).

## Hosting

Copy the folder to any static web host. That is the whole deployment.

- The page must be served over `http://` or `https://`, not opened from `file://`, because the browser
  blocks ES modules and `fetch` of the data files from `file://`. Any static server works. For a local
  check, run `npx serve .` or `python -m http.server` in the folder and open the address it prints.
- Students' browsers need outbound access to the provider endpoints listed in `js/constants.js`
  (`generativelanguage.googleapis.com` for Gemini, `api.openai.com` for OpenAI). Nothing else is contacted.
- Nothing is stored on the server. Runs live in each student's browser (`localStorage`); the API key lives in
  `sessionStorage` and is forgotten when the tab closes.

## Folder layout

```
brief-lab/
  index.html          the page shell: three regions, mode indicator, overlays
  styles.css          GCSU Evergreen palette and layout; every color is a CSS variable at the top
  js/
    constants.js      every default, model name, range, and threshold, each with a comment
    copy.js           every word a student can read
    model.js          the seven elements, the brief, the assembler, run snapshots
    main.js           entry point
    provider.js       calls Gemini / OpenAI from the browser; retries, timeouts, typed errors
    settings.js       the Settings drawer (key in sessionStorage, model list, temperature)
    status.js         renders plain-language status and error blocks
    field.js          the seven nodes, wires, and the Brief node
    tree.js           lineage operations: filing, roots, codes, labels, export/import
    tree-view.js      the tree drawer
    diff.js           word-level diff, text stats, brief and settings diffs
    similarity.js     how alike two outputs are (0-1) and the noise floor
    compare-view.js   the Compare panel
    dom.js, storage.js, state.js   small helpers
    (later phases add: blind, walkthrough, export)
  data/
    walkthrough.json           the built-in sample task
    walkthrough-recorded.json  recorded walkthrough runs (Phase 5; you generate this from the app)
  tests/              Node tests for every pure module
  README.md           this file
  STATUS.md           what is done, what is next, decisions made along the way
```

## Running the tests

Requires Node 20 or newer. From the folder:

```
node --test
```

Every pure module (assembler, tree operations, diff, similarity, blind selection, summary formatter)
has tests here. The copy tests also check that no student-facing text uses the banned words or the
phrase "prompt engineering," and that every explainer paragraph is under 70 words.

## Changing defaults and model names

Open `js/constants.js`. Every value has a plain-language comment above it. The ones you are most
likely to touch:

- `PROVIDERS.gemini.defaultModel` and `PROVIDERS.openai.defaultModel`: the model name shown before a
  student picks one. Model names change often, so the Settings drawer has a **List models** button
  that asks the provider for the current names with the student's key; the name field is also free
  text. Change the defaults here when a name is retired, but nothing breaks if you do not.
- `DEFAULT_TEMPERATURE`, `TEMPERATURE_MIN`, `TEMPERATURE_MAX`: the temperature dial.
- `BLIND_NO_DIFFERENCE_THRESHOLD`: the similarity above which a blind round reports
  "no visible difference" instead of a hit or a miss.
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
the structure (one entry per element, three sub-fields under `rules`).

## Recording the walkthrough runs

Phase 5 will add the instructions. In short: run the walkthrough yourself with a key, export the tree,
and save the export as `data/walkthrough-recorded.json`. The app replays those runs for students who
have no key yet, labeled as recorded on every output.

## Clearing student storage

Students can press "Clear everything" in the footer. It deletes the saved tree from `localStorage` and
forgets the key. To do it by hand: open the browser's developer tools, go to Application (Chrome, Edge)
or Storage (Firefox, Safari), and delete the entries whose names start with `brief-lab.`.

## Known limitations

- Phone screens are out of scope. The layout is built for desktop and tolerates tablets.
- One working tree per browser. Export to keep more than one; import to bring one back.
- A provider that blocks direct browser calls (CORS) cannot be used; the app will report it rather
  than route through a server.
- Free-tier providers may use what students send to train models. The Settings panel says so.
