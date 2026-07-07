import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, Eye, MoreHorizontal, Trash2, Flag, Bot } from 'lucide-react';
import { supabase } from '../lib/supabase';
import VerificationBadge from './VerificationBadge';
import ReportModal from './ReportModal';

interface SeriesChapter {
  id: string;
  chapter_number: number;
  title: string | null;
  content: string;
}

interface SeriesAuthor {
  id: string;
  name: string;
  username?: string;
  profile_pic_url?: string;
  is_verified?: boolean;
  verification_type?: string;
  verification_reason?: string;
}

interface PostSeriesData {
  id: string;
  author_id: string;
  title: string;
  is_anonymous: boolean;
  is_explicit: boolean;
  created_at: string;
  ai_flagged?: 'ai_assisted' | 'ai_generated' | null;
  ai_flag_source?: 'user' | 'system' | null;
  ai_detection_score?: number | null;
  author?: SeriesAuthor;
  chapters: SeriesChapter[];
}

interface PostSeriesCardProps {
  series: PostSeriesData;
  currentUserId?: string | null;
  onProfileClick?: (userId: string) => void;
  onDelete?: (seriesId: string) => void;
}

const PostSeriesCard: React.FC<PostSeriesCardProps> = ({
  series,
  currentUserId,
  onProfileClick,
  onDelete,
}) => {
  const navigate = useNavigate();
  const [currentChapter, setCurrentChapter] = useState(0);
  const [showExplicit, setShowExplicit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isOwnSeries = currentUserId === series.author_id;
  const sortedChapters = [...series.chapters].sort((a, b) => a.chapter_number - b.chapter_number);
  const chapter = sortedChapters[currentChapter];
  const totalChapters = sortedChapters.length;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasViewed) {
          setHasViewed(true);
        }
      },
      { threshold: 0.5 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [hasViewed]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const d = new Date(dateString);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
  };

  const getDisplayName = () => {
    if (series.is_anonymous) return 'Anonymous User';
    if (series.author?.name?.trim()) return series.author.name;
    return `User ${series.author_id.slice(0, 8)}`;
  };

  const handleAuthorClick = () => {
    if (!series.is_anonymous && series.author?.id) {
      navigate(`/u/${series.author.id}`);
    }
  };

  const handleDelete = async () => {
    if (!isOwnSeries) return;
    try {
      const { error } = await supabase
        .from('post_series')
        .delete()
        .eq('id', series.id)
        .eq('author_id', currentUserId!);
      if (!error) onDelete?.(series.id);
    } catch {
      // silent
    }
    setShowMenu(false);
  };

  const handleReport = async (seriesId: string, reason: string, description: string) => {
    if (!currentUserId) return;
    try {
      await supabase
        .from('series_reports')
        .insert({
          reporter_id: currentUserId,
          series_id: seriesId,
          reported_user_id: series.author_id,
          reason,
          description: description || null,
        });
    } catch {
      // silent
    }
    setShowReportModal(false);
  };

  const goNext = () => {
    if (currentChapter < totalChapters - 1) setCurrentChapter(currentChapter + 1);
  };

  const goPrev = () => {
    if (currentChapter > 0) setCurrentChapter(currentChapter - 1);
  };

  return (
    <div
      ref={cardRef}
      className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl sm:rounded-3xl overflow-hidden hover:bg-slate-800/40 transition-all duration-300"
    >
      <div className="bg-gradient-to-r from-teal-600/20 to-cyan-600/20 border-b border-teal-500/20 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 ${
                !series.is_anonymous && onProfileClick ? 'cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all duration-300' : ''
              }`}
              onClick={handleAuthorClick}
            >
              {!series.is_anonymous && series.author?.profile_pic_url ? (
                <img
                  src={series.author.profile_pic_url}
                  alt={getDisplayName()}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                  <span className="text-slate-300 font-bold text-sm">
                    {series.is_anonymous ? '?' : (series.author?.name?.charAt(0) || '?')}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span
                  className={`font-bold text-slate-100 text-sm sm:text-base truncate ${
                    !series.is_anonymous && onProfileClick ? 'cursor-pointer hover:text-slate-300 transition-colors' : ''
                  }`}
                  onClick={handleAuthorClick}
                >
                  {getDisplayName()}
                </span>
                {!series.is_anonymous && series.author?.is_verified && (
                  <VerificationBadge
                    isVerified={true}
                    verificationType={series.author.verification_type}
                    verificationReason={series.author.verification_reason}
                    size="sm"
                  />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-slate-500 text-xs sm:text-sm">{formatTimeAgo(series.created_at)}</p>
                {series.ai_flagged && (
                  <div className="group relative">
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/25">
                      <Bot className="w-2.5 h-2.5" />
                      <span>AI</span>
                    </span>
                    <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-20 w-56">
                      <div className="bg-slate-800 border border-slate-600 rounded-lg p-2.5 shadow-xl text-[11px] leading-relaxed text-slate-300">
                        <div className="font-semibold text-purple-300 mb-1">
                          {series.ai_flagged === 'ai_generated'
                            ? 'This content may be AI-generated'
                            : 'This content may be AI-assisted'}
                        </div>
                        {series.ai_detection_score !== null && series.ai_detection_score !== undefined && (
                          <div className="text-slate-400 mb-1">
                            Detection score: {series.ai_detection_score}%
                          </div>
                        )}
                        <div className="text-slate-500">
                          {series.ai_flag_source === 'user'
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

          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-teal-500/15 border border-teal-500/25 rounded-full">
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-teal-400 text-xs font-semibold">Series</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-all duration-300"
              >
                <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-xl z-10 min-w-[140px]">
                  {isOwnSeries ? (
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-red-400 hover:text-red-300 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Series</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowReportModal(true);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-red-400 hover:text-red-300 text-sm"
                    >
                      <Flag className="w-4 h-4" />
                      <span>Report</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <h2 className="text-slate-100 font-bold text-base sm:text-lg leading-snug">{series.title}</h2>
        </div>
      </div>

      {series.is_explicit && !showExplicit ? (
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-[200px]">
          <Eye className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-red-300 font-medium text-sm mb-3">This series contains explicit content</p>
          <button
            onClick={() => setShowExplicit(true)}
            className="px-5 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-red-300 hover:text-red-200 font-medium transition-all duration-300 text-sm"
          >
            Show Content
          </button>
        </div>
      ) : (
        <div className="p-4 sm:p-6">
          {chapter && (
            <div className="min-h-[140px] sm:min-h-[160px]">
              <div className="flex items-center space-x-2 mb-3">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-teal-400 text-xs sm:text-sm font-bold">
                  {chapter.chapter_number}
                </span>
                <span className="text-slate-200 font-semibold text-sm sm:text-base truncate">
                  {chapter.title || `Chapter ${chapter.chapter_number}`}
                </span>
              </div>

              <div className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {chapter.content}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={currentChapter === 0}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                currentChapter === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex items-center space-x-1.5">
              {sortedChapters.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentChapter(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    idx === currentChapter
                      ? 'w-6 h-2 bg-teal-500'
                      : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              disabled={currentChapter === totalChapters - 1}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                currentChapter === totalChapters - 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 text-center">
            <span className="text-slate-500 text-xs">
              Chapter {currentChapter + 1} of {totalChapters}
            </span>
          </div>
        </div>
      )}
      {showReportModal && (
        <ReportModal
          targetType="post"
          targetId={series.id}
          targetName={series.title}
          onClose={() => setShowReportModal(false)}
          onReport={handleReport}
        />
      )}
    </div>
  );
};

export default PostSeriesCard;
