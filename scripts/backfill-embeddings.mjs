#!/usr/bin/env node
/**
 * HireLabs - Embedding Backfill Script
 *
 * Scans public.resumes for records where parsed_text is present but embedding is null,
 * generates 384-d dense embeddings via hirelabs-matcher (/embed), and persists them
 * with an embedded_at timestamp.
 *
 * Usage:
 *   node scripts/backfill-embeddings.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { embedTexts } from '../lib/resume/embedding.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BATCH_SIZE = 10;

async function backfill() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_KEY.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  console.log('Querying resumes missing embeddings...');
  const { data: resumes, error } = await supabase
    .from('resumes')
    .select('id, file_name, parsed_text')
    .is('embedding', null)
    .not('parsed_text', 'is', null)
    .limit(500);

  if (error) {
    console.error('Failed to query resumes:', error.message);
    process.exit(1);
  }

  if (!resumes || resumes.length === 0) {
    console.log('No resumes need embedding backfill. All records up to date!');
    return;
  }

  console.log(`Found ${resumes.length} resume(s) to backfill.`);

  for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
    const chunk = resumes.slice(i, i + BATCH_SIZE);
    const texts = chunk.map((r) => r.parsed_text.slice(0, 30000));

    try {
      const { vectors, model_used } = await embedTexts(texts);

      for (let j = 0; j < chunk.length; j++) {
        const resume = chunk[j];
        const vector = vectors[j];
        const now = new Date().toISOString();

        const { error: updateErr } = await supabase
          .from('resumes')
          .update({
            embedding: vector,
            embedded_at: now,
          })
          .eq('id', resume.id);

        if (updateErr) {
          console.error(`Failed to update resume ${resume.id} (${resume.file_name}):`, updateErr.message);
        } else {
          console.log(`[${i + j + 1}/${resumes.length}] Embedded ${resume.file_name} (${model_used})`);
        }
      }
    } catch (batchErr) {
      console.error(`Error embedding batch starting at index ${i}:`, batchErr.message);
    }
  }

  console.log('Backfill process complete.');
}

backfill().catch((err) => {
  console.error('Unhandled backfill error:', err);
  process.exit(1);
});
