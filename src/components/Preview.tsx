import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PostCard from './PostCard';
import PostSeriesCard from './PostSeriesCard';
import Search from './Search';
import Profile from './Profile';

interface PostData {
  id: string;
  author_id: string;
  content: string;
  post_type: 'text' | 'quote' | 'voice' | 'poll';
  quote_signature?: string;
  voice_url?: string;
  is_explicit: boolean;
  is_anonymous: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  moderation_reason?: string;
  moderation_score?: number | null;
  classification_label?: string | null;
  classification_confidence?: number | null;
  classification_data?: Record<string, unknown> | null;
  ai_flagged?: 'ai_assisted' | 'ai_generated' | null;
  author?: {
    id: string;
    name: string;
    username: string;
    profile_pic_url?: string;
    profile_type?: string;
  };
  is_saved?: boolean;
  is_reposted?: boolean;
  user_reaction?: 'respect' | 'reject' | 'observe' | null;
}

interface SeriesData {
  id: string;
  author_id: string;
  title: string;
  is_anonymous: boolean;
  is_explicit: boolean;
  created_at: string;
  ai_flagged?: 'ai_assisted' | 'ai_generated' | null;
  ai_flag_source?: 'user' | 'system' | null;
  author?: {
    id: string;
    name: string;
    username?: string;
    profile_pic_url?: string;
    is_verified?: boolean;
    verification_type?: string;
    verification_reason?: string;
  };
  chapters: {
    id: string;
    chapter_number: number;
    title: string | null;
    content: string;
  }[];
}

type FeedItem = { type: 'post'; data: PostData; created_at: string } | { type: 'series'; data: SeriesData; created_at: string };

const Preview: React.FC = () => {
  const navigate = useNavigate();
  const { tab } = useParams();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNavItem, setActiveNavItem] = useState<'home' | 'search'>((tab as 'home' | 'search') || 'home');
  const [showSearch, setShowSearch] = useState(tab === 'search');

  useEffect(() => {
    if (tab) {
      setActiveNavItem(tab as 'home' | 'search');
      setShowSearch(tab === 'search');
      if (tab === 'home') {
        setShowSearch(false);
      }
    } else {
      setActiveNavItem('home');
      setShowSearch(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchPreviewData();
  }, []);

  const fetchPreviewData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching preview data...');
      
      // Fetch 20 random posts
      // Note: Supabase/PostgREST doesn't have a direct 'random' order, 
      // so we use a RPC or fetch more and shuffle. 
      // Given the constraints, we'll use an RPC if available or just fetch 100 and shuffle.
      // But actually, we can use 'id' or 'created_at' with some random offset if we wanted.
      // A better way for random in Supabase is using `order` with a random-ish seed if possible,
      // but simpler is to fetch more and pick 20.
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          author_id,
          content,
          post_type,
          quote_signature,
          voice_url,
          is_explicit,
          is_anonymous,
          view_count,
          created_at,
          moderation_reason,
          ai_flagged,
          author:profiles(id, name, username, profile_pic_url, is_verified, verification_type, verification_reason)
        `)
        .eq('is_explicit', false)
        .eq('moderation_reason', 'NONE')
        .or('moderation_score.is.null,moderation_score.lt.3')
        .is('reply_to_post_id', null)
        .order('created_at', { ascending: false })
        .limit(40);

      if (postsError) {
        console.error('Posts error:', postsError);
        throw postsError;
      }

      // Shuffle and pick 20
      const shuffledPosts = (postsData || [])
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

      console.log('Posts fetched and shuffled:', shuffledPosts.length);

      // Fetch series (keep chronological or also random?) - Let's do 5 random series too
      const { data: seriesData, error: seriesError } = await supabase
        .from('post_series')
        .select(`
          id,
          author_id,
          title,
          is_anonymous,
          is_explicit,
          created_at,
          ai_flagged,
          author:profiles(id, name, username, profile_pic_url, is_verified, verification_type, verification_reason),
          chapters:series_chapters(id, chapter_number, title, content)
        `)
        .eq('is_explicit', false)
        .limit(10);

      if (seriesError) {
        console.error('Series error:', seriesError);
        throw seriesError;
      }

      const shuffledSeries = (seriesData || [])
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);

      console.log('Series fetched and shuffled:', shuffledSeries.length);

      setPosts(shuffledPosts);
      setSeriesList(shuffledSeries);
    } catch (error) {
      console.error('Error fetching preview data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const feedItems: FeedItem[] = [
    ...posts.map(p => ({ type: 'post' as const, data: p, created_at: p.created_at })),
    ...seriesList.map(s => ({ type: 'series' as const, data: s, created_at: s.created_at })),
  ].sort(() => Math.random() - 0.5); // Randomize the mix as well

  const handleProfileClick = (userId: string) => {
    navigate(`/u/${userId}`);
  };

  const handleJoinClick = () => {
    navigate('/intro');
  };

  // Empty handlers for actions that should remain disabled
  const noop = () => {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Get Started Banner */}
      <div className="mb-12 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 sm:p-12 relative overflow-hidden group">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[center_top_-1px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
              Explore what's happening on <span className="text-blue-400">FRACT</span> today.
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl font-medium max-w-xl leading-relaxed">
              Full access is currently available only in selected countries. Join the conversation and share your perspective.
            </p>
            <button
              onClick={() => navigate('/availablecountries')}
              className="mt-4 text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-2 transition-colors"
            >
              Check available countries
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>
          <button
            onClick={() => navigate('/intro')}
            className="flex-shrink-0 bg-white text-slate-950 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all duration-300 shadow-2xl shadow-white/10 active:scale-95 flex items-center gap-3 group"
          >
            Get Started
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Main Tab Bar - Simplified and Read-Only */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex space-x-2 bg-slate-800/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/5">
          <button
            className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
              activeNavItem === 'home' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            onClick={() => {
              setActiveNavItem('home');
              setShowSearch(false);
            }}
          >
            Discover
          </button>
          <button
            className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
              activeNavItem === 'search' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            onClick={() => {
              setActiveNavItem('search');
              setShowSearch(true);
            }}
          >
            Search
          </button>
        </div>
      </div>

      {showSearch ? (
        <div className="bg-slate-800/30 rounded-3xl p-6 border border-slate-700/30">
          <Search onBack={() => setShowSearch(false)} onProfileClick={handleProfileClick} onJoinClick={handleJoinClick} />
        </div>
      ) : (
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-slate-800/30 rounded-3xl p-6 animate-pulse">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-32"></div>
                      <div className="h-3 bg-slate-700 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-full"></div>
                    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : feedItems.length > 0 ? (
            feedItems.map((item) =>
              item.type === 'post' ? (
                <div key={`post-${item.data.id}`}>
                  <PostCard
                    post={item.data}
                    onSave={noop}
                    onReport={noop}
                    onEdit={noop}
                    onDelete={noop}
                    onReact={noop}
                    onProfileClick={() => handleProfileClick(item.data.author_id)}
                    onShowEditHistory={noop}
                    onReflect={noop}
                    onViewReflections={noop}
                  />
                </div>
              ) : (
                <div key={`series-${item.data.id}`}>
                  <PostSeriesCard
                    series={item.data}
                    onProfileClick={() => handleProfileClick(item.data.author_id)}
                  />
                </div>
              )
            )
          ) : (
            <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-slate-700/20">
              <p className="text-slate-400">No posts available at the moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Simplified Mobile Nav */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/60 backdrop-blur-2xl border border-white/10 px-8 py-4 rounded-[2rem] flex items-center space-x-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 ring-1 ring-white/5 group">
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
        <button 
          onClick={() => {
            setActiveNavItem('home');
            setShowSearch(false);
          }}
          className={`p-2 transition-all duration-300 relative ${activeNavItem === 'home' && !showSearch ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Home className="w-7 h-7" />
          {activeNavItem === 'home' && !showSearch && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
          )}
        </button>
        <button 
          onClick={() => {
            setActiveNavItem('search');
            setShowSearch(true);
          }}
          className={`p-2 transition-all duration-300 relative ${showSearch ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <SearchIcon className="w-7 h-7" />
          {showSearch && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Preview;
