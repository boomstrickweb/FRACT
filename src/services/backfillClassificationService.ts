import { supabase } from '../lib/supabase';
import { requestTextClassification } from './textClassificationService';

/**
 * Service to backfill classification for posts that haven't been classified yet.
 * It processes posts "slowly" by using small batches and delays between them.
 */

interface BackfillStats {
  totalFound: number;
  processed: number;
  failed: number;
}

export async function backfillPostClassification(batchSize = 5, delayMs = 2000): Promise<BackfillStats> {
  const stats: BackfillStats = {
    totalFound: 0,
    processed: 0,
    failed: 0
  };

  try {
    // 1. Find posts without classification
    const { data: unclassifiedPosts, error: fetchError } = await supabase
      .from('posts')
      .select('id, content')
      .is('classification_label', null)
      .not('post_type', 'eq', 'voice') // Skip voice posts as they don't have text content usually
      .eq('moderation_reason', 'NONE') // Only classify safe posts
      .order('created_at', { ascending: false }) // Process newer ones first
      .limit(50); // Hard limit per run to keep it "slow"

    if (fetchError) {
      console.error('Error fetching unclassified posts:', fetchError);
      return stats;
    }

    if (!unclassifiedPosts || unclassifiedPosts.length === 0) {
      console.log('No unclassified posts found.');
      return stats;
    }

    stats.totalFound = unclassifiedPosts.length;
    console.log(`Starting backfill for ${stats.totalFound} posts...`);

    // 2. Process in small batches
    for (let i = 0; i < unclassifiedPosts.length; i += batchSize) {
      const batch = unclassifiedPosts.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (post) => {
        try {
          await requestTextClassification({
            content: post.content,
            postId: post.id,
            postTable: 'posts'
          });
          stats.processed++;
        } catch (err) {
          console.error(`Failed to classify post ${post.id}:`, err);
          stats.failed++;
        }
      });

      await Promise.all(batchPromises);

      // Delay between batches to be "slow"
      if (i + batchSize < unclassifiedPosts.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log('Backfill session completed:', stats);
  } catch (error) {
    console.error('Unexpected error during backfill:', error);
  }

  return stats;
}
