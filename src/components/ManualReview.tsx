import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ManualReviewProps {
  postId?: string;
  reflectionId?: string;
  onClose: () => void;
  onSubmit: () => void;
}

const ManualReview: React.FC<ManualReviewProps> = ({ postId, reflectionId, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if it's a High severity case (quarantined) to decide which table to write to
      const table = 'manual_review'; // Default
      
      // The requirement says: "If the user requests a Manual Review themselves, put it in the same tab [high-manual-review]... the user can request Manual Review in Low and Medium cases, because it automatically writes in High. In these cases, just write it to the manual-review table."
      // Wait, let's re-read: "If any of these happen, everyone should see why... The user can request an appeal using the Manual Review button... If it's High, automatically write it to a table called high-manual-review... But if the user requests a Manual Review themselves, put it in the same tab. However, the user can request Manual Review in Low and Medium cases, because it automatically writes in High. In these cases, just write it to the manual-review table."
      
      // Clarification: 
      // High -> auto-written to high-manual-review.
      // User appeal for High -> update high-manual-review or add to it? "put it in the same tab".
      // Low/Medium -> user appeal -> write to manual-review.
      
      let isHigh = false;
      if (postId) {
        const { data } = await supabase.from('posts').select('moderation_score').eq('id', postId).single();
        if (data?.moderation_score && data.moderation_score >= 3) isHigh = true;
      } else if (reflectionId) {
        const { data } = await supabase.from('reflections').select('moderation_score').eq('id', reflectionId).single();
        if (data?.moderation_score && data.moderation_score >= 3) isHigh = true;
      }

      const targetTable = isHigh ? 'high_manual_review' : 'manual_review';

      const { error: insertError } = await supabase
        .from(targetTable)
        .insert({
          post_id: postId,
          reflection_id: reflectionId,
          user_id: user.id,
          reason: reason.trim(),
          status: 'pending'
        });

      if (insertError) throw insertError;

      onSubmit();
      onClose();
    } catch (err: any) {
      console.error('Error submitting manual review:', err);
      setError(err.message || 'Failed to submit review request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-100">Request Manual Review</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-slate-400 text-sm mb-6">
            If you believe our automated system made a mistake, please explain why. 
            A moderator will review your post and the decision.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reason for appeal
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why the moderation was incorrect..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[150px] resize-none"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/20"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit for Review</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManualReview;
