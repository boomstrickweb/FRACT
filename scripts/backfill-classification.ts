import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env if it exists
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your environment or .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function requestTextClassification(content: string, postId: string) {
  const apiUrl = `${SUPABASE_URL}/functions/v1/classify-text`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      postId,
      postTable: 'posts'
    }),
  });

  if (!response.ok) {
    throw new Error(`Classification failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function requestBatchClassification(items: {content: string, postId: string}[]) {
  const apiUrl = `${SUPABASE_URL}/functions/v1/classify-text`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items,
      postTable: 'posts'
    }),
  });

  if (!response.ok) {
    if (response.status === 429) return { error: 'QUOTA_EXCEEDED' };
    throw new Error(`Batch classification failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function runBackfill() {
  console.log('🚀 Starting batched backfill of existing posts...');
  
  let totalProcessed = 0;
  let hasMore = true;
  const BATCH_SIZE = 10; 
  const TOTAL_LIMIT = 500; 
  const DELAY_MS = 10000; // 10 seconds between batches (6 batches per minute = 60 posts/min)

  while (hasMore && totalProcessed < TOTAL_LIMIT) {
    console.log(`\nFetching next batch of ${BATCH_SIZE} unclassified posts...`);
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, content')
      .is('classification_label', null)
      .not('post_type', 'eq', 'voice')
      .eq('moderation_reason', 'NONE')
      .order('created_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (error) {
      console.error('❌ Error fetching posts:', error);
      break;
    }

    if (!posts || posts.length === 0) {
      console.log('✅ All posts have been classified!');
      hasMore = false;
      break;
    }

    console.log(`Processing batch of ${posts.length} posts...`);

    let retries = 1;
    let success = false;
    
    while (retries >= 0 && !success) {
      try {
        process.stdout.write(`  Classifying batch of ${posts.length}... `);
        const batchItems = posts.map(p => ({ content: p.content, postId: p.id }));
        const result = await requestBatchClassification(batchItems);
        
        if (result.error === 'QUOTA_EXCEEDED') {
          console.log('\n🚫 Quota exceeded. Stopping backfill for now.');
          process.exit(0);
        }

        console.log('✅');
        totalProcessed += posts.length;
        success = true;
      } catch (err: any) {
        if (retries > 0) {
          console.log(`⚠️ (${err.message}). Retrying in 10s...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          console.log(`❌ (${err.message})`);
        }
        retries--;
      }
    }

    console.log(`Total processed so far: ${totalProcessed}`);
    
    // Delay between batches
    if (hasMore) {
      console.log(`Waiting ${DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`\n🏁 Backfill finished. Total posts classified: ${totalProcessed}`);
}

runBackfill();
