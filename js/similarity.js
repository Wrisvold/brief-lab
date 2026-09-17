// Brief Lab — similarity.js
// How alike two outputs are, as one number from 0 to 1.
//
// In one sentence: similarity is the share of words the two texts have in common,
// counting repeats (Sorensen-Dice on word bags). Identical texts score 1; texts with
// no words in common score 0. It is symmetric and ignores case and punctuation.
// The Blind-mode threshold that uses it lives in constants.js.

// Lower-case words with punctuation stripped. Numbers count as words.
export function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// word -> count
export function wordBag(text) {
  const bag = new Map();
  for (const w of words(text)) bag.set(w, (bag.get(w) || 0) + 1);
  return bag;
}

// 0..1. Two empty texts are identical (1). One empty text and one not: 0.
export function similarity(a, b) {
  const A = wordBag(a);
  const B = wordBag(b);
  let sizeA = 0;
  let sizeB = 0;
  for (const n of A.values()) sizeA += n;
  for (const n of B.values()) sizeB += n;
  if (sizeA === 0 && sizeB === 0) return 1;
  if (sizeA === 0 || sizeB === 0) return 0;
  let shared = 0;
  for (const [w, n] of A) {
    const m = B.get(w);
    if (m) shared += Math.min(n, m);
  }
  return (2 * shared) / (sizeA + sizeB);
}

// "differed by about N%" for a similarity value.
export function percentDifferent(sim) {
  return Math.round((1 - sim) * 100);
}

// Given the outputs of two or more runs of the identical brief, the average pairwise
// similarity and the matching percentage. null when fewer than two outputs.
export function noiseFloor(outputs) {
  const list = (outputs || []).map((o) => String(o || ''));
  if (list.length < 2) return null;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      sum += similarity(list[i], list[j]);
      pairs++;
    }
  }
  const mean = sum / pairs;
  return { pairs, runs: list.length, meanSimilarity: mean, percent: percentDifferent(mean) };
}
