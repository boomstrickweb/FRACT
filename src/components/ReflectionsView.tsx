import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Volume2, Send, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReflectionCard, { type ReflectionData } from './ReflectionCard';
import PostContent from './PostContent';
import CreateReflect from './CreateReflect';
import ReflectionEditHistory from './ReflectionEditHistory';

interface TargetPost {
  id: string;
  content: string;
  post_type: 'text' | 'quote' | 'voice' | 'poll';
  quote_signature?: string;
  voice_url?: string;
  is_anonymous: boolean;
  author_id: string;
  author?: {
    id: string;
    name: string;
    username?: string;
    profile_pic_url?: string;
  };
}

interface ReflectionsViewProps {
  post: TargetPost;
  currentUserId?: string;
  onBack: () => void;
  onProfileClick?: (userId: string) => void;
}

const ReflectionsView: React.FC<ReflectionsViewProps> = ({
  post,
  currentUserId,
  onBack,
  onProfileClick,
}) => {
  const [reflections, setReflections] = useState<ReflectionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateReflect, setShowCreateReflect] = useState(false);
  const [editingReflection, setEditingReflection] = useState<ReflectionData | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [hasReflected, setHasReflected] = useState(false);
  const [isPostOwner, setIsPostOwner] = useState(false);

  useEffect(() => {
    setIsPostOwner(currentUserId === post.author_id);
    loadReflections();
  }, [post.id, currentUserId]);

  const loadReflections = async () => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      const loggedInUserId = user?.id || currentUserId;

      const moderationFilter = loggedInUserId 
        ? `moderation_score.lt.3,moderation_score.is.null,moderation_reason.eq.spam,author_id.eq.${loggedInUserId}`
        : `moderation_score.lt.3,moderation_score.is.null,moderation_reason.eq.spam`;

      const { data, error } = await supabase
        .from('reflections')
        .select(`
          *,
          author:profiles!reflections_author_id_fkey (
            id, name, username, profile_pic_url, is_verified, verification_type, verification_reason, created_at
          )
        `)
        .eq('post_id', post.id)
        .or(moderationFilter)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading reflections:', error);
        return;
      }

      let enriched = data || [];

      if (loggedInUserId) {
        const { data: trackerEntry } = await supabase
          .from('reflection_tracker')
          .select('post_id')
          .eq('user_id', loggedInUserId)
          .eq('post_id', post.id)
          .maybeSingle();

        setHasReflected(!!trackerEntry);

        if (enriched.length > 0) {
          const ids = enriched.map(r => r.id);

          const { data: userReactions } = await supabase
            .from('reflection_reactions')
            .select('reflection_id, reaction_type')
            .eq('user_id', loggedInUserId)
            .in('reflection_id', ids);

          const reactionMap = new Map(userReactions?.map(r => [r.reflection_id, r.reaction_type]) || []);

          enriched = enriched.map(r => ({
            ...r,
            user_reaction: reactionMap.get(r.id) || null,
          }));
        }
      }

      setReflections(enriched);
    } catch (err) {
      console.error('Error in loadReflections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (reflectionId: string) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from('reflections')
        .delete()
        .eq('id', reflectionId)
        .eq('author_id', currentUserId);
      if (error) { console.error('Error deleting reflection:', error); return; }
      setReflections(prev => prev.filter(r => r.id !== reflectionId));
    } catch (err) {
      console.error('Error in handleDelete:', err);
    }
  };

  const handleReact = (reflectionId: string, reaction: 'respect' | 'reject' | 'observe' | null) => {
    setReflections(prev => prev.map(r => r.id === reflectionId ? { ...r, user_reaction: reaction } : r));
  };

  const getAuthorDisplay = () => {
    if (post.is_anonymous) return 'Anonymous User';
    return post.author?.name || 'Unknown User';
  };

  const renderPostPreview = () => {
    if (post.post_type === 'text') {
      return (
        <div className="text-slate-300 text-sm leading-relaxed line-clamp-3 whitespace-pre-wrap">
          <PostContent text={post.content} />
        </div>
      );
    }
    if (post.post_type === 'quote') {
      return (
        <div className="border-l-4 border-slate-500 pl-4">
          <div className="text-slate-300 text-sm italic line-clamp-2">"{post.content}"</div>
          {post.quote_signature && (
            <div className="text-slate-400 text-xs mt-1">— {post.quote_signature}</div>
          )}
        </div>
      );
    }
    if (post.post_type === 'voice') {
      return (
        <div className="flex items-center space-x-2 text-slate-400">
          <Volume2 className="w-4 h-4" />
          <span className="text-sm">Voice Note</span>
        </div>
      );
    }
    return null;
  };

  if (showCreateReflect) {
    return (
      <CreateReflect
        post={post}
        onBack={() => setShowCreateReflect(false)}
        onReflectCreated={() => {
          setShowCreateReflect(false);
          loadReflections();
        }}
      />
    );
  }

  if (editingReflection) {
    return (
      <EditReflectionInline
        reflection={editingReflection}
        onBack={() => setEditingReflection(null)}
        onUpdated={() => {
          setEditingReflection(null);
          loadReflections();
        }}
      />
    );
  }

  if (viewingHistoryId) {
    return (
      <ReflectionEditHistory
        reflectionId={viewingHistoryId}
        onBack={() => setViewingHistoryId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <h1 className="text-xl font-bold text-slate-100">Reflections</h1>
                {!isLoading && (
                  <span className="text-slate-400 text-sm">
                    ({(isPostOwner || hasReflected || reflections.length === 0) ? reflections.length : '?'})
                  </span>
                )}
              </div>
            </div>

            {currentUserId && !isPostOwner && !hasReflected && (
              <button
                onClick={() => setShowCreateReflect(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Reflect</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6">
        <div className="mb-6 bg-slate-800/30 border border-slate-700/40 rounded-2xl p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
              {!post.is_anonymous && post.author?.profile_pic_url ? (
                <img src={post.author.profile_pic_url} alt={getAuthorDisplay()} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                  <span className="text-slate-300 font-bold text-xs">
                    {post.is_anonymous ? '?' : (post.author?.name?.charAt(0) || 'U')}
                  </span>
                </div>
              )}
            </div>
            <span className="text-slate-400 text-sm font-medium">{getAuthorDisplay()}</span>
          </div>
          {renderPostPreview()}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Loading reflections...</p>
          </div>
        ) : !isPostOwner && !hasReflected ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-600/20 to-teal-600/20 border border-cyan-500/20 rounded-2xl flex items-center justify-center">
              <Eye className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-4">Share your perspective to view others</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
              FRACT prioritizes independent thinking before exposure to others' views.
            </p>
            {currentUserId ? (
              <button
                onClick={() => setShowCreateReflect(true)}
                className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-900/20"
              >
                Write a Reflection
              </button>
            ) : (
              <p className="text-slate-500 text-sm">Please sign in to share your perspective.</p>
            )}
          </div>
        ) : reflections.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-600/20 to-teal-600/20 border border-cyan-500/20 rounded-2xl flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">No reflections yet</h3>
            {currentUserId && !isPostOwner && hasReflected ? (
              <p className="text-cyan-400 text-sm">You have already reflected on this post. Each post can only be reflected on once.</p>
            ) : (
              <>
                <p className="text-slate-400 mb-6">Be the first to share your perspective on this post.</p>
                {currentUserId && !isPostOwner && (
                  <button
                    onClick={() => setShowCreateReflect(true)}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
                  >
                    Write a Reflection
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentUserId && !isPostOwner && hasReflected && (
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 text-center">
                <p className="text-cyan-400 text-sm">You have already reflected on this post. Each post can only be reflected on once.</p>
              </div>
            )}
            {reflections.map(reflection => (
              <ReflectionCard
                key={reflection.id}
                reflection={reflection}
                currentUserId={currentUserId}
                onEdit={(id) => {
                  const r = reflections.find(r => r.id === id);
                  if (r) setEditingReflection(r);
                }}
                onDelete={handleDelete}
                onViewHistory={(id) => setViewingHistoryId(id)}
                onProfileClick={onProfileClick}
                onReact={handleReact}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface EditReflectionInlineProps {
  reflection: ReflectionData;
  onBack: () => void;
  onUpdated: () => void;
}

const EditReflectionInline: React.FC<EditReflectionInlineProps> = ({ reflection, onBack, onUpdated }) => {
  const reflectionType = reflection.reflection_type || 'text';

  const [content, setContent] = useState(reflection.content || '');
  const [quoteSignature, setQuoteSignature] = useState(reflection.quote_signature || '');
  const [isExplicit, setIsExplicit] = useState(reflection.is_explicit);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');


  const canSubmit = (() => {
    if (reflectionType === 'voice') return isExplicit !== reflection.is_explicit;
    if (reflectionType === 'text') return content.trim().length > 0 && content.trim().length <= 420 &&
      (content.trim() !== (reflection.content || '').trim() || isExplicit !== reflection.is_explicit);
    if (reflectionType === 'quote') return content.trim().length > 0 && quoteSignature.trim().length > 0 &&
      (content.trim() !== (reflection.content || '').trim() ||
       quoteSignature.trim() !== (reflection.quote_signature || '').trim() ||
       isExplicit !== reflection.is_explicit);
    return false;
  })();

  const handleSave = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setError('');

    try {
      const updates: any = {
        is_explicit: isExplicit,
        updated_at: new Date().toISOString(),
      };

      if (reflectionType !== 'voice') {
        updates.content = content.trim();
      }
      if (reflectionType === 'quote') {
        updates.quote_signature = quoteSignature.trim();
      }

      const { error: updateError } = await supabase
        .from('reflections')
        .update(updates)
        .eq('id', reflection.id);

      if (updateError) {
        setError('Failed to update reflection. Please try again.');
        return;
      }
      onUpdated();
    } catch (_) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-slate-100">Edit Reflection</h1>
            </div>
            <button
              onClick={handleSave}
              disabled={!canSubmit || isLoading}
              className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-300 text-sm disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {reflectionType === 'voice' && (
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5">
            <div className="flex items-center space-x-3 text-slate-300">
              <Volume2 className="w-5 h-5 text-cyan-400" />
              <span className="text-sm">Voice notes cannot have their audio edited, only the explicit flag.</span>
            </div>
          </div>
        )}

        {reflectionType === 'text' && (
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={420}
              autoFocus
              className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all duration-300 resize-none text-sm sm:text-base"
              rows={7}
            />
            <div className={`text-right text-xs ${content.length > 400 ? 'text-amber-400' : 'text-slate-400'}`}>
              {content.length}/420
            </div>
          </div>
        )}

        {reflectionType === 'quote' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium text-sm">Quote</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={300}
                autoFocus
                className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all duration-300 resize-none text-sm sm:text-base"
                rows={4}
              />
              <div className={`text-right text-xs ${content.length > 280 ? 'text-amber-400' : 'text-slate-400'}`}>
                {content.length}/300
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium text-sm">Signature</label>
              <input
                type="text"
                value={quoteSignature}
                onChange={(e) => setQuoteSignature(e.target.value)}
                maxLength={100}
                className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all duration-300 text-sm sm:text-base"
                placeholder="-- Author name"
              />
              <div className="text-right text-slate-400 text-xs">{quoteSignature.length}/100</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-slate-400" />
            <span className="text-slate-200 font-medium text-sm">Explicit Content</span>
          </div>
          <button
            onClick={() => setIsExplicit(!isExplicit)}
            className={`relative w-10 h-5 rounded-full transition-all duration-300 ${isExplicit ? 'bg-red-500' : 'bg-slate-600'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isExplicit ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReflectionsView;
