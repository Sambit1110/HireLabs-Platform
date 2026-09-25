const fs = require('fs');

const routeContent = \import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function parsePdf(buffer) {
  try {
    const pkg = eval('require("pdf-parse")');
    const PDFParse = pkg.PDFParse || pkg;
    let text = '';
    
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      text = result?.text || '';
      await parser.destroy();
    } catch (innerError) {
      console.error("PDF.js error bypassed:", innerError.message || innerError);
    }

    if (!text.trim()) {
      return "This is an image-only or scanned PDF. No readable text could be extracted. The candidate needs to use a standard text-based PDF.";
    }
    return text;
  } catch (e) {
    console.error("PDF parsing error bypassed:", e.message || e);
    return "Parsed text unavailable because the PDF parser failed or this is an image-only PDF. Please provide advice on using a standard text-based resume.";
  }
}

async function parseDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result?.value || '';
}

function cleanText(value) {
  return value
    .replace(/\\u0000/g, ' ')
    .replace(/\\r/g, '\\n')
    .replace(/[ \\t]+/g, ' ')
    .replace(/\\n\\s*\\n\\s*\\n+/g, '\\n\\n')
    .trim()
    .slice(0, 50000);
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No resume file provided.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Resume exceeds the 5 MB limit.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const extension = file.name.split('.').pop()?.toLowerCase();

    let parsedText;
    if (extension === 'pdf' || file.type === 'application/pdf') {
      parsedText = await parsePdf(buffer);
    } else if (
      extension === 'docx' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      parsedText = await parseDocx(buffer);
    } else {
      return NextResponse.json({ error: 'Only PDF and DOCX resumes are supported.' }, { status: 400 });
    }

    parsedText = cleanText(parsedText);

    const baseName = file.name
      .replace(/\\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();

    let aiData = { candidateName: 'Candidate', candidateTitle: 'Applicant', extractedSkills: [], yearsExperience: null, resume_score: 50, improvement_tips: [] };
    
    if (process.env.GEMINI_API_KEY) {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
          input: \\\You are an expert technical recruiter and resume reviewer. Parse the following resume text and return a JSON object with EXACTLY this schema: { "candidateName": "string", "candidateTitle": "string", "extractedSkills": ["string"], "yearsExperience": number, "resume_score": number (0-100 score based on ATS readability, impact, and formatting), "improvement_tips": ["string"] (3-5 highly specific, actionable tips to improve this exact resume). \\n\\nFILE NAME: \\\\\\\\\n\\nRESUME TEXT:\\n\\\\\\\\\\,
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: {
              type: 'object',
              properties: {
                candidateName: { type: 'string' },
                candidateTitle: { type: 'string' },
                extractedSkills: { type: 'array', items: { type: 'string' } },
                yearsExperience: { type: 'integer' },
                resume_score: { type: 'integer' },
                improvement_tips: { type: 'array', items: { type: 'string' } }
              },
              required: ["candidateName", "candidateTitle", "extractedSkills", "resume_score", "improvement_tips"]
            }
          },
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const textOut = payload?.output_text || (payload?.output?.[0]?.text) || payload?.output?.[0]?.content?.parts?.[0]?.text;
        if (textOut) {
          try {
            aiData = JSON.parse(textOut.replace(/\\\\\\\\\\\\\\\json/gi, '').replace(/\\\\\\\\\\\\\\\/g, '').trim());
          } catch (e) {
            console.error("Failed to parse Gemini JSON:", e);
          }
        }
      }
    }

    let finalName = aiData.candidateName;
    if (!finalName || finalName === 'Candidate' || finalName.toLowerCase() === 'unknown') {
      finalName = baseName;
    }

    return NextResponse.json({
      parsedText,
      candidateName: finalName || 'Candidate',
      candidateTitle: aiData.candidateTitle || 'Applicant',
      yearsExperience: aiData.yearsExperience || null,
      extractedSkills: aiData.extractedSkills || [],
      resumeScore: aiData.resume_score || 0,
      improvementTips: aiData.improvement_tips || [],
      profileCompleteness: 100,
    });
  } catch (error) {
    console.error('Resume parser error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unable to parse resume.',
    }, { status: 500 });
  }
}
\;
fs.writeFileSync('app/api/parse-resume/route.js', routeContent, 'utf-8');
