import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, Globe, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { countries } from './availablecountries';

interface NewCampaignProps {
  onBack: () => void;
  onSubmitted: () => void;
}

const categories = [
  'Environment',
  'Technology',
  'Human Rights',
  'Education',
  'Health',
  'Economy',
  'Privacy',
  'Science',
  'Other'
];

const NewCampaign: React.FC<NewCampaignProps> = ({ onBack, onSubmitted }) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    actionGoal: '',
    category: '',
    regionType: 'Global',
    specificCountry: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a campaign');

      const { error: submitError } = await supabase
        .from('campaigns')
        .insert({
          author_id: user.id,
          title: formData.title,
          summary: formData.summary,
          action_goal: formData.actionGoal,
          category: formData.category,
          region: formData.regionType === 'Global' ? 'Global' : formData.specificCountry,
          is_reviewed: false
        });

      if (submitError) throw submitError;

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to submit campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col">
        <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button 
                onClick={onSubmitted}
                className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors group"
              >
                <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-white" />
              </button>
              <h1 className="text-xl font-bold ml-4">Success</h1>
            </div>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Thanks for your submission.</h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              Every campaign is reviewed before publication to help prevent duplicates, spam, and misleading information.
            </p>
            <button
              onClick={onSubmitted}
              className="w-full bg-slate-100 text-slate-900 py-3 rounded-xl font-bold hover:bg-white transition-colors"
            >
              Back to Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button 
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors group"
            >
              <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-white" />
            </button>
            <h1 className="text-xl font-bold ml-4">New Campaign</h1>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Campaign title (required)
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Don't Cut Trees"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all"
                />
                <div className="text-right text-xs text-slate-500 mt-1">
                  {formData.title.length}/80
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Summary (required)
                </label>
                <textarea
                  required
                  placeholder="What is this campaign for?"
                  rows={3}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  What action are you asking people to support? (required)
                </label>
                <textarea
                  required
                  placeholder="Examples: Protect urban forests, Keep libraries open, Support open-source software, Preserve historic buildings."
                  rows={3}
                  value={formData.actionGoal}
                  onChange={(e) => setFormData({ ...formData, actionGoal: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Category (required)
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Region (required)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, regionType: 'Global' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                        formData.regionType === 'Global'
                          ? 'bg-slate-100 text-slate-900 border-slate-100'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span>Global</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, regionType: 'Specific' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                        formData.regionType === 'Specific'
                          ? 'bg-slate-100 text-slate-900 border-slate-100'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Country</span>
                    </button>
                  </div>
                </div>
              </div>

              {formData.regionType === 'Specific' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Select Country (required)
                  </label>
                  <select
                    required
                    value={formData.specificCountry}
                    onChange={(e) => setFormData({ ...formData, specificCountry: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all"
                  >
                    <option value="">Choose a country...</option>
                    {countries.map((country) => (
                      <option key={country.name} value={country.name}>{country.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-100 text-slate-900 py-4 rounded-xl font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-3 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Submit'
                )}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4 leading-relaxed">
                Campaigns are selected based on relevance, originality, community interest, and compliance with our moderation rules.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewCampaign;
