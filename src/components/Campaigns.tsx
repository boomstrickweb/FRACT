import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, X, Globe, Tag, Heart, Info } from 'lucide-react';
import { MdCampaign } from 'react-icons/md';
import { getCampaignIcon } from '../lib/campaignIcons';
import { supabase } from '../lib/supabase';
import NewCampaign from './NewCampaign';
import CampaignPage from './CampaignPage';
import CampaignPost from './CampaignPost';

interface Campaign {
  id: string;
  author_id: string;
  title: string;
  summary: string;
  action_goal: string;
  category: string;
  region: string;
  is_reviewed: boolean;
  created_at: string;
  supporter_count?: number;
  author?: {
    name: string;
    username: string;
    profile_pic_url?: string;
  };
}

interface CampaignsProps {
  onBack: () => void;
}


const Campaigns: React.FC<CampaignsProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [supportingCampaign, setSupportingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          author:profiles(name, username, profile_pic_url),
          posts(count)
        `)
        .eq('is_reviewed', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const enrichedData = data?.map(c => ({
        ...c,
        supporter_count: c.posts?.[0]?.count || 0
      })) || [];
      
      setCampaigns(enrichedData);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewCampaignClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/intro');
      return;
    }
    setShowNewCampaign(true);
  };

  if (showNewCampaign) {
    return <NewCampaign onBack={() => setShowNewCampaign(false)} onSubmitted={() => {
      setShowNewCampaign(false);
      fetchCampaigns();
    }} />;
  }

  if (supportingCampaign) {
    return (
      <CampaignPost 
        campaignId={supportingCampaign.id} 
        campaignTitle={supportingCampaign.title}
        campaignCategory={supportingCampaign.category}
        onBack={() => setSupportingCampaign(null)}
        onPostCreated={() => {
          setSupportingCampaign(null);
          // Optional: redirect to home feed or show success
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={onBack}
                className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors group"
              >
                <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-white" />
              </button>
              <h1 className="text-xl font-bold ml-4">Campaigns</h1>
            </div>
            <button
              onClick={handleNewCampaignClick}
              className="flex items-center gap-2 bg-slate-100 text-slate-900 px-4 py-2 rounded-xl font-medium hover:bg-white transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Campaign</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-slate-400 rounded-full animate-spin"></div>
          </div>
        ) : campaigns.length > 0 ? (
          <div className="grid gap-6">
            {campaigns.map((campaign) => {
              const CampaignIcon = getCampaignIcon(campaign);
              return (
                <div 
                  key={campaign.id} 
                  className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-all cursor-pointer group/card"
                  onClick={() => navigate(`/c/${campaign.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <button 
                      className="flex-shrink-0 bg-slate-100 text-slate-900 px-4 py-2 rounded-xl font-bold hover:bg-white transition-colors flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSupportingCampaign(campaign);
                      }}
                    >
                      <Heart className="w-4 h-4" />
                      <span>Support</span>
                    </button>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <CampaignIcon className="w-5 h-5 text-slate-400 group-hover/card:text-slate-300 transition-colors" />
                        <h3 className="text-xl font-bold group-hover/card:text-slate-200 transition-colors">{campaign.title}</h3>
                      </div>
                      <p className="text-slate-300 line-clamp-2">{campaign.summary}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                        <span>{campaign.supporter_count || 0} Supporters</span>
                      </div>
                    </div>
                    <button
                      className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCampaign(campaign);
                      }}
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
              <MdCampaign className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Campaigns Yet</h2>
            <p className="text-slate-400 mb-8">Be the first to start a movement!</p>
            <button
              onClick={handleNewCampaignClick}
              className="bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-white transition-colors"
            >
              Start New Campaign
            </button>
          </div>
        )}
      </div>
      {/* Info Card Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedCampaign(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              {selectedCampaign.author?.profile_pic_url ? (
                <img src={selectedCampaign.author.profile_pic_url} alt="" className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                  {React.createElement(getCampaignIcon(selectedCampaign), { className: "w-8 h-8 text-slate-400" })}
                </div>
              )}
              <div>
                <div className="text-lg font-bold">{selectedCampaign.author?.name}</div>
                <div className="text-slate-400">@{selectedCampaign.author?.username}</div>
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-4">{selectedCampaign.title}</h2>
            
            <div className="flex items-center gap-2 mb-6 text-blue-400 font-bold uppercase tracking-wider text-sm">
              <span>{selectedCampaign.supporter_count || 0} Supporters</span>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Summary</h4>
                <p className="text-slate-200 text-lg leading-relaxed">{selectedCampaign.summary}</p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Action Goal</h4>
                <div className="bg-slate-700/30 border border-slate-700 p-4 rounded-2xl text-slate-100">
                  {selectedCampaign.action_goal}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/30 p-4 rounded-2xl border border-slate-700">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Tag className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Category</span>
                  </div>
                  <div className="font-semibold">{selectedCampaign.category}</div>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-2xl border border-slate-700">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Globe className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Region</span>
                  </div>
                  <div className="font-semibold">{selectedCampaign.region}</div>
                </div>
              </div>

              <button 
                className="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-bold hover:bg-white transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  // Support action
                }}
              >
                <Heart className="w-5 h-5 fill-current" />
                <span>Support this Campaign</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
