import React, { useState, useEffect } from 'react';
import { ChevronLeft, Heart } from 'lucide-react';
import { getCampaignIcon } from '../lib/campaignIcons';
import { supabase } from '../lib/supabase';
import PostCard from './PostCard';
import CampaignPost from './CampaignPost';

interface Campaign {
  id: string;
  title: string;
  summary: string;
  category: string;
  supporter_count?: number;
}

interface CampaignPageProps {
  campaign?: Campaign;
  campaignId?: string;
  onBack: () => void;
}

const CampaignPage: React.FC<CampaignPageProps> = ({ campaign: initialCampaign, campaignId, onBack }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(initialCampaign || null);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialCampaign);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [showSupportFlow, setShowSupportFlow] = useState(false);

  useEffect(() => {
    if (!campaign && campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  useEffect(() => {
    if (campaign?.id || campaignId) {
      fetchPosts();
    }
  }, [campaign?.id, campaignId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const fetchCampaign = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          posts(count)
        `)
        .eq('id', campaignId)
        .single();
      
      if (error) throw error;
      
      const enrichedData = {
        ...data,
        supporter_count: data.posts?.[0]?.count || 0
      };
      setCampaign(enrichedData);
    } catch (error) {
      console.error('Error fetching campaign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setIsLoadingPosts(true);
      const targetId = campaign?.id || campaignId;
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          campaign:campaigns(id, title, category),
          author:profiles!posts_author_id_fkey (
            id,
            name,
            username,
            profile_pic_url,
            is_verified,
            verification_type,
            verification_reason
          )
        `)
        .eq('campaign_id', targetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Check for user reactions and saved state
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data && data.length > 0) {
        const postIds = data.map((post: any) => post.id);
        const [savedRes, reactionsRes] = await Promise.all([
          supabase.from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          supabase.from('post_reactions').select('post_id, reaction_type').eq('user_id', user.id).in('post_id', postIds)
        ]);

        const savedIds = new Set(savedRes.data?.map(s => s.post_id));
        const reactionMap = new Map(reactionsRes.data?.map(r => [r.post_id, r.reaction_type]));

        const enrichedPosts = data.map(post => ({
          ...post,
          is_saved: savedIds.has(post.id),
          user_reaction: reactionMap.get(post.id) || null
        }));
        setPosts(enrichedPosts);
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error('Error fetching campaign posts:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleReact = (postId: string, reaction: any) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, user_reaction: reaction } : p));
  };

  const handleSave = (postId: string, isSaved: boolean) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_saved: isSaved } : p));
  };

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Campaign Not Found</h2>
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">Go Back</button>
      </div>
    );
  }

  if (showSupportFlow && campaign) {
    return (
      <CampaignPost 
        campaignId={campaign.id} 
        campaignTitle={campaign.title}
        campaignCategory={campaign.category}
        onBack={() => setShowSupportFlow(false)}
        onPostCreated={() => {
          setShowSupportFlow(false);
          fetchPosts();
        }}
      />
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
            <h1 className="text-xl font-bold ml-4">Campaign Details</h1>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-2">
            {React.createElement(getCampaignIcon(campaign), { className: "w-8 h-8 text-blue-400" })}
            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              {campaign.title}
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-sm">
              <span>{campaign.supporter_count || posts.length} Supporters</span>
            </div>
            <button
              onClick={() => setShowSupportFlow(true)}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>Support</span>
            </button>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Summary</h4>
            <p className="text-slate-200 text-xl leading-relaxed">
              {campaign.summary}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold text-slate-100">Supporting Posts</h3>
            <span className="text-sm text-slate-500 font-medium bg-slate-800 px-3 py-1 rounded-full border border-slate-700/50">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          {isLoadingPosts ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-700 border-t-slate-500 rounded-full animate-spin"></div>
            </div>
          ) : posts.length > 0 ? (
            <div className="grid gap-6">
              {posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post}
                  currentUserId={currentUserId || undefined}
                  onReact={handleReact}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-800/20 border border-dashed border-slate-700/50 rounded-3xl">
              <p className="text-slate-500">No posts supporting this campaign yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignPage;
