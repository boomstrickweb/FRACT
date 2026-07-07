import React, { useState } from 'react';
import { ArrowLeft, Check, X, Newspaper, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AccountScopeDeclarationProps {
  onBack: () => void;
  onComplete: () => void;
}

const AccountScopeDeclaration: React.FC<AccountScopeDeclarationProps> = ({ onBack, onComplete }) => {
  const [selectedCovers, setSelectedCovers] = useState<string[]>([]);
  const [selectedDoesNotCover, setSelectedDoesNotCover] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverCategories = [
    {
      title: '📰 Information & Analysis',
      items: [
        'Public Affairs',
        'Politics & Governance',
        'Economy & Finance',
        'Technology & Innovation',
        'Science & Research',
        'Environment & Climate',
        'Health (non-medical analysis only)',
        'Education',
        'Law & Legal Analysis (non-advisory)'
      ]
    },
    {
      title: '🌍 Society & Culture',
      items: [
        'Society & Social Issues',
        'Human Rights',
        'Media & Journalism',
        'Culture & Arts',
        'Philosophy & Ethics',
        'History',
        'Religion & Belief Systems'
      ]
    },
    {
      title: '🌐 Digital & Modern Life',
      items: [
        'Internet & Digital Culture',
        'AI & Future Studies',
        'Cybersecurity',
        'Startups & Entrepreneurship',
        'Work & Productivity'
      ]
    }
  ];

  const doesNotCoverItems = [
    'Medical advice',
    'Psychological or psychiatric advice',
    'Legal advice',
    'Financial investment advice',
    'Gambling or betting',
    'Adult or explicit content',
    'Hate-based content',
    'Violent or extremist content'
  ];

  const toggleCover = (item: string) => {
    if (selectedCovers.includes(item)) {
      setSelectedCovers(selectedCovers.filter(i => i !== item));
    } else {
      if (selectedCovers.length < 5) {
        setSelectedCovers([...selectedCovers, item]);
      }
    }
  };

  const toggleDoesNotCover = (item: string) => {
    if (selectedDoesNotCover.includes(item)) {
      setSelectedDoesNotCover(selectedDoesNotCover.filter(i => i !== item));
    } else {
      setSelectedDoesNotCover([...selectedDoesNotCover, item]);
    }
  };

  const isValid = () => {
    return selectedCovers.length >= 2 && selectedCovers.length <= 5 && selectedDoesNotCover.length >= 2;
  };

  const handleConfirm = async () => {
    if (!isValid()) return;

    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      await supabase.from('account_scope_covers').delete().eq('user_id', user.id);
      await supabase.from('account_scope_does_not_cover').delete().eq('user_id', user.id);

      const coversData = selectedCovers.map(topic => ({
        user_id: user.id,
        topic
      }));

      const doesNotCoverData = selectedDoesNotCover.map(item => ({
        user_id: user.id,
        item
      }));

      const { error: coversError } = await supabase
        .from('account_scope_covers')
        .insert(coversData);

      if (coversError) throw coversError;

      const { error: doesNotCoverError } = await supabase
        .from('account_scope_does_not_cover')
        .insert(doesNotCoverData);

      if (doesNotCoverError) throw doesNotCoverError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          profile_type: 'media',
          media_converted_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Error saving account scope:', err);
      setError(err.message || 'Failed to save account scope. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const getCoverValidationMessage = () => {
    if (selectedCovers.length === 0) {
      return { message: 'Select at least 2 topics', color: 'text-slate-400' };
    } else if (selectedCovers.length === 1) {
      return { message: 'Select at least 1 more topic', color: 'text-orange-400' };
    } else if (selectedCovers.length >= 2 && selectedCovers.length <= 5) {
      return { message: `${selectedCovers.length} topics selected`, color: 'text-green-400' };
    } else {
      return { message: 'Maximum 5 topics', color: 'text-red-400' };
    }
  };

  const getDoesNotCoverValidationMessage = () => {
    if (selectedDoesNotCover.length === 0) {
      return { message: 'Select at least 2 items (required)', color: 'text-red-400' };
    } else if (selectedDoesNotCover.length === 1) {
      return { message: 'Select at least 1 more item', color: 'text-orange-400' };
    } else {
      return { message: `${selectedDoesNotCover.length} items selected`, color: 'text-green-400' };
    }
  };

  const coverValidation = getCoverValidationMessage();
  const doesNotCoverValidation = getDoesNotCoverValidationMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-100">Account Scope Declaration</h1>
                  <p className="text-slate-400 text-sm">Define your coverage areas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 mb-8">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-blue-300 font-semibold mb-1">Why This Matters</h3>
              <p className="text-blue-400/80 text-sm leading-relaxed">
                Media Profiles clearly state what they talk about and what they do not. This protects the reader and keeps the media account disciplined.
              </p>
            </div>
          </div>
        </div>

        {/* Covers Section */}
        <div className="mb-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-slate-100">Covers</h2>
              <div className={`text-sm font-semibold ${coverValidation.color}`}>
                {coverValidation.message}
              </div>
            </div>
            <p className="text-slate-400 text-sm">This account mainly covers these (select 2-5 topics)</p>
          </div>

          <div className="space-y-6">
            {coverCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-100 mb-4">{category.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.items.map((item, itemIndex) => {
                    const isSelected = selectedCovers.includes(item);
                    const isDisabled = !isSelected && selectedCovers.length >= 5;

                    return (
                      <button
                        key={itemIndex}
                        onClick={() => !isDisabled && toggleCover(item)}
                        disabled={isDisabled}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                          isSelected
                            ? 'border-green-500 bg-green-500/10 text-green-300'
                            : isDisabled
                            ? 'border-slate-700 bg-slate-800/30 text-slate-600 cursor-not-allowed'
                            : 'border-slate-600 bg-slate-800/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium pr-2">{item}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Does NOT Cover Section */}
        <div className="mb-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-red-400">Does NOT Cover</h2>
              <div className={`text-sm font-semibold ${doesNotCoverValidation.color}`}>
                {doesNotCoverValidation.message}
              </div>
            </div>
            <p className="text-slate-400 text-sm">This account does not cover these (select at least 2 - required)</p>
            <div className="mt-2 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <p className="text-orange-300 text-sm">
                <strong>Important:</strong> This section sends a clear message to the reader: "Do not expect these from this account."
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-red-500/30 rounded-2xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {doesNotCoverItems.map((item, index) => {
                const isSelected = selectedDoesNotCover.includes(item);

                return (
                  <button
                    key={index}
                    onClick={() => toggleDoesNotCover(item)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                      isSelected
                        ? 'border-red-500 bg-red-500/10 text-red-300'
                        : 'border-slate-600 bg-slate-800/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium pr-2">{item}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-red-400 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gradient-to-t from-gray-900 via-slate-800/95 to-transparent pt-8 pb-6">
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
            {!isValid() && (
              <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-orange-300 font-semibold text-sm">Requirements not met</p>
                    <ul className="mt-2 space-y-1 text-orange-400/80 text-sm">
                      {selectedCovers.length < 2 && (
                        <li>• Select at least 2 topics in "Covers" section</li>
                      )}
                      {selectedCovers.length > 5 && (
                        <li>• Select maximum 5 topics in "Covers" section</li>
                      )}
                      {selectedDoesNotCover.length < 2 && (
                        <li>• Select at least 2 items in "Does NOT Cover" section</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={onBack}
                disabled={isSaving}
                className="flex-1 px-6 py-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValid() || isSaving}
                className={`flex-1 px-6 py-4 font-bold rounded-xl transition-all duration-300 transform ${
                  isValid() && !isSaving
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white hover:scale-105 cursor-pointer'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Check className="w-5 h-5 inline mr-2" />
                {isSaving ? 'Saving...' : 'Confirm & Convert'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl max-w-md w-full border border-green-500/30 shadow-2xl overflow-hidden">
            {/* Success Animation Background */}
            <div className="relative p-8 bg-gradient-to-r from-green-600/20 to-emerald-600/20">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">You're All Set!</h2>
                <p className="text-green-300 text-lg mb-2">Welcome to Media Profile</p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Your account has been successfully converted to a Media Profile. You now have enhanced privileges and responsibilities.
                </p>
              </div>
            </div>

            {/* Selected Coverage Summary */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Check className="w-4 h-4 text-green-400" />
                  <h4 className="text-sm font-bold text-slate-100">Your Coverage Areas</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCovers.map((item, index) => (
                    <span key={index} className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-xs">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <X className="w-4 h-4 text-red-400" />
                  <h4 className="text-sm font-bold text-slate-100">What You Don't Cover</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDoesNotCover.map((item, index) => (
                    <span key={index} className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="p-6 pt-0">
              <button
                onClick={handleComplete}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Continue to My Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountScopeDeclaration;
