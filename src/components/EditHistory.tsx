import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EditHistoryEntry {
  id: string;
  content: string;
  quote_signature?: string;
  edited_at: string;
  version_number: number;
}

interface EditHistoryProps {
  postId: string;
  onBack: () => void;
}

const EditHistory: React.FC<EditHistoryProps> = ({ postId, onBack }) => {
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const [currentPost, setCurrentPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEditHistory();
  }, [postId]);

  const loadEditHistory = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Load current post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey (
            id,
            name,
            profile_pic_url
          )
        `)
        .eq('id', postId)
        .single();

      if (postError) {
        console.error('Error loading post:', postError);
        setError('Failed to load post');
        return;
      }

      setCurrentPost(post);

      // Load edit history
      const { data: historyData, error: historyError } = await supabase
        .from('post_edit_history')
        .select('*')
        .eq('post_id', postId)
        .order('version_number', { ascending: false });

      if (historyError) {
        console.error('Error loading edit history:', historyError);
        setError('Failed to load edit history');
        return;
      }

      setHistory(historyData || []);

    } catch (error) {
      console.error('Error in loadEditHistory:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDisplayName = (author: any) => {
    if (!author) return 'Unknown User';
    if (currentPost?.is_anonymous) return 'Anonymous User';
    return author.name || `User ${author.id?.slice(0, 8) || 'unknown'}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-slate-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-400">Loading edit history...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Clock className="w-10 h-10 text-red-100" />
          </div>
          <h3 className="text-2xl font-bold text-slate-100 mb-2">Error Loading History</h3>
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
              <h1 className="text-xl font-bold text-slate-100">Edit History</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Current Post */}
        {currentPost && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Current Version</h2>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6">
              {/* Author */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                  {!currentPost.is_anonymous && currentPost.author?.profile_pic_url ? (
                    <img
                      src={currentPost.author.profile_pic_url}
                      alt={getDisplayName(currentPost.author)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-300" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-slate-200">
                    {getDisplayName(currentPost.author)}
                  </div>
                  <div className="text-slate-400 text-sm">
                    {formatDate(currentPost.updated_at)}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="text-slate-300">
                {currentPost.post_type === 'text' && (
                  <div className="whitespace-pre-wrap">{currentPost.content}</div>
                )}
                {currentPost.post_type === 'quote' && (
                  <div className="bg-slate-700/30 border-l-4 border-slate-500 pl-4 py-3 rounded-r-xl">
                    <div className="italic mb-2">"{currentPost.content}"</div>
                    {currentPost.quote_signature && (
                      <div className="text-slate-400">— {currentPost.quote_signature}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit History */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4">
            Edit History ({history.length} {history.length === 1 ? 'edit' : 'edits'})
          </h2>
          
          {history.length > 0 ? (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-slate-800/20 backdrop-blur-sm border border-slate-700/30 rounded-3xl p-6"
                >
                  {/* Version Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300 font-medium">
                        Version {entry.version_number}
                      </span>
                    </div>
                    <div className="text-slate-400 text-sm">
                      {formatDate(entry.edited_at)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-slate-300">
                    {currentPost?.post_type === 'text' && (
                      <div className="whitespace-pre-wrap">{entry.content}</div>
                    )}
                    {currentPost?.post_type === 'quote' && (
                      <div className="bg-slate-700/20 border-l-4 border-slate-500/50 pl-4 py-3 rounded-r-xl">
                        <div className="italic mb-2">"{entry.content}"</div>
                        {entry.quote_signature && (
                          <div className="text-slate-400">— {entry.quote_signature}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-10 h-10 text-slate-100" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100 mb-2">No Edit History</h3>
              <p className="text-slate-400 text-lg">
                This post hasn't been edited yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating elements */}
      <div className="fixed top-20 left-10 w-2 h-2 bg-slate-500 rounded-full opacity-60 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-32 right-16 w-3 h-3 bg-slate-400 rounded-full opacity-40 animate-pulse delay-1000 pointer-events-none"></div>
      <div className="fixed top-1/3 right-8 w-1 h-1 bg-slate-600 rounded-full opacity-80 animate-pulse delay-500 pointer-events-none"></div>
    </div>
  );
};

export default EditHistory;