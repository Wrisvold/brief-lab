// Brief Lab — copy.js
// Every word a student can read lives here: labels, hints, explainers, errors, walkthrough text.
// Edit the strings; leave the keys alone (the code looks things up by key).
//
// Curly braces mark values the app fills in, e.g. "{model}" or "{percent}". Keep them.
// Each explainer paragraph must stay under 70 words. tests/copy.test.js checks that,
// and checks for a short list of words the course avoids.

// Fill "{name}" placeholders in a string from an object of values.
export function fill(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (m, key) => (key in values ? String(values[key]) : m));
}

export const APP = {
  title: 'Brief Lab',
  tagline: 'Build a seven-element brief. Run it. Read the output for the fingerprint of each element.',
  course: 'AIST 6300 · Human/AI Communications · Georgia College & State University',
  modeLabel: 'Mode',
  modes: { walkthrough: 'Walkthrough', free: 'Free' },
  settings: 'Settings',
  whatIsHappening: 'What is happening here',
};

// The one-line hint under each element's name. Framework wording; keep the order in model.js.
export const ELEMENT_HINTS = {
  persona: 'Who the AI is for this task. Sets tone and perspective, not accuracy.',
  task: 'What it should do. One strong verb, one object.',
  context: "The situation: audience, purpose, constraints, what the AI can't know.",
  examples: 'Show the shape you want. Two or three beats one.',
  rules: 'What to always do, what never to do, and what to do when it can\'t.',
  criteria: 'What "good" looks like. Checkable if possible.',
  steps: 'The order to work in, when order matters.',
};

// Labels and hints for the three Rules sub-fields.
export const RULES_HINTS = {
  do: 'Positive rules: what to always do.',
  dont: 'Negative space: what to leave out.',
  fallback: 'What to say when the task cannot be completed as asked.',
};

// The collapsible "What is happening here" panel for each region: what it does, why it matters.
export const EXPLAINERS = {
  field: {
    what: 'This is the field. Each box is one element of the brief: Persona, Task, Context, Examples, Rules, Criteria, Steps. Type into a box to fill it. The plug switch turns an element on or off without erasing what you wrote. Only plugged elements reach the model.',
    why: 'A brief is easier to read one element at a time. Unplugging an element and running again shows you what that element was doing. Nothing you unplug is lost; it is only left out of the next run.',
  },
  prompt: {
    what: 'This is the assembled brief: the exact text the model receives, built from the plugged elements in framework order. It is one message, the same as pasting it into a chat window. The counts below it are rough guides to length.',
    why: 'Seeing the assembled text keeps you honest. If an element is unplugged or empty, it is not here, and the model cannot act on it. What you see is all the model gets.',
  },
  output: {
    what: 'This is what the model sent back for the current run, shown as plain text exactly as received. If your brief has a plugged Criteria element, each criterion appears below as a checkbox you can tick against the output.',
    why: 'Reading the output for the fingerprint of each element is the skill this instrument trains. Tone points to Persona. Missing facts point to Context. A refusal that names what it cannot do points to the fallback rule.',
  },
  tree: {
    what: 'Every run is saved as a node here. A run made after editing the field becomes a child of the node you were working from. Click a node to load its brief back onto the field. Compare puts any two nodes side by side.',
    why: 'A change you cannot trace is a change you cannot learn from. The tree keeps every version and where it came from, so you can run again and compare instead of guessing what you did.',
  },
  compare: {
    what: 'Compare shows two nodes side by side: first what changed in the brief, then any settings change, then a word-by-word diff of the two outputs. Blue marks words added on the right; red marks words removed from the left.',
    why: 'Two runs of the identical brief will differ a little. That is the noise floor. A difference smaller than the noise floor may mean nothing. The noise-floor note tells you how big a change has to be before you should trust it.',
  },
  blind: {
    what: 'Run blind copies the current brief, drops one plugged element at random, runs it, and hides the brief. You read the output and name the missing element. Task is never dropped, because a brief without a task is not a brief.',
    why: 'Naming the missing element from the output alone is the test of whether you can read a fingerprint. Sometimes an element makes no visible difference on a task. The reveal says so. That is a finding about the element, not a mistake.',
  },
};

// The Settings drawer and key entry.
export const SETTINGS = {
  title: 'Settings',
  provider: 'Provider',
  apiKey: 'API key',
  apiKeyPlaceholder: 'Paste your key',
  model: 'Model name',
  modelHint: 'Editable. If the provider retires this name, type the new one here.',
  temperature: 'Temperature',
  temperatureHint: 'Higher = more variation between runs',
  maxOutput: 'Max output length (tokens)',
  testConnection: 'Test connection',
  testing: 'Testing...',
  testOk: 'Connected. {model} answered.',
  clearKey: 'Forget key',
  close: 'Close',
  keyShow: 'Show',
  keyHide: 'Hide',
  keyKept: 'Key kept for this tab only.',
  keyNone: 'No key entered.',
  listModels: 'List models',
  listing: 'Asking the provider...',
  listed: '{count} models are available to this key. Pick one or type a name.',
  modelPick: 'Available models',
  maxOutputHint: 'Roughly three quarters of a word per token.',
  keyEntry: {
    whatIsAKey: 'An API key is a long string of letters and numbers that lets this page call a model on your behalf. It is not the same as a chat subscription: a ChatGPT or Gemini subscription is not an API key. You need a key from the provider\'s developer site.',
    whereGemini: 'Gemini: sign in at Google AI Studio and choose Get API key. The free tier is enough for this course.',
    whereOpenAI: 'OpenAI: sign in at platform.openai.com and create a key under API keys. OpenAI keys need a small prepaid balance.',
    stays: 'Your key stays in this browser tab and goes only to the provider you chose. It is not logged, saved to disk, or sent anywhere else. Closing the tab forgets it.',
    training: 'Free-tier providers may use what you send to improve their models. Do not paste confidential material, client data, or anything you would not put in a public document.',
    getKeyLink: 'Get a key',
    modelListLink: 'Current model names',
  },
};

// Errors. Each has a title, a plain message, and a suggested next step. Never a raw error.
export const ERRORS = {
  missingKey: {
    title: 'No API key yet.',
    message: 'The app needs a key before it can run a brief.',
    next: 'Open Settings and paste a key. The Settings panel says where to get one.',
  },
  invalidKey: {
    title: 'The provider rejected the key.',
    message: 'The provider answered that this key is not valid, or is not allowed to use this model.',
    next: 'Check that you copied the whole key and that it belongs to the provider selected in Settings. A brand-new key can take a minute to start working.',
  },
  unknownModel: {
    title: 'This model name may have been retired.',
    message: 'The provider says it does not have a model called {model}.',
    next: 'Change the model name in Settings. The current names are listed at {url}.',
  },
  rateLimit: {
    title: 'The provider is asking us to slow down.',
    message: 'Free tiers allow only a few requests per minute. Retrying in {seconds} seconds (try {attempt} of {total}).',
    next: 'Nothing to do; the app will retry on its own.',
    gaveUp: 'Still rate-limited after {total} tries. Wait a minute, then run again.',
  },
  noQuota: {
    title: 'This account has no credit with the provider.',
    message: 'The key is valid, but the provider says the account has no remaining quota.',
    next: "Add credit on the provider's billing page, or switch to Gemini in Settings; its free tier is enough for this course.",
  },
  providerBusy: {
    title: 'The provider is having trouble on its end.',
    message: 'The provider answered with a server error. Retrying in {seconds} seconds (try {attempt} of {total}).',
    next: 'Nothing to do; the app will retry on its own.',
    gaveUp: 'Still failing after {total} tries. Wait a few minutes, then run again.',
  },
  badRequest: {
    title: 'The provider rejected the request.',
    message: 'The provider said: {detail}',
    next: 'This usually means the model does not accept a setting such as temperature or output length. Change the model in Settings, or set temperature to 1, and try again.',
  },
  network: {
    title: 'Could not reach the provider.',
    message: 'The request did not get through. This is usually the network, a firewall, or an ad blocker.',
    next: 'Check your connection and try again. On a campus network, the provider\'s address may be blocked; try another network.',
  },
  emptyResponse: {
    title: 'The model sent nothing back.',
    message: 'The provider answered, but the reply had no text. Some providers do this when a safety filter stops the reply.',
    next: 'Run again. If it keeps happening, soften the task wording or change the model.',
  },
  unexpected: {
    title: 'Something unexpected happened.',
    message: 'The provider answered in a way the app does not recognise.',
    next: 'Try again. If it keeps happening, tell your instructor what you were doing.',
  },
  taskLoad: {
    title: 'Could not load the task.',
    message: 'The task file did not arrive from the server.',
    next: 'Reload the page. If it keeps happening, the data folder may be missing from the host.',
  },
  storageUnavailable: {
    title: 'This browser is not saving anything.',
    message: 'Storage is blocked or full, so runs will disappear when you close the tab.',
    next: 'Export your tree before you leave, or try a different browser.',
  },
};

// The field: nodes, plugs, prediction, run controls.
export const FIELD = {
  title: 'The field',
  plugged: 'Plugged',
  unplugged: 'Unplugged',
  plugToggle: 'Plug',
  emptyNote: 'Empty. Counts as unplugged.',
  predictionLabel: 'Before you run: what do you expect this change to do?',
  predictionHint: 'One or two sentences. Optional, but the habit is the point.',
  run: 'Run',
  runAgain: 'Run again',
  runBlind: 'Run blind',
  running: 'Running...',
  changedSinceLastRun: 'Changed since last run. The next Run will branch from the current node.',
  unchangedSinceLastRun: 'Same as the current node.',
  loadTask: 'Load a task',
  loadWalkthroughTask: 'Load the walkthrough task',
  startBlank: 'Start blank',
  loadConfirm: 'This replaces what is on the field. Your saved runs are not affected.',
  assemblerName: 'Brief',
  assemblerHint: 'The plugged elements, assembled in framework order. This is what Run sends.',
  pluggedList: 'Plugged: {list}',
  nothingPlugged: 'Nothing plugged in.',
  wiresLabel: 'Wires from each plugged element into the brief',
};

// The assembled-brief panel.
export const PROMPT = {
  title: 'Assembled brief',
  counts: '{chars} characters · about {tokens} tokens',
  empty: 'Nothing is plugged in yet. Fill an element to see the brief.',
  copy: 'Copy',
  copied: 'Copied.',
};

// The output panel.
export const OUTPUT = {
  title: 'Output',
  empty: 'No output yet. Fill the field and press Run.',
  progress: 'Waiting for {provider}...',
  progressRetry: 'Rate-limited. Retrying in {seconds}s (try {attempt} of {total}).',
  progressBusy: 'Provider trouble. Retrying in {seconds}s (try {attempt} of {total}).',
  done: 'Reply from {provider} {model} in {seconds}s.',
  recordedLabel: 'Recorded run · {model} · {date} — not live',
  criteriaTitle: 'Criteria',
  criteriaNote: "If you couldn't decide whether a criterion was met, it wasn't checkable. Rewrite it.",
};

// The tree drawer.
export const TREE = {
  title: 'Tree',
  empty: 'No runs yet. Your first Run will appear here.',
  root: 'Root',
  current: 'current',
  sameBrief: 'same brief',
  fullBrief: 'full brief',
  blindUnrevealed: 'blind · unrevealed',
  blindRevealed: 'blind · revealed',
  recorded: 'recorded',
  load: 'Load',
  compare: 'Compare',
  newRoot: 'New root',
  newRootConfirm: 'Start a fresh root? The field will be cleared. Nothing already saved is deleted.',
  notePlaceholder: 'Add a short note',
  calibration: 'Calibration record',
  exportTree: 'Export tree',
  importTree: 'Import tree',
  copySummary: 'Copy lineage summary',
  copied: 'Copied.',
  clearEverything: 'Clear everything',
  clearConfirm: 'Delete every saved run and forget the key? Export first if you want a copy.',
  storageWarning: 'Your saved tree is getting large ({size}). Export it soon; the browser may stop saving.',
  minus: '– {element}',
  plus: '+ {element}',
  edited: 'edited {element}',
  unchanged: 'same as parent',
  rootLabel: 'Root {letter}',
  noteLabel: 'Note',
  noteHint: 'A short note on the current node, for your own records.',
  storageFailed: 'The browser refused to save the tree. Export it now so nothing is lost.',
  runAgainHint: 'Same brief, same settings: a sibling for the noise floor.',
  exportHint: 'Downloads every run, including hidden blind rounds, as one file the app can import exactly.',
  importConfirm: 'Replace the current tree with the imported one? Export first if you want a copy of what is here.',
  importDone: 'Imported {n} runs.',
  importFailed: 'That file is not a Brief Lab tree.',
  summaryTitle: 'Lineage summary',
  summaryHint: 'A plain-text block for pasting into an assignment.',
  summaryCopied: 'Lineage summary copied.',
  summaryShown: 'Copy the text below.',
  close: 'Close',
};

// The Compare panel.
export const COMPARE = {
  title: 'Compare',
  close: 'Close',
  left: 'Left',
  right: 'Right',
  briefDiff: 'What changed in the brief',
  settingsDiff: 'Settings',
  outputDiff: 'What changed in the output',
  noiseFloor: 'Noise floor',
  predictions: 'Predictions',
  noBriefChange: 'Same brief on both sides.',
  noSettingsChange: 'Same settings on both sides.',
  stats: '{words} words · {paragraphs} paragraphs · {listItems} list items',
  noiseFloorNote: 'Two runs of the identical brief differed by about {percent}%. Differences smaller than that may be noise.',
  runAgainOffer: 'Want to know how much of this is the change and how much is chance? Run the same brief again.',
  noPrediction: 'No prediction was written for this run.',
  pluggedWord: 'plugged',
  unpluggedWord: 'unplugged',
  added: 'added',
  removed: 'removed',
  pickLeft: 'Left node',
  pickRight: 'Right node',
  sameNode: 'Pick two different nodes to compare.',
  statusPlugged: 'plugged in on the right',
  statusUnplugged: 'unplugged on the right',
  statusEdited: 'edited',
  statusSame: 'same on both sides',
  statusAbsent: 'not used on either side',
  outputOf: 'Output of {code}',
  noiseFloorRuns: 'Based on {runs} runs of the identical brief.',
  predictionOf: 'Prediction on {code}',
  legend: 'Red with a line through it: words only on the left. Blue underlined: words only on the right.',
  criteriaLine: 'Criteria checks on {code}: {met} of {total} met',
  criteriaUnmet: ' (unmet: {list})',
};

// Blind mode.
export const BLIND = {
  title: 'Blind round',
  question: 'One of the plugged elements was dropped before this run. Which one?',
  taskNote: 'Task is never dropped: a brief without a task is not a brief.',
  confidence: 'How sure are you?',
  reason: 'Why? (optional, one line)',
  fileCall: 'File your call',
  filingIsFinal: 'Filing is final. There is no score, only the reveal.',
  reveal: 'Reveal',
  hiddenBrief: 'The brief for this run is hidden until you file your call.',
  tooFew: 'Run blind needs at least {n} plugged elements on the current node.',
  replayNote: 'A second blind run from the same node draws again. It may draw the same element.',
  revealedLine: 'Revealed: {element} was dropped.',
  yourCall: 'Your call: {call} ({confidence} confidence).',
  similarityLine: 'Similarity to parent: {similarity}, threshold {threshold}.',
  outcomeIdentified: 'Identified. You named the missing element.',
  outcomeMissed: 'Missed. {dropped} was dropped; you said {call}. The diff below shows what {dropped} was doing.',
  outcomeNoDifference: 'Dropping {element} made no visible difference on this task. That is a finding about the element, not a mistake.',
  needsRun: 'Run the brief first. A blind round drops an element from the current node and compares against it.',
  maskTitle: 'Brief hidden',
  filed: 'Your call is filed: {call} ({confidence} confidence). Reveal when you are ready.',
  chooseBoth: 'Pick an element and a confidence level to file your call.',
  droppedMark: 'dropped in this blind round',
  roundOf: 'Blind round from {code}',
  reasonShown: 'Your reason: {reason}',
};

// The calibration record: a table, not a score.
export const CALIBRATION = {
  title: 'Calibration record',
  intro: 'For each element: how many times it was dropped in a blind round, how many times you identified it, and how many times it made no visible difference.',
  element: 'Element',
  dropped: 'Dropped',
  identified: 'Identified',
  noDifference: 'No visible difference',
  byConfidence: 'High-confidence calls were right {right} of {total} times.',
  byConfidenceNone: 'No high-confidence calls yet.',
  empty: 'No blind rounds revealed yet.',
  recordedNote: 'Recorded runs are never counted here.',
  missed: 'Missed',
  rounds: 'Rounds counted: {n}.',
  midRound: 'Available once the current blind round is revealed.',
  close: 'Close',
};

// The walkthrough stepper. Eight stops, added in the order their effect is easiest to see.
export const WALKTHROUGH = {
  title: 'Walkthrough',
  start: 'Start the walkthrough',
  next: 'Next stop',
  finish: 'Finish',
  runThisStop: 'Run this stop',
  replayRecorded: 'Replay the recorded run',
  replayLive: 'Replay live with my key',
  noKeyOffer: 'No key yet? You can replay recorded runs to see the walkthrough, then repeat any stop live once you have a key.',
  noRecording: 'No recorded run is available for this stop.',
  intro: 'Eight stops for seven elements. Stop 0 is the task alone. Stops 1 to 6 each add one element, in the order its effect is easiest to see. Stop 7 runs the finished brief a second time. Fill the Prediction box before each run if you can.',
  orderNote: 'The stepper adds elements in the order they are easiest to see, not framework order. The field always shows them in framework order.',
  stopLabel: 'Stop {n}',
  openCompare: 'Open Compare',
  startOver: 'Start over',
  startOverHint: 'Start over goes back to the first stop. Nothing is deleted; the runs stay in the tree.',
  done: 'done',
  recordedNotice: 'This output is a recorded run, not live. Replay live with your key to get your own.',
  saveRecording: 'Save these runs as the recorded walkthrough (instructor)',
  saveRecordingHint: 'Downloads walkthrough-recorded.json built from the eight live runs of this walkthrough. Replace the file in the data folder with it.',
  needsAllLive: 'The recording can be saved once all eight stops have live runs.',
  end: 'The walkthrough is over. The field and the tree are yours; keep going in Free mode.',
  stops: [
    {
      title: 'Task only',
      copy: 'The sample task is already in the Task box; the other six boxes are empty on purpose. A task alone is a bare instruction: the model fills every gap with its own guesses about the reader, the length, and the tone. Run it and read the result as a baseline.',
      after: 'Read the output once. Note what the model invented that you never told it.',
    },
    {
      title: '+ Context',
      copy: 'Context is the situation: who reads this, why, and what the model cannot know on its own. Here it carries the company, the date, the on-site days, the stipend, and the people the policy does not cover.',
      after: 'Open Compare. The facts should now be right. Watch for what the model still assumes.',
    },
    {
      title: '+ Rules',
      copy: "Rules say what to always do, what never to do, and what to say when it can't. The Don't line is negative space: things left out on purpose. The fallback tells the model what to do with the out-of-state case.",
      after: 'Compare. Did the promise about pay disappear? Did the fallback sentence appear where the policy runs out?',
    },
    {
      title: '+ Criteria',
      copy: 'Criteria say what good looks like, in checkable terms. The model reads them too, and often tightens up to meet them. Below the output you can now tick each criterion yourself.',
      after: 'Compare, then tick the checklist. A criterion you could not decide on was not checkable.',
    },
    {
      title: '+ Persona',
      copy: 'Persona sets who the model is for this task. It changes tone, address, and structure. It does not change facts: the date, the days, and the stipend should be exactly what Context gave. If a fact changed, that is noise or a mistake, not the persona.',
      after: 'Compare. Look at what changed (tone, how the reader is addressed, structure) and what did not (the numbers).',
    },
    {
      title: '+ Examples',
      copy: 'Examples show the shape you want instead of describing it. Two short samples here: an opening and a fallback sentence. Watch how closely the model copies their rhythm.',
      after: "Compare. Does the opening now match the example's shape? Did anything else drift?",
    },
    {
      title: '+ Steps',
      copy: 'Steps give the order of work when order matters. For a short announcement they mostly set the order of paragraphs. On some tasks Steps make no visible difference; that is worth knowing too.',
      after: 'Compare. Did the paragraph order follow the steps? If nothing changed, say so. It is a finding.',
    },
    {
      title: 'Run again',
      copy: 'The full brief, run a second time, unchanged. The two outputs will differ. That difference is the noise floor: the amount of change you get for free, from sampling alone. Any change smaller than this may be chance.',
      after: 'Open Compare and read the noise-floor note. Keep that percentage in mind for every comparison you make from now on.',
    },
  ],
};

// Footer and storage.
export const FOOTER = {
  storageNote: 'Runs are saved in this browser only. The API key is forgotten when the tab closes. No accounts, no analytics, no cookies.',
  clearEverything: 'Clear everything',
};
