import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, User, ArrowLeft, Calendar } from 'lucide-react';
import { supabase, wrapMediaUrl } from '../lib/supabase';
import PostCard from './PostCard';
import VerificationBadge from './VerificationBadge';

interface SearchResult {
  id: string;
  username: string;
  name: string;
  bio?: string;
  profile_pic_url?: string;
  created_at: string;
  is_following?: boolean;
  is_verified?: boolean;
  verification_type?: string;
}

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
  moderation_score?: number | null;
  moderation_reason?: string | null;
  is_quarantined?: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
    username: string;
    profile_pic_url?: string;
    profile_type?: string;
  };
  is_saved?: boolean;
  is_reposted?: boolean;
  campaign_id?: string;
  campaign?: {
    id: string;
    title: string;
  };
  user_reaction?: 'respect' | 'reject' | 'observe' | null;
}

interface SearchProps {
  onBack: () => void;
  onProfileClick?: (userId: string) => void;
  onJoinClick?: () => void;
}

const Search: React.FC<SearchProps> = ({ onBack, onProfileClick }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'profiles' | 'posts'>('profiles');
  const [profileResults, setProfileResults] = useState<SearchResult[]>([]);
  const [postResults, setPostResults] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setProfileResults([]);
      setPostResults([]);
    }
  }, [searchQuery, activeTab]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      if (activeTab === 'profiles') {
        await searchProfiles();
      } else {
        await searchPosts();
      }
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          name,
          bio,
          profile_pic_url,
          created_at,
          is_verified,
          verification_type
        `)
        .or(`username.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) {
        console.error('Error searching profiles:', error);
        setProfileResults([]);
        return;
      }

      let followingIds: string[] = [];
      if (currentUserId) {
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId);

        followingIds = (followsData || []).map(f => f.following_id);
      }

      const resultsWithFollowing = (data || []).map(profile => ({
        ...profile,
        is_following: followingIds.includes(profile.id)
      }));

      setProfileResults(resultsWithFollowing);
    } catch (error) {
      console.error('Error in searchProfiles:', error);
      setProfileResults([]);
    }
  };

  const searchPosts = async () => {
    try {
      const { data, error } = await supabase
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
          moderation_score,
          moderation_reason,
          is_quarantined,
          created_at,
          updated_at,
          author:profiles(
            id,
            name,
            username,
            profile_pic_url,
            profile_type
          ),
          campaign:campaigns(
            id,
            title
          )
        `)
        .ilike('content', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error searching posts:', error);
        setPostResults([]);
        return;
      }

      setPostResults((data || []) as unknown as PostData[]);
    } catch (error) {
      console.error('Error in searchPosts:', error);
      setPostResults([]);
    }
  };

  const handleProfileClick = (userId: string) => {
    if (onProfileClick) {
      onProfileClick(userId);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  const handleFollowUser = async (userId: string) => {
    if (!currentUserId) return;

    try {
      const profile = profileResults.find(p => p.id === userId);
      if (!profile) return;

      if (profile.is_following) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId);

        setProfileResults(prev =>
          prev.map(p =>
            p.id === userId ? { ...p, is_following: false } : p
          )
        );
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: userId
          });

        setProfileResults(prev =>
          prev.map(p =>
            p.id === userId ? { ...p, is_following: true } : p
          )
        );
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-slate-100">Search</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Input */}
        <div className="mb-8">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for users or posts..."
              className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Search Tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1 border border-slate-700/50">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('profiles')}
                  className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'profiles'
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100 shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  Profiles
                </button>
                
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'posts'
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100 shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  Posts
                  {activeTab === 'posts' && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 opacity-20 blur-xl"></div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="min-h-96">
          {!searchQuery.trim() ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                <SearchIcon className="w-10 h-10 text-slate-100" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100 mb-2">Search FRACT</h3>
              <p className="text-slate-400 text-lg">
                Find users and posts that interest you
              </p>
            </div>
          ) : isLoading ? (
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
                  {activeTab === 'posts' && (
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-full"></div>
                      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Profile Results */}
              {activeTab === 'profiles' && (
                <div>
                  {profileResults.length > 0 ? (
                    <div className="space-y-4">
                      {profileResults.map((profile) => (
                        <div
                          key={profile.id}
                          onClick={() => handleProfileClick(profile.id)}
                          className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 hover:bg-slate-800/40 transition-all duration-300 cursor-pointer"
                        >
                          <div className="flex items-center space-x-4">
                            {/* Profile Picture */}
                            <div className="w-16 h-16 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                              {profile.profile_pic_url ? (
                                <img
                                  src={wrapMediaUrl(profile.profile_pic_url)}
                                  alt={profile.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                  <User className="w-8 h-8 text-slate-300" />
                                </div>
                              )}
                            </div>

                            {/* Profile Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-bold text-slate-100 truncate">
                                  {profile.name || `User ${profile.id?.slice(0, 8) || 'unknown'}`}
                                </h3>
                                {profile.is_verified && (
                                  <VerificationBadge
                                    isVerified={true}
                                    verificationType={profile.verification_type}
                                    size="sm"
                                  />
                                )}
                                {profile.username && (
                                  <span className="text-slate-400 truncate text-xs">
                                    @{profile.username}
                                  </span>
                                )}
                                {!profile.username && (
                                  <span className="text-slate-400 truncate text-xs">
                                    {profile.id?.slice(0, 8) || 'unknown'}...
                                  </span>
                                )}
                              </div>
                              
                              {profile.bio && (
                                <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                                  {profile.bio}
                                </p>
                              )}
                              
                              <div className="flex items-center space-x-1 text-slate-500 text-sm">
                                <Calendar className="w-4 h-4" />
                                <span>Joined {formatJoinDate(profile.created_at)}</span>
                              </div>
                            </div>

                            {/* Follow Button */}
                            <div className="flex-shrink-0">
                              {profile.id !== currentUserId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFollowUser(profile.id);
                                  }}
                                  className={`px-4 py-2 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                                    profile.is_following
                                      ? 'bg-slate-600 hover:bg-slate-500 text-white'
                                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                                  }`}
                                >
                                  {profile.is_following ? 'Following' : 'Follow'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                        <User className="w-10 h-10 text-slate-100" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-100 mb-2">No profiles found</h3>
                      <p className="text-slate-400 text-lg">
                        Try searching with different keywords
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Post Results */}
              {activeTab === 'posts' && (
                <div>
                  {postResults.length > 0 ? (
                    <div className="space-y-6">
                      {postResults.map((post: any) => (
                        <PostCard
                          key={post.id}
                          post={post as any}
                          currentUserId={currentUserId || undefined}
                          onProfileClick={handleProfileClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                        <SearchIcon className="w-10 h-10 text-slate-100" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-100 mb-2">No posts found</h3>
                      <p className="text-slate-400 text-lg">
                        Try searching with different keywords
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;
