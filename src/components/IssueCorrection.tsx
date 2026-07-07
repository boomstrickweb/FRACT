import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IssueCorrectionProps {
  postId: string;
  onBack: () => void;
  onCorrectionIssued?: () => void;
}

const IssueCorrection: React.FC<IssueCorrectionProps> = ({
  postId,
  onBack,
  onCorrectionIssued,
}) => {
  const [post, setPost] = useState<any>(null);
  const [content, setContent] = useState('');
  const [quoteSignature, setQuoteSignature] = useState('');
  const [whatWasWrong, setWhatWasWrong] = useState('');
  const [whatGotFixed, setWhatGotFixed] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) {
        setError('Failed to load post');
        console.error('Error loading post:', error);
        return;
      }

      setPost(data);
      setContent(data.content || '');
      setQuoteSignature(data.quote_signature || '');
    } catch (err) {
      console.error('Error in loadPost:', err);
      setError('Failed to load post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueCorrection = async () => {
    if (!post) return;

    if (!content.trim()) {
      setError('Post content cannot be empty');
      return;
    }

    if (post.post_type === 'quote' && !quoteSignature.trim()) {
      setError('Quote signature is required');
      return;
    }

    if (!whatWasWrong.trim()) {
      setError('Please describe what was wrong');
      return;
    }

    if (!whatGotFixed.trim()) {
      setError('Please describe what got fixed');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data: historyData, error: historyCountError } = await supabase
        .from('post_edit_history')
        .select('version_number')
        .eq('post_id', postId)
        .order('version_number', { ascending: false })
        .limit(1);

      if (historyCountError) {
        console.error('Error getting version number:', historyCountError);
        setError('Failed to save correction');
        return;
      }

      const nextVersion = historyData && historyData.length > 0
        ? historyData[0].version_number + 1
        : 1;

      const { error: insertError } = await supabase
        .from('post_edit_history')
        .insert({
          post_id: postId,
          content: post.content,
          quote_signature: post.quote_signature,
          version_number: nextVersion,
          what_was_wrong: whatWasWrong.trim(),
          what_got_fixed: whatGotFixed.trim(),
        });

      if (insertError) {
        console.error('Error inserting edit history:', insertError);
        setError('Failed to save correction history');
        return;
      }

      const updateData: any = {
        content: content.trim(),
        updated_at: new Date().toISOString(),
      };

      if (post.post_type === 'quote') {
        updateData.quote_signature = quoteSignature.trim();
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId);

      if (updateError) {
        console.error('Error updating post:', updateError);
        setError('Failed to update post');
        return;
      }

      onCorrectionIssued?.();
      onBack();
    } catch (err) {
      console.error('Error in handleIssueCorrection:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const getCharacterLimit = () => {
    if (!post) return 420;
    return post.post_type === 'quote' ? 300 : 420;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-lg">Post not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
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
              <h1 className="text-xl font-bold text-slate-100">Issue Correction</h1>
            </div>

            <button
              onClick={handleIssueCorrection}
              disabled={isSaving || !content.trim() || !whatWasWrong.trim() || !whatGotFixed.trim()}
              className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Save Correction</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-orange-300 font-semibold mb-1">Media Profile Correction Protocol</h3>
              <p className="text-slate-400 text-sm">
                As a media profile, you must document what was wrong and what was fixed.
                This information will be publicly visible in the Correction Protocol.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-slate-200 font-semibold mb-2 text-lg">
              Edit Post Content
            </label>
            {post.post_type === 'text' && (
              <div className="space-y-2">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Update your post content..."
                  maxLength={420}
                  className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none"
                  rows={6}
                />
                <div className="text-right text-slate-400 text-sm">
                  {content.length}/{getCharacterLimit()}
                </div>
              </div>
            )}

            {post.post_type === 'quote' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium">Quote</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Update the quote..."
                    maxLength={300}
                    className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none"
                    rows={4}
                  />
                  <div className="text-right text-slate-400 text-sm">
                    {content.length}/300
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium">Signature</label>
                  <input
                    type="text"
                    value={quoteSignature}
                    onChange={(e) => setQuoteSignature(e.target.value)}
                    placeholder="— Author name"
                    maxLength={100}
                    className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  />
                  <div className="text-right text-slate-400 text-sm">
                    {quoteSignature.length}/100
                  </div>
                </div>
              </div>
            )}

            {post.post_type === 'voice' && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center">
                <p className="text-slate-400">Voice posts cannot be edited</p>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-700">
            <h3 className="text-slate-200 font-semibold mb-4 text-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>Correction Documentation (Required)</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-2">
                  What was wrong?
                </label>
                <textarea
                  value={whatWasWrong}
                  onChange={(e) => setWhatWasWrong(e.target.value)}
                  placeholder="Describe the error, inaccuracy, or issue that needs correction..."
                  className="w-full p-4 bg-slate-800/50 border border-red-500/30 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">
                  What got fixed?
                </label>
                <textarea
                  value={whatGotFixed}
                  onChange={(e) => setWhatGotFixed(e.target.value)}
                  placeholder="Explain the correction made and the accurate information..."
                  className="w-full p-4 bg-slate-800/50 border border-green-500/30 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-green-300 font-semibold mb-1">Transparency Commitment</h3>
                <p className="text-slate-400 text-sm">
                  Your correction details will be visible to all users, demonstrating your
                  commitment to accuracy and accountability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueCorrection;
