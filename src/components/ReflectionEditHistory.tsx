import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, Quote, Volume2, Play, Pause, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HistoryEntry {
  id: string;
  reflection_id: string;
  content: string | null;
  quote_signature: string | null;
  reflection_type: 'text' | 'quote' | 'voice';
  is_explicit: boolean;
  edited_at: string;
  version_number: number;
}

interface ReflectionEditHistoryProps {
  reflectionId: string;
  onBack: () => void;
}

const ReflectionEditHistory: React.FC<ReflectionEditHistoryProps> = ({ reflectionId, onBack }) => {
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [reflectionId]);

  const load = async () => {
    try {
      setIsLoading(true);
      setError('');

      const { data: reflection, error: rErr } = await supabase
        .from('reflections')
        .select(`
          *,
          author:profiles!reflections_author_id_fkey (id, name, profile_pic_url)
        `)
        .eq('id', reflectionId)
        .maybeSingle();

      if (rErr || !reflection) {
        setError('Failed to load reflection.');
        return;
      }
      setCurrent(reflection);

      const { data: hist, error: hErr } = await supabase
        .from('reflection_edit_history')
        .select('*')
        .eq('reflection_id', reflectionId)
        .order('version_number', { ascending: false });

      if (hErr) {
        setError('Failed to load edit history.');
        return;
      }
      setHistory(hist || []);
    } catch (_) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getDisplayName = () => {
    if (!current) return 'Unknown User';
    if (current.is_anonymous) return 'Anonymous User';
    return current.author?.name || `User ${current.author_id?.slice(0, 8)}`;
  };

  const renderContentBlock = (
    type: 'text' | 'quote' | 'voice',
    content: string | null,
    quoteSig: string | null,
    voiceUrl?: string | null,
    isExplicit?: boolean
  ) => {
    if (isExplicit) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <span className="text-red-400 text-sm font-medium">Explicit Content — hidden in history</span>
        </div>
      );
    }

    if (type === 'text') {
      return (
        <div className="text-slate-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
          {content || ''}
        </div>
      );
    }

    if (type === 'quote') {
      return (
        <div className="border-l-4 border-cyan-500/40 pl-4 py-1 space-y-1">
          <div className="flex items-start space-x-2">
            <Quote className="w-4 h-4 text-cyan-400/60 mt-0.5 flex-shrink-0" />
            <p className="text-slate-300 text-sm sm:text-base italic">{content}</p>
          </div>
          {quoteSig && (
            <p className="text-slate-400 text-xs sm:text-sm pl-6">— {quoteSig}</p>
          )}
        </div>
      );
    }

    if (type === 'voice') {
      if (voiceUrl) {
        return <VoicePlayer url={voiceUrl} />;
      }
      return (
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Volume2 className="w-4 h-4" />
          <span>Voice Note (unavailable)</span>
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading edit history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-600/20 border border-red-600/30 rounded-2xl flex items-center justify-center">
            <Clock className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">Error Loading History</h3>
          <p className="text-slate-400 mb-6 text-sm">{error}</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center space-x-4 h-16">
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h1 className="text-lg sm:text-xl font-bold text-slate-100">Reflection Edit History</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6 py-6 space-y-8">
        {current && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-200 mb-3">Current Version</h2>
            <div className="bg-slate-800/40 border border-cyan-500/20 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                  {!current.is_anonymous && current.author?.profile_pic_url ? (
                    <img src={current.author.profile_pic_url} alt={getDisplayName()} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-slate-200 font-medium text-sm">{getDisplayName()}</div>
                  <div className="text-slate-400 text-xs">{formatDate(current.updated_at)}</div>
                </div>
              </div>
              {renderContentBlock(
                current.reflection_type || 'text',
                current.content,
                current.quote_signature,
                current.voice_url,
                current.is_explicit
              )}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-200 mb-3">
            Edit History ({history.length} {history.length === 1 ? 'edit' : 'edits'})
          </h2>

          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/40 border border-slate-600/40 rounded-2xl flex items-center justify-center">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-slate-200 font-semibold mb-1">No edits yet</h3>
              <p className="text-slate-400 text-sm">This reflection has not been edited.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-slate-800/20 border border-slate-700/40 rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300 font-medium text-sm">
                        Version {entry.version_number}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-700/50 rounded-full text-slate-400 capitalize">
                        {entry.reflection_type}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs">{formatDate(entry.edited_at)}</div>
                  </div>
                  {renderContentBlock(
                    entry.reflection_type,
                    entry.content,
                    entry.quote_signature,
                    null,
                    entry.is_explicit
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface VoicePlayerProps {
  url: string;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="bg-slate-700/40 rounded-xl p-3 sm:p-4">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        className="hidden"
      />
      <div className="flex items-center space-x-3">
        <button
          onClick={toggle}
          className="w-9 h-9 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-1 text-cyan-400">
              <Volume2 className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Voice Note</span>
            </div>
            <span className="text-slate-400 text-xs">{fmt(progress)} / {fmt(duration)}</span>
          </div>
          <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-300"
              style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReflectionEditHistory;
