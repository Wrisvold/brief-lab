# Design brief: the Brief Lab student guide

**From:** Ward Risvold, AIST 6300 (Human/AI Communications), Georgia College & State University
**To:** Design
**Deliverable:** a student-facing guide, "How to use Brief Lab," as a print-ready PDF and a single web page
**Source of truth for how the app behaves:** the appendix at the end of this brief, and the live app itself

This brief is written in the same seven-element form the course teaches, because it is the form the
app is built around. Read the appendix before designing anything; every control name and every
number in it was checked against the app.

---

## 1. Persona

You are an instructional designer writing for graduate students who are working professionals
without a technical background: marketing, finance, healthcare, operations, education. They are
comfortable in a chat window and uncomfortable with anything that looks like code. You write short
sentences, name the button the reader will press, and never explain a concept the reader does not
need in order to take the next step.

## 2. Task

Produce a student guide that gets a first-time user from opening Brief Lab to finishing the guided
walkthrough, and then shows them the four things they will do on their own afterwards: change one
element and compare, run again for the noise floor, run a blind round, and hand in a lineage summary.

## 3. Context

**What Brief Lab is.** A browser app for the first movement of the course, "Speaking to Your
Partner." Students assemble a brief from seven elements, run it against a language model with their
own free API key, and learn to read the output for the fingerprint of each element. Every run is
saved as a node in a lineage tree, so any two runs can be compared. A blind mode drops one element
and asks the student to name it from the output alone.

**The seven elements, in the fixed order the course uses:** Persona, Task, Context, Examples, Rules,
Criteria, Steps. The guide must use these names, in this order, and nothing else. The Rules element
has three parts: Do, Don't (negative space), and Fallback (what to say when the task cannot be done).

**The confusion this guide must remove.** The app's guided walkthrough has **eight stops** for
**seven elements**. The stop chips are named for what they add ("Task only", "+ Context", ...,
"Run again") and carry no numbers, but students still expect one stop per element. The count does
not match, on purpose:

- The walkthrough adds elements **in the order their effect is easiest to see** on the sample task,
  not in the framework order. So the second stop adds Context, not Persona.
- The first stop is the bare Task alone, and the last stop does not add anything: it runs the full
  brief a second time to show how much two identical runs differ (the "noise floor").
- The field on screen always shows the elements in **framework** order (Persona first), whatever
  the stepper is doing.

So the guide needs a single clear picture that says: seven elements, eight stops, and here is how
they line up. The mapping table in the appendix is that picture. Please give it visual weight.

**Where the guide is used.** Week 3 (Early B, "The Constraint Lab"), Week 4 (A1, "The Brief," which
asks students to predict what will go wrong before they run), and Week 8 (A2, which asks students
to decide whether to restart or justify their current line). The guide is read once, then kept open
beside the app.

**Visual identity.** The course's "GCSU Evergreen" system, the same as the app: Evergreen `#245C4F`
for headings and rules, Ice `#EAF1EE` for panels, Gold `#E0A32E` for accents only (never small text
on white), light surfaces only. Serif headings (Georgia or Cambria), a system sans for body text,
monospace for anything the model sends or receives. No dark backgrounds. No icon badges.

## 4. Examples

**The shape of a step in the guide.** One line of instruction naming the control, one line of what
the student will see, one line of why it matters. For example:

> Press **Run this stop**. The model's reply appears in the Output panel on the right, and a new node
> appears in the Tree. Every run is kept, so you can always go back to this one.

**The shape of the stop mapping.** A row per stop, showing the stop number and title exactly as the
app shows them, the element it adds, and the chips filling up. For example the first three rows:

| Stop as shown in the app | What it adds | Elements plugged after this stop |
|---|---|---|
| Task only | Task | Task |
| + Context | Context | Task, Context |
| + Rules | Rules (Do, Don't, Fallback) | Task, Context, Rules |

**Good explainer copy** (this is the app's own register; match it):

> Every run is saved as a branch. Change one element, run, and the app files the result next to the
> version it came from. Later you can put any two side by side and see what the change did, and what
> it didn't.

**Copy to avoid:**

> The lineage tree leverages version control paradigms to empower iterative prompt refinement.

## 5. Rules

**Do**

- Use the course's words: *brief*, *element*, *plug / unplug*, *negative space*, *fallback*,
  *run again and compare*, *fingerprint*, *noise floor*.
- Name every control exactly as the app labels it (see the appendix), in bold.
- Put the stop-to-element mapping on its own page or panel, and refer back to it.
- Say plainly, once, that a ChatGPT, Gemini, or Claude subscription is not an API key, and that the free
  Gemini key from Google AI Studio is enough.
- Say plainly, once, that the key stays in the student's browser and goes only to the provider, and
  that free-tier providers may use what is sent for training, so nothing confidential goes in.
- Present "no visible difference" in a blind round as a finding about the element, not a mistake.
- Keep every paragraph under 70 words.

**Don't**

- Do not use the phrase "prompt engineering" anywhere. The course says *brief*.
- Do not use "leverage," "seamless," "robust," "delve," "powerful," "unlock," "supercharge," or
  "journey."
- Do not add points, badges, streaks, levels, or any language of scoring. The calibration record
  is a table, not a score, and the guide must not turn it into one.
- Do not rename, reorder, merge, or add elements. Do not renumber the stops; the guide must match
  what the student sees on screen.
- Do not include screenshots of the Settings panel with a key visible, even a fake one.
- Do not describe features the appendix does not list. If something seems missing, ask.

**Fallback**

- If a behaviour is not covered by the appendix or cannot be seen in the app, do not guess. Mark it
  "confirm with Ward" in the draft and leave it out of the final until answered.

## 6. Criteria

The guide is done when all of these are true and checkable:

1. A reader can go from a blank browser to a finished walkthrough using only the guide, with every
   button named exactly as on screen.
2. The stop-to-element mapping appears once as a table or diagram, and the text refers to it rather
   than re-explaining it.
3. The seven elements appear in framework order everywhere they are listed.
4. The four free-mode activities each have their own short section: change one element and compare;
   run again; run blind; copy the lineage summary.
5. The API-key section contains the "not a subscription" line and the confidentiality line.
6. No banned word, no "prompt engineering," no scoring language, no paragraph over 70 words.
7. Colours, fonts, and surfaces match the Evergreen system; gold appears only as an accent.
8. The PDF prints legibly in black and white, since some students will print it.

## 7. Steps

1. Read the appendix and open the app once. Run the walkthrough on the recorded runs if no key is
   handy; every screen the guide describes will appear.
2. Draft the stop-to-element mapping first and get it approved before writing the rest.
3. Write the walkthrough section stop by stop, using the app's own stop titles.
4. Write the four free-mode sections.
5. Write the short "before you start" section: getting a key, entering it, testing the connection.
6. Run the banned-word and paragraph-length checks against the draft.
7. Send the draft to Ward with any "confirm with Ward" items listed at the top.

---

## Appendix: verified facts about the app

Everything below was checked against the app as built. Control names are exact.

### The screen

Three regions, left to right:

- **The field.** Seven element boxes stacked in framework order, each with a name, a one-line hint, a
  text area, and a **Plugged** / **Unplugged** switch. Unplugging greys the box, dashes its border,
  and breaks its wire; the text is kept. An empty box counts as unplugged. The Rules box has three
  labelled parts: **Do**, **Don't / negative space**, **Fallback**. At the bottom of the chain sits
  the **Brief** node with seven small chips (filled = plugged), a character and token count, the
  **Before you run: what do you expect this change to do?** box (the prediction), and the buttons
  **Run**, **Run again**, **Run blind**.
- **The output column.** **Assembled brief** (the exact text sent to the model, with a **Copy**
  button) above **Output** (the model's reply). When Criteria is plugged, a checklist appears under
  the output, one checkbox per criterion, with the line: "If you couldn't decide whether a criterion
  was met, it wasn't checkable. Rewrite it."
- **The tree.** Every run as a node: a glyph, a code such as A3, seven chips, a computed label
  ("full brief", "– Context", "same brief", "blind · unrevealed"), and the time. The current node is
  outlined in gold and has a note field. Buttons: **Export tree**, **Import tree**,
  **Copy lineage summary**, **New root**, **Compare**, **Calibration record**. Each row has its own
  **Compare** button.

Across the top: the title, a **Mode** switch (**Walkthrough** / **Free**), and **Settings**. Above
the field in Walkthrough mode: the stepper. At the bottom: **Clear everything**.

Every region has a collapsible **What is happening here** panel with two short paragraphs.

### Settings

**Provider** (Gemini, OpenAI, or Claude), **API key** (masked; **Show**, **Forget key**), an
explanation of keys including "a ChatGPT, Gemini, or Claude subscription is not an API key" and the
confidentiality caution,
**Get a key** and **Current model names** links, **Model name** (free text) with **List models**
(asks the provider for the names this key can use), **Temperature** (0 to 1, "Higher = more variation
between runs"), **Max output length (tokens)**, and **Test connection**.

The key is kept only for the browser tab and is forgotten when the tab closes.

### The walkthrough: seven elements, eight stops

| Stop as shown in the app | What it adds | Elements plugged after this stop |
|---|---|---|
| Task only | Task | Task |
| + Context | Context | Task, Context |
| + Rules | Rules (Do, Don't, Fallback) | Task, Context, Rules |
| + Criteria | Criteria (and the checklist appears) | Task, Context, Rules, Criteria |
| + Persona | Persona | Persona, Task, Context, Rules, Criteria |
| + Examples | Examples | Persona, Task, Context, Examples, Rules, Criteria |
| + Steps | Steps | all seven |
| Run again | nothing; the full brief runs a second time | all seven |

Why this order: it is the order in which each element's effect is easiest to see on the sample task.
The field always shows the elements in framework order regardless.

At each stop the student sees: a short paragraph about the element, the element's text already filled
in from the sample task, and the buttons **Run this stop** (live, with a key) or **Replay the recorded
run** (no key needed, output labelled "Recorded run · model · date — not live"). After the run: a
"what changed" note, **Open Compare**, **Replay live with my key** (for recorded stops), and
**Next stop**. At the last stop: **Finish**, which switches the mode to Free and leaves the field and
tree as they are. **Start over** goes back to the first stop and deletes nothing.

Entering any stop puts that stop's elements on the field; the others are empty. This is why the Task
box is already filled at the first stop.

The walkthrough builds a real lineage in the tree: A1 through A7 in a chain, with A8 beside A7 as
"same brief".

### The sample task

Harrow & Vance Supply Co., a fictional restaurant-supply distributor in Macon, Georgia, announcing a
Hybrid Work Standard. It contains a date and a dollar amount that must be stated exactly, a promise
that must not be made (pay, headcount, future review), and a group the policy does not yet cover
(out-of-state remote hires), so the fallback rule has something to do.

### Compare

Opens over the field with two node pickers. Sections, in this order: **What changed in the brief**
(chips side by side, each element marked same / plugged in on the right / unplugged on the right /
edited, with the text difference), **Settings** (only if different), **What changed in the output**
(word count, paragraphs, list items per side; a word-by-word diff, red struck-through for words only
on the left, blue underlined for words only on the right), **Noise floor** (either "Two runs of the
identical brief differed by about N%. Differences smaller than that may be noise." or an offer to
**Run again**), and **Predictions** (whatever the student wrote before either run). Escape closes it.

### Run again

Makes a same-brief sibling of the current node: identical brief, identical settings. Offered only while
the field still matches the current node. Two or more such siblings give the noise-floor percentage.

### Run blind

Offered when the current node has three or more plugged elements. It copies the current brief, drops
one plugged element at random (never Task), runs it, and hides the brief behind a "Brief hidden"
mask. Under the output: "One of the plugged elements was dropped before this run. Which one?", the
candidate elements, **How sure are you?** (Low, Medium, High), an optional one-line reason, and
**File your call** ("Filing is final. There is no score, only the reveal."). Then **Reveal**, which
states one of three outcomes: identified, missed, or "Dropping [element] made no visible difference
on this task. That is a finding about the element, not a mistake." The Compare view opens with the
dropped element outlined in gold. A second blind run from the same node may draw the same element.

### Calibration record

A table, per element: dropped, identified, missed, no visible difference; plus one line on how often
High-confidence calls were right. Not available mid-round. No totals presented as a score.

### Handing work in

- **Copy lineage summary** puts a plain-text block on the clipboard (or shows it in a panel): a header
  with date and settings, each root with its Task, one line per node with chips, what changed, word
  count and similarity, predictions, blind rounds with call and outcome, criteria checks, and totals.
- **Export tree** downloads the whole tree as a file the app can import exactly. **Import tree**
  replaces the current tree with such a file.
- **New root** clears the field and starts a fresh group (Root B) without deleting Root A. This is
  the visible "restart" for A2.
- **Clear everything** deletes all runs, the draft, and the key from this browser.

### Glossary the guide may use

brief · element · plug / unplug · negative space · fallback · fingerprint · run again · noise floor ·
node · root · lineage · prediction · blind round · calibration record
