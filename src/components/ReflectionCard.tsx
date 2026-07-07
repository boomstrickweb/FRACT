import React, { useState, useRef, useEffect } from 'react';
import {
  Pencil, Calendar, AlertTriangle, Shield,
  Lightbulb, HelpCircle, FlaskConical, User, Volume2, Play,
  Pause, Quote, MoreVertical, Clock, Flag, Heart, X, Eye as EyeIcon, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import VerificationBadge from './VerificationBadge';
import PostContent from './PostContent';
import ReportModal from './ReportModal';
import ManualReview from './ManualReview';

interface ReflectionAuthor {
  id: string;
  name: string;
  username?: string;
  profile_pic_url?: string;
  is_verified?: boolean;
  verification_type?: string;
  verification_reason?: string;
  created_at: string;
}

export interface ReflectionData {
  id: string;
  post_id: string;
  author_id: string;
  content: string | null;
  reflection_type?: 'text' | 'quote' | 'voice';
  quote_signature?: string | null;
  voice_url?: string | null;
  is_explicit: boolean;
  is_anonymous: boolean;
  perspective_lock?: 'opinion' | 'question' | 'hypothesis' | 'personal_experience' | null;
  moderation_reason?: string | null;
  moderation_score?: number | null;
  created_at: string;
  updated_at: string;
  author?: ReflectionAuthor;
  user_reaction?: 'respect' | 'reject' | 'observe' | null;
  reaction_counts?: {
    respect_count: number;
    reject_count: number;
    observe_count: number;
  };
}

interface ReflectionCardProps {
  reflection: ReflectionData;
  currentUserId?: string;
  onEdit?: (reflectionId: string) => void;
  onDelete?: (reflectionId: string) => void;
  onViewHistory?: (reflectionId: string) => void;
  onProfileClick?: (userId: string) => void;
  onReact?: (reflectionId: string, reaction: 'respect' | 'reject' | 'observe' | null) => void;
}

const perspectiveMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  opinion: { label: 'Opinion', icon: <Lightbulb className="w-3.5 h-3.5" />, color: 'bg-blue-600/20 text-blue-300 border-blue-600/30' },
  question: { label: 'Question', icon: <HelpCircle className="w-3.5 h-3.5" />, color: 'bg-green-600/20 text-green-300 border-green-600/30' },
  hypothesis: { label: 'Hypothesis', icon: <FlaskConical className="w-3.5 h-3.5" />, color: 'bg-amber-600/20 text-amber-300 border-amber-600/30' },
  personal_experience: { label: 'Experience', icon: <User className="w-3.5 h-3.5" />, color: 'bg-rose-600/20 text-rose-300 border-rose-600/30' },
};

const ReflectionCard: React.FC<ReflectionCardProps> = ({
  reflection,
  currentUserId,
  onEdit,
  onDelete,
  onViewHistory,
  onProfileClick,
  onReact,
}) => {
  const [showExplicitContent, setShowExplicitContent] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [reactionCounts, setReactionCounts] = useState(
    reflection.reaction_counts || { respect_count: 0, reject_count: 0, observe_count: 0 }
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isActuallyEdited, setIsActuallyEdited] = useState(false);
  const [showManualReview, setShowManualReview] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const isOwnReflection = currentUserId === reflection.author_id;
  const reflectionType = reflection.reflection_type || 'text';

  useEffect(() => {
    const checkIsAdmin = async () => {
      if (!currentUserId) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUserId)
          .single();
        setIsAdmin(data?.is_admin || false);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    checkIsAdmin();
  }, [currentUserId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOwnReflection) loadReactionCounts();
  }, [isOwnReflection]);

  useEffect(() => {
    checkEditHistory();
    checkAppealStatus();
  }, [reflection.id]);

  const checkAppealStatus = async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('manual_review')
        .select('id')
        .eq('reflection_id', reflection.id)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (data && !error) {
        setAppealSubmitted(true);
      } else {
        // Also check high_manual_review
        const { data: highData } = await supabase
          .from('high_manual_review')
          .select('id')
          .eq('reflection_id', reflection.id)
          .eq('user_id', currentUserId)
          .maybeSingle();
        if (highData) setAppealSubmitted(true);
      }
    } catch (err) {
      console.error('Error checking appeal status:', err);
    }
  };

  useEffect(() => {
    setReactionCounts(reflection.reaction_counts || { respect_count: 0, reject_count: 0, observe_count: 0 });
  }, [reflection.reaction_counts]);

  const checkEditHistory = async () => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return;
      }
      const { count, error } = await supabase
        .from('reflection_edit_history')
        .select('*', { count: 'exact', head: true })
        .eq('reflection_id', reflection.id);

      if (!error && count && count > 0) {
        setIsActuallyEdited(true);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const loadReactionCounts = async () => {
    try {
      const { data } = await supabase
        .from('reflection_reactions')
        .select('reaction_type')
        .eq('reflection_id', reflection.id);
      if (data) {
        setReactionCounts({
          respect_count: data.filter(r => r.reaction_type === 'respect').length,
          reject_count: data.filter(r => r.reaction_type === 'reject').length,
          observe_count: data.filter(r => r.reaction_type === 'observe').length,
        });
      }
    } catch (_) {}
  };

  const handleReaction = async (reaction: 'respect' | 'reject' | 'observe') => {
    if (!currentUserId || isOwnReflection) return;
    const newReaction = reflection.user_reaction === reaction ? null : reaction;
    try {
      if (newReaction) {
        await supabase
          .from('reflection_reactions')
          .upsert(
            { user_id: currentUserId, reflection_id: reflection.id, reaction_type: newReaction },
            { onConflict: 'reflection_id, user_id' }
          );
      } else {
        await supabase
          .from('reflection_reactions')
          .delete()
          .eq('user_id', currentUserId)
          .eq('reflection_id', reflection.id);
      }
      onReact?.(reflection.id, newReaction);
    } catch (err) {
      console.error('Error handling reaction:', err);
    }
  };

  const handleReport = async (reflectionId: string, reason: string, description: string) => {
    if (!currentUserId) return;
    await supabase.from('reflection_reports').insert({
      reporter_id: currentUserId,
      reflection_id: reflectionId,
      reported_user_id: reflection.author_id,
      reason,
      description,
    });
    setShowReport(false);
    setReportSubmitted(true);
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const formatTimeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return new Date(d).toLocaleDateString();
  };

  const formatAccountAge = (c: string) => {
    const days = Math.floor((Date.now() - new Date(c).getTime()) / 86400000);
    if (days < 1) return 'Today';
    if (days < 30) return `${days}d old`;
    if (days < 365) return `${Math.floor(days / 30)}mo old`;
    const y = Math.floor(days / 365), m = Math.floor((days % 365) / 30);
    return m > 0 ? `${y}y ${m}mo old` : `${y}y old`;
  };

  const formatAudioTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const getDisplayName = () => {
    if (reflection.is_anonymous) return 'Anonymous User';
    const a = reflection.author;
    if (!a) return `User ${reflection.author_id.slice(0, 8)}`;
    return a.name?.trim() || a.username?.trim() || `User ${reflection.author_id.slice(0, 8)}`;
  };

  const renderContent = () => {
    // Show blur for Medium severity (score 2)
    if (reflection.moderation_score === 2 && reflection.moderation_reason !== 'spam' && !showExplicitContent) {
      return (
        <div className="relative min-h-[80px]">
          <div className="filter blur-lg select-none pointer-events-none text-slate-200 text-sm leading-relaxed line-clamp-3">
            {reflection.content || 'Voice note'}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setShowExplicitContent(true)}
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded-xl text-amber-300 hover:text-amber-200 font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
            >
              Show Content
            </button>
          </div>
        </div>
      );
    }

    if (reflection.is_explicit && !showExplicitContent) {
      return (
        <div className="relative min-h-[80px]">
          <div className="filter blur-lg select-none pointer-events-none text-slate-200 text-sm leading-relaxed line-clamp-3">
            {reflection.content || 'Voice note'}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setShowExplicitContent(true)}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-300 hover:text-red-200 font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
            >
              Show Content
            </button>
          </div>
        </div>
      );
    }

    if (reflectionType === 'text') {
      return (
        <div className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
          <PostContent text={reflection.content || ''} />
        </div>
      );
    }

    if (reflectionType === 'quote') {
      return (
        <div className="border-l-4 border-cyan-500/40 pl-4 py-1 space-y-1">
          <div className="flex items-start space-x-2">
            <Quote className="w-4 h-4 text-cyan-400/60 mt-0.5 flex-shrink-0" />
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed italic">
              {reflection.content}
            </p>
          </div>
          {reflection.quote_signature && (
            <p className="text-slate-400 text-xs sm:text-sm pl-6">— {reflection.quote_signature}</p>
          )}
        </div>
      );
    }

    if (reflectionType === 'voice' && reflection.voice_url) {
      return (
        <div className="bg-slate-700/40 rounded-xl p-3 sm:p-4">
          <audio
            ref={audioRef}
            src={reflection.voice_url}
            onTimeUpdate={() => setAudioProgress(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration || 0)}
            onEnded={() => { setIsPlaying(false); setAudioProgress(0); }}
            className="hidden"
          />
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleAudio}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
            >
              {isPlaying
                ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                : <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1 text-cyan-400">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Voice Note</span>
                </div>
                <span className="text-slate-400 text-xs">
                  {formatAudioTime(audioProgress)} / {formatAudioTime(audioDuration)}
                </span>
              </div>
              <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-300"
                  style={{ width: audioDuration > 0 ? `${(audioProgress / audioDuration) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (reflection.moderation_score && reflection.moderation_score >= 3 && reflection.moderation_reason !== 'spam' && !isOwnReflection && !isAdmin) {
    return null;
  }

  return (
    <>
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 sm:p-5 hover:bg-slate-800/40 transition-all duration-300">
        {reflection.is_explicit && (
          <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-xl p-2 flex items-center space-x-2">
            <EyeIcon className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-medium text-sm">Explicit Content</span>
          </div>
        )}

        {reportSubmitted && (
          <div className="mb-3 bg-green-500/10 border border-green-500/20 rounded-xl p-2 flex items-center space-x-2">
            <Flag className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-medium text-sm">Report submitted. Thank you.</span>
          </div>
        )}

        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            {/* Moderation Warning */}
            {reflection.moderation_score && reflection.moderation_score >= 2 && reflection.moderation_reason !== 'spam' && (
              <div className={`mb-3 flex items-center justify-between p-3 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${
                reflection.moderation_score >= 3 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {reflection.moderation_score >= 3 ? 'Reflection Quarantined' : 'Content Not Promoted'}
                  </span>
                </div>
                {isOwnReflection && !appealSubmitted && (
                  <button
                    onClick={() => setShowManualReview(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all duration-300 ${
                      reflection.moderation_score >= 3
                        ? 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-300'
                        : 'bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30 text-amber-300'
                    }`}
                  >
                    Manual Review
                  </button>
                )}
                {appealSubmitted && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Shield className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Appeal Pending</span>
                  </div>
                )}
              </div>
            )}

            <div
              className={`flex items-center space-x-3 min-w-0 flex-1 ${!reflection.is_anonymous && reflection.author ? 'cursor-pointer group' : ''}`}
              onClick={() => !reflection.is_anonymous && reflection.author && onProfileClick?.(reflection.author.id)}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 group-hover:ring-2 group-hover:ring-slate-500 transition-all duration-300">
                {!reflection.is_anonymous && reflection.author?.profile_pic_url ? (
                  <img
                    src={reflection.author.profile_pic_url}
                    alt={getDisplayName()}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                    <span className="text-slate-300 font-bold text-sm">
                      {reflection.is_anonymous ? '?' : (reflection.author?.name?.charAt(0) || reflection.author_id.charAt(0).toUpperCase())}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="text-slate-100 font-semibold text-sm group-hover:text-slate-300 transition-colors truncate">
                    {getDisplayName()}
                  </span>
                  {!reflection.is_anonymous && reflection.author?.is_verified && (
                    <VerificationBadge
                      isVerified={true}
                      verificationType={reflection.author.verification_type}
                      verificationReason={reflection.author.verification_reason}
                      size="sm"
                    />
                  )}
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 flex-wrap gap-y-0.5">
                  <span>{formatTimeAgo(reflection.created_at)}</span>
                  {!reflection.is_anonymous && reflection.author?.created_at && (
                    <>
                      <span>·</span>
                      <div className="flex items-center space-x-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{formatAccountAge(reflection.author.created_at)}</span>
                      </div>
                    </>
                  )}
                  {isActuallyEdited && (
                    <>
                      <span>·</span>
                      <span className="italic">edited</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {currentUserId && (
            <div className="relative flex-shrink-0 ml-2" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-all duration-200"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700/60 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  {isOwnReflection ? (
                    <>
                      <button
                        onClick={() => { setMenuOpen(false); onEdit?.(reflection.id); }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-slate-200 hover:bg-slate-700/50 transition-colors text-sm"
                      >
                        <Pencil className="w-4 h-4 text-slate-400" />
                        <span>Edit Reflection</span>
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); onViewHistory?.(reflection.id); }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-slate-200 hover:bg-slate-700/50 transition-colors text-sm"
                      >
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>Edit History</span>
                      </button>
                      <div className="border-t border-slate-700/50 my-1" />
                      <button
                        onClick={() => { setMenuOpen(false); onDelete?.(reflection.id); }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setMenuOpen(false); onViewHistory?.(reflection.id); }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-slate-200 hover:bg-slate-700/50 transition-colors text-sm"
                      >
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>View Edit History</span>
                      </button>
                      {!reportSubmitted && (
                        <button
                          onClick={() => { setMenuOpen(false); setShowReport(true); }}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                        >
                          <Flag className="w-4 h-4" />
                          <span>Report</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {reflection.perspective_lock && perspectiveMeta[reflection.perspective_lock] && (
          <div className="mb-3">
            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full border text-xs font-medium ${perspectiveMeta[reflection.perspective_lock].color}`}>
              {perspectiveMeta[reflection.perspective_lock].icon}
              <span>{perspectiveMeta[reflection.perspective_lock].label}</span>
            </span>
          </div>
        )}

        <div className="mb-3 sm:mb-4">{renderContent()}</div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <div className="flex items-center space-x-1">
            {!isOwnReflection && currentUserId && (
              <>
                <button
                  onClick={() => handleReaction('respect')}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg transition-all duration-300 ${
                    reflection.user_reaction === 'respect'
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${reflection.user_reaction === 'respect' ? 'fill-current' : ''}`} />
                  <span className="text-xs font-medium hidden sm:inline">Respect</span>
                </button>

                <button
                  onClick={() => handleReaction('reject')}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg transition-all duration-300 ${
                    reflection.user_reaction === 'reject'
                      ? 'text-red-400 bg-red-500/10'
                      : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <X className={`w-4 h-4 ${reflection.user_reaction === 'reject' ? 'fill-current' : ''}`} />
                  <span className="text-xs font-medium hidden sm:inline">Reject</span>
                </button>

                <button
                  onClick={() => handleReaction('observe')}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg transition-all duration-300 ${
                    reflection.user_reaction === 'observe'
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10'
                  }`}
                >
                  <EyeIcon className={`w-4 h-4 ${reflection.user_reaction === 'observe' ? 'fill-current' : ''}`} />
                  <span className="text-xs font-medium hidden sm:inline">Observe</span>
                </button>
              </>
            )}
          </div>

          {isOwnReflection && (
            <div className="flex items-center space-x-3 text-slate-500 text-xs">
              <div className="flex items-center space-x-1">
                <Heart className="w-3 h-3 text-green-400" />
                <span>{reactionCounts.respect_count}</span>
              </div>
              <div className="flex items-center space-x-1">
                <X className="w-3 h-3 text-red-400" />
                <span>{reactionCounts.reject_count}</span>
              </div>
              <div className="flex items-center space-x-1">
                <EyeIcon className="w-3 h-3 text-blue-400" />
                <span>{reactionCounts.observe_count}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showManualReview && (
        <ManualReview
          reflectionId={reflection.id}
          onClose={() => setShowManualReview(false)}
          onSubmit={() => {
            setShowManualReview(false);
            setAppealSubmitted(true);
            window.location.reload();
          }}
        />
      )}

      {showReport && (
        <ReportModal
          targetType="post"
          targetId={reflection.id}
          targetName={`Reflection by ${getDisplayName()}`}
          onClose={() => setShowReport(false)}
          onReport={handleReport}
        />
      )}
    </>
  );
};

export default ReflectionCard;
