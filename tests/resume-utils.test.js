import { describe, expect, it } from 'vitest';
import { validateResume } from '../lib/resume/validation.ts';
import { cleanResumeText } from '../lib/resume/text.js';
import { parseAIJson } from '../lib/ai/parse-json.js';
import { apiError, apiSuccess } from '../lib/api/response.js';

const makeFile = (name, type, size = 10) => ({ name, type, size });

describe('validateResume', () => {
  it('accepts PDF and DOCX', () => {
    expect(validateResume(makeFile('resume.pdf', 'application/pdf'))).toBeNull();
    expect(validateResume(makeFile('resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBeNull();
  });
  it('rejects unsupported files and oversized files', () => {
    expect(validateResume(makeFile('resume.txt', 'text/plain'))).toMatch(/PDF and DOCX/);
    expect(validateResume(makeFile('resume.pdf', 'application/pdf', 5 * 1024 * 1024 + 1))).toMatch(/5 MB/);
  });
  it('accepts exactly 5 MB and blank browser MIME when extension is allowed', () => {
    expect(validateResume(makeFile('resume.pdf', 'application/pdf', 5 * 1024 * 1024))).toBeNull();
    expect(validateResume(makeFile('resume.docx', '', 10))).toBeNull();
  });
});

describe('cleanResumeText', () => {
  it('normalizes whitespace, newlines and null characters', () => {
    expect(cleanResumeText('  hello\u0000  world\r\n\r\n\r\nnext  ')).toBe('hello world\n\nnext');
  });
  it('handles empty and non-string values and clips to the maximum', () => {
    expect(cleanResumeText(null)).toBe('');
    expect(cleanResumeText('abcdef', 3)).toBe('abc');
  });
});

describe('parseAIJson', () => {
  it('parses JSON and fenced JSON', () => {
    expect(parseAIJson('{"ok":true}')).toEqual({ ok: true });
    expect(parseAIJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });
  it('rejects malformed and empty output', () => {
    expect(() => parseAIJson('')).toThrow(/empty/);
    expect(() => parseAIJson('not json')).toThrow(/unreadable/);
    expect(() => parseAIJson('{"value":}')).toThrow();
  });
});

describe('API response helpers', () => {
  it('returns the standard success envelope', async () => {
    const response = apiSuccess({ id: '1' }, 201);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, data: { id: '1' } });
  });
  it('returns the standard error envelope', async () => {
    const response = apiError('NO_ACCESS', 'Sign in.', 401);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: { code: 'NO_ACCESS', message: 'Sign in.' } });
  });
});
