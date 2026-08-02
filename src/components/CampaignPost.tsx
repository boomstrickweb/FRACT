import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Type, Quote, Mic, Send, Pause, Play, Square, Volume2, X } from 'lucide-react';
import { getCampaignIcon } from '../lib/campaignIcons';
import { supabase } from '../lib/supabase';
import { uploadToR2 } from '../lib/r2.ts';
import { checkPostRateLimit, checkDuplicatePost, recordPostAttempt, formatRetryMessage } from '../services/antiSpamService';
import { requestAiDetection } from '../services/aiDetectionService';
import { requestTextClassification } from '../services/textClassificationService';

interface CampaignPostProps {
  campaignId: string;
  campaignTitle: string;
  campaignCategory: string;
  onBack: () => void;
  onPostCreated?: () => void;
}

type PostType = 'text' | 'quote' | 'voice';

const CampaignPost: React.FC<CampaignPostProps> = ({ campaignId, campaignTitle, campaignCategory, onBack, onPostCreated }) => {
  const [postType, setPostType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [quoteSignature, setQuoteSignature] = useState('');
  const [isExplicit, setIsExplicit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Voice recording states
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

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
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= 60) {
              stopRecording();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
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
      const fileName = `${userId}-${Date.now()}.webm`;
      const filePath = `${userId}/${fileName}`;
      const publicUrl = await uploadToR2('voice-notes', filePath, blob);
      return publicUrl;
    } catch (error) {
      console.error('Error in uploadVoiceNote:', error);
      setError('Failed to upload voice note. Please try again.');
      return null;
    }
  };

  const handleSubmit = async () => {
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

      // ANTI-SPAM: Check rate limits
      const rateLimitCheck = await checkPostRateLimit(user.id);
      if (!rateLimitCheck.allowed) {
        setError(formatRetryMessage(rateLimitCheck));
        return;
      }

      // Validate content
      if (postType === 'text' && !content.trim()) {
        setError('Please enter some text for your post');
        return;
      }
      if (postType === 'quote' && (!content.trim() || !quoteSignature.trim())) {
        setError('Please enter both quote content and signature');
        return;
      }
      if (postType === 'voice' && !audioBlob) {
        setError('Please record a voice note');
        return;
      }

      // ANTI-SPAM: Duplicate check
      if (postType === 'text' || postType === 'quote') {
        const duplicateCheck = await checkDuplicatePost(user.id, content.trim());
        if (!duplicateCheck.allowed) {
          setError(duplicateCheck.message || 'Duplicate content detected');
          return;
        }
      }

      let voiceUrl = null;
      if (postType === 'voice' && audioBlob) {
        voiceUrl = await uploadVoiceNote(audioBlob, user.id);
        if (!voiceUrl) return;
      }

      // Hive Moderation
      let moderationResult = { action: 'allow', category: 'NONE', score: 0 };
      if (postType !== 'voice') {
        try {
          const textToModerate = postType === 'quote' ? `${content} - ${quoteSignature}` : content;
          const { data: hiveData, error: hiveError } = await supabase.functions.invoke('hive-moderation', {
            body: { text: textToModerate, userId: user.id }
          });
          if (hiveError) throw hiveError;
          moderationResult = hiveData || moderationResult;
        } catch (err) {
          console.error('Moderation error:', err);
          setError('Moderation check failed. Please try again.');
          return;
        }
      }

      const postData = {
        author_id: user.id,
        content: postType === 'voice' ? '' : content.trim(),
        post_type: postType,
        quote_signature: postType === 'quote' ? quoteSignature.trim() : null,
        voice_url: voiceUrl,
        is_explicit: isExplicit,
        campaign_id: campaignId,
        moderation_reason: moderationResult.category,
        moderation_score: moderationResult.score > 0 ? moderationResult.score : null,
        is_quarantined: moderationResult.action === 'quarantine' || moderationResult.action === 'user_only',
      };

      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();

      if (postError) {
        console.error('Error creating post:', postError);
        setError('Failed to create post. Please try again.');
        return;
      }

      if (newPost) {
        if (moderationResult.action === 'quarantine' || moderationResult.action === 'user_only') {
           await supabase.from('high_manual_review').insert({
             post_id: newPost.id,
             user_id: user.id,
             reason: `Hive moderation triggered: ${moderationResult.category}`
           });
        }

        const contentForFingerprint = postType === 'voice' ? `voice_${Date.now()}` : content.trim();
        await recordPostAttempt(user.id, newPost.id, contentForFingerprint);

        if (postType !== 'voice') {
          requestAiDetection({
            content: content.trim(),
            postId: newPost.id,
            postTable: 'posts',
          });
          requestTextClassification({
            content: content.trim(),
            postId: newPost.id,
            postTable: 'posts',
          });
        }
      }

      onPostCreated?.();
      onBack();

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = () => {
    if (postType === 'text') return content.trim().length > 0;
    if (postType === 'quote') return content.trim().length > 0 && quoteSignature.trim().length > 0;
    if (postType === 'voice') return audioBlob !== null;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-slate-800 p-2 rounded-lg">
                  {React.createElement(getCampaignIcon({ title: campaignTitle, category: campaignCategory }), { className: "w-5 h-5 text-blue-400" })}
                </div>
                <div>
                  <h1 className="text-lg font-bold">Support Campaign</h1>
                  <p className="text-xs text-slate-400 line-clamp-1">{campaignTitle}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || isLoading}
              className="px-6 py-2 bg-slate-100 hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 text-slate-900 font-bold rounded-xl transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Post Type Tabs */}
        <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50">
          <button
            onClick={() => setPostType('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              postType === 'text' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-4 h-4" />
            <span className="font-bold">Text</span>
          </button>
          <button
            onClick={() => setPostType('quote')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              postType === 'quote' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Quote className="w-4 h-4" />
            <span className="font-bold">Quote</span>
          </button>
          <button
            onClick={() => setPostType('voice')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              postType === 'voice' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span className="font-bold">Voice</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
          {postType === 'text' && (
            <div className="space-y-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share why this campaign matters to you..."
                maxLength={420}
                rows={6}
                className="w-full bg-transparent text-xl text-slate-100 placeholder-slate-600 focus:outline-none resize-none"
              />
              <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                <span className={`text-sm font-medium ${content.length > 400 ? 'text-red-400' : 'text-slate-500'}`}>
                  {content.length} / 420
                </span>
              </div>
            </div>
          )}

          {postType === 'quote' && (
            <div className="space-y-6">
              <div className="relative">
                <Quote className="absolute -left-2 -top-2 w-8 h-8 text-slate-700 opacity-50" />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="The quote..."
                  maxLength={300}
                  rows={4}
                  className="w-full bg-transparent text-2xl font-serif text-slate-100 placeholder-slate-700 focus:outline-none resize-none pl-8 italic"
                />
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-slate-700/50">
                <span className="text-slate-500 font-serif text-2xl">—</span>
                <input
                  type="text"
                  value={quoteSignature}
                  onChange={(e) => setQuoteSignature(e.target.value)}
                  placeholder="Who said it?"
                  maxLength={100}
                  className="flex-1 bg-transparent text-lg text-slate-300 placeholder-slate-700 focus:outline-none"
                />
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>{content.length}/300</span>
                <span>{quoteSignature.length}/100</span>
              </div>
            </div>
          )}

          {postType === 'voice' && (
            <div className="py-8 flex flex-col items-center justify-center space-y-8">
              {!audioUrl ? (
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    {isRecording && (
                      <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                    )}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isRecording ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                    </button>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-mono font-bold mb-2">
                      {formatTime(recordingTime)}
                    </div>
                    <p className="text-slate-400">
                      {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Maximum 60 seconds</p>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-6">
                  <div className="bg-slate-700/50 rounded-2xl p-6 flex items-center gap-4">
                    <button
                      onClick={playAudio}
                      className="w-16 h-16 bg-slate-100 text-slate-900 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                    </button>
                    <div className="flex-1">
                      <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-300 w-full animate-pulse" />
                      </div>
                      <div className="flex justify-between mt-2 text-sm text-slate-400 font-mono">
                        <span>{formatTime(recordingTime)}</span>
                        <span>0:00</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAudioUrl(null);
                        setAudioBlob(null);
                        setRecordingTime(0);
                      }}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between p-6 bg-slate-800/30 border border-slate-700/50 rounded-3xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="font-bold text-slate-200">Explicit Content</div>
              <div className="text-xs text-slate-500">Mark if contains sensitive material</div>
            </div>
          </div>
          <button
            onClick={() => setIsExplicit(!isExplicit)}
            className={`w-14 h-8 rounded-full transition-colors relative ${
              isExplicit ? 'bg-red-500' : 'bg-slate-700'
            }`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${
              isExplicit ? 'right-1' : 'left-1'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignPost;
