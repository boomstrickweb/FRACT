import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FeedbackProps {
  onBack: () => void;
}

const Feedback: React.FC<FeedbackProps> = ({ onBack }) => {
  const [feedbackType, setFeedbackType] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const feedbackTypes = [
    { value: 'feature_request', label: 'Feature request' },
    { value: 'ui_ux_improvement', label: 'UI/UX improvement' },
    { value: 'bug_report', label: 'Bug report' },
    { value: 'moderation_concern', label: 'Moderation concern' },
    { value: 'general_feedback', label: 'General feedback' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackType || !feedbackText.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('No user found');
        return;
      }

      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          feedback_type: feedbackType,
          feedback_text: feedbackText.trim()
        });

      if (error) {
        console.error('Error submitting feedback:', error);
        return;
      }

      setShowSuccess(true);
      setFeedbackType('');
      setFeedbackText('');

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-slate-100">Feedback</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-3">Share Your Feedback</h2>
          <p className="text-slate-300 text-lg mb-2">
            Feedback shared on FRACT helps shape the platform.
          </p>
          <p className="text-slate-300 text-lg mb-4">
            Not all suggestions will be implemented, but all are observed.
          </p>
          <p className="text-slate-400 text-sm">
            You can share thoughts on features, design, bugs, moderation, or the experience overall.
          </p>
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type Selection */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <label className="block text-slate-200 font-semibold mb-4">
              Feedback Type <span className="text-red-400">*</span>
            </label>
            <div className="space-y-3">
              {feedbackTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                    feedbackType === type.value
                      ? 'bg-blue-600/20 border-2 border-blue-500'
                      : 'bg-slate-700/30 border-2 border-slate-600/50 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="feedbackType"
                    value={type.value}
                    checked={feedbackType === type.value}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-3 text-slate-200 font-medium">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Feedback Text Input */}
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <label className="block text-slate-200 font-semibold mb-4">
              Your Feedback <span className="text-red-400">*</span>
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe what you'd like to see or what you think could be improved."
              rows={8}
              className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
              required
            />
            <p className="text-slate-500 text-sm mt-3">
              FRACT does not respond to all feedback directly, but feedback does influence direction.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!feedbackType || !feedbackText.trim() || isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Share Feedback</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-slide-up">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">Feedback Submitted!</p>
              <p className="text-sm text-green-100">Thank you for helping improve FRACT</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback;
