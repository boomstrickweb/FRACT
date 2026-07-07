import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, User, ArrowLeft, Calendar, Heart, Sparkles, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PostCard from './PostCard';
import Profile from './Profile';
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

interface SoulmateMatch {
  user_id: string;
  name: string;
  username?: string;
  bio?: string;
  profile_pic_url?: string;
  created_at: string;
  is_verified?: boolean;
  verification_type?: string;
  verification_reason?: string;
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
  user_reaction?: 'respect' | 'reject' | 'observe' | null;
}

interface SearchProps {
  onBack: () => void;
  onProfileClick?: (userId: string) => void;
  onJoinClick?: () => void;
}

const Search: React.FC<SearchProps> = ({ onBack, onProfileClick, onJoinClick }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'profiles' | 'posts'>('profiles');
  const [profileResults, setProfileResults] = useState<SearchResult[]>([]);
  const [postResults, setPostResults] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [soulmateMatches, setSoulmateMatches] = useState<SoulmateMatch[]>([]);
  const [showSoulmates, setShowSoulmates] = useState(false);
  const [isLoadingSoulmates, setIsLoadingSoulmates] = useState(false);
  const [userHasSoulcode, setUserHasSoulcode] = useState(false);
  const [showSoulmateAnimation, setShowSoulmateAnimation] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    checkUserSoulcode();
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

  const checkUserSoulcode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: soulcode } = await supabase
        .from('soulcodes')
        .select('id')
        .eq('user_id', user.id)
        .single();

      setUserHasSoulcode(!!soulcode);
    } catch (error) {
      console.error('Error checking soulcode:', error);
    }
  };

  const findSoulmates = async () => {
    if (!currentUserId) return;

    setIsLoadingSoulmates(true);
    try {
      console.log('🔮 Finding soulmate matches for user:', currentUserId);
      
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('Supabase not configured');
        setSoulmateMatches([]);
        setShowSoulmates(true);
        setIsLoadingSoulmates(false);
        return;
      }

      // Get user's soulcode
      const { data: userSoulcode, error: soulcodeError } = await supabase
        .from('soulcodes')
        .select('core_drive, value_spectrum, social_vibe')
        .eq('user_id', currentUserId)
        .single();

      if (soulcodeError) {
        console.error('❌ Error getting user soulcode:', soulcodeError);
        setSoulmateMatches([]);
        setShowSoulmates(true);
        return;
      }

      if (!userSoulcode) {
        console.log('❌ User has no soulcode');
        setSoulmateMatches([]);
        setShowSoulmates(true);
        return;
      }

      console.log('✅ User soulcode:', userSoulcode);

      // Find users with matching soulcodes (excluding self)
      const { data: matchingSoulcodes, error: matchingError } = await supabase
        .from('soulcodes')
        .select('user_id')
        .eq('core_drive', userSoulcode.core_drive)
        .eq('value_spectrum', userSoulcode.value_spectrum)
        .eq('social_vibe', userSoulcode.social_vibe)
        .neq('user_id', currentUserId);

      if (matchingError) {
        console.error('❌ Error finding matching soulcodes:', matchingError);
        setSoulmateMatches([]);
        setShowSoulmates(true);
        return;
      }

      console.log('🔮 Found matching soulcode user IDs:', matchingSoulcodes);

      if (!matchingSoulcodes || matchingSoulcodes.length === 0) {
        console.log('💔 No matching soulcodes found');
        setSoulmateMatches([]);
        setShowSoulmates(true);
        return;
      }

      // Get profile data for matching users
      const userIds = matchingSoulcodes.map(s => s.user_id);
      console.log('👥 Getting profiles for user IDs:', userIds);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, name, username, bio, profile_pic_url, created_at, is_verified, verification_type,
          user_verifications!user_verifications_user_id_fkey (
            verification_reason,
            is_active
          )
        `)
        .in('id', userIds)
        .not('is_deactivated', 'eq', true);

      if (profilesError) {
        console.error('❌ Error getting profiles:', profilesError);
        setSoulmateMatches([]);
        setShowSoulmates(true);
        return;
      }

      console.log('👤 Found profiles:', profiles);

      // Transform profiles to match SoulmateMatch interface
      const matches: SoulmateMatch[] = (profiles || []).map(profile => ({
        user_id: profile.id,
        name: profile.name || `User ${profile.id.slice(0, 8)}`,
        username: profile.username,
        bio: profile.bio,
        profile_pic_url: profile.profile_pic_url,
        created_at: profile.created_at,
        is_verified: profile.is_verified,
        verification_type: profile.verification_type,
        verification_reason: (profile as any).user_verifications?.[0]?.verification_reason
      }));

      console.log('💕 Transformed soulmate matches:', matches);
      setSoulmateMatches(matches);
      setShowSoulmates(true);

      // Show animation if matches found
      if (matches.length > 0) {
        setShowSoulmateAnimation(true);
        setTimeout(() => setShowSoulmateAnimation(false), 3000);
      }
    } catch (error) {
      console.error('Error in findSoulmates:', error);
      setSoulmateMatches([]);
      setShowSoulmates(true);
    } finally {
      setIsLoadingSoulmates(false);
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
      const query = searchQuery.trim();
      
      console.log('Searching for:', query);
      
      // First, let's see all profiles to debug
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('id, name, username, bio, profile_pic_url, created_at, is_verified, verification_type, verification_reason, is_deactivated')
        .limit(10);
      
      console.log('All profiles (first 10):', allProfiles);
      console.log('All profiles error:', allError);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, username, bio, profile_pic_url, created_at, is_verified, verification_type, verification_reason')
        .not('is_deactivated', 'eq', true)
        .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(50);

      if (error) {
        console.error('Error searching profiles:', error);
        setProfileResults([]);
        return;
      }

      console.log('Raw search results:', profiles);
      console.log('Search query used:', `name.ilike.%${query}%,username.ilike.%${query}%`);

      // Check which users the current user is following
      let enrichedProfiles = profiles || [];
      
      if (currentUserId && profiles && profiles.length > 0) {
        const profileIds = profiles.map(p => p.id);
        
        // Get following status for all users (don't filter by blocking for search)
        let followingIds = new Set<string>();
        if (profileIds.length > 0) {
          const { data: followData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUserId)
            .in('following_id', profileIds);
          
          followingIds = new Set(followData?.map(f => f.following_id) || []);
        }
        
        const { data: bIds } = await supabase.rpc('get_blocked_user_ids', { user_uuid: currentUserId });
        const blockedSet = new Set((bIds || []).map((id: string) => id));

        enrichedProfiles = profiles
          .filter(profile => !blockedSet.has(profile.id))
          .map(profile => ({
            ...profile,
            is_following: followingIds.has(profile.id)
          }));
      }

      setProfileResults(enrichedProfiles);
    } catch (error) {
      console.error('Error in searchProfiles:', error);
      setProfileResults([]);
    }
  };

  const searchPosts = async () => {
    try {
      console.log('🔍 Searching posts for:', searchQuery);
      
      const { data: { user } } = await supabase.auth.getUser();
      const loggedInUserId = user?.id || currentUserId;
      
      const moderationFilter = loggedInUserId 
        ? `moderation_reason.eq.NONE,author_id.eq.${loggedInUserId}`
        : `moderation_reason.eq.NONE`;

      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
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
        .eq('is_anonymous', false)
        .not('profiles.is_deactivated', 'eq', true)
        .or(moderationFilter)
        .ilike('content', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error searching posts:', error);
        setPostResults([]);
        return;
      }

      console.log('📝 Post search results:', posts?.length || 0);
      console.log('📝 Sample posts:', posts?.slice(0, 3).map(p => ({
        id: p.id,
        author: p.author?.name,
        content: p.content.substring(0, 50)
      })));

      if (loggedInUserId && posts) {
        const { data: bIds } = await supabase.rpc('get_blocked_user_ids', { user_uuid: loggedInUserId });
        const { data: mIds } = await supabase.rpc('get_muted_user_ids', { user_uuid: loggedInUserId });
        const excludedSet = new Set([
          ...((bIds || []).map((id: string) => id)),
          ...((mIds || []).map((id: string) => id))
        ]);

        const filteredPosts = posts.filter((post: any) => !excludedSet.has(post.author_id));
        const postIds = filteredPosts.map(post => post.id);

        const { data: savedPosts } = await supabase
          .from('saved_posts')
          .select('post_id')
          .eq('user_id', loggedInUserId)
          .in('post_id', postIds.length > 0 ? postIds : ['00000000-0000-0000-0000-000000000000']);

        const savedPostIds = new Set(savedPosts?.map(sp => sp.post_id) || []);

        const enrichedPosts = filteredPosts.map(post => ({
          ...post,
          is_saved: savedPostIds.has(post.id),
          is_reposted: false
        }));

        setPostResults(enrichedPosts);
      } else {
        setPostResults(posts || []);
      }
    } catch (error) {
      console.error('Error in searchPosts:', error);
    }
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/u/${userId}`);
  };

  const handleBackFromProfile = () => {
    setShowProfile(false);
    setSelectedUserId(null);
  };

  const handleSave = async (postId: string, shouldSave: boolean) => {
    if (!currentUserId) return;

    try {
      if (shouldSave) {
        const { error } = await supabase
          .from('saved_posts')
          .insert({
            user_id: currentUserId,
            post_id: postId
          });

        if (error) {
          console.error('Error saving post:', error);
          return;
        }
      } else {
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', postId);

        if (error) {
          console.error('Error unsaving post:', error);
          return;
        }
      }

      // Update local state
      setPostResults(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, is_saved: shouldSave }
          : post
      ));
    } catch (error) {
      console.error('Error in handleSave:', error);
    }
  };

  const handleReport = async (postId: string) => {
    // TODO: Implement report functionality
    console.log('Report post:', postId);
  };

  const handleEdit = async (postId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit post:', postId);
  };

  const handleDelete = async (postId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', currentUserId);

      if (error) {
        console.error('Error deleting post:', error);
        return;
      }

      // Remove from local state
      setPostResults(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error in handleDelete:', error);
    }
  };

  const handleFollowUser = async (userId: string) => {
    if (!currentUserId) {
      if (onJoinClick) onJoinClick();
      return;
    }

    try {
      const profile = profileResults.find(p => p.id === userId);
      if (!profile) return;

      if (profile.is_following) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId);

        if (error) {
          console.error('Error unfollowing user:', error);
          return;
        }
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: userId
          });

        if (error) {
          console.error('Error following user:', error);
          return;
        }
      }

      // Update local state
      setProfileResults(prev => prev.map(p => 
        p.id === userId 
          ? { ...p, is_following: !p.is_following }
          : p
      ));
    } catch (error) {
      console.error('Error in handleFollowUser:', error);
    }
  };
  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
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

        {/* Find Your Soulmate Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-3xl p-6 backdrop-blur-sm">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Heart className="w-8 h-8 text-purple-400" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Find Your Soulmate
                </h2>
                <Heart className="w-8 h-8 text-pink-400" />
              </div>
              
              <p className="text-slate-300 mb-6">
                {userHasSoulcode 
                  ? 'Discover people who share your exact soulcode match'
                  : 'Create your soulcode first to find your perfect match'
                }
              </p>
              
              {userHasSoulcode ? (
                <button
                  onClick={findSoulmates}
                  disabled={isLoadingSoulmates}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-purple-700 disabled:to-pink-700 text-white font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg"
                >
                  {isLoadingSoulmates ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Finding Soulmates...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-5 h-5" />
                      <span>Find My Soulmate</span>
                      <Sparkles className="w-5 h-5" />
                    </div>
                  )}
                </button>
              ) : (
                <div className="text-slate-400">
                  <p className="mb-4">Go to Profile → Edit Profile → Create Soulcode</p>
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-700/50 rounded-xl">
                    <Heart className="w-4 h-4 text-purple-400" />
                    <span className="text-sm">Soulcode Required</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1 border border-slate-700/50">
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    setActiveTab('profiles');
                    setShowSoulmates(false);
                  }}
                  className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'profiles' && !showSoulmates
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100 shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  Profiles
                </button>
                
                <button
                  onClick={() => {
                    setActiveTab('posts');
                    setShowSoulmates(false);
                  }}
                  className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'posts' && !showSoulmates
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100 shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  Posts
                  {activeTab === 'posts' && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 opacity-20 blur-xl"></div>
                  )}
                </button>
                
                {soulmateMatches.length > 0 && (
                  <button
                    onClick={() => setShowSoulmates(true)}
                    className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      showSoulmates
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-slate-100 shadow-lg'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4" />
                      <span>Soulmates ({soulmateMatches.length})</span>
                    </div>
                    {showSoulmates && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 opacity-20 blur-xl"></div>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="min-h-96">
          {/* Soulmate Animation */}
          {showSoulmateAnimation && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
              <div className="text-center animate-pulse">
                <div className="relative mb-8">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                    <Heart className="w-16 h-16 text-white animate-pulse" />
                  </div>
                  <div className="absolute inset-0 animate-ping">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full"></div>
                  </div>
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                  Soulmates Found! ✨
                </h2>
                <div className="flex justify-center space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-6 h-6 text-yellow-400 animate-pulse delay-${i * 100}`} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Soulmate Results - shown regardless of search query */}
          {showSoulmates ? (
            <>
              {isLoadingSoulmates ? (
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-slate-800/30 rounded-3xl p-6 animate-pulse">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-16 h-16 bg-purple-900/30 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-purple-900/20 rounded w-32"></div>
                          <div className="h-3 bg-slate-700 rounded w-24"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {soulmateMatches.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                          Your Soulmates ✨
                        </h3>
                        <p className="text-slate-400">
                          {soulmateMatches.length} perfect {soulmateMatches.length === 1 ? 'match' : 'matches'} found
                        </p>
                      </div>
                      
                      {soulmateMatches.map((match) => (
                        <div
                          key={match.user_id}
                          onClick={() => handleProfileClick(match.user_id)}
                          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-3xl p-6 hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-300 cursor-pointer transform hover:scale-105"
                        >
                          <div className="flex items-center space-x-4">
                            {/* Profile Picture */}
                            <div className="relative">
                              <div className="w-16 h-16 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                                {match.profile_pic_url ? (
                                  <img
                                    src={match.profile_pic_url}
                                    alt={match.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                    <User className="w-8 h-8 text-slate-300" />
                                  </div>
                                )}
                              </div>
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <Heart className="w-3 h-3 text-white" />
                              </div>
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-bold text-slate-100 truncate">
                                  {match.name || `User ${match.user_id?.slice(0, 8) || 'unknown'}`}
                                </h3>
                                {match.is_verified && (
                                  <VerificationBadge
                                    isVerified={true}
                                    verificationType={match.verification_type}
                                    verificationReason={match.verification_reason}
                                    size="sm"
                                  />
                                )}
                                <div className="flex items-center space-x-1">
                                  <Sparkles className="w-4 h-4 text-purple-400" />
                                  <span className="text-purple-300 text-sm font-medium">Soulmate</span>
                                </div>
                              </div>
                              
                              {match.bio && (
                                <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                                  {match.bio}
                                </p>
                              )}
                              
                              <div className="flex items-center space-x-1 text-slate-500 text-sm">
                                <Calendar className="w-4 h-4" />
                                <span>Joined {formatJoinDate(match.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Heart className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-100 mb-2">No Soulmates Found</h3>
                      <p className="text-slate-400 text-lg">
                        No one matches your exact soulcode yet. Keep checking back!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : !searchQuery.trim() ? (
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
                                  src={profile.profile_pic_url}
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

                            {/* Follow Button (placeholder) */}
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
                          onSave={handleSave}
                          onReport={handleReport}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
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

      {/* Floating elements */}
      <div className="fixed top-20 left-10 w-2 h-2 bg-slate-500 rounded-full opacity-60 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-32 right-16 w-3 h-3 bg-slate-400 rounded-full opacity-40 animate-pulse delay-1000 pointer-events-none"></div>
      <div className="fixed top-1/3 right-8 w-1 h-1 bg-slate-600 rounded-full opacity-80 animate-pulse delay-500 pointer-events-none"></div>
    </div>
  );
};

export default Search;