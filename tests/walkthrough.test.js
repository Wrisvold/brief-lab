import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  stopOrder, elementsAtStop, briefForStop, isAgainStop, readRecording, buildRecording, RECORDING_FORMAT, STOP_COUNT,
} from '../js/walkthrough.js';
import { pluggedKeys, assemble } from '../js/model.js';

const task = JSON.parse(readFileSync(new URL('../data/walkthrough.json', import.meta.url), 'utf8'));
const recorded = JSON.parse(readFileSync(new URL('../data/walkthrough-recorded.json', import.meta.url), 'utf8'));

test('eight stops: seven elements in the walkthrough order, then run again', () => {
  assert.equal(STOP_COUNT, 8);
  assert.deepEqual(stopOrder(task), ['task', 'context', 'rules', 'criteria', 'persona', 'examples', 'steps', 'again']);
  assert.equal(isAgainStop(7), true);
  assert.equal(isAgainStop(6), false);
});

test('elementsAtStop grows one element per stop and stop 7 equals stop 6', () => {
  assert.deepEqual(elementsAtStop(task, 0), ['task']);
  assert.deepEqual(elementsAtStop(task, 1), ['task', 'context']);
  assert.deepEqual(elementsAtStop(task, 6), ['task', 'context', 'rules', 'criteria', 'persona', 'examples', 'steps']);
  assert.deepEqual(elementsAtStop(task, 7), elementsAtStop(task, 6));
});

test('briefForStop plugs only the elements reached, in framework order on the field', () => {
  const b0 = briefForStop(task, 0);
  assert.deepEqual(pluggedKeys(b0), ['task']);
  assert.equal(assemble(b0), `Task: ${task.elements.task.text}`);
  const b2 = briefForStop(task, 2);
  assert.deepEqual(pluggedKeys(b2), ['task', 'context', 'rules']);
  assert.equal(b2.rules.fallback, task.elements.rules.fallback);
  assert.equal(b2.persona.text, '');
  const b7 = briefForStop(task, 7);
  assert.deepEqual(pluggedKeys(b7), ['persona', 'task', 'context', 'examples', 'rules', 'criteria', 'steps']);
  assert.equal(assemble(b7), assemble(briefForStop(task, 6)));
});

test('the shipped recorded file is a valid placeholder with no usable stops yet', () => {
  const r = readRecording(recorded, task.id);
  assert.equal(r.ok, true);
  assert.equal(r.stops.size, 0);
  assert.equal(recorded.format, RECORDING_FORMAT);
  assert.equal(recorded.stops.length, 8);
});

test('readRecording accepts filled stops and rejects wrong files', () => {
  const filled = { ...recorded, provider: 'gemini', model: 'm', date: '2026-09-20', stops: [{ stop: 0, output: 'A' }, { stop: 7, output: 'B' }, { stop: 9, output: 'x' }, { stop: 1, output: '  ' }] };
  const r = readRecording(filled, task.id);
  assert.equal(r.ok, true);
  assert.deepEqual([...r.stops.keys()], [0, 7]);
  assert.equal(r.stops.get(0).output, 'A');
  assert.equal(r.meta.model, 'm');
  assert.equal(readRecording(null).ok, false);
  assert.equal(readRecording({ format: 'x' }).ok, false);
  assert.equal(readRecording({ ...recorded, taskId: 'other' }, task.id).ok, false);
});

test('buildRecording then readRecording round-trips outputs by stop', () => {
  const runs = Array.from({ length: 8 }, (_, i) => ({
    output: `Output ${i}`, prediction: i === 3 ? 'guess' : '',
    settings: { provider: 'gemini', model: 'm', temperature: 0.7, maxOutputTokens: 1024 },
  }));
  const file = buildRecording({ taskId: task.id, runs, recordedBy: 'Ward' });
  assert.equal(file.format, RECORDING_FORMAT);
  assert.equal(file.model, 'm');
  assert.equal(file.stops.length, 8);
  const r = readRecording(JSON.parse(JSON.stringify(file)), task.id);
  assert.equal(r.stops.size, 8);
  assert.equal(r.stops.get(5).output, 'Output 5');
  assert.equal(r.stops.get(3).prediction, 'guess');
});
