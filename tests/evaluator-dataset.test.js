import { describe, expect, it } from 'vitest';

import { buildCandidateMessages, candidateSchema } from '../lib/ai/candidate-prompt.js';
import {
  applyGold,
  conflictReason,
  crossSplitIssues,
  devPackages,
  joinPairs,
  modelInput,
  parseReviewDecisions,
  reviewQueue,
  roleFromJd,
  selectFixedDevIds,
  sourceBody,
  targetFlags,
  trainingRecord,
} from '../lib/evaluator/dataset.js';

const jds = { j_0001: 'Data Analyst\nRequired skills: SQL, Tableau\nPreferred skills: Python', j_0002: 'Backend Engineer\nRequired skills: Go, Kubernetes', j_0003: 'QA Engineer\nRequired skills: Selenium' };
const resumes = {
  r_0001: 'Data Analyst with 4 years of experience.\nSkills: SQL, Tableau, Excel\nBuilt weekly dashboards.',
  r_0002: 'Backend Engineer with 6 years of experience.\nSkills: Go, Kubernetes, PostgreSQL\nRan production clusters.',
  r_0003: 'Student.',
};
const splits = { r_0001: 'train', r_0002: 'train', r_0003: 'dev', r_0009: 'test' };
const io = { readJd: (id) => jds[id] ?? null, readResume: (id) => resumes[id] ?? null, splitOf: (id) => splits[id] };

function target(overrides = {}) {
  const value = Object.fromEntries(candidateSchema.required.map((key) => [key, []]));
  return {
    ...value,
    candidate_summary: 'Data analyst with reporting experience.',
    relevant_experience_summary: 'Four years of SQL reporting.',
    confidence: 70,
    fit_score: 82,
    fit_verdict: 'strong',
    gaps: ['Python is not demonstrated in the resume and requires verification.'],
    recommendation: 'Proceed to a human-led interview to verify Python experience.',
    skill_gap_analysis: { demonstrated_skills: ['SQL'], partially_demonstrated_skills: [], missing_required_skills: [], missing_preferred_skills: ['Python'], unverified_skills: [], skill_gap_summary: 'Python not demonstrated.' },
    recruiter_insights: { strongest_alignment: ['SQL'], areas_for_verification: ['Python'], suggested_interview_focus: ['Python'], overall_assessment: 'Strong documented SQL fit.' },
    ...overrides,
  };
}

describe('model input', () => {
  it('builds the same messages from the same source pair', () => {
    expect(roleFromJd(jds.j_0001)).toBe('Data Analyst');
    expect(sourceBody(jds.j_0001, resumes.r_0001)).toEqual({
      mode: 'candidate', role: 'Data Analyst', jobDescription: jds.j_0001,
      candidate: { parsedText: resumes.r_0001, name: null, title: null, skills: null, yearsExperience: null },
    });
    expect(modelInput(jds.j_0001, resumes.r_0001)).toEqual(buildCandidateMessages(sourceBody(jds.j_0001, resumes.r_0001)));
    expect(modelInput(jds.j_0001, resumes.r_0001)).toEqual(modelInput(jds.j_0001, resumes.r_0001));
  });
});

describe('joinPairs', () => {
  it('joins texts and keeps pair id, split, label source and gold labels', () => {
    const { records, issues } = joinPairs([{ pair_id: 'p_1', resume_id: 'r_0001', jd_id: 'j_0001', fit_score: 82, fit_verdict: 'strong', label_source: 'human' }], 'train', io);
    expect(issues).toEqual([]);
    expect(records[0]).toMatchObject({ pair_id: 'p_1', split: 'train', resume_id: 'r_0001', jd_id: 'j_0001', jd_text: jds.j_0001, resume_text: resumes.r_0001, label: { fit_score: 82, fit_verdict: 'strong', label_source: 'human' } });
  });

  it('holds back and flags missing texts, duplicates, conflicting labels, bad labels, wrong-split and locked test resumes', () => {
    const row = (pair_id, resume_id, jd_id, fit_score, fit_verdict) => ({ pair_id, resume_id, jd_id, fit_score, fit_verdict, label_source: 'human' });
    const rows = [
      row('p_1', 'r_0001', 'j_0001', 82, 'strong'),
      row('p_1', 'r_0002', 'j_0002', 82, 'strong'),
      row('p_2', 'r_0001', 'j_0002', 60, 'moderate'),
      row('p_3', 'r_0001', 'j_0002', 30, 'weak'),
      row('p_4', 'r_0002', 'j_0001', 90, 'strong'),
      row('p_5', 'r_0002', 'j_0001', 90, 'strong'),
      row('p_6', 'r_0404', 'j_0001', 60, 'moderate'),
      row('p_7', 'r_0002', 'j_0404', 60, 'moderate'),
      row('p_8', 'r_0001', 'j_0003', 90, 'weak'),
      row('p_9', 'r_0003', 'j_0001', 20, 'weak'),
      row('p_10', 'r_0009', 'j_0001', 20, 'weak'),
    ];
    const { records, issues } = joinPairs(rows, 'train', io);
    expect(records.map((record) => record.pair_id)).toEqual(['p_4']);
    expect(issues.map((issue) => [issue.pair_id, issue.type])).toEqual([
      ['p_1', 'duplicate_pair_id'],
      ['p_1', 'duplicate_pair_id'],
      ['p_2', 'conflicting_labels'],
      ['p_3', 'conflicting_labels'],
      ['p_5', 'duplicate_pair'],
      ['p_6', 'missing_resume'],
      ['p_7', 'missing_jd'],
      ['p_8', 'invalid_label'],
      ['p_9', 'resume_wrong_split'],
      ['p_10', 'locked_test_resume'],
    ]);
  });

  it('flags resumes that appear in both train and dev', () => {
    const train = [{ pair_id: 'p_1', resume_id: 'r_0001', jd_id: 'j_0001' }];
    const dev = [{ pair_id: 'p_9', resume_id: 'r_0001', jd_id: 'j_0002' }, { pair_id: 'p_8', resume_id: 'r_0003', jd_id: 'j_0001' }];
    expect(crossSplitIssues(train, dev)).toEqual([
      { type: 'train_dev_resume_overlap', pair_id: 'p_1', split: 'train', detail: 'r_0001' },
      { type: 'train_dev_resume_overlap', pair_id: 'p_9', split: 'dev', detail: 'r_0001' },
    ]);
  });
});

describe('dev manifest', () => {
  const dev = Array.from({ length: 40 }, (_, index) => {
    const verdict = ['strong', 'moderate', 'weak', 'insufficient_evidence'][index % 4];
    const score = { strong: 85, moderate: 60, weak: 30, insufficient_evidence: 10 }[verdict];
    return { pair_id: `p_dev_${String(index).padStart(3, '0')}`, resume_id: `r_${index}`, jd_id: 'j_0001', jd_text: jds.j_0001, resume_text: index % 7 === 0 ? 'Short.' : 'A longer resume text with plenty of documented evidence about SQL work.', label: { fit_score: score, fit_verdict: verdict, label_source: 'human' } };
  });

  it('picks a fixed, deterministic 20 with every verdict and thin-evidence cases', () => {
    const picked = selectFixedDevIds(dev, 20);
    expect(picked.ids).toHaveLength(20);
    expect(new Set(picked.ids).size).toBe(20);
    expect(selectFixedDevIds([...dev].reverse(), 20).ids).toEqual(picked.ids);
    const verdicts = new Set(picked.ids.map((id) => dev.find((record) => record.pair_id === id).label.fit_verdict));
    expect(verdicts).toEqual(new Set(['strong', 'moderate', 'weak', 'insufficient_evidence']));
    expect(picked.thin_evidence.length).toBeGreaterThan(0);
  });

  it('keeps labels out of the model inputs and in the gold manifest', () => {
    const { inputs, gold } = devPackages(dev.slice(0, 3), ['p_dev_000']);
    expect(Object.keys(inputs[0])).toEqual(['pair_id', 'messages']);
    expect(JSON.stringify(inputs)).not.toMatch(/label_source|"fit_score":|"fit_verdict":|fixed_20/);
    expect(inputs[0]).toEqual({ pair_id: 'p_dev_000', messages: modelInput(jds.j_0001, 'Short.') });
    expect(gold[0]).toEqual({ pair_id: 'p_dev_000', fit_score: 85, fit_verdict: 'strong', label_source: 'human', fixed_20: true });
    expect(gold[1].fixed_20).toBe(false);
  });
});

describe('gold labels and conflicts', () => {
  it("replaces the generated score and verdict with the team's label", () => {
    expect(applyGold(target({ fit_score: 70, fit_verdict: 'moderate' }), { fit_score: 88, fit_verdict: 'strong' })).toMatchObject({ fit_score: 88, fit_verdict: 'strong' });
  });

  it('quarantines generated targets that disagree sharply with the label', () => {
    expect(conflictReason(target({ fit_score: 80, fit_verdict: 'strong' }), { fit_score: 72, fit_verdict: 'moderate' })).toBeNull();
    expect(conflictReason(target({ fit_score: 85, fit_verdict: 'strong' }), { fit_score: 30, fit_verdict: 'weak' })).toBe('verdict_two_bands_apart');
    expect(conflictReason(target({ fit_score: 74, fit_verdict: 'moderate' }), { fit_score: 40, fit_verdict: 'weak' })).toBe('score_gap_30_or_more');
    expect(conflictReason(target({ fit_score: 60, fit_verdict: 'moderate' }), { fit_score: 10, fit_verdict: 'insufficient_evidence' })).toBe('insufficient_evidence_mismatch');
  });
});

describe('targetFlags', () => {
  it('passes a complete, evidence-first target', () => {
    expect(targetFlags(target())).toEqual({ errors: [], warnings: [] });
  });

  it('rejects broken targets and warns about unexplained gaps and non-review recommendations', () => {
    expect(targetFlags({ ...target(), fit_score: 40 }).errors).toContain('score_outside_verdict_band');
    expect(targetFlags({ ...target(), gaps: 'none' }).errors).toContain('schema');
    const missing = target({
      gaps: [],
      skill_gap_analysis: { ...target().skill_gap_analysis, missing_required_skills: ['Tableau'], skill_gap_summary: '' },
      recommendation: 'Hire immediately.',
    });
    expect(targetFlags(missing).warnings).toEqual(['missing_evidence_not_explained', 'recommendation_not_for_human_review']);
    expect(targetFlags(target({ recommendation: 'Reject this candidate.' })).warnings).toContain('recommendation_not_for_human_review');
  });
});

describe('training record', () => {
  it('orders messages system, user, assistant and keeps provenance outside them', () => {
    const record = { pair_id: 'p_1', split: 'train', resume_id: 'r_0001', jd_id: 'j_0001', jd_text: jds.j_0001, resume_text: resumes.r_0001, label: { fit_score: 82, fit_verdict: 'strong', label_source: 'human' } };
    const row = trainingRecord(record, target());
    expect(Object.keys(row)).toEqual(['id', 'messages']);
    expect(row.id).toBe('p_1');
    expect(row.messages.map((message) => message.role)).toEqual(['system', 'user', 'assistant']);
    expect(row.messages.slice(0, 2)).toEqual(modelInput(jds.j_0001, resumes.r_0001));
    expect(JSON.parse(row.messages[2].content)).toEqual(target());
    expect(JSON.stringify(row.messages)).not.toMatch(/p_1|r_0001|label_source/);
  });
});

describe('review queue', () => {
  it('lists at least the requested number, flagged items first, with blank decision columns', () => {
    const items = Array.from({ length: 120 }, (_, index) => ({
      record: { pair_id: `p_${index}`, jd_text: jds.j_0001, resume_text: resumes.r_0001, label: { fit_score: 82, fit_verdict: 'strong', label_source: 'human' } },
      target: target(),
      flags: index === 50 ? ['missing_evidence_not_explained'] : [],
      conflict: index === 70 ? 'verdict_two_bands_apart' : null,
    }));
    const csv = reviewQueue(items, 100);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('pair_id,gold_score,gold_verdict,label_source,generated_score,generated_verdict,flags,job_title,resume_excerpt,missing_required_skills,recommendation,overall_assessment,target_json,reviewer_name,decision,corrected_target_json,notes');
    expect(lines).toHaveLength(101);
    expect(lines[1].startsWith('p_70,')).toBe(true);
    expect(lines[2].startsWith('p_50,')).toBe(true);
  });

  it('counts only reviews a person completed', () => {
    const csv = 'pair_id,decision,reviewer_name,corrected_target_json\np_1,accept,Hrittima,\np_2,,Hrittima,\np_3,correct,Hrittima,"{""fit_score"":70}"\np_4,accept,,\n';
    const decisions = parseReviewDecisions(csv);
    expect([...decisions.keys()]).toEqual(['p_1', 'p_3']);
    expect(decisions.get('p_3')).toEqual({ decision: 'correct', reviewer: 'Hrittima', corrected: { fit_score: 70 } });
  });
});
