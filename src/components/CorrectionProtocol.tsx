import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CorrectionProtocolProps {
  postId: string;
  onBack: () => void;
}

interface EditHistoryEntry {
  id: string;
  content: string;
  quote_signature?: string;
  edited_at: string;
  version_number: number;
  what_was_wrong?: string;
  what_got_fixed?: string;
}

const CorrectionProtocol: React.FC<CorrectionProtocolProps> = ({ postId, onBack }) => {
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);
  const [currentPost, setCurrentPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [postId]);

  const loadData = async () => {
    try {
      const [historyResult, postResult] = await Promise.all([
        supabase
          .from('post_edit_history')
          .select('*')
          .eq('post_id', postId)
          .order('version_number', { ascending: false }),
        supabase
          .from('posts')
          .select('*, author:profiles!posts_author_id_fkey(username, name, profile_type)')
          .eq('id', postId)
          .single()
      ]);

      if (historyResult.error) {
        console.error('Error loading history:', historyResult.error);
        setError('Failed to load correction protocol');
        return;
      }

      if (postResult.error) {
        console.error('Error loading post:', postResult.error);
        setError('Failed to load post');
        return;
      }

      setEditHistory(historyResult.data || []);
      setCurrentPost(postResult.data);
    } catch (err) {
      console.error('Error in loadData:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isMediaProfile = currentPost?.author?.profile_type === 'media';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading correction protocol...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-lg">{error}</div>
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
              <h1 className="text-xl font-bold text-slate-100">
                {isMediaProfile ? 'Correction Protocol' : 'Edit History'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isMediaProfile && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-orange-300 font-semibold mb-1">Media Profile Corrections</h3>
                <p className="text-slate-400 text-sm">
                  This timeline shows all corrections made to this post, including what was wrong
                  and what was fixed. This demonstrates transparency and accountability.
                </p>
              </div>
            </div>
          </div>
        )}

        {editHistory.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
            <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-lg">No edits have been made to this post yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-green-400 font-bold text-lg">Current Version</h3>
                <div className="text-slate-400 text-sm">
                  Updated {formatDate(currentPost.updated_at)}
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                {currentPost.post_type === 'text' && (
                  <p className="text-slate-200 whitespace-pre-wrap">{currentPost.content}</p>
                )}
                {currentPost.post_type === 'quote' && (
                  <div className="border-l-4 border-slate-500 pl-4">
                    <p className="text-slate-200 italic mb-2">"{currentPost.content}"</p>
                    {currentPost.quote_signature && (
                      <p className="text-slate-400">— {currentPost.quote_signature}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-600 to-transparent"></div>

              {editHistory.map((entry) => (
                <div key={entry.id} className="relative pl-14 pb-8 last:pb-0">
                  <div className="absolute left-3 top-2 w-6 h-6 bg-slate-700 rounded-full border-2 border-slate-600 flex items-center justify-center">
                    <span className="text-xs text-slate-400">v{entry.version_number}</span>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-slate-300 font-semibold">
                        Version {entry.version_number}
                      </h4>
                      <div className="text-slate-500 text-sm">
                        {formatDate(entry.edited_at)}
                      </div>
                    </div>

                    {entry.what_was_wrong && entry.what_got_fixed && (
                      <div className="space-y-3 mb-4">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h5 className="text-red-300 font-semibold mb-1">What was wrong?</h5>
                              <p className="text-slate-300 text-sm">{entry.what_was_wrong}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h5 className="text-green-300 font-semibold mb-1">What got fixed?</h5>
                              <p className="text-slate-300 text-sm">{entry.what_got_fixed}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <h5 className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                        Previous Content
                      </h5>
                      {currentPost.post_type === 'text' && (
                        <p className="text-slate-300 whitespace-pre-wrap">{entry.content}</p>
                      )}
                      {currentPost.post_type === 'quote' && (
                        <div className="border-l-4 border-slate-600 pl-4">
                          <p className="text-slate-300 italic mb-2">"{entry.content}"</p>
                          {entry.quote_signature && (
                            <p className="text-slate-400">— {entry.quote_signature}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-400 font-bold text-lg">Original Version</h3>
                <div className="text-slate-500 text-sm">
                  Created {formatDate(currentPost.created_at)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CorrectionProtocol;
