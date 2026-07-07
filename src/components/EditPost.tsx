import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EditPostProps {
  postId: string;
  onBack: () => void;
  onPostUpdated?: () => void;
}

interface PostData {
  id: string;
  content: string;
  post_type: 'text' | 'quote' | 'voice';
  quote_signature?: string;
  created_at: string;
  updated_at: string;
}

const EditPost: React.FC<EditPostProps> = ({ postId, onBack, onPostUpdated }) => {
  const [originalPost, setOriginalPost] = useState<PostData | null>(null);
  const [content, setContent] = useState('');
  const [quoteSignature, setQuoteSignature] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPost();
  }, [postId]);

  useEffect(() => {
    if (originalPost) {
      const contentChanged = content !== originalPost.content;
      const signatureChanged = quoteSignature !== (originalPost.quote_signature || '');
      setHasChanges(contentChanged || signatureChanged);
    }
  }, [content, quoteSignature, originalPost]);

  const loadPost = async () => {
    try {
      setIsLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .eq('author_id', user.id) // Ensure user owns the post
        .single();

      if (postError) {
        console.error('Error loading post:', postError);
        setError('Failed to load post');
        return;
      }

      if (post.post_type === 'voice') {
        setError('Voice notes cannot be edited');
        return;
      }

      setOriginalPost(post);
      setContent(post.content);
      setQuoteSignature(post.quote_signature || '');

    } catch (error) {
      console.error('Error in loadPost:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!originalPost || !hasChanges) return;

    setIsSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Check for active ban
      const { data: profile } = await supabase
        .from('profiles')
        .select('ban_until')
        .eq('id', user.id)
        .single();

      if (profile?.ban_until && new Date(profile.ban_until) > new Date()) {
        const banEndDate = new Date(profile.ban_until).toLocaleString();
        setError(`You are temporarily banned from posting until ${banEndDate} due to a moderation violation.`);
        setIsSaving(false);
        return;
      }

      // Hive Moderation for edited content
      let moderationResult = { action: 'allow', category: 'NONE', score: 0 };
      if (originalPost.post_type !== 'voice') {
        try {
          const textToModerate = originalPost.post_type === 'quote' ? `${content} - ${quoteSignature}` : content;
          console.log('Calling Hive moderation for edited post:', { textToModerate });
          const { data: hiveData, error: hiveError } = await supabase.functions.invoke('hive-moderation', {
            body: { text: textToModerate, userId: user.id }
          });

          if (hiveError) {
            console.error('Hive moderation error:', hiveError);
            throw hiveError;
          }

          if (hiveData && hiveData.error) {
            console.error('Hive moderation returned error:', hiveData.error, 'Raw response:', hiveData.raw);
            throw new Error(hiveData.error);
          }
          
          console.log('Hive moderation result:', hiveData);
          moderationResult = hiveData || moderationResult;
        } catch (err) {
          console.error('Detailed Hive moderation error during edit:', err);
          setError('Moderation check failed. Please try again.');
          setIsSaving(false);
          return;
        }
      }

      // Update the post
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          content: content.trim(),
          quote_signature: originalPost.post_type === 'quote' ? quoteSignature.trim() : null,
          updated_at: new Date().toISOString(),
          moderation_reason: moderationResult.category,
          moderation_score: moderationResult.score > 0 ? moderationResult.score : null,
          is_quarantined: moderationResult.action === 'quarantine' || moderationResult.action === 'user_only'
        })
        .eq('id', postId)
        .eq('author_id', user.id);

      if (updateError) {
        console.error('Error updating post:', updateError);
        setError('Failed to update post. Please try again.');
        return;
      }

      // Apply 48h ban if Medium moderation triggered
      if (moderationResult.action === 'ban_and_label') {
        const banUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        await supabase.from('profiles').update({ ban_until: banUntil }).eq('id', user.id);
      }

      // Log to high-manual-review if quarantine or user_only triggered by critical
      if (moderationResult.action === 'quarantine' || moderationResult.action === 'user_only') {
        await supabase.from('high_manual_review').insert({
          post_id: postId,
          user_id: user.id,
          reason: `Hive moderation triggered on edit: ${moderationResult.category} (${moderationResult.action})`
        });
      }

      // Success
      onPostUpdated?.();
      onBack();

    } catch (error) {
      console.error('Error in handleSave:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getCharacterLimit = () => {
    if (!originalPost) return 0;
    switch (originalPost.post_type) {
      case 'text': return 420;
      case 'quote': return 300;
      default: return 0;
    }
  };

  const getSignatureLimit = () => {
    return originalPost?.post_type === 'quote' ? 100 : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-slate-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-400">Loading post...</div>
        </div>
      </div>
    );
  }

  if (error && !originalPost) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
            <AlertCircle className="w-10 h-10 text-red-100" />
          </div>
          <h3 className="text-2xl font-bold text-slate-100 mb-2">Cannot Edit Post</h3>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-semibold rounded-2xl transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-slate-100">Edit Post</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 font-medium transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Post Type Info */}
        <div className="mb-6 bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="font-medium">Post Type:</span>
            <span className="capitalize">{originalPost?.post_type}</span>
            {originalPost?.post_type === 'quote' && (
              <span className="text-slate-500">• Quote with signature</span>
            )}
          </div>
        </div>

        {/* Content Editor */}
        <div className="space-y-6">
          {/* Main Content */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-medium">
              {originalPost?.post_type === 'quote' ? 'Quote Content' : 'Post Content'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={originalPost?.post_type === 'quote' ? 'Enter the quote...' : 'What\'s on your mind?'}
              maxLength={getCharacterLimit()}
              className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none"
              rows={6}
            />
            <div className="text-right text-slate-400 text-sm">
              {content.length}/{getCharacterLimit()}
            </div>
          </div>

          {/* Quote Signature */}
          {originalPost?.post_type === 'quote' && (
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium">Signature</label>
              <input
                type="text"
                value={quoteSignature}
                onChange={(e) => setQuoteSignature(e.target.value)}
                placeholder="— Author name"
                maxLength={getSignatureLimit()}
                className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
              />
              <div className="text-right text-slate-400 text-sm">
                {quoteSignature.length}/{getSignatureLimit()}
              </div>
            </div>
          )}

          {/* Changes Indicator */}
          {hasChanges && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-blue-400 font-medium">You have unsaved changes</span>
              </div>
            </div>
          )}

          {/* Original Post Preview */}
          <div className="bg-slate-800/20 rounded-2xl p-4 border border-slate-700/50">
            <h3 className="text-slate-300 font-medium mb-3">Original Post</h3>
            <div className="text-slate-400 text-sm mb-2">
              Created: {new Date(originalPost?.created_at || '').toLocaleString()}
            </div>
            {originalPost?.updated_at !== originalPost?.created_at && (
              <div className="text-slate-400 text-sm mb-2">
                Last edited: {new Date(originalPost?.updated_at || '').toLocaleString()}
              </div>
            )}
            
            {originalPost?.post_type === 'text' && (
              <div className="text-slate-300 whitespace-pre-wrap">
                {originalPost.content}
              </div>
            )}
            
            {originalPost?.post_type === 'quote' && (
              <div className="bg-slate-700/30 border-l-4 border-slate-500 pl-4 py-3 rounded-r-xl">
                <div className="text-slate-300 italic mb-2">
                  "{originalPost.content}"
                </div>
                {originalPost.quote_signature && (
                  <div className="text-slate-400">
                    — {originalPost.quote_signature}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPost;