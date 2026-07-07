import { supabase } from '../lib/supabase';

export interface ClassificationResult {
  success: boolean;
  label?: string;
  confidence?: number;
  error?: string;
}

/**
 * Requests text classification for a post via Supabase Edge Function
 */
export async function requestTextClassification(
  content: string,
  postId: string,
  postTable: 'posts' | 'post_series' = 'posts'
): Promise<ClassificationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('classify-text', {
      body: {
        content,
        postId,
        postTable
      }
    });

    if (error) {
      console.error('Error invoking classify-text function:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      label: data.label,
      confidence: data.confidence
    };
  } catch (err) {
    console.error('Unexpected error during classification request:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Requests batch text classification for multiple posts
 */
export async function requestBatchClassification(
  items: { content: string; postId: string }[],
  postTable: 'posts' | 'post_series' = 'posts'
): Promise<{ success: boolean; processed?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('classify-text', {
      body: {
        items,
        postTable
      }
    });

    if (error) {
      console.error('Error invoking batch classify-text function:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      processed: data.processed
    };
  } catch (err) {
    console.error('Unexpected error during batch classification request:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
