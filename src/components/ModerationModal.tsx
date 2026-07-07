import React, { useState } from 'react';
import { X, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ModerationModalProps {
  postId: string;
  currentModeration: 'NONE' | 'child_exploitation' | 'child_safety' | 'self_harm_intent' | 'bullying' | 'violent_description' | 'drugs' | 'self_harm' | 'hate' | 'violence' | 'weapons';
  onClose: () => void;
  onModerate: () => void;
}

const ModerationModal: React.FC<ModerationModalProps> = ({
  postId,
  currentModeration,
  onClose,
  onModerate,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(currentModeration);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moderationCategories = [
    {
      value: 'NONE',
      label: 'No Moderation',
      description: 'Post will appear in Discover feed',
      color: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
      activeColor: 'bg-green-500/20 border-green-500 ring-2 ring-green-500/50',
      textColor: 'text-green-400',
    },
    {
      value: 'child_exploitation',
      label: 'Child Exploitation',
      description: 'Content showing child exploitation',
      color: 'bg-red-600/10 border-red-600/30 hover:bg-red-600/20',
      activeColor: 'bg-red-600/20 border-red-600 ring-2 ring-red-600/50',
      textColor: 'text-red-500',
    },
    {
      value: 'child_safety',
      label: 'Child Safety',
      description: 'Content that endangers children',
      color: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20',
      activeColor: 'bg-red-500/20 border-red-500 ring-2 ring-red-500/50',
      textColor: 'text-red-400',
    },
    {
      value: 'self_harm_intent',
      label: 'Self Harm Intent',
      description: 'Content showing intent of self-harm',
      color: 'bg-orange-600/10 border-orange-600/30 hover:bg-orange-600/20',
      activeColor: 'bg-orange-600/20 border-orange-600 ring-2 ring-orange-600/50',
      textColor: 'text-orange-500',
    },
    {
      value: 'bullying',
      label: 'Bullying',
      description: 'Harassment or bullying behavior',
      color: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
      activeColor: 'bg-orange-500/20 border-orange-500 ring-2 ring-orange-500/50',
      textColor: 'text-orange-400',
    },
    {
      value: 'violent_description',
      label: 'Violent Description',
      description: 'Graphic descriptions of violence',
      color: 'bg-amber-600/10 border-amber-600/30 hover:bg-amber-600/20',
      activeColor: 'bg-amber-600/20 border-amber-600 ring-2 ring-amber-600/50',
      textColor: 'text-amber-500',
    },
    {
      value: 'drugs',
      label: 'Drugs',
      description: 'Promotion or use of illegal drugs',
      color: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20',
      activeColor: 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/50',
      textColor: 'text-purple-400',
    },
    {
      value: 'self_harm',
      label: 'Self Harm',
      description: 'Content related to self-harm',
      color: 'bg-orange-400/10 border-orange-400/30 hover:bg-orange-400/20',
      activeColor: 'bg-orange-400/20 border-orange-400 ring-2 ring-orange-400/50',
      textColor: 'text-orange-300',
    },
    {
      value: 'hate',
      label: 'Hate',
      description: 'Hate speech or symbols',
      color: 'bg-red-400/10 border-red-400/30 hover:bg-red-400/20',
      activeColor: 'bg-red-400/20 border-red-400 ring-2 ring-red-400/50',
      textColor: 'text-red-300',
    },
    {
      value: 'violence',
      label: 'Violence',
      description: 'Depiction of violence',
      color: 'bg-red-700/10 border-red-700/30 hover:bg-red-700/20',
      activeColor: 'bg-red-700/20 border-red-700 ring-2 ring-red-700/50',
      textColor: 'text-red-600',
    },
    {
      value: 'weapons',
      label: 'Weapons',
      description: 'Promotion or sale of weapons',
      color: 'bg-gray-600/10 border-gray-600/30 hover:bg-gray-600/20',
      activeColor: 'bg-gray-600/20 border-gray-600 ring-2 ring-gray-600/50',
      textColor: 'text-gray-400',
    },
  ];

  const handleSubmit = async () => {
    if (selectedReason === currentModeration) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('moderate_post', {
        target_post_id: postId,
        reason: selectedReason,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      if (data && !data.success) {
        setError(data.error || 'Failed to moderate post');
        return;
      }

      onModerate();
      onClose();
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error moderating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-slate-100">Moderate Post</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-slate-300 text-sm mb-2">
              Select a moderation category for this post. Moderated posts are excluded from the Discover feed
              but remain visible elsewhere.
            </p>
            <p className="text-slate-400 text-xs">
              The post owner will see a warning message and their account status will be set to "Limited".
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 text-sm font-medium mb-1">Error</p>
                <p className="text-red-300/90 text-xs">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {moderationCategories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedReason(category.value)}
                className={`w-full text-left border rounded-xl p-4 transition-all duration-200 ${
                  selectedReason === category.value
                    ? category.activeColor
                    : category.color
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {selectedReason === category.value ? (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-500"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm mb-1 ${category.textColor}`}>
                      {category.label}
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Applying...' : 'Apply Moderation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModerationModal;
