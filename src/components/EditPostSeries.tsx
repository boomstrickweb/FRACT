import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, BookOpen, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Chapter {
  id?: string;
  number: number;
  title: string;
  content: string;
  isExpanded: boolean;
  isNew?: boolean;
}

interface EditPostSeriesProps {
  seriesId: string;
  onBack: () => void;
  onSeriesUpdated?: () => void;
}

const EditPostSeries: React.FC<EditPostSeriesProps> = ({ seriesId, onBack, onSeriesUpdated }) => {
  const [seriesTitle, setSeriesTitle] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSeries();
  }, [seriesId]);

  const loadSeries = async () => {
    try {
      setIsLoading(true);
      const { data: series, error: seriesError } = await supabase
        .from('post_series')
        .select('*')
        .eq('id', seriesId)
        .single();

      if (seriesError || !series) {
        setError('Failed to load series.');
        return;
      }

      setSeriesTitle(series.title);

      const { data: chaptersData, error: chaptersError } = await supabase
        .from('series_chapters')
        .select('*')
        .eq('series_id', seriesId)
        .order('chapter_number', { ascending: true });

      if (chaptersError) {
        setError('Failed to load chapters.');
        return;
      }

      setChapters(
        (chaptersData || []).map(ch => ({
          id: ch.id,
          number: ch.chapter_number,
          title: ch.title || '',
          content: ch.content,
          isExpanded: false,
        }))
      );
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const addChapter = () => {
    if (chapters.length >= 12) return;
    const newNumber = chapters.length + 1;
    setChapters([
      ...chapters.map(ch => ({ ...ch, isExpanded: false })),
      { number: newNumber, title: '', content: '', isExpanded: true, isNew: true },
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
    setChapters(chapters.map((ch, i) => ({
      ...ch,
      isExpanded: i === index ? !ch.isExpanded : ch.isExpanded,
    })));
  };

  const canSave = () => {
    if (!seriesTitle.trim()) return false;
    return chapters.every(ch => ch.content.trim().length > 0);
  };

  const handleSave = async () => {
    if (!canSave()) return;
    setIsSaving(true);
    setError('');

    try {
      const { error: titleError } = await supabase
        .from('post_series')
        .update({ title: seriesTitle.trim() })
        .eq('id', seriesId);

      if (titleError) {
        setError('Failed to update series title.');
        return;
      }

      const { error: deleteError } = await supabase
        .from('series_chapters')
        .delete()
        .eq('series_id', seriesId);

      if (deleteError) {
        setError('Failed to update chapters.');
        return;
      }

      const chaptersToInsert = chapters.map(ch => ({
        series_id: seriesId,
        chapter_number: ch.number,
        title: ch.title.trim() || null,
        content: ch.content.trim(),
      }));

      const { error: insertError } = await supabase
        .from('series_chapters')
        .insert(chaptersToInsert);

      if (insertError) {
        setError('Failed to save chapters.');
        return;
      }

      onSeriesUpdated?.();
      onBack();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading series...</p>
        </div>
      </div>
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
                <BookOpen className="w-5 h-5 text-teal-400" />
                <h1 className="text-lg sm:text-xl font-bold text-slate-100">Edit Post Series</h1>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!canSave() || isSaving}
              className="px-4 sm:px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save Changes</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4">
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
                {chapters.filter(ch => ch.content.trim()).length} of {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} written
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
      </div>
    </div>
  );
};

export default EditPostSeries;
