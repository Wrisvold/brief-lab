# For Johnny

Hi John. Brief Lab is built and every automated check passes, but a handful of steps need a real
person with a real API key and real browsers. This page walks you through them. Nothing here needs
a code editor. Budget about an hour, plus a little waiting on the model.

If anything looks wrong at any step, do not try to fix it. Write down what you did, what you expected,
and what you saw (a screenshot is ideal), and send it to Ward. The list at the end says exactly what
to report.

## 1. Get the folder running on your computer

1. Download the project from https://github.com/Wrisvold/brief-lab (green **Code** button, then
   **Download ZIP**) and unzip it somewhere easy to find, such as your Desktop.
2. The app must be opened through a small local web server, not by double-clicking `index.html`.
   Browsers refuse to run it straight from a file. Two easy ways:
   - **If Python is installed** (it is on most Macs and many Windows machines): open a terminal
     (Mac: Terminal; Windows: PowerShell), type `cd ` followed by a space, drag the unzipped
     `brief-lab` folder onto the window, press Enter, then run:

     ```
     python -m http.server 8765
     ```

     On some Macs the command is `python3` instead of `python`.
   - **If you use VS Code**: install the "Live Server" extension, open the folder, right-click
     `index.html`, and choose "Open with Live Server".
3. Open Chrome and go to `http://localhost:8765` (or the address Live Server shows).
4. You should see the Brief Lab page with a Walkthrough stepper at the top and seven element boxes
   below. If you see a blank page, the server is not running or you opened the file directly.

## 2. Get a Gemini API key (free)

1. Go to https://aistudio.google.com/apikey and sign in with a Google account.
2. Press **Create API key**. Copy the long string it shows. This is your key; treat it like a password.
3. A ChatGPT or Gemini subscription is not an API key. Only the string from that page works.
4. The free tier is enough for everything below. Do not paste anything confidential into the app;
   free-tier providers may use what you send to train their models.

## 3. Check the connection

1. In the app, press **Settings** (top right).
2. Leave the provider on Gemini. Paste your key into the **API key** box.
3. Press **List models**. Within a few seconds a drop-down of model names should appear with a line
   saying how many models are available to your key. Pick any name that starts with `gemini` and
   contains `flash`.
4. Press **Test connection**. You should see "Connected. [model name] answered."
5. Close Settings.

If you instead see "The provider rejected the key", re-copy the key and try again. If it still fails,
note the exact message and move on to section 6.

## 4. Run the walkthrough with your key and save the recording

This is the most important step. It produces the file that lets students without a key see the
walkthrough.

1. Make sure the mode indicator at the top says **Walkthrough** (click it if it says Free).
2. Press **Start the walkthrough**. Stop 0 loads a task with only the Task element filled.
3. Press **Run this stop**. Wait for the output to appear on the right (usually 5 to 20 seconds).
   If the app says the provider asked it to slow down, just wait; it retries on its own with a
   countdown.
4. Read the short "what changed" note, press **Open Compare** if you are curious (stop 0 has nothing
   to compare against yet), then press **Next stop**.
5. Repeat for every stop through stop 6. Each stop adds one element and runs again. If you like,
   type a sentence in the "Before you run" box before each run; those predictions are saved too.
6. Stop 7 says **Run again**. Press **Run this stop**. This runs the same full brief a second time.
   Press **Open Compare** and look for the "Noise floor" section: it should say the two runs differed
   by about some percentage.
7. Still on stop 7, press **Save these runs as the recorded walkthrough (instructor)**. Your browser
   downloads a file named `walkthrough-recorded.json`. If the button is greyed out, one of the eight
   stops did not get a live run; click that stop's chip in the stepper and run it, then return to
   stop 7.
8. Send `walkthrough-recorded.json` to Ward, or, if you are comfortable with GitHub, replace
   `data/walkthrough-recorded.json` in the repository with it.
9. Press **Finish**. The mode switches to Free and the runs stay in the tree on the right.

## 5. Try the features a student would use

Each of these should take a minute or two.

1. **Unplug and compare.** In the tree on the right, click the last node to load it. On the field,
   press the **Plugged** button on the Context box so it says Unplugged (the box goes grey and
   dashed and its wire breaks). Press **Run**. A new node appears under the one you loaded. Press
   that node's **Compare** button. The panel should show, in this order: what changed in the brief
   (Context unplugged), settings, the two outputs with differences marked, the noise-floor note,
   and any predictions.
2. **Run again.** With a node loaded and the field unchanged, press **Run again**. A node labelled
   "same brief" appears beside it. Open Compare on it and check the noise-floor note gives a
   percentage.
3. **Blind round.** Load any node with at least three plugged elements and press **Run blind**. The
   field blurs behind "Brief hidden" and a panel under the output asks which element was dropped.
   Pick one, pick a confidence, press **File your call**, then **Reveal**. You should get one of
   three results: identified, missed, or "made no visible difference". The Compare panel opens with
   the dropped element outlined in gold. Then press **Calibration record** in the tree header and
   check the table shows one row.
4. **Criteria checklist.** Load a node whose brief includes Criteria (any walkthrough node from stop 3
   on). Under the output, tick a few checkboxes. Open Compare on that node; the output section should
   say "Criteria checks on ...: N of M met".
5. **New root.** Press **New root** in the tree header. The field clears; the old runs stay. Type a
   Task and press Run. A "Root B" group appears below Root A.

## 6. Check the error messages

The app is supposed to explain every failure in plain words, never show raw error text.

1. **Wrong model name.** Open Settings, change the model name to `gemini-does-not-exist`, close
   Settings, press Run. Expected: "This model name may have been retired" with a link to the current
   names. Then change the model back (use List models).
2. **No key.** Open Settings, press **Forget key**, close Settings, press Run. Expected: "No API key
   yet" with a next step. Then paste the key back in.
3. **Rate limit.** This one is hard to trigger on purpose. If at any point during your session you
   see "The provider is asking us to slow down" with a countdown, note that it retried and whether
   it eventually succeeded. If you never see it, that is fine; just say so.

## 7. Export, clear, import

1. Press **Export tree** in the tree header. A file named `brief-lab-tree-[date].json` downloads.
2. Press **Copy lineage summary**, then paste into any text editor. You should see a plain-text
   block: a header line, "Root A", one line per node, and a totals line at the end. Keep this paste.
3. Press **Clear everything** at the bottom of the page and confirm. The tree empties and the key is
   forgotten.
4. Press **Import tree** and choose the file from step 1. The whole tree should come back, including
   the blind round. Press **Copy lineage summary** again and compare with your earlier paste: apart
   from the date and time in the first line, it should be identical.

## 8. Other browsers (optional)

Chrome, Edge, Firefox, and Safari's engine (WebKit) have all been checked by script and pass, so
nothing is required here. If you happen to have a Mac, one look in real Safari is welcome: open
`http://localhost:8765`, press **Load a task** then **Load the walkthrough task**, unplug one
element, and note anything that looks broken or odd.

## 9. What to send back to Ward

- The `walkthrough-recorded.json` file from section 4 (the main deliverable).
- Which model name you ended up using.
- For each section above: worked, or what went wrong, with the exact message you saw and a
  screenshot if you can.
- Anything a non-technical student might find confusing: a label, a message, a step in the
  walkthrough. This matters as much as the bugs.

Thank you. The point of all this is that the students only ever see the app working.
