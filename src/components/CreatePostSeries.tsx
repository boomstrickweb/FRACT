import React, { useState } from 'react';
import { ArrowLeft, Send, Plus, Trash2, BookOpen, ChevronDown, ChevronUp, Eye, UserX, GripVertical, Bot } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { requestAiDetection } from '../services/aiDetectionService';

interface CreatePostSeriesProps {
  onBack: () => void;
  onSeriesCreated?: () => void;
}

interface Chapter {
  number: number;
  title: string;
  content: string;
  isExpanded: boolean;
}

type AiLabel = 'ai_assisted' | 'ai_generated' | null;

const CreatePostSeries: React.FC<CreatePostSeriesProps> = ({ onBack, onSeriesCreated }) => {
  const [seriesTitle, setSeriesTitle] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([
    { number: 1, title: '', content: '', isExpanded: true }
  ]);
  const [isExplicit, setIsExplicit] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiLabel, setAiLabel] = useState<AiLabel>(null);
  const addChapter = () => {
    if (chapters.length >= 12) return;
    const newNumber = chapters.length + 1;
    setChapters([
      ...chapters.map(ch => ({ ...ch, isExpanded: false })),
      { number: newNumber, title: '', content: '', isExpanded: true }
    ]);
  };

  const removeChapter = (index: number) => {
    if (chapters.length <= 1) return;
    const updated = chapters
      .filter((_, i) => i !== index)
      .map((ch, i) => ({ ...ch, number: i + 1 }));
    setChapters(updated);
  };

  const updateChapter = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...chapters];
    updated[index] = { ...updated[index], [field]: value };
    setChapters(updated);
  };

  const toggleChapter = (index: number) => {
    const updated = chapters.map((ch, i) => ({
      ...ch,
      isExpanded: i === index ? !ch.isExpanded : ch.isExpanded
    }));
    setChapters(updated);
  };

  const canSubmit = () => {
    if (!seriesTitle.trim()) return false;
    return chapters.every(ch => ch.content.trim().length > 0);
  };

  const filledChaptersCount = chapters.filter(ch => ch.content.trim().length > 0).length;

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setIsLoading(true);
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
        setIsLoading(false);
        return;
      }

      const seriesData: any = {
        author_id: user.id,
        title: seriesTitle.trim(),
        is_anonymous: isAnonymous,
        is_explicit: isExplicit,
      };

      if (aiLabel) {
        seriesData.ai_flagged = aiLabel;
        seriesData.ai_flag_source = 'user';
      }

      const { data: series, error: seriesError } = await supabase
        .from('post_series')
        .insert(seriesData)
        .select()
        .single();

      if (seriesError || !series) {
        setError('Failed to create series. Please try again.');
        return;
      }

      const chaptersToInsert = chapters.map(ch => ({
        series_id: series.id,
        chapter_number: ch.number,
        title: ch.title.trim() || null,
        content: ch.content.trim(),
      }));

      const { error: chaptersError } = await supabase
        .from('series_chapters')
        .insert(chaptersToInsert);

      if (chaptersError) {
        setError('Failed to save chapters. Please try again.');
        return;
      }

      if (!aiLabel) {
        const allContent = chapters.map(ch => ch.content.trim()).join('\n\n');
        requestAiDetection({
          content: allContent,
          postId: series.id,
          postTable: 'post_series',
        });
      }

      onSeriesCreated?.();
      onBack();
    } catch {
      setError('An unexpected error occurred. Please try again.');
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
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-teal-400" />
                <h1 className="text-lg sm:text-xl font-bold text-slate-100">Create Post Series</h1>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || isLoading}
              className="px-4 sm:px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Publishing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Publish Series</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="mb-6 sm:mb-8">
          <label className="block text-slate-200 font-semibold text-base sm:text-lg mb-3">Series Title</label>
          <input
            type="text"
            value={seriesTitle}
            onChange={(e) => setSeriesTitle(e.target.value)}
            placeholder="Give your series a name..."
            maxLength={100}
            className="w-full p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
          />
          <div className="text-right text-slate-500 text-xs mt-1.5">{seriesTitle.length}/100</div>
        </div>

        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-200">Chapters</h3>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                {filledChaptersCount} of {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} written
              </p>
            </div>
            {chapters.length < 12 && (
              <button
                onClick={addChapter}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400 hover:text-teal-300 hover:bg-teal-500/20 transition-all duration-300 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Chapter</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {chapters.map((chapter, index) => (
              <div
                key={index}
                className={`rounded-xl sm:rounded-2xl border transition-all duration-300 overflow-hidden ${
                  chapter.isExpanded
                    ? 'bg-slate-800/50 border-teal-500/30'
                    : 'bg-slate-800/20 border-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                <button
                  onClick={() => toggleChapter(index)}
                  className="w-full flex items-center justify-between p-3 sm:p-4"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <GripVertical className="w-4 h-4 text-slate-600" />
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold ${
                        chapter.content.trim()
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                          : 'bg-slate-700/50 text-slate-500 border border-slate-600/50'
                      }`}>
                        {chapter.number}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="text-slate-200 text-sm sm:text-base font-medium truncate block">
                        {chapter.title.trim() || `Chapter ${chapter.number}`}
                      </span>
                      {!chapter.isExpanded && chapter.content.trim() && (
                        <span className="text-slate-500 text-xs truncate block mt-0.5">
                          {chapter.content.trim().slice(0, 60)}...
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {chapters.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeChapter(index);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {chapter.isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {chapter.isExpanded && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                    <div>
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => updateChapter(index, 'title', e.target.value)}
                        placeholder="Chapter title (optional)"
                        maxLength={80}
                        className="w-full p-2.5 sm:p-3 bg-slate-700/30 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-transparent transition-all duration-300 text-sm"
                      />
                      <div className="text-right text-slate-600 text-xs mt-1">{chapter.title.length}/80</div>
                    </div>
                    <div>
                      <textarea
                        value={chapter.content}
                        onChange={(e) => updateChapter(index, 'content', e.target.value)}
                        placeholder="Write your chapter content..."
                        maxLength={420}
                        rows={4}
                        className="w-full p-2.5 sm:p-3 bg-slate-700/30 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-transparent transition-all duration-300 resize-none text-sm"
                      />
                      <div className="text-right text-slate-600 text-xs mt-1">{chapter.content.length}/420</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {chapters.length < 12 && (
            <button
              onClick={addChapter}
              className="mt-3 w-full p-3 border-2 border-dashed border-slate-700/50 hover:border-teal-500/30 rounded-xl sm:rounded-2xl text-slate-500 hover:text-teal-400 transition-all duration-300 flex items-center justify-center space-x-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Chapter ({chapters.length}/12)</span>
            </button>
          )}
        </div>

        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-3 sm:mb-4">Options</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-700">
              <div className="flex items-center space-x-3">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-slate-200 font-medium text-sm sm:text-base">Explicit Content</div>
                  <div className="text-slate-400 text-xs sm:text-sm">Mark if series contains explicit material</div>
                </div>
              </div>
              <button
                onClick={() => setIsExplicit(!isExplicit)}
                className={`relative w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                  isExplicit ? 'bg-red-500' : 'bg-slate-600'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 sm:top-1 sm:w-4 sm:h-4 bg-white rounded-full transition-all duration-300 ${
                  isExplicit ? 'left-5 sm:left-7' : 'left-0.5 sm:left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-700">
              <div className="flex items-center space-x-3">
                <UserX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-slate-200 font-medium text-sm sm:text-base">Anonymous Series</div>
                  <div className="text-slate-400 text-xs sm:text-sm">Hide your identity from everyone</div>
                </div>
              </div>
              <button
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                  isAnonymous ? 'bg-slate-500' : 'bg-slate-600'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 sm:top-1 sm:w-4 sm:h-4 bg-white rounded-full transition-all duration-300 ${
                  isAnonymous ? 'left-5 sm:left-7' : 'left-0.5 sm:left-1'
                }`} />
              </button>
            </div>

            <div className="p-3 sm:p-4 bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  <div>
                    <div className="text-slate-200 font-medium text-sm sm:text-base">AI Label</div>
                    <div className="text-slate-400 text-xs sm:text-sm">Check if AI-assisted or AI-generated</div>
                  </div>
                </div>
                <button
                  onClick={() => setAiLabel(aiLabel ? null : 'ai_assisted')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    aiLabel ? 'bg-amber-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      aiLabel ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostSeries;
