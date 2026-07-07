import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X } from 'lucide-react';

interface ReportModalProps {
  targetType: 'user' | 'post';
  targetId: string;
  targetName?: string;
  onClose: () => void;
  onReport: (targetId: string, ...args: any[]) => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  targetType,
  targetId,
  targetName,
  onClose,
  onReport
}) => {
  const [reportType, setReportType] = useState<'profile_info' | 'general'>('general');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const userReportReasons = {
    profile_info: [
      'Inappropriate profile picture',
      'Inappropriate cover photo',
      'Inappropriate bio content',
      'Misleading profile information',
      'Impersonation'
    ],
    general: [
      'Harassment or bullying',
      'Spam or fake account',
      'Hate speech',
      'Inappropriate behavior',
      'Scam or fraud',
      'Other'
    ]
  };

  const postReportReasons = [
    'Spam or misleading content',
    'Harassment or bullying',
    'Hate speech',
    'Violence or dangerous content',
    'Adult content',
    'Copyright infringement',
    'Other'
  ];

  const handleSubmit = async () => {
    if (!reason) return;

    setIsSubmitting(true);
    try {
      if (targetType === 'user') {
        await onReport(targetId, reportType, reason, description);
      } else {
        await onReport(targetId, reason, description);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700/80 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Report {targetType === 'user' ? 'User' : 'Post'}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[220px]">
                {targetName || 'Unknown'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {targetType === 'user' && (
            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm">Report Category</label>
              <div className="space-y-2">
                <button
                  onClick={() => setReportType('profile_info')}
                  className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
                    reportType === 'profile_info'
                      ? 'bg-slate-600/80 text-slate-100 ring-1 ring-slate-500'
                      : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  <div className="font-medium text-sm">Profile Information</div>
                  <div className="text-xs text-slate-400 mt-0.5">Issues with profile picture, bio, etc.</div>
                </button>
                <button
                  onClick={() => setReportType('general')}
                  className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
                    reportType === 'general'
                      ? 'bg-slate-600/80 text-slate-100 ring-1 ring-slate-500'
                      : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  <div className="font-medium text-sm">General Behavior</div>
                  <div className="text-xs text-slate-400 mt-0.5">Issues with user behavior or content</div>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-2 text-sm">Reason for Report</label>
            <div className="space-y-1.5">
              {(targetType === 'user'
                ? userReportReasons[reportType]
                : postReportReasons
              ).map((reasonOption) => (
                <button
                  key={reasonOption}
                  onClick={() => setReason(reasonOption)}
                  className={`w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200 text-sm ${
                    reason === reasonOption
                      ? 'bg-red-500/15 text-red-200 ring-1 ring-red-500/50'
                      : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  {reasonOption}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-2 text-sm">
              Additional Details (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about this report..."
              rows={3}
              className="w-full p-3 bg-slate-700/40 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition-all duration-200 resize-none text-sm"
              maxLength={500}
            />
            <div className="text-right text-slate-500 text-xs mt-1">
              {description.length}/500
            </div>
          </div>
        </div>

        <div className="flex space-x-3 p-5 pt-4 border-t border-slate-700/50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason || isSubmitting}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 text-sm"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReportModal;