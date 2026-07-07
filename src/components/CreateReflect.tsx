import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Type, Quote, Mic, Eye, UserX, Send, Pause, Play, Square, Volume2, Lightbulb, HelpCircle, FlaskConical, User, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PostContent from './PostContent';

interface ReflectTargetPost {
  id: string;
  content: string;
  post_type: 'text' | 'quote' | 'voice' | 'poll';
  quote_signature?: string;
  voice_url?: string;
  is_anonymous: boolean;
  author?: {
    id: string;
    name: string;
    username?: string;
    profile_pic_url?: string;
  };
}

interface CreateReflectProps {
  post: ReflectTargetPost;
  onBack: () => void;
  onReflectCreated?: () => void;
}

type ReflectType = 'text' | 'quote' | 'voice';
type PerspectiveLock = 'opinion' | 'question' | 'hypothesis' | 'personal_experience' | null;

const CreateReflect: React.FC<CreateReflectProps> = ({ post, onBack, onReflectCreated }) => {
  const [reflectType, setReflectType] = useState<ReflectType>('text');
  const [content, setContent] = useState('');
  const [quoteSignature, setQuoteSignature] = useState('');
  const [isExplicit, setIsExplicit] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [perspectiveLock, setPerspectiveLock] = useState<PerspectiveLock>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);


  const canSubmit = () => {
    if (reflectType === 'text') return content.trim().length > 0;
    if (reflectType === 'quote') return content.trim().length > 0 && quoteSignature.trim().length > 0;
    if (reflectType === 'voice') return audioBlob !== null;
    return false;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) { stopRecording(); return 60; }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= 60) { stopRecording(); return 60; }
            return prev + 1;
          });
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) clearInterval(timerRef.current);
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadVoiceNote = async (blob: Blob, userId: string): Promise<string | null> => {
    try {
      const fileName = `reflect-${userId}-${Date.now()}.webm`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(filePath, blob);

      if (uploadError) {
        console.error('Error uploading voice note:', uploadError);
        setError(`Failed to upload voice note: ${uploadError.message}`);
        return null;
      }

      const { data } = supabase.storage.from('voice-notes').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error('Error in uploadVoiceNote:', err);
      setError('Failed to upload voice note. Please try again.');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setIsLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to reflect.');
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

      let voiceUrl: string | null = null;
      if (reflectType === 'voice' && audioBlob) {
        voiceUrl = await uploadVoiceNote(audioBlob, user.id);
        if (!voiceUrl) return;
      }

      // Hive Moderation
      let moderationResult = { action: 'allow', category: 'NONE', score: 0 };
      if (reflectType !== 'voice') {
        try {
          const textToModerate = reflectType === 'quote' ? `${content} - ${quoteSignature}` : content;
          console.log('Calling Hive moderation for reflection:', { textToModerate, reflectType });
          const { data: hiveData, error: hiveError } = await supabase.functions.invoke('hive-moderation', {
            body: { text: textToModerate, userId: user.id }
          });

          if (hiveError) {
            console.error('Hive moderation error:', hiveError);
            throw hiveError;
          }

          if (hiveData && hiveData.error) {
            console.error('Hive moderation returned error:', hiveData.error, 'Raw response:', hiveData.raw);
            throw new Error(hiveData.error);
          }
          
          console.log('Hive moderation result:', hiveData);
          moderationResult = hiveData || moderationResult;
        } catch (err) {
          console.error('Detailed Hive moderation error:', err);
          setError('Moderation check failed. Please try again.');
          return;
        }
      }

      const insertData: any = {
        post_id: post.id,
        author_id: user.id,
        reflection_type: reflectType,
        content: reflectType === 'voice' ? '' : content.trim(),
        quote_signature: reflectType === 'quote' ? quoteSignature.trim() : null,
        voice_url: voiceUrl,
        is_explicit: isExplicit,
        is_anonymous: isAnonymous,
        perspective_lock: perspectiveLock,
        moderation_reason: moderationResult.category,
        moderation_score: moderationResult.score > 0 ? moderationResult.score : null,
        is_quarantined: moderationResult.action === 'quarantine' || moderationResult.action === 'user_only',
      };

      // Handle specific moderation actions
      if (moderationResult.action === 'ban_and_label') {
        const banUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        await supabase.from('profiles').update({ ban_until: banUntil }).eq('id', user.id);
      }

      const { data: newReflection, error: insertError } = await supabase
        .from('reflections')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You have already reflected on this post.');
        } else {
          console.error('Error creating reflection:', insertError);
          setError('Failed to post reflection. Please try again.');
        }
        return;
      }

      if (newReflection) {
        if (moderationResult.action === 'quarantine' || moderationResult.action === 'user_only') {
          await supabase.from('high_manual_review').insert({
            reflection_id: newReflection.id, // I should probably update high_manual_review to support reflections too
            user_id: user.id,
            reason: `Hive moderation triggered on reflection: ${moderationResult.category} (${moderationResult.action})`
          });
        }
      }

      onReflectCreated?.();
      onBack();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
        <div className="border-l-4 border-slate-500 pl-4 py-1">
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

  const perspectiveOptions: { key: PerspectiveLock; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'opinion', label: 'Opinion', icon: <Lightbulb className="w-4 h-4" />, color: 'bg-blue-600 text-white' },
    { key: 'question', label: 'Question', icon: <HelpCircle className="w-4 h-4" />, color: 'bg-green-600 text-white' },
    { key: 'hypothesis', label: 'Hypothesis', icon: <FlaskConical className="w-4 h-4" />, color: 'bg-amber-600 text-white' },
    { key: 'personal_experience', label: 'Experience', icon: <User className="w-4 h-4" />, color: 'bg-rose-600 text-white' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Header */}
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
                <h1 className="text-lg sm:text-xl font-bold text-slate-100">Create Reflection</h1>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || isLoading}
              className="px-4 sm:px-6 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Posting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Reflect</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Original Post Preview */}
        <div className="mb-6 bg-slate-800/30 border border-cyan-500/20 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">Reflecting on</span>
          </div>
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
            <span className="text-slate-300 text-sm font-medium">{getAuthorDisplay()}</span>
          </div>
          {renderPostPreview()}
        </div>

        {/* Reflection Type Selector */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-3 sm:mb-4">Choose reflect type</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={() => setReflectType('text')}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${
                reflectType === 'text'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 bg-slate-800/20 hover:bg-slate-800/30'
              }`}
            >
              <Type className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 ${reflectType === 'text' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <div className={`font-medium text-sm sm:text-base ${reflectType === 'text' ? 'text-cyan-300' : 'text-slate-200'}`}>Text</div>
              <div className="text-slate-400 text-xs sm:text-sm">420 characters</div>
            </button>

            <button
              onClick={() => setReflectType('quote')}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${
                reflectType === 'quote'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 bg-slate-800/20 hover:bg-slate-800/30'
              }`}
            >
              <Quote className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 ${reflectType === 'quote' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <div className={`font-medium text-sm sm:text-base ${reflectType === 'quote' ? 'text-cyan-300' : 'text-slate-200'}`}>Quote</div>
              <div className="text-slate-400 text-xs sm:text-sm">300 + 100 chars</div>
            </button>

            <button
              onClick={() => setReflectType('voice')}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${
                reflectType === 'voice'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 bg-slate-800/20 hover:bg-slate-800/30'
              }`}
            >
              <Mic className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 ${reflectType === 'voice' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <div className={`font-medium text-sm sm:text-base ${reflectType === 'voice' ? 'text-cyan-300' : 'text-slate-200'}`}>Voice</div>
              <div className="text-slate-400 text-xs sm:text-sm">60 seconds max</div>
            </button>
          </div>
        </div>

        {/* Content Input */}
        <div className="mb-6 sm:mb-8">
          {reflectType === 'text' && (
            <div className="space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your perspective on this post..."
                maxLength={420}
                autoFocus
                className="w-full p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm resize-none text-sm sm:text-base"
                rows={6}
              />
              <div className={`text-right text-xs sm:text-sm ${content.length > 400 ? 'text-amber-400' : 'text-slate-400'}`}>
                {content.length}/420
              </div>
            </div>
          )}

          {reflectType === 'quote' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-slate-300 font-medium text-sm sm:text-base">Quote</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter the quote..."
                  maxLength={300}
                  autoFocus
                  className="w-full p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm resize-none text-sm sm:text-base"
                  rows={4}
                />
                <div className={`text-right text-xs sm:text-sm ${content.length > 280 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {content.length}/300
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-slate-300 font-medium text-sm sm:text-base">Signature</label>
                <input
                  type="text"
                  value={quoteSignature}
                  onChange={(e) => setQuoteSignature(e.target.value)}
                  placeholder="-- Author name"
                  maxLength={100}
                  className="w-full p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
                />
                <div className="text-right text-slate-400 text-xs sm:text-sm">
                  {quoteSignature.length}/100
                </div>
              </div>
            </div>
          )}

          {reflectType === 'voice' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-mono text-slate-200 mb-4">
                    {formatTime(recordingTime)}
                  </div>

                  <div className="flex items-center justify-center space-x-3 sm:space-x-4 mb-4">
                    {!isRecording && !audioBlob && (
                      <button
                        onClick={startRecording}
                        className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Mic className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                      </button>
                    )}

                    {isRecording && (
                      <>
                        <button
                          onClick={pauseRecording}
                          className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-600 hover:bg-slate-500 text-white rounded-full flex items-center justify-center transition-all duration-300"
                        >
                          {isPaused ? <Play className="w-5 h-5 sm:w-6 sm:h-6" /> : <Pause className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </button>
                        <button
                          onClick={stopRecording}
                          className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all duration-300"
                        >
                          <Square className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                      </>
                    )}

                    {audioBlob && (
                      <button
                        onClick={playAudio}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-600 hover:bg-slate-500 text-white rounded-full flex items-center justify-center transition-all duration-300"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
                      </button>
                    )}
                  </div>

                  {audioUrl && (
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  )}

                  <div className="text-slate-400 text-xs sm:text-sm">
                    {isRecording
                      ? (isPaused ? 'Recording paused' : 'Recording...')
                      : audioBlob
                        ? 'Voice note ready'
                        : 'Tap to start recording'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-3 sm:mb-4">Advanced Options</h3>
          <div className="space-y-4">
            {/* Explicit Content */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-700">
              <div className="flex items-center space-x-3">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-slate-200 font-medium text-sm sm:text-base">Explicit Content</div>
                  <div className="text-slate-400 text-xs sm:text-sm">Mark if content contains explicit material</div>
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

            {/* Anonymous Reflection */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-700">
              <div className="flex items-center space-x-3">
                <UserX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-slate-200 font-medium text-sm sm:text-base">Anonymous Reflection</div>
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

            {/* Perspective Lock */}
            <div className="p-3 sm:p-4 bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-700">
              <div className="flex items-center space-x-3 mb-3">
                <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                <div>
                  <div className="text-slate-200 font-medium text-sm sm:text-base">Perspective Lock (Optional)</div>
                  <div className="text-slate-400 text-xs sm:text-sm">Tag your reflection with a perspective type</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {perspectiveOptions.map(({ key, label, icon, color }) => (
                  <button
                    key={key}
                    onClick={() => setPerspectiveLock(perspectiveLock === key ? null : key)}
                    className={`p-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                      perspectiveLock === key
                        ? color
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
                    }`}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-4">
          <p className="text-slate-400 text-xs leading-relaxed">
            Each user can reflect on a post only once. Reflections cannot be reflected upon. Your account age will be visible alongside your reflection.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateReflect;
