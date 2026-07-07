import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Heart, X, Eye, Bookmark, Flag, Edit3, Trash2, Play, Pause, Volume2, MessageSquare, Repeat2, Clock, Lightbulb, HelpCircle, FlaskConical, User, Link2, AlertTriangle, Shield, Bot, Eye as EyeIcon, ShieldAlert, Send, Share2, Sparkles, Cake } from 'lucide-react';
import ManualReview from './ManualReview';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import VerificationBadge from './VerificationBadge';
import ReportModal from './ReportModal';
import ModerationModal from './ModerationModal';
import PostContent from './PostContent';
import PollDisplay from './PollDisplay';

interface PostData {
  id: string;
  author_id: string;
  content: string;
  post_type: 'text' | 'quote' | 'voice' | 'poll';
  quote_signature?: string;
  voice_url?: string;
  is_explicit: boolean;
  is_anonymous: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  reply_to_post_id?: string;
  disappears_at?: string;
  perspective_lock?: 'opinion' | 'question' | 'hypothesis' | 'personal_experience' | null;
  sources?: string[];
  source_type?: string;
  source_description?: string;
  moderation_reason?: 'NONE' | 'child_exploitation' | 'child_safety' | 'self_harm_intent' | 'bullying' | 'violent_description' | 'drugs' | 'self_harm' | 'hate' | 'violence' | 'weapons';
  original_post?: {
    id: string;
    content: string;
    post_type: 'text' | 'quote' | 'voice' | 'poll';
    quote_signature?: string;
    voice_url?: string;
    author_id?: string;
    author?: {
      id: string;
      username: string;
      name: string;
      profile_pic_url?: string;
    };
    is_anonymous: boolean;
    created_at: string;
  };
  repost_info?: {
    user_id: string;
    username: string;
    name: string;
    created_at: string;
  };
  author?: {
    id: string;
    name: string;
    username: string;
    profile_pic_url?: string;
    bio?: string;
    is_verified?: boolean;
    verification_type?: string;
    verification_reason?: string;
    profile_type?: string;
  };
  ai_flagged?: 'ai_assisted' | 'ai_generated' | null;
  ai_flag_source?: 'user' | 'system' | null;
  ai_detection_score?: number | null;
  is_saved?: boolean;
  is_reposted?: boolean;
  is_anniversary?: boolean;
  user_reaction?: 'respect' | 'reject' | 'observe' | null;
  reaction_counts?: {
    respect_count: number;
    reject_count: number;
    observe_count: number;
  };
}

interface PostCardProps {
  post: PostData;
  currentUserId?: string;
  onSave?: (postId: string, isSaved: boolean) => void;
  onReport?: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  showActions?: boolean;
  onReact?: (postId: string, reaction: 'respect' | 'reject' | 'observe' | null) => void;
  onProfileClick?: (userId: string) => void;
  onShowEditHistory?: (postId: string) => void;
  onReflect?: (post: PostData) => void;
  onViewReflections?: (post: PostData) => void;
  reflectionCount?: number;
}

const PostCard: React.FC<PostCardProps> = React.memo(({
  post,
  currentUserId,
  onSave,
  onReport: _onReport,
  onEdit,
  onDelete,
  showActions = true,
  onReact,
  onProfileClick,
  onShowEditHistory,
  onReflect,
  onViewReflections,
  reflectionCount,
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [hasViewed, setHasViewed] = useState(false);
  const [showExplicitContent, setShowExplicitContent] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [showManualReview, setShowManualReview] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [localReflectionCount, setLocalReflectionCount] = useState<number>(reflectionCount || 0);
  const [isActuallyEdited, setIsActuallyEdited] = useState(false);
  const [reactionCounts, setReactionCounts] = useState({
    respect_count: 0,
    reject_count: 0,
    observe_count: 0
  });
  const [showSources, setShowSources] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const isOwnPost = currentUserId === post.author_id;

  const checkIsAdmin = React.useCallback(async () => {
    if (!currentUserId) return;

    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', currentUserId)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        return;
      }

      setIsAdmin(data?.is_admin || false);
    } catch (error) {
      console.error('Error in checkIsAdmin:', error);
    }
  }, [currentUserId]);

  const loadReflectionCount = React.useCallback(async () => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return;
      }

      const { count, error } = await supabase
        .from('reflections')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      if (error) {
        console.error('Error loading reflection count:', error);
        return;
      }

      if (count !== null) {
        setLocalReflectionCount(count);
      }
    } catch (error) {
      console.error('Error in loadReflectionCount:', error);
    }
  }, [post.id]);

  const checkEditHistory = React.useCallback(async () => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return;
      }

      const { count } = await supabase
        .from('post_edit_history')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      if (count && count > 0) {
        setIsActuallyEdited(true);
      }
    } catch (error) {
      // Silently fail
    }
  }, [post.id]);

  const loadReactionCounts = React.useCallback(async () => {
    if (!isOwnPost || !currentUserId) return;

    try {
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('Supabase not configured, skipping reaction counts');
        return;
      }

      // Direct query for reaction counts
      const { data, error } = await supabase
        .from('post_reactions')
        .select('reaction_type')
        .eq('post_id', post.id);

      if (error) {
        console.error('Error loading reaction counts:', error);
        return;
      }

      if (data) {
        const counts = {
          respect_count: data.filter(r => r.reaction_type === 'respect').length,
          reject_count: data.filter(r => r.reaction_type === 'reject').length,
          observe_count: data.filter(r => r.reaction_type === 'observe').length
        };
        setReactionCounts(counts);
      }
    } catch {
      console.log('Supabase not available for reaction counts');
    }
  }, [currentUserId, isOwnPost, post.id]);

  const recordView = React.useCallback(async () => {
    if (!currentUserId || hasViewed) return;

    try {
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return;
      }

      await supabase.rpc('increment_post_view', {
        post_uuid: post.id,
        user_uuid: currentUserId
      });
    } catch {
      // Silently handle view recording errors
    }
  }, [currentUserId, post.id, hasViewed]);

  useEffect(() => {
    // Check if user is admin
    if (currentUserId) {
      checkIsAdmin();
    }
  }, [currentUserId, checkIsAdmin]);

  useEffect(() => {
    // Load reflection count
    loadReflectionCount();

    // Check if post has edit history
    checkEditHistory();

    // Load reaction counts if user is post author
    if (isOwnPost) {
      loadReactionCounts();
    }
  }, [post.id, isOwnPost, loadReflectionCount, checkEditHistory, loadReactionCounts]);

  useEffect(() => {
    // Record view when post comes into view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasViewed && currentUserId) {
          recordView();
          setHasViewed(true);
        }
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [hasViewed, currentUserId, recordView]);



  const handleReaction = async (reaction: 'respect' | 'reject' | 'observe') => {
    if (!currentUserId) {
      onReact?.(post.id, reaction);
      return;
    }
    if (isOwnPost) return;
    
    const currentReaction = post.user_reaction;
    const newReaction = currentReaction === reaction ? null : reaction;
    
    console.log('🎯 Reaction clicked:', {
      postId: post.id,
      currentReaction,
      clickedReaction: reaction,
      newReaction,
      userId: currentUserId
    });
    
    try {
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('Supabase not configured, cannot handle reactions');
        return;
      }

      // Handle database update first
      if (newReaction) {
        console.log('💾 Saving reaction to database:', newReaction);
        const { error: upsertError } = await supabase
          .from('post_reactions')
          .upsert({
            user_id: currentUserId,
            post_id: post.id,
            reaction_type: newReaction
          }, {
            onConflict: 'user_id, post_id'
          });

        if (upsertError) {
          console.error('Error adding reaction:', upsertError);
          return;
        }
        console.log('✅ Reaction saved successfully');
      } else {
        console.log('🗑️ Removing reaction from database');
        const { error: deleteError } = await supabase
          .from('post_reactions')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id);

        if (deleteError) {
          console.error('Error removing reaction:', deleteError);
          return;
        }
        console.log('✅ Reaction removed successfully');
      }
      
      // Update local state AFTER successful database update
      onReact?.(post.id, newReaction);
      
      // Reload reaction counts for own posts
      if (isOwnPost) {
        setTimeout(() => {
          loadReactionCounts();
        }, 100);
      }
      
    } catch (error) {
      console.log('Supabase not available for reactions');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return postDate.toLocaleDateString();
  };

  const formatTimeRemaining = (disappearsAt: string) => {
    const now = new Date();
    const expiryDate = new Date(disappearsAt);
    const diffInSeconds = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);

    if (diffInSeconds <= 0) return 'soon';
    if (diffInSeconds < 60) return `in ${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `in ${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `in ${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `in ${Math.floor(diffInSeconds / 86400)}d`;
    
    return `on ${expiryDate.toLocaleDateString()}`;
  };
  const handleAudioPlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    onSave?.(post.id, !post.is_saved);
  };

  const handleReportPost = async (postId: string, reason: string, description?: string) => {
    if (!currentUserId) {
      _onReport?.(postId);
      return;
    }

    try {
      const { error } = await supabase
        .from('post_reports')
        .insert({
          reporter_id: currentUserId,
          post_id: postId,
          reported_user_id: post.author_id,
          reason: reason,
          ...(description ? { description } : {})
        });

      if (error) {
        console.error('Error reporting post:', error);
        return;
      }

      setShowReportModal(false);
    } catch (error) {
      console.error('Error in handleReportPost:', error);
    }
  };

  const handleAuthorClick = () => {
    if (!post.is_anonymous && post.author?.id) {
      navigate(`/u/${post.author.id}`);
    }
  };

  const getDisplayName = (author: Record<string, any> | undefined, authorId: string, isAnonymous: boolean) => {
    if (isAnonymous) return 'Anonymous User';
    if (author?.name && author.name.trim()) return author.name;
    if (author?.username && author.username.trim()) return author.username;
    return author?.name || `User ${authorId.slice(0, 8)}`;
  };

  const renderPerspectiveLock = () => {
    if (!post.perspective_lock) return null;

    const perspectives = {
      opinion: {
        icon: Lightbulb,
        label: 'Opinion',
        color: 'bg-blue-600 text-white'
      },
      question: {
        icon: HelpCircle,
        label: 'Question',
        color: 'bg-green-600 text-white'
      },
      hypothesis: {
        icon: FlaskConical,
        label: 'Hypothesis',
        color: 'bg-amber-600 text-white'
      },
      personal_experience: {
        icon: User,
        label: 'Personal Experience',
        color: 'bg-rose-600 text-white'
      }
    };

    const perspective = perspectives[post.perspective_lock];
    if (!perspective) return null;

    const Icon = perspective.icon;

    return (
      <div className="mb-3 sm:mb-4">
        <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ${perspective.color}`}>
          <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>{perspective.label}</span>
        </div>
      </div>
    );
  };


  const renderPostContent = () => {
    // If explicit content OR Medium moderation (score 2) and not shown yet, show blurred version
    if ((post.is_explicit || (post.moderation_score === 2 && post.moderation_reason !== 'spam')) && !showExplicitContent) {
      return (
        <div className="relative min-h-[100px]">
          <div className="filter blur-lg select-none pointer-events-none">
            {getActualContent()}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setShowExplicitContent(true)}
              className={`px-4 sm:px-6 py-2 sm:py-3 border rounded-xl sm:rounded-2xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm sm:text-base ${
                post.moderation_score === 2 && post.moderation_reason !== 'spam'
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-300 hover:text-amber-200' 
                  : 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-300 hover:text-red-200'
              }`}
            >
              Show Content
            </button>
          </div>
        </div>
      );
    }

    return getActualContent();
  };

  const renderOriginalPost = () => {
    if (!post.original_post) return null;

    const originalPost = post.original_post;
    
    return (
      <div className="mt-3 sm:mt-4 bg-slate-800/20 border border-slate-700/30 rounded-xl sm:rounded-2xl p-3 sm:p-4">
        {/* Original post author */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
            {!originalPost.is_anonymous && originalPost.author?.profile_pic_url ? (
              <img
                src={originalPost.author.profile_pic_url.includes('supabase.co') && originalPost.author.profile_pic_url.includes('profile-pictures')
                  ? `${originalPost.author.profile_pic_url}?width=64&height=64&resize=cover`
                  : originalPost.author.profile_pic_url}
                alt={originalPost.author.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                <span className="text-slate-300 font-bold text-xs sm:text-sm">
                  {originalPost.is_anonymous ? '?' : originalPost.author?.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-300 text-xs sm:text-sm font-medium truncate">
              {originalPost.is_anonymous ? 'Anonymous User' : originalPost.author?.name || 'Unknown User'}
            </div>
            {!originalPost.is_anonymous && (
              <div className="text-slate-500 text-xs truncate">
                {originalPost.author_id?.slice(0, 8) || 'unknown'}...
              </div>
            )}
          </div>
        </div>

        {/* Original post content */}
        <div className="text-slate-300 text-xs sm:text-sm">
          {originalPost.post_type === 'text' && (
            <div className="whitespace-pre-wrap"><PostContent text={originalPost.content} /></div>
          )}
          {originalPost.post_type === 'quote' && (
            <div className="bg-slate-700/20 border-l-2 border-slate-500 pl-2 sm:pl-3 py-2 rounded-r-lg">
              <div className="italic mb-1">"{originalPost.content}"</div>
              {originalPost.quote_signature && (
                <div className="text-slate-400 text-xs sm:text-sm">— {originalPost.quote_signature}</div>
              )}
            </div>
          )}
          {originalPost.post_type === 'voice' && originalPost.voice_url && (
            <div className="bg-slate-700/20 rounded-lg p-2 sm:p-3 border border-slate-600/50">
              <div className="flex items-center space-x-2 text-slate-400">
                <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs">Voice Note</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  const getActualContent = () => {
    if (post.post_type === 'text') {
      return (
        <div className="text-slate-200 text-sm sm:text-base lg:text-lg leading-relaxed whitespace-pre-wrap">
          <PostContent text={post.content} />
        </div>
      );
    }

    if (post.post_type === 'quote') {
      return (
        <div className="bg-slate-800/30 border-l-4 border-slate-500 pl-4 sm:pl-6 py-3 sm:py-4 rounded-r-xl sm:rounded-r-2xl">
          <div className="text-slate-200 text-sm sm:text-base lg:text-lg leading-relaxed italic mb-2 sm:mb-3">
            "<PostContent text={post.content} />"
          </div>
          {post.quote_signature && (
            <div className="text-slate-400 font-medium text-sm sm:text-base">
              — {post.quote_signature}
            </div>
          )}
        </div>
      );
    }

    if (post.post_type === 'voice' && post.voice_url) {
      return (
        <div className="bg-slate-800/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-700">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={handleAudioPlay}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-6 sm:h-6" /> : <Play className="w-4 h-4 sm:w-6 sm:h-6" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <Volume2 className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 text-xs sm:text-sm">Voice Note</span>
                {audioDuration > 0 && (
                  <span className="text-slate-500 text-xs sm:text-sm">
                    {formatAudioTime(audioDuration)}
                  </span>
                )}
              </div>

              <div className="w-full bg-slate-700 rounded-full h-1 sm:h-2">
                <div
                  className="bg-gradient-to-r from-slate-500 to-slate-400 h-1 sm:h-2 rounded-full transition-all duration-300"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={post.voice_url}
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      );
    }

    if (post.post_type === 'poll') {
      return (
        <PollDisplay
          postId={post.id}
          createdBy={post.author_id}
          currentUserId={currentUserId}
        />
      );
    }

    return null;
  };

  if (post.moderation_score && post.moderation_score >= 3 && post.moderation_reason !== 'spam' && !isOwnPost && !isAdmin) {
    return null;
  }

  return (
    <div 
      ref={cardRef}
      className="bg-slate-800/20 backdrop-blur-md border border-slate-700/40 rounded-3xl p-4 sm:p-7 hover:bg-slate-800/40 hover:border-slate-600/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/10 group/card"
    >
      {/* Repost indicator */}
      {post.repost_info && (
        <div className="mb-3 sm:mb-4 flex items-center space-x-2 text-slate-400 text-xs sm:text-sm">
          <Repeat2 className="w-4 h-4" />
          <span>
            <span className="font-medium text-slate-300">{post.repost_info.name}</span> reposted
          </span>
          <span>•</span>
          <span>{formatTimeAgo(post.repost_info.created_at)}</span>
        </div>
      )}

      {/* Reply indicator */}
      {post.reply_to_post_id && (
        <div className="mb-3 sm:mb-4 flex items-center space-x-2 text-slate-400 text-xs sm:text-sm">
          <MessageSquare className="w-4 h-4" />
          <span>Reply</span>
        </div>
      )}

      {/* Explicit Content Warning */}
      {post.is_explicit && (
        <div className="mb-3 sm:mb-4 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-2 sm:p-3 flex items-center space-x-2">
          <EyeIcon className="w-5 h-5 text-red-400" />
          <span className="text-red-400 font-medium text-sm sm:text-base">Explicit Content</span>
        </div>
      )}

      {/* Anniversary Celebration */}
      {post.is_anniversary && (
        <div className="mb-4 relative overflow-hidden bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/30 rounded-2xl p-4 sm:p-6 group/anniversary">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover/anniversary:scale-110 transition-transform duration-500">
                <Cake className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h4 className="text-slate-100 font-bold text-base sm:text-lg">FRACT 1-Year Anniversary</h4>
                <p className="text-slate-400 text-xs sm:text-sm">This is a special anniversary post!</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCelebration(true);
                setCelebrationKey(prev => prev + 1);
                // Auto-hide after 5 seconds
                setTimeout(() => setShowCelebration(false), 5000);
              }}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-purple-900/20 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center space-x-2"
            >
              <Cake className="w-4 h-4" />
              <span>let's celebrate</span>
            </button>
          </div>

          {/* Celebration Animation Overlay */}
          {showCelebration && (
            <div key={celebrationKey} className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
              <div className="relative">
                {/* Cake Container */}
                <div className="animate-bounce duration-1000">
                  <div className="relative text-8xl sm:text-9xl">
                    🎂
                    {/* Floating Sparkles around the cake */}
                    <div className="absolute -top-4 -right-4 animate-ping">✨</div>
                    <div className="absolute -bottom-2 -left-4 animate-bounce delay-300">🎉</div>
                    <div className="absolute top-1/2 -right-8 animate-pulse text-4xl">🧁</div>
                  </div>
                </div>
                
                {/* Background Glow */}
                <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                
                {/* Text Animation */}
                <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <h2 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-400 animate-pulse text-center">
                    HAPPY 1 YEAR!
                  </h2>
                </div>
              </div>
              
              {/* Confetti effect using CSS */}
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes confetti-fall {
                  0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
                .confetti {
                  position: absolute;
                  width: 10px;
                  height: 10px;
                  background: #a855f7;
                  top: -10px;
                  animation: confetti-fall 4s linear forwards;
                }
              `}} />
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ['#a855f7', '#ec4899', '#eab308', '#3b82f6', '#22c55e'][Math.floor(Math.random() * 5)],
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 3}s`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Moderation Warning */}
      {post.moderation_reason && post.moderation_reason !== 'NONE' && post.moderation_reason !== 'spam' && (
        <div className={`mb-3 sm:mb-4 border rounded-xl sm:rounded-2xl p-3 sm:p-4 ${
          post.moderation_score >= 3 ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className="flex items-start space-x-3">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              post.moderation_score >= 3 ? 'text-red-400' : 'text-amber-400'
            }`} />
            <div className="flex-1">
              <div className={`font-semibold text-sm sm:text-base mb-1 ${
                post.moderation_score >= 3 ? 'text-red-400' : 'text-amber-400'
              }`}>
                {post.moderation_score >= 3 ? 'Post Quarantined' : 'Content Not Promoted'}
              </div>
              <p className={`text-xs sm:text-sm leading-relaxed ${
                post.moderation_score >= 3 ? 'text-red-300/90' : 'text-amber-300/90'
              }`}>
                {`This post has been moderated for ${post.moderation_reason.replace(/_/g, ' ')}.`}
                {post.moderation_score === 1 && " It has been removed from Discover."}
                {post.moderation_score === 2 && " It has been removed from Discover and labeled."}
                {post.moderation_score >= 3 && " It is currently in quarantine and only visible to you."}
              </p>
              
              {isOwnPost && !appealSubmitted && (
                <button
                  onClick={() => setShowManualReview(true)}
                  className="mt-3 flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Manual Review</span>
                </button>
              )}
              {appealSubmitted && (
                <p className="mt-2 text-[10px] font-bold text-slate-400 italic">Appeal submitted</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Quick Publish (for Quarantined posts) */}
      {isAdmin && post.is_quarantined && (
        <div className="mb-3 sm:mb-4 bg-blue-500/10 border border-blue-500/30 rounded-xl sm:rounded-2xl p-3">
          <button
            onClick={async () => {
              const { error } = await supabase.rpc('publish_quarantined_post', { target_post_id: post.id });
              if (error) {
                console.error('Error publishing:', error);
                alert('Failed to publish');
              } else {
                window.location.reload();
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Publish to Feed</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center space-x-3">
          {/* Profile Picture */}
        <div 
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 group-hover/card:ring-2 group-hover/card:ring-blue-500/50 transition-all duration-500 ${
              !post.is_anonymous && onProfileClick ? 'cursor-pointer hover:ring-2 hover:ring-slate-500 transition-all duration-300' : ''
            }`}
            onClick={handleAuthorClick}
          >
            {!post.is_anonymous && post.author?.profile_pic_url ? (
              <img
                src={post.author.profile_pic_url.includes('supabase.co') && post.author.profile_pic_url.includes('profile-pictures') 
                  ? `${post.author.profile_pic_url}?width=96&height=96&resize=cover`
                  : post.author.profile_pic_url}
                alt={getDisplayName(post.author, post.author_id, post.is_anonymous)}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                <span className="text-slate-300 font-bold text-sm sm:text-lg">
                  {post.is_anonymous ? '?' : (post.author?.name?.charAt(0) || post.author_id?.charAt(0).toUpperCase() || '?')}
                </span>
              </div>
            )}
          </div>

          {/* User Info */}
          <div 
            className={`min-w-0 flex-1 ${!post.is_anonymous && onProfileClick ? 'cursor-pointer' : ''}`}
            onClick={handleAuthorClick}
          >
            <div className="flex items-center space-x-2">
              <h3 className={`font-bold text-slate-100 text-sm sm:text-base truncate ${
                !post.is_anonymous && onProfileClick ? 'hover:text-slate-300 transition-colors' : ''
              }`}>
                {getDisplayName(post.author, post.author_id, post.is_anonymous)}
              </h3>
              {!post.is_anonymous && post.author?.is_verified && (
                <VerificationBadge
                  isVerified={true}
                  verificationType={post.author.verification_type}
                  verificationReason={post.author.verification_reason}
                  size="sm"
                />
              )}
              {!post.is_anonymous && post.author?.username && (
                <span className="text-slate-400 text-xs sm:text-sm truncate">
                  @{post.author.username}
                </span>
              )}
              {!post.is_anonymous && post.author_id && !post.author?.username && (
                <span className="text-slate-500 text-xs sm:text-[10px] truncate opacity-50">
                  {post.author_id.slice(0, 8)}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-slate-500 text-xs sm:text-sm">{formatTimeAgo(post.created_at)}</p>
              {isActuallyEdited && (
                <>
                  <span className="text-slate-500 text-xs sm:text-sm">·</span>
                  <span className="text-slate-500 text-xs sm:text-sm italic">edited</span>
                </>
              )}
              {post.ai_flagged && (
                <div className="group relative">
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/25">
                    <Bot className="w-2.5 h-2.5" />
                    <span>AI</span>
                  </span>
                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-20 w-56">
                    <div className="bg-slate-800 border border-slate-600 rounded-lg p-2.5 shadow-xl text-[11px] leading-relaxed text-slate-300">
                      <div className="font-semibold text-purple-300 mb-1">
                        {post.ai_flagged === 'ai_generated'
                          ? 'This content may be AI-generated'
                          : 'This content may be AI-assisted'}
                      </div>
                      {post.ai_detection_score !== null && post.ai_detection_score !== undefined && (
                        <div className="text-slate-400 mb-1">
                          Detection score: {post.ai_detection_score}%
                        </div>
                      )}
                      <div className="text-slate-500">
                        {post.ai_flag_source === 'user'
                          ? 'Labeled by the author.'
                          : 'Flagged by automated analysis.'}
                      </div>
                      <span className="block text-slate-500 mt-1">This label may not be fully accurate.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Share and Menu Buttons */}
        {showActions && (
          <div className="relative flex-shrink-0 flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}/#/p/${post.id}`;
                navigator.clipboard.writeText(shareUrl);
                // Simple feedback could be added here
              }}
              className="p-1 sm:p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-all duration-300 active:scale-90"
              title="Copy link to post"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`p-1 sm:p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-all duration-300 active:scale-90 ${showMenu ? 'bg-slate-700 text-slate-100' : ''}`}
            >
              <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-xl sm:rounded-2xl shadow-xl z-10 min-w-[140px] sm:min-w-[160px]">
                {isOwnPost ? (
                  <>
                    {post.post_type !== 'voice' && post.post_type !== 'poll' && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onEdit?.(post.id);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-slate-200 hover:text-white text-sm sm:text-base"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>
                          {post.author?.profile_type === 'media'
                            ? 'Issue Correction'
                            : 'Edit'}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onShowEditHistory?.(post.id);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-slate-200 hover:text-white text-sm sm:text-base"
                    >
                      <span>📝</span>
                      <span>{post.author?.profile_type === 'media' ? 'Correction Protocol' : 'Edit History'}</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowModerationModal(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-blue-400 hover:text-blue-300 text-sm sm:text-base border-t border-slate-700/50"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Moderate</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete?.(post.id);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-red-400 hover:text-red-300 text-sm sm:text-base"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onShowEditHistory?.(post.id);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-slate-200 hover:text-white text-sm sm:text-base"
                    >
                      <span>📝</span>
                      <span>{post.author?.profile_type === 'media' ? 'Correction Protocol' : 'Edit History'}</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowModerationModal(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-blue-400 hover:text-blue-300 text-sm sm:text-base border-t border-slate-700/50"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Moderate</span>
                      </button>
                    )}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-red-400 hover:text-red-300 text-sm sm:text-base"
                  >
                    <Flag className="w-4 h-4" />
                    <span>Report</span>
                  </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Perspective Lock Badge */}
      {renderPerspectiveLock()}

      {/* Content */}
      <div className="mb-3 sm:mb-4">
        {renderPostContent()}

        {/* Original post for replies */}
        {post.reply_to_post_id && renderOriginalPost()}

        {/* Disappearing post indicator */}
        {post.disappears_at && (
          <div className="mt-2 flex items-center space-x-1 text-orange-400 text-xs sm:text-sm">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>
              Disappears {formatTimeRemaining(post.disappears_at)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 sm:pt-4 border-t border-slate-700/50 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto">
            {/* Reactions - only show if not own post */}
            {!isOwnPost && currentUserId && (
              <>
                <button
                  onClick={() => handleReaction('respect')}
                  className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0 ${
                    post.user_reaction === 'respect'
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${post.user_reaction === 'respect' ? 'fill-current' : ''}`} />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">Respect</span>
                </button>

                <button
                  onClick={() => handleReaction('reject')}
                  className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0 ${
                    post.user_reaction === 'reject'
                      ? 'text-red-400 bg-red-500/10'
                      : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <X className={`w-4 h-4 sm:w-5 sm:h-5 ${post.user_reaction === 'reject' ? 'fill-current' : ''}`} />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">Reject</span>
                </button>

                <button
                  onClick={() => handleReaction('observe')}
                  className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0 ${
                    post.user_reaction === 'observe'
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10'
                  }`}
                >
                  <EyeIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${post.user_reaction === 'observe' ? 'fill-current' : ''}`} />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">Observe</span>
                </button>

                {/* Reflect button - only for non-own posts */}
                {onReflect && post.post_type !== 'poll' && (
                  <button
                    onClick={() => onReflect(post)}
                    className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                  >
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium hidden sm:inline">Reflect</span>
                  </button>
                )}
              </>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0 ${
                post.is_saved
                  ? 'text-yellow-400 bg-yellow-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`}
            >
              <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 ${post.is_saved ? 'fill-current' : ''}`} />
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">Save</span>
            </button>

            {/* View Sources - for media profile posts */}
            {(post.source_type || (post.sources && post.sources.length > 0)) && (
              <button
                onClick={() => setShowSources(true)}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
              >
                <Link2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Sources</span>
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-3 sm:space-x-4 text-slate-500 text-xs sm:text-sm">
            {/* Reaction counts for post author */}
            {isOwnPost && (
              <>
                <div className="flex items-center space-x-1">
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                  <span>{reactionCounts.respect_count}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                  <span>{reactionCounts.reject_count}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                  <span>{reactionCounts.observe_count}</span>
                </div>
              </>
            )}

            {/* View Reflections Stat */}
            {onViewReflections && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewReflections(post);
                }}
                className="flex items-center space-x-1 hover:text-cyan-400 transition-colors group"
                title="View Reflections"
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
                <span>{localReflectionCount}</span>
              </button>
            )}
            
            {/* View count for own posts */}
            {isOwnPost && !post.repost_info && !post.reply_to_post_id && (
              <div className="flex items-center space-x-1">
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{post.view_count}</span>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          targetType="post"
          targetId={post.id}
          targetName={`Post by ${getDisplayName(post.author, post.author_id, post.is_anonymous)}`}
          onClose={() => setShowReportModal(false)}
          onReport={(postId: string, reason: string, description?: string) => handleReportPost(postId, reason, description)}
        />
      )}

      {/* Moderation Modal */}
      {showModerationModal && (
        <ModerationModal
          postId={post.id}
          currentModeration={post.moderation_reason || 'NONE'}
          onClose={() => setShowModerationModal(false)}
          onModerate={() => {
            window.location.reload();
          }}
        />
      )}

      {/* Manual Review Modal */}
      {showManualReview && (
        <ManualReview
          postId={post.id}
          onClose={() => setShowManualReview(false)}
          onSubmit={() => {
            setAppealSubmitted(true);
            // After successful appeal, we might want to refresh or notify
            window.location.reload();
          }}
        />
      )}

      {/* Sources Modal */}
      {showSources && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link2 className="w-6 h-6 text-white" />
                <h3 className="text-xl font-bold text-white">Post Sources</h3>
              </div>
              <button
                onClick={() => setShowSources(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {/* Sources List */}
              {post.source_type === 'sources' && post.sources && post.sources.length > 0 && (
                <div>
                  <h4 className="text-slate-200 font-semibold mb-3">Referenced Sources:</h4>
                  <div className="space-y-2">
                    {post.sources.map((source, index) => (
                      <div key={index} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                        <div className="flex items-start space-x-2">
                          <span className="text-orange-400 font-semibold">{index + 1}.</span>
                          {source.startsWith('http://') || source.startsWith('https://') ? (
                            <a
                              href={source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline break-all flex-1"
                            >
                              {source}
                            </a>
                          ) : (
                            <span className="text-slate-300 break-all flex-1">{source}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Type Declaration */}
              {post.source_type === 'original_reporting' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl">✓</span>
                    </div>
                    <h4 className="text-green-300 font-bold text-lg">Original Reporting</h4>
                  </div>
                  <p className="text-slate-300 text-sm">
                    This post is based on original information or firsthand knowledge.
                  </p>
                  {post.source_description && (
                    <div className="mt-3 pt-3 border-t border-green-500/20">
                      <p className="text-slate-400 text-sm italic">{post.source_description}</p>
                    </div>
                  )}
                </div>
              )}

              {post.source_type === 'opinion_commentary' && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-blue-300 font-bold text-lg">Opinion / Commentary</h4>
                  </div>
                  <p className="text-slate-300 text-sm">
                    This post represents analysis or opinion, not sourced facts.
                  </p>
                  {post.source_description && (
                    <div className="mt-3 pt-3 border-t border-blue-500/20">
                      <p className="text-slate-400 text-sm italic">{post.source_description}</p>
                    </div>
                  )}
                </div>
              )}

              {post.source_type === 'public_knowledge' && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl">🌐</span>
                    </div>
                    <h4 className="text-purple-300 font-bold text-lg">Public Knowledge</h4>
                  </div>
                  <p className="text-slate-300 text-sm">
                    This information is widely known and does not rely on a single source.
                  </p>
                  {post.source_description && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20">
                      <p className="text-slate-400 text-sm italic">{post.source_description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-900/50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowSources(false)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default PostCard;