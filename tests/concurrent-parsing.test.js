import { it } from 'vitest';
import assert from 'node:assert/strict';

import { runWithConcurrency } from '../lib/resume/batch.js';
import { ResumeParseError, parseResumeBytes } from '../lib/resume/parsing.js';
import { makeDocx, makePdf } from './helpers/fixtures.js';

const resume = (name, skill) => [
  name,
  'Software Engineer',
  `${skill.length} years of experience delivering production systems with ${skill}.`,
  'Worked across teams on reliable, well-tested services.',
];

// Real pdf-parse / mammoth work, run through the same pool the UI uses.
it('parses several real PDF/DOCX files concurrently and maps each result to its own file', async () => {
  const inputs = [
    { id: 'r1', fileName: 'ana.pdf', bytes: makePdf(resume('Ana Lopez', 'Kubernetes')), expect: ['Ana Lopez', 'Kubernetes'] },
    { id: 'r2', fileName: 'ben.docx', bytes: makeDocx(resume('Ben Okafor', 'Django')), expect: ['Ben Okafor', 'Django'] },
    { id: 'r3', fileName: 'broken.pdf', bytes: new Uint8Array(Buffer.from('%PDF-1.4\ngarbage', 'latin1')), expectError: true },
    { id: 'r4', fileName: 'chen.pdf', bytes: makePdf(resume('Chen Wei', 'TensorFlow')), expect: ['Chen Wei', 'TensorFlow'] },
    { id: 'r5', fileName: 'dana.docx', bytes: makeDocx(resume('Dana Smith', 'Terraform')), expect: ['Dana Smith', 'Terraform'] },
  ];

  let inFlight = 0;
  let maxInFlight = 0;
  const settled = [];

  const outcomes = await runWithConcurrency(inputs, async (input) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      return await parseResumeBytes(input.bytes, { fileName: input.fileName });
    } finally {
      inFlight -= 1;
    }
  }, {
    concurrency: 3,
    onSettled: (outcome, input) => settled.push(input.id),
  });

  assert.equal(maxInFlight, 3, 'three files should be parsing at the same time');
  assert.equal(settled.length, 5);

  inputs.forEach((input, index) => {
    const outcome = outcomes[index];
    if (input.expectError) {
      assert.equal(outcome.status, 'rejected');
      assert.ok(outcome.reason instanceof ResumeParseError);
      return;
    }
    assert.equal(outcome.status, 'fulfilled', `${input.fileName} should parse`);
    const [name, skill] = input.expect;
    assert.equal(outcome.value.candidateName, name, `${input.fileName} got another file's name`);
    assert.deepEqual(outcome.value.extractedSkills, [skill], `${input.fileName} got another file's skills`);
  });
});
