import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Type, Quote, Mic, Eye, Clock, UserX, Send, Pause, Play, Square, Volume2, Lightbulb, HelpCircle, FlaskConical, User, Link2, Plus, X, BookOpen, BarChart3, Sparkles, Cake } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { checkPostRateLimit, checkDuplicatePost, recordPostAttempt, formatRetryMessage } from '../services/antiSpamService';
import { requestAiDetection } from '../services/aiDetectionService';
import { requestTextClassification } from '../services/textClassificationService';

// Force rebuild of text classification service dependency

interface CreatePostProps {
  onBack: () => void;
  onPostCreated?: () => void;
  onCreateSeries?: () => void;
  replyToPost?: {
    id: string;
    content: string;
    post_type: 'text' | 'quote' | 'voice';
    quote_signature?: string;
    voice_url?: string;
    author?: {
      username: string;
      name: string;
      profile_pic_url?: string;
    };
    is_anonymous: boolean;
  };
}

type PostType = 'text' | 'quote' | 'voice' | 'poll';
type PerspectiveLock = 'opinion' | 'question' | 'hypothesis' | 'personal_experience' | null;
type SourceType = 'sources' | 'original_reporting' | 'opinion_commentary' | 'public_knowledge' | null;

const CreatePost: React.FC<CreatePostProps> = ({ onBack, onPostCreated, onCreateSeries, replyToPost }) => {
  const [postType, setPostType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [quoteSignature, setQuoteSignature] = useState('');
  const [isExplicit, setIsExplicit] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isAnniversary, setIsAnniversary] = useState(false);
  const [disappearTimer, setDisappearTimer] = useState<number | null>(null);
  const [perspectiveLock, setPerspectiveLock] = useState<PerspectiveLock>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [error, setError] = useState('');
  const [isMediaProfile, setIsMediaProfile] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [sources, setSources] = useState<string[]>(['', '', '']);
  const [sourceDescription, setSourceDescription] = useState('');
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDuration, setPollDuration] = useState(60);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadProfileType();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const loadProfileType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_type')
        .eq('id', user.id)
        .single();

      setIsMediaProfile(profile?.profile_type === 'media');
    } catch (error) {
      console.error('Error loading profile type:', error);
    }
  };

  const addSource = () => {
    if (sources.length < 5) {
      setSources([...sources, '']);
    }
  };

  const removeSource = (index: number) => {
    if (sources.length > 3) {
      setSources(sources.filter((_, i) => i !== index));
    }
  };

  const updateSource = (index: number, value: string) => {
    const newSources = [...sources];
    newSources[index] = value;
    setSources(newSources);
  };

  const getCharacterLimit = () => {
    switch (postType) {
      case 'text': return 420;
      case 'quote': return 300;
      case 'poll': return 160;
      default: return 0;
    }
  };

  const getSignatureLimit = () => {
    return postType === 'quote' ? 100 : 0;
  };

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

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value.slice(0, 70);
    setPollOptions(newOptions);
  };

  const uploadVoiceNote = async (blob: Blob, userId: string): Promise<string | null> => {
    try {
      const fileName = `${userId}-${Date.now()}.webm`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(filePath, blob);

      if (uploadError) {
        console.error('Error uploading voice note:', uploadError);
        setError(`Failed to upload voice note: ${uploadError.message}`);
        return null;
      }

      const { data } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(filePath);

      return data.publicUrl;
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

      // ANTI-SPAM: Check rate limits first
      const rateLimitCheck = await checkPostRateLimit(user.id);
      if (!rateLimitCheck.allowed) {
        setError(formatRetryMessage(rateLimitCheck));
        return;
      }

      // Validate content based on post type
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

      if (postType === 'poll') {
        if (!pollTitle.trim()) {
          setError('Please enter a poll question');
          return;
        }
        const filledOptions = pollOptions.filter(o => o.trim().length > 0);
        if (filledOptions.length < 2) {
          setError('Poll must have at least 2 options');
          return;
        }
        if (filledOptions.length > 4) {
          setError('Poll can have maximum 4 options');
          return;
        }
      }

      // ANTI-SPAM: Check for duplicate content (text and quote posts only)
      if (postType === 'text' || postType === 'quote') {
        const contentToCheck = replyToPost ? replyContent.trim() : content.trim();
        const duplicateCheck = await checkDuplicatePost(user.id, contentToCheck);

        if (!duplicateCheck.allowed) {
          setError(duplicateCheck.message || 'Duplicate content detected');
          return;
        }
      }

      // Validate sources for media profiles
      if (isMediaProfile && !replyToPost) {
        if (!sourceType) {
          setError('Media profiles must specify sources or select a content type');
          return;
        }

        if (sourceType === 'sources') {
          const filledSources = sources.filter(s => s.trim().length > 0);
          if (filledSources.length < 3) {
            setError('Please provide at least 3 sources');
            return;
          }
          if (filledSources.length > 5) {
            setError('Maximum 5 sources allowed');
            return;
          }
        }
      }

      let voiceUrl = null;
      if (postType === 'voice' && audioBlob) {
        voiceUrl = await uploadVoiceNote(audioBlob, user.id);
        if (!voiceUrl) {
          setError('Failed to upload voice note');
          return;
        }
      }

      // Hive Moderation
      let moderationResult = { action: 'allow', category: 'NONE', score: 0 };
      if (postType !== 'voice' && postType !== 'poll') {
        try {
          const textToModerate = postType === 'quote' ? `${content} - ${quoteSignature}` : (replyToPost ? replyContent : content);
          console.log('Calling Hive moderation for:', { textToModerate, postType });
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
          // If moderation fails, we might want to prevent posting for safety, 
          // but for now we'll just log and continue as it was before.
          // However, we should inform the user that a check failed.
          setError('Moderation check failed. Please try again.');
          return;
        }
      }

      // Calculate disappear time
      let disappearsAt = null;
      if (disappearTimer) {
        disappearsAt = new Date(Date.now() + disappearTimer * 60 * 1000).toISOString();
      }

      interface PostData {
        author_id: string;
        content: string;
        post_type: string;
        quote_signature: string | null;
        voice_url: string | null;
        is_explicit: boolean;
        is_anonymous: boolean;
        disappears_at: string | null;
        reply_to_post_id: string | null;
        perspective_lock: string | null;
        sources?: string[];
        source_type?: string;
        source_description?: string | null;
        moderation_reason: string;
        moderation_score: number | null;
        is_quarantined: boolean;
        is_anniversary: boolean;
      }

      const postData: PostData = {
        author_id: user.id,
        content: replyToPost ? replyContent.trim() : (postType === 'voice' || postType === 'poll' ? '' : content.trim()),
        post_type: postType,
        quote_signature: postType === 'quote' ? quoteSignature.trim() : null,
        voice_url: voiceUrl,
        is_explicit: isExplicit,
        is_anonymous: isAnonymous,
        disappears_at: postType === 'poll' ? null : disappearsAt,
        reply_to_post_id: replyToPost?.id || null,
        perspective_lock: postType === 'poll' ? null : perspectiveLock,
        moderation_reason: moderationResult.category,
        moderation_score: moderationResult.score > 0 ? moderationResult.score : null,
        is_quarantined: moderationResult.action === 'quarantine' || moderationResult.action === 'user_only',
        is_anniversary: isAnniversary,
      };

      // Handle specific moderation actions
      if (moderationResult.action === 'ban_and_label') {
        // Apply 48h ban
        const banUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        await supabase.from('profiles').update({ ban_until: banUntil }).eq('id', user.id);
      }

      // Add source data for media profiles
      if (isMediaProfile && !replyToPost) {
        if (sourceType === 'sources') {
          postData.sources = sources.filter(s => s.trim().length > 0);
          postData.source_type = 'sources';
        } else if (sourceType) {
          postData.source_type = sourceType;
          postData.source_description = sourceDescription.trim() || null;
        }
      }

      // Create post
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
        // Log to high-manual-review if quarantine or user_only triggered by critical
        if (moderationResult.action === 'quarantine' || moderationResult.action === 'user_only') {
           await supabase.from('high_manual_review').insert({
             post_id: newPost.id,
             user_id: user.id,
             reason: `Hive moderation triggered: ${moderationResult.category} (${moderationResult.action})`
           });
        }

        const contentForFingerprint = replyToPost
          ? replyContent.trim()
          : (postType === 'voice' ? `voice_${Date.now()}` : (postType === 'poll' ? pollTitle.trim() : content.trim()));

        await recordPostAttempt(user.id, newPost.id, contentForFingerprint);

        if (postType === 'poll') {
          const filledOptions = pollOptions.filter(o => o.trim().length > 0);
          const pollOptions_data = filledOptions.map((text, index) => ({
            id: index,
            text: text.trim(),
            vote_count: 0
          }));
          const endTime = new Date(Date.now() + pollDuration * 60 * 1000).toISOString();

          const { error: pollError } = await supabase
            .from('polls')
            .insert({
              post_id: newPost.id,
              title: pollTitle.trim(),
              options: pollOptions_data,
              created_by: user.id,
              end_time: endTime,
            });

          if (pollError) {
            console.error('Error creating poll:', pollError);
            setError('Failed to create poll. Please try again.');
            return;
          }
        } else if (postType !== 'voice') {
          const textContent = replyToPost ? replyContent.trim() : content.trim();
          requestAiDetection({
            content: textContent,
            postId: newPost.id,
            postTable: 'posts',
          });
          requestTextClassification({
            content: textContent,
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
    if (replyToPost) return replyContent.trim().length > 0;
    if (postType === 'text') return content.trim().length > 0;
    if (postType === 'quote') return content.trim().length > 0 && quoteSignature.trim().length > 0;
    if (postType === 'voice') return audioBlob !== null;
    if (postType === 'poll') {
      const filledOptions = pollOptions.filter(o => o.trim().length > 0);
      return pollTitle.trim().length > 0 && filledOptions.length >= 2 && filledOptions.length <= 4;
    }
    return false;
  };

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
              <h1 className="text-lg sm:text-xl font-bold text-slate-100">
                {replyToPost ? 'Reply as Post' : 'Create Post'}
              </h1>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || isLoading}
              className="px-4 sm:px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Posting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Post</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Post Type Selector */}
        {!replyToPost && (
        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-3 sm:mb-4">Choose post type</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={() => setPostType('text')}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${
                postType === 'text'
                  ? 'border-slate-500 bg-slate-800/50'
                  : 'border-slate-700 bg-slate-800/20 hover:bg-slate-800/30'
              }`}
            >
              <Type className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-slate-200 font-medium text-sm sm:text-base">Text</div>
              <div className="text-slate-400 text-xs sm:text-sm">420 characters</div>
            </button>

            <button
              onClick={() => setPostType('quote')}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${
                postType === 'quote'
                  ? 'border-slate-500 bg-slate-800/50'
                  : 'border-slate-700 bg-slate-800/20 hover:bg-slate-800/30'
              }`}
            >
              <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-slate-200 font-medium text-sm sm:text-base">Quote</div>
              <div className="text-slate-400 text-xs sm:text-sm">300 + 100 chars</div>
            </button>

            <button
              onClick={() => setPostType('voice')}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${
                postType === 'voice'
                  ? 'border-slate-500 bg-slate-800/50'
                  : 'border-slate-700 bg-slate-800/20 hover:bg-slate-800/30'
              }`}
            >
              <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-slate-200 font-medium text-sm sm:text-base">Voice</div>
              <div className="text-slate-400 text-xs sm:text-sm">60 seconds max</div>
            </button>

            <button
              onClick={() => setPostType('poll')}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${
                postType === 'poll'
                  ? 'border-slate-500 bg-slate-800/50'
                  : 'border-slate-700 bg-slate-800/20 hover:bg-slate-800/30'
              }`}
            >
              <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-slate-200 font-medium text-sm sm:text-base">Poll</div>
              <div className="text-slate-400 text-xs sm:text-sm">Survey</div>
            </button>

            {onCreateSeries && (
              <button
                onClick={onCreateSeries}
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 hover:border-teal-500/50 transition-all duration-300"
              >
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-teal-400 mx-auto mb-2" />
                <div className="text-teal-300 font-medium text-sm sm:text-base">Post Series</div>
                <div className="text-teal-400/70 text-xs sm:text-sm">Up to 12 chapters</div>
              </button>
            )}
          </div>
        </div>
        )}

        {/* Reply Content */}
        {replyToPost && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-3 sm:mb-4">Your Reply</h3>
            <div className="space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                maxLength={420}
                className="w-full p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none text-sm sm:text-base"
                rows={4}
              />
              <div className="text-right text-slate-400 text-xs sm:text-sm">
                {replyContent.length}/420
              </div>
            </div>
          </div>
        )}

        {/* Original Post (for replies) */}
        {replyToPost && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-3 sm:mb-4">Replying to</h3>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              {/* Author info */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                  {!replyToPost.is_anonymous && replyToPost.author?.profile_pic_url ? (
                    <img
                      src={replyToPost.author.profile_pic_url}
                      alt={replyToPost.author.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                      <span className="text-slate-300 font-bold text-xs sm:text-sm">
                        {replyToPost.is_anonymous ? '?' : replyToPost.author?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-200 text-sm sm:text-base truncate">
                    {replyToPost.is_anonymous ? 'Anonymous User' : replyToPost.author?.name || 'Unknown User'}
                  </div>
                  {!replyToPost.is_anonymous && (
                    <div className="text-slate-400 text-xs sm:text-sm truncate">
                      UID: {replyToPost.id?.slice(0, 8) || 'unknown'}...
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="text-slate-300 text-sm sm:text-base">
                {replyToPost.post_type === 'text' && (
                  <div className="whitespace-pre-wrap">{replyToPost.content}</div>
                )}
                {replyToPost.post_type === 'quote' && (
                  <div className="bg-slate-700/30 border-l-4 border-slate-500 pl-3 sm:pl-4 py-3 rounded-r-xl">
                    <div className="italic mb-2">"{replyToPost.content}"</div>
                    {replyToPost.quote_signature && (
                      <div className="text-slate-400">— {replyToPost.quote_signature}</div>
                    )}
                  </div>
                )}
                {replyToPost.post_type === 'voice' && replyToPost.voice_url && (
                  <div className="bg-slate-700/30 rounded-xl p-3 sm:p-4 border border-slate-600">
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Volume2 className="w-4 h-4" />
                      <span className="text-xs sm:text-sm">Voice Note</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Content Input */}
        {!replyToPost && (
        <div className="mb-6 sm:mb-8">
          {postType === 'text' && (
            <div className="space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={420}
                className="w-full p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none text-sm sm:text-base"
                rows={6}
              />
              <div className="text-right text-slate-400 text-xs sm:text-sm">
                {content.length}/{getCharacterLimit()}
              </div>
            </div>
          )}

          {postType === 'quote' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-slate-300 font-medium text-sm sm:text-base">Quote</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter the quote..."
                  maxLength={300}
                  className="w-full p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none text-sm sm:text-base"
                  rows={4}
                />
                <div className="text-right text-slate-400 text-xs sm:text-sm">
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
                  maxLength={getSignatureLimit()}
                  className="w-full p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
                />
                <div className="text-right text-slate-400 text-xs sm:text-sm">
                  {quoteSignature.length}/{getSignatureLimit()}
                </div>
              </div>
            </div>
          )}

          {postType === 'voice' && (
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
                    {isRecording ? (isPaused ? 'Recording paused' : 'Recording...') : 
                     audioBlob ? 'Voice note ready' : 'Tap to start recording'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {postType === 'poll' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-slate-300 font-medium text-sm sm:text-base">Poll Question</label>
                <textarea
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value.slice(0, 160))}
                  placeholder="What would you like to ask?"
                  maxLength={160}
                  className="w-full p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none text-sm sm:text-base"
                  rows={2}
                />
                <div className="text-right text-slate-400 text-xs sm:text-sm">
                  {pollTitle.length}/160
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-slate-300 font-medium text-sm sm:text-base">Poll Options (2-4)</label>
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      maxLength={70}
                      className="flex-1 p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl sm:rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => removePollOption(index)}
                        className="p-3 sm:p-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                    {pollOptions.length < 4 && index === pollOptions.length - 1 && (
                      <button
                        onClick={addPollOption}
                        className="p-3 sm:p-4 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium text-sm sm:text-base">Poll Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '10 min', value: 10 },
                      { label: '1 hour', value: 60 },
                      { label: '4 hours', value: 240 },
                      { label: '1 day', value: 1440 },
                      { label: '3 days', value: 4320 },
                      { label: '7 days', value: 10080 },
                    ].map((duration) => (
                      <button
                        key={duration.value}
                        onClick={() => setPollDuration(duration.value)}
                        className={`p-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
                          pollDuration === duration.value
                            ? 'bg-slate-600 text-slate-100'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
                        }`}
                      >
                        {duration.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

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

            {/* Anonymous Post */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-700">
              <div className="flex items-center space-x-3">
                <UserX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-slate-200 font-medium text-sm sm:text-base">Anonymous Post</div>
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

            {/* Celebrate Anniversary */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl sm:rounded-2xl border border-purple-500/30">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                  <Cake className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-slate-200 font-medium text-sm sm:text-base flex items-center space-x-2">
                    <span>Celebrate Anniversary</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider border border-purple-500/30">Special</span>
                  </div>
                  <div className="text-slate-400 text-xs sm:text-sm">Celebrate FRACT's 1-year with a surprise!</div>
                </div>
              </div>
              <button
                onClick={() => setIsAnniversary(!isAnniversary)}
                className={`relative w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                  isAnniversary ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-slate-600'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 sm:top-1 sm:w-4 sm:h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${
                  isAnniversary ? 'left-5 sm:left-7' : 'left-0.5 sm:left-1'
                }`} />
              </button>
            </div>

            {/* Perspective Lock */}
            {postType !== 'poll' && (
              <div className="p-3 sm:p-4 bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-700">
                <div className="flex items-center space-x-3 mb-3">
                  <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  <div>
                    <div className="text-slate-200 font-medium text-sm sm:text-base">Perspective Lock (Optional)</div>
                    <div className="text-slate-400 text-xs sm:text-sm">Tag your post with a perspective type</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPerspectiveLock(perspectiveLock === 'opinion' ? null : 'opinion')}
                    className={`p-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                      perspectiveLock === 'opinion'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span>Opinion</span>
                  </button>

                  <button
                    onClick={() => setPerspectiveLock(perspectiveLock === 'question' ? null : 'question')}
                    className={`p-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                      perspectiveLock === 'question'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Question</span>
                  </button>

                  <button
                    onClick={() => setPerspectiveLock(perspectiveLock === 'hypothesis' ? null : 'hypothesis')}
                    className={`p-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                      perspectiveLock === 'hypothesis'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
                    }`}
                  >
                    <FlaskConical className="w-4 h-4" />
                    <span>Hypothesis</span>
                  </button>

                  <button
                    onClick={() => setPerspectiveLock(perspectiveLock === 'personal_experience' ? null : 'personal_experience')}
                    className={`p-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                      perspectiveLock === 'personal_experience'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Experience</span>
                  </button>
                </div>
              </div>
            )}

            {/* Source Attribution - Media Profiles Only */}
            {isMediaProfile && (
              <div className="p-3 sm:p-4 bg-orange-500/10 rounded-xl sm:rounded-2xl border border-orange-500/30">
                <div className="flex items-center space-x-3 mb-4">
                  <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                  <div>
                    <div className="text-slate-200 font-medium text-sm sm:text-base">Source Attribution (Required)</div>
                    <div className="text-slate-400 text-xs sm:text-sm">Media profiles must provide sources or declare content type</div>
                  </div>
                </div>

                {/* Source Type Selection */}
                <div className="mb-4">
                  <div className="text-slate-300 text-sm font-medium mb-2">Choose one:</div>

                  {/* Provide Sources Option */}
                  <button
                    onClick={() => setSourceType(sourceType === 'sources' ? null : 'sources')}
                    className={`w-full p-3 rounded-lg text-left transition-all duration-300 mb-2 ${
                      sourceType === 'sources'
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    <div className="font-medium text-sm">Provide Sources (3-5 required)</div>
                    <div className="text-xs opacity-80 mt-1">List sources for factual claims</div>
                  </button>

                  {/* Content Type Options */}
                  <div className="text-slate-300 text-sm font-medium mb-2 mt-4">Or select content type:</div>

                  <button
                    onClick={() => setSourceType(sourceType === 'original_reporting' ? null : 'original_reporting')}
                    className={`w-full p-3 rounded-lg text-left transition-all duration-300 mb-2 ${
                      sourceType === 'original_reporting'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    <div className="font-medium text-sm">Original Reporting</div>
                    <div className="text-xs opacity-80 mt-1">Based on original information or firsthand knowledge</div>
                  </button>

                  <button
                    onClick={() => setSourceType(sourceType === 'opinion_commentary' ? null : 'opinion_commentary')}
                    className={`w-full p-3 rounded-lg text-left transition-all duration-300 mb-2 ${
                      sourceType === 'opinion_commentary'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    <div className="font-medium text-sm">Opinion / Commentary</div>
                    <div className="text-xs opacity-80 mt-1">Analysis or opinion, not sourced facts</div>
                  </button>

                  <button
                    onClick={() => setSourceType(sourceType === 'public_knowledge' ? null : 'public_knowledge')}
                    className={`w-full p-3 rounded-lg text-left transition-all duration-300 ${
                      sourceType === 'public_knowledge'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    <div className="font-medium text-sm">Public Knowledge</div>
                    <div className="text-xs opacity-80 mt-1">Widely known information, no single source needed</div>
                  </button>
                </div>

                {/* Source Input Fields */}
                {sourceType === 'sources' && (
                  <div className="space-y-2">
                    <div className="text-slate-300 text-sm font-medium mb-2">Enter Sources (Min: 3, Max: 5)</div>
                    {sources.map((source, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={source}
                          onChange={(e) => updateSource(index, e.target.value)}
                          placeholder={`Source ${index + 1} (URL or citation)`}
                          className="flex-1 p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        />
                        {sources.length > 3 && (
                          <button
                            onClick={() => removeSource(index)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {sources.length < 5 && (
                      <button
                        onClick={addSource}
                        className="w-full p-2 text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:bg-orange-500/10 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Source</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Optional Description for Content Types */}
                {sourceType && sourceType !== 'sources' && (
                  <div className="mt-3">
                    <textarea
                      value={sourceDescription}
                      onChange={(e) => setSourceDescription(e.target.value)}
                      placeholder="Optional: Add details about this content..."
                      className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Disappearing Timer */}
            {postType !== 'poll' && (
              <>
                <div className="p-3 sm:p-4 bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-700">
                  <div className="flex items-center space-x-3 mb-3">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                    <div>
                      <div className="text-slate-200 font-medium text-sm sm:text-base">Disappearing Post</div>
                      <div className="text-slate-400 text-xs sm:text-sm">Auto-delete after specified time</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[null, 5, 15, 30, 60, 120, 360, 1440, 10080].map((minutes) => (
                      <button
                        key={minutes || 'never'}
                        onClick={() => setDisappearTimer(minutes)}
                        className={`p-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
                          disappearTimer === minutes
                            ? 'bg-slate-600 text-slate-100'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-200'
                        }`}
                      >
                        {minutes ? (
                          minutes < 60 ? `${minutes}m` :
                          minutes < 1440 ? `${Math.floor(minutes / 60)}h` :
                          minutes === 1440 ? '1d' :
                          minutes === 10080 ? '1w' : `${minutes}m`
                        ) : 'Never'}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Custom Time Input */}
                <div className="space-y-3">
                  <div className="text-slate-300 font-medium text-sm">Or set custom time:</div>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      placeholder="Amount"
                      className="flex-1 p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm"
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        const unit = (e.target.nextElementSibling as HTMLSelectElement)?.value || 'minutes';
                        if (value && value > 0) {
                          let minutes = value;
                          if (unit === 'hours') minutes = value * 60;
                          else if (unit === 'days') minutes = value * 1440;
                          else if (unit === 'weeks') minutes = value * 10080;
                          setDisappearTimer(minutes);
                        }
                      }}
                    />
                    <select
                      className="p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm"
                      onChange={(e) => {
                        const input = e.target.previousElementSibling as HTMLInputElement;
                        const value = parseInt(input.value);
                        if (value && value > 0) {
                          let minutes = value;
                          if (e.target.value === 'hours') minutes = value * 60;
                          else if (e.target.value === 'days') minutes = value * 1440;
                          else if (e.target.value === 'weeks') minutes = value * 10080;
                          setDisappearTimer(minutes);
                        }
                      }}
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                  
                  {disappearTimer && !([null, 5, 15, 30, 60, 120, 360, 1440, 10080].includes(disappearTimer)) && (
                    <div className="text-slate-400 text-xs">
                      Post will disappear in: {
                        disappearTimer < 60 ? `${disappearTimer} minutes` :
                        disappearTimer < 1440 ? `${Math.floor(disappearTimer / 60)} hours ${disappearTimer % 60 > 0 ? `${disappearTimer % 60} minutes` : ''}` :
                        disappearTimer < 10080 ? `${Math.floor(disappearTimer / 1440)} days ${Math.floor((disappearTimer % 1440) / 60) > 0 ? `${Math.floor((disappearTimer % 1440) / 60)} hours` : ''}` :
                        `${Math.floor(disappearTimer / 10080)} weeks ${Math.floor((disappearTimer % 10080) / 1440) > 0 ? `${Math.floor((disappearTimer % 10080) / 1440)} days` : ''}`
                      }
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;