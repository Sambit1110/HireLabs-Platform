import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createSingleFlight, runWithConcurrency } from '../lib/resume/batch.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Worker that records concurrency and completion order. */
function tracker() {
  const state = { inFlight: 0, maxInFlight: 0, started: [], completed: [] };
  const worker = async (item) => {
    state.inFlight += 1;
    state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
    state.started.push(item.id);
    try {
      await delay(item.ms);
      if (item.fail) throw new Error(`${item.id} is corrupted`);
      return { id: item.id, parsed: `profile:${item.id}` };
    } finally {
      state.inFlight -= 1;
      state.completed.push(item.id);
    }
  };
  return { state, worker };
}

const FOUR_RESUMES = [
  { id: 'resume1.pdf', ms: 40 },
  { id: 'resume2.pdf', ms: 10 },
  { id: 'resume3.docx', ms: 30, fail: true },
  { id: 'resume4.pdf', ms: 5 },
];

describe('runWithConcurrency', () => {
  it('queues 4 inputs and processes them concurrently, not sequentially', async () => {
    const { state, worker } = tracker();
    const startedAt = Date.now();

    await runWithConcurrency(FOUR_RESUMES, worker, { concurrency: 4 });

    const elapsed = Date.now() - startedAt;
    assert.equal(state.maxInFlight, 4);
    // Sequential would take 85ms+; parallel is bounded by the slowest (40ms).
    assert.ok(elapsed < 80, `expected parallel execution, took ${elapsed}ms`);
  });

  it('never exceeds the concurrency limit and keeps the rest queued', async () => {
    const { state, worker } = tracker();
    const items = Array.from({ length: 10 }, (_, index) => ({ id: `r${index}`, ms: 5 + (index % 3) * 5 }));

    await runWithConcurrency(items, worker, { concurrency: 3 });

    assert.equal(state.maxInFlight, 3);
    assert.equal(state.completed.length, 10);
    assert.deepEqual(state.started.slice(0, 3), ['r0', 'r1', 'r2']);
  });

  it('isolates failures: one bad file does not fail the batch', async () => {
    const { worker } = tracker();

    const outcomes = await runWithConcurrency(FOUR_RESUMES, worker, { concurrency: 2 });

    assert.deepEqual(outcomes.map((outcome) => outcome.status), ['fulfilled', 'fulfilled', 'rejected', 'fulfilled']);
    assert.match(outcomes[2].reason.message, /resume3\.docx is corrupted/);
  });

  it('reports results in completion order without mixing up file identity', async () => {
    const { worker } = tracker();
    const settledOrder = [];

    const outcomes = await runWithConcurrency(FOUR_RESUMES, worker, {
      concurrency: 4,
      onSettled: (outcome, item, index) => {
        settledOrder.push(item.id);
        // Each outcome is delivered with its own item and index.
        if (outcome.status === 'fulfilled') {
          assert.equal(outcome.value.id, item.id);
          assert.equal(FOUR_RESUMES[index].id, item.id);
        }
      },
    });

    assert.deepEqual(settledOrder, ['resume4.pdf', 'resume2.pdf', 'resume3.docx', 'resume1.pdf']);
    // Returned outcomes stay in input order.
    assert.equal(outcomes[0].value.parsed, 'profile:resume1.pdf');
    assert.equal(outcomes[3].value.parsed, 'profile:resume4.pdf');
  });

  it('delivers each result as soon as it is ready, before slower items finish', async () => {
    const seen = [];
    let slowFinished = false;

    await runWithConcurrency(
      [{ id: 'slow', ms: 50 }, { id: 'fast', ms: 5 }],
      async (item) => {
        await delay(item.ms);
        if (item.id === 'slow') slowFinished = true;
        return item.id;
      },
      {
        concurrency: 2,
        onSettled: (outcome) => seen.push({ id: outcome.value, slowFinished }),
      }
    );

    assert.deepEqual(seen[0], { id: 'fast', slowFinished: false });
  });

  it('survives a throwing onSettled callback and handles empty input', async () => {
    const outcomes = await runWithConcurrency([1, 2], async (n) => n * 2, {
      onSettled: () => {
        throw new Error('ui update failed');
      },
    });
    assert.deepEqual(outcomes.map((outcome) => outcome.value), [2, 4]);
    assert.deepEqual(await runWithConcurrency([], async () => 1), []);
  });
});

describe('createSingleFlight (duplicate processing protection)', () => {
  it('runs a task once for concurrent calls with the same key', async () => {
    const flight = createSingleFlight();
    let calls = 0;
    const task = async () => {
      calls += 1;
      await delay(10);
      return 'parsed';
    };

    const [first, second] = await Promise.all([flight.run('resume-1', task), flight.run('resume-1', task)]);

    assert.equal(calls, 1);
    assert.equal(first, 'parsed');
    assert.equal(second, 'parsed');
  });

  it('keeps different keys independent and allows a later explicit retry', async () => {
    const flight = createSingleFlight();
    let calls = 0;
    const task = async () => {
      calls += 1;
      await delay(5);
    };

    await Promise.all([flight.run('a', task), flight.run('b', task)]);
    assert.equal(calls, 2);
    assert.equal(flight.has('a'), false);

    await flight.run('a', task);
    assert.equal(calls, 3);
  });

  it('clears the key after a failure so the resume can be retried', async () => {
    const flight = createSingleFlight();
    await assert.rejects(flight.run('x', async () => {
      throw new Error('boom');
    }));
    assert.equal(flight.has('x'), false);
    assert.equal(await flight.run('x', async () => 'ok'), 'ok');
  });
});
