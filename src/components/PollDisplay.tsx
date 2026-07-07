import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PollOption {
  id: number;
  text: string;
  vote_count: number;
}

interface PollDisplayProps {
  postId: string;
  createdBy: string;
  currentUserId?: string;
}

interface PollData {
  id: string;
  title: string;
  options: PollOption[];
  start_time: string;
  end_time: string;
  status: 'ongoing' | 'ended';
  total_votes: number;
}

interface UserVote {
  option_index: number;
}

const PollDisplay: React.FC<PollDisplayProps> = ({ postId, createdBy, currentUserId }) => {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [userVote, setUserVote] = useState<UserVote | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [pollEnded, setPollEnded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPoll();
    const interval = setInterval(checkPollStatus, 1000);
    return () => clearInterval(interval);
  }, [postId]);

  const loadPoll = async () => {
    try {
      setIsLoading(true);
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('post_id', postId)
        .maybeSingle();

      if (pollError) {
        console.error('Error loading poll:', pollError);
        setIsLoading(false);
        return;
      }

      if (pollData) {
        setPoll(pollData);
        await checkPollStatus();

        if (currentUserId && currentUserId !== createdBy) {
          const { data: voteData } = await supabase
            .from('poll_votes')
            .select('option_index')
            .eq('poll_id', pollData.id)
            .eq('user_id', currentUserId)
            .maybeSingle();

          if (voteData) {
            setUserVote(voteData);
          }
        }
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Error in loadPoll:', err);
      setIsLoading(false);
    }
  };

  const checkPollStatus = async () => {
    try {
      const { data: pollData } = await supabase
        .from('polls')
        .select('*')
        .eq('post_id', postId)
        .maybeSingle();

      if (!pollData) return;

      const endTime = new Date(pollData.end_time).getTime();
      const now = Date.now();

      if (now >= endTime) {
        setPollEnded(true);
        setPoll(pollData);
        setTimeRemaining('');
      } else {
        setPollEnded(false);
        const remaining = endTime - now;
        setTimeRemaining(formatTimeRemaining(remaining));
      }
    } catch (err) {
      console.error('Error checking poll status:', err);
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const duration = end - start;

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  };

  const handleVote = async (optionIndex: number) => {
    if (!currentUserId || !poll) return;

    if (currentUserId === createdBy) {
      setError('Poll creator cannot vote in their own poll');
      return;
    }

    setSelectedOption(optionIndex);
    setShowConfirmation(true);
  };

  const confirmVote = async () => {
    if (!currentUserId || !poll || selectedOption === null) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { error: voteError } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: poll.id,
          user_id: currentUserId,
          option_index: selectedOption,
        });

      if (voteError) {
        if (voteError.message.includes('duplicate')) {
          setError('You have already voted in this poll');
        } else {
          setError('Failed to submit vote');
        }
        console.error('Vote error:', voteError);
      } else {
        setUserVote({ option_index: selectedOption });
        setShowConfirmation(false);
        await loadPoll();
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 sm:p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-3/4"></div>
        <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 sm:p-6">
        <p className="text-slate-400 text-sm">Poll not found</p>
      </div>
    );
  }

  const totalVotes = poll.total_votes || 0;

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between">
        <h3 className="text-slate-200 font-semibold text-base sm:text-lg flex-1 mr-3">
          {poll.title}
        </h3>
        {pollEnded && (
          <div className="text-xs sm:text-sm font-medium text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full flex-shrink-0">
            Poll ended
          </div>
        )}
      </div>

      {pollEnded ? (
        <div className="text-xs sm:text-sm text-slate-400 space-y-1">
          <p>Lasted {formatDuration(poll.start_time, poll.end_time)}</p>
          <p>{totalVotes} participant{totalVotes !== 1 ? 's' : ''}</p>
        </div>
      ) : (
        <div className="text-xs sm:text-sm text-slate-400">
          Ends in {timeRemaining}
        </div>
      )}

      <div className="space-y-3">
        {poll.options.map((option, index) => {
          const percentage = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;
          const isSelected = userVote?.option_index === index;

          if (pollEnded || userVote) {
            return (
              <div key={option.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isSelected ? 'text-slate-100 font-medium' : 'text-slate-300'}`}>
                    {option.text}
                    {isSelected && <span className="ml-2 text-xs text-teal-400">(Your vote)</span>}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-400 font-medium">
                    {option.vote_count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isSelected ? 'bg-teal-500' : 'bg-slate-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={option.id}>
              <button
                onClick={() => handleVote(index)}
                disabled={isSubmitting}
                className="w-full p-3 sm:p-4 bg-slate-700/50 hover:bg-slate-700 disabled:bg-slate-700/30 text-slate-200 rounded-lg sm:rounded-xl transition-all duration-300 font-medium text-sm sm:text-base text-left"
              >
                {option.text}
              </button>
            </div>
          );
        })}
      </div>

      {!pollEnded && !userVote && (
        <p className="text-xs text-slate-500 text-center">
          Results are revealed after the poll ends -- not during. Results were hidden during voting to ensure independent decisions.
        </p>
      )}

      {pollEnded && !userVote && (
        <p className="text-xs text-slate-500 text-center">
          This poll has ended. Results are now visible.
        </p>
      )}

      {showConfirmation && selectedOption !== null && (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 space-y-3">
          <p className="text-slate-200 font-medium text-sm">
            Your vote: <span className="text-teal-400">{poll.options[selectedOption].text}</span>
          </p>
          <p className="text-xs sm:text-sm text-slate-400">
            Warning: Your vote is final and cannot be changed. Are you sure you want to continue?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirmation(false);
                setSelectedOption(null);
              }}
              disabled={isSubmitting}
              className="flex-1 p-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-600/50 text-slate-200 rounded-lg transition-all duration-300 font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmVote}
              disabled={isSubmitting}
              className="flex-1 p-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-600/50 text-white rounded-lg transition-all duration-300 font-medium text-sm"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm vote'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-xs sm:text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default PollDisplay;
