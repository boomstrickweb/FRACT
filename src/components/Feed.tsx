import React, { useState, useEffect } from 'react';
import { Home, Search as SearchIcon, Plus, User, Radio, Waves, Zap, Sparkles } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Profile from './Profile';
import CreatePost from './CreatePost';
import CreatePostSeries from './CreatePostSeries';
import EditPost from './EditPost';
import EditHistory from './EditHistory';
import IssueCorrection from './IssueCorrection';
import CorrectionProtocol from './CorrectionProtocol';
import Search from './Search';
import PostCard from './PostCard';
import PostSeriesCard from './PostSeriesCard';
import CreateReflect from './CreateReflect';
import ReflectionsView from './ReflectionsView';
import ActionPassword from './ActionPassword';
import { supabase } from '../lib/supabase';
import { loadEchoPosts, enrichEchoPosts, type EchoTier, type EchoMatch } from '../services/echoService';

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
  moderation_reason?: 'NONE' | 'child_exploitation' | 'child_safety' | 'self_harm_intent' | 'bullying' | 'violent_description' | 'drugs' | 'self_harm' | 'hate' | 'violence' | 'weapons' | 'spam';
  is_quarantined?: boolean;
  created_at: string;
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

const Feed = () => {
  const navigate = useNavigate();
  const { tab } = useParams();
  const [activeTab, setActiveTab] = useState<'discover' | 'following' | 'echoes'>('discover');
  const [activeMainTab, setActiveMainTab] = useState<'feed' | 'soulmates'>('feed');
  const [activeNavItem, setActiveNavItem] = useState<'home' | 'search' | 'create' | 'notifications' | 'profile'>(
    (tab as 'home' | 'search' | 'create' | 'notifications' | 'profile') || 'home'
  );
  const [showProfile, setShowProfile] = useState(tab === 'profile');
  const [showSearch, setShowSearch] = useState(tab === 'search');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<Record<string, number>>({});
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [editHistoryPostId, setEditHistoryPostId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [soulmatePosts, setSoulmatePosts] = useState<PostData[]>([]);
  const [userHasSoulcode, setUserHasSoulcode] = useState(false);
  const [echoMatches, setEchoMatches] = useState<EchoMatch[]>([]);
  const [echoTier, setEchoTier] = useState<EchoTier>('weak');
  const [isLoadingEchoes, setIsLoadingEchoes] = useState(false);
  const [seriesList, setSeriesList] = useState<SeriesData[]>([]);
  const [hideAiPosts, setHideAiPosts] = useState(false);
  const [mixedFeed, setMixedFeed] = useState(true);
  const [interestCategories, setInterestCategories] = useState<string[]>([]);
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [reflectTargetPost, setReflectTargetPost] = useState<PostData | null>(null);
  const [reflectionsViewPost, setReflectionsViewPost] = useState<PostData | null>(null);
  const [showActionPasswordForCreate, setShowActionPasswordForCreate] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateSeries, setShowCreateSeries] = useState(false);
  const [showEditPost, setShowEditPost] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [replyToPost, setReplyToPost] = useState<PostData | null>(null);
  const [showIssueCorrection, setShowIssueCorrection] = useState(false);
  const [correctionPostId, setCorrectionPostId] = useState<string | null>(null);
  const [showCorrectionProtocol, setShowCorrectionProtocol] = useState(false);
  const [protocolPostId, setProtocolPostId] = useState<string | null>(null);

  const loadSoulmatePosts = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('Supabase not configured, showing empty soulmate feed');
        setSoulmatePosts([]);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSoulmatePosts([]);
        setIsLoading(false);
        return;
      }

      console.log('🔮 Loading soulmate posts...');
      
      const { data: soulmatePostsData, error } = await supabase.rpc('get_soulmate_posts_feed', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error loading soulmate posts:', error);
        setSoulmatePosts([]);
        return;
      }

      console.log('💕 Loaded soulmate posts:', soulmatePostsData?.length || 0);
      
      // Transform the data to match PostData interface
      const transformedPosts = (soulmatePostsData || []).map((post: PostData) => ({
        id: post.id,
        author_id: post.author_id,
        content: post.content,
        post_type: post.post_type as 'text' | 'quote' | 'voice',
        quote_signature: post.quote_signature,
        voice_url: post.voice_url,
        is_explicit: post.is_explicit,
        is_anonymous: post.is_anonymous,
        view_count: post.view_count,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: {
          id: post.author_id,
          name: (post as any).author_name,
          username: (post as any).author_username,
          profile_pic_url: (post as any).author_profile_pic_url,
          is_verified: (post as any).author_is_verified,
          verification_type: (post as any).author_verification_type
        },
        is_saved: false,
        is_reposted: false,
        user_reaction: null
      }));

      if (user.id && transformedPosts.length > 0) {
        const postIds = transformedPosts.map((post: PostData) => post.id);
        
        const [savedPostsRes, userReactionsRes] = await Promise.all([
          supabase
            .from('saved_posts')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds),
          supabase
            .from('post_reactions')
            .select('post_id, reaction_type')
            .eq('user_id', user.id)
            .in('post_id', postIds)
        ]);

        const savedPostIds = new Set(savedPostsRes.data?.map(sp => sp.post_id) || []);
        const reactionMap = new Map(userReactionsRes.data?.map(r => [r.post_id, r.reaction_type]) || []);

        const enrichedPosts = transformedPosts.map(post => ({
          ...post,
          is_saved: savedPostIds.has(post.id),
          is_reposted: false,
          user_reaction: reactionMap.get(post.id) || null
        }));

        setSoulmatePosts(enrichedPosts);
      } else {
        setSoulmatePosts([]);
      }
    } catch (error) {
      console.error('Error in loadSoulmatePosts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [soulmatePosts.length]);

  const loadEchoFeed = React.useCallback(async () => {
    try {
      setIsLoadingEchoes(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEchoMatches([]);
        setIsLoadingEchoes(false);
        return;
      }

      const matches = await loadEchoPosts(user.id, echoTier);
      const enriched = await enrichEchoPosts(matches, user.id);
      setEchoMatches(enriched);
    } catch (error) {
      console.error('Error loading echoes:', error);
      setEchoMatches([]);
    } finally {
      setIsLoadingEchoes(false);
    }
  }, [echoTier, echoMatches.length]);

  const loadPosts = React.useCallback(async (force = false) => {
    try {
      // Basic caching to reduce egress
      const now = Date.now();
      const lastFetch = lastFetchTime[activeTab] || 0;
      if (!force && posts.length > 0 && (now - lastFetch < CACHE_DURATION)) {
        console.log(`Using cached posts for ${activeTab}`);
        return;
      }

      setIsLoading(true);
      
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('Supabase not configured, showing empty feed');
        setPosts([]);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
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
          ai_flagged,
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
        .eq('is_anonymous', false);

      // Apply moderation filter
      const effectiveUserId = user?.id;
      if (activeTab === 'discover') {
        // Strict filter for Discover: only NONE
        query = query.eq('moderation_reason', 'NONE');
      } else {
        // Other feeds (Following, etc.): show non-quarantined or author's own posts
        const moderationFilter = effectiveUserId 
          ? `moderation_score.lt.3,moderation_score.is.null,author_id.eq.${effectiveUserId}`
          : `moderation_score.lt.3,moderation_score.is.null`;
        query = query.or(moderationFilter);
      }

      if (activeTab === 'following' && user) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        const followingIds = following?.map(f => f.following_id) || [];
        if (followingIds.length > 0) {
          query = query.in('author_id', followingIds);
        } else {
          setPosts([]);
          setIsLoading(false);
          return;
        }
      }

      const { data: postsData, error: postsError } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) {
        console.error('Error loading posts:', postsError);
        setPosts([]);
        return;
      }

      // Check which posts are saved and get user reactions
      if (user?.id && postsData && postsData.length > 0) {
        const postIds = postsData.map((post: PostData) => post.id);
        
        const [savedPostsRes, userReactionsRes] = await Promise.all([
          supabase
            .from('saved_posts')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds),
          supabase
            .from('post_reactions')
            .select('post_id, reaction_type')
            .eq('user_id', user.id)
            .in('post_id', postIds)
        ]);

        const savedPostIds = new Set(savedPostsRes.data?.map(sp => sp.post_id) || []);
        const reactionMap = new Map(userReactionsRes.data?.map(r => [r.post_id, r.reaction_type]) || []);

        const enrichedPosts = postsData.map(post => ({
          ...post,
          is_saved: savedPostIds.has(post.id),
          is_reposted: false,
          user_reaction: reactionMap.get(post.id) || null
        }));

        setPosts(enrichedPosts);
        setLastFetchTime(prev => ({ ...prev, [activeTab]: Date.now() }));
      } else {
        setPosts(postsData || []);
        if (postsData && postsData.length > 0) {
          setLastFetchTime(prev => ({ ...prev, [activeTab]: Date.now() }));
        }
      }
    } catch (error) {
      console.error('Error in loadPosts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, lastFetchTime, posts.length, CACHE_DURATION]);

  const loadSeries = React.useCallback(async (force = false) => {
    try {
      // Basic caching to reduce egress
      const now = Date.now();
      const lastFetch = lastFetchTime['series'] || 0;
      if (!force && seriesList.length > 0 && (now - lastFetch < CACHE_DURATION)) {
        return;
      }

      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        setSeriesList([]);
        return;
      }

      const { data: seriesData, error: seriesError } = await supabase
        .from('post_series')
        .select(`
          id,
          title,
          is_anonymous,
          is_explicit,
          created_at,
          ai_flagged,
          author:profiles!post_series_author_id_fkey (
            id, name, username, profile_pic_url, is_verified, verification_type, verification_reason
          ),
          chapters:series_chapters (
            id, chapter_number, title, content
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (seriesError) {
        console.error('Error loading series:', seriesError);
        setSeriesList([]);
        return;
      }

      setSeriesList((seriesData || []).filter((s: any) => s.chapters && s.chapters.length > 0));
      setLastFetchTime(prev => ({ ...prev, series: Date.now() }));
    } catch (error) {
      console.error('Error in loadSeries:', error);
      setSeriesList([]);
    }
  }, [seriesList.length, lastFetchTime, CACHE_DURATION]);

  const checkAndCleanupExpiredPosts = React.useCallback(async () => {
    try {
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return;
      }

      // Check if there are expired posts
      const { data: expiredCount, error: countError } = await supabase.rpc('get_expired_posts_count');
      
      if (countError) {
        console.log('Cleanup function not available:', countError.message);
        return;
      }

      if (expiredCount > 0) {
        console.log(`🗑️ Found ${expiredCount} expired posts, cleaning up...`);
        
        // Delete expired posts
        const { data: deletedCount, error: cleanupError } = await supabase.rpc('cleanup_expired_posts');
        
        if (cleanupError) {
          console.error('Error cleaning up posts:', cleanupError);
          return;
        }
        
        if (deletedCount > 0) {
          console.log(`✅ Deleted ${deletedCount} expired posts`);
          // Reload posts to update the UI
          if (activeMainTab === 'feed') {
            loadPosts(true);
          } else {
            loadSoulmatePosts();
          }
        }
      }
    } catch (error) {
      console.log('Cleanup check failed:', error);
    }
  }, [activeMainTab, loadPosts, loadSoulmatePosts]);

  const loadCurrentUser = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      if (user?.id) {
        const { data: prefs } = await supabase
          .from('profiles')
          .select('hide_ai_posts, mixed_feed, interest_categories, excluded_categories')
          .eq('id', user.id)
          .maybeSingle();
        setHideAiPosts(prefs?.hide_ai_posts ?? false);
        setMixedFeed(prefs?.mixed_feed ?? true);
        setInterestCategories(prefs?.interest_categories ?? []);
        setExcludedCategories(prefs?.excluded_categories ?? []);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }, []);

  const navItems = [
    { id: 'home' as const, icon: Home, label: 'Home' },
    { id: 'search' as const, icon: SearchIcon, label: 'Search' },
    { id: 'create' as const, icon: Plus, label: 'Create' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];

  const checkUserSoulcode = React.useCallback(async () => {
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
  }, []);

  const applyCategoryFilter = React.useCallback((postList: PostData[]): PostData[] => {
    if (mixedFeed) {
      if (excludedCategories.length === 0) return postList;
      return postList.filter(p => {
        if (!p.classification_label) return true;
        return !excludedCategories.includes(p.classification_label);
      });
    } else {
      if (interestCategories.length === 0) return [];
      return postList.filter(p => {
        if (!p.classification_label) return false;
        return interestCategories.includes(p.classification_label);
      });
    }
  }, [mixedFeed, excludedCategories, interestCategories]);

  useEffect(() => {
    if (tab) {
      setActiveNavItem(tab as 'home' | 'search' | 'create' | 'notifications' | 'profile');
      setShowProfile(tab === 'profile');
      setShowSearch(tab === 'search');
      if (tab === 'home') {
        setShowProfile(false);
        setShowSearch(false);
      }
    } else {
      setActiveNavItem('home');
      setShowProfile(false);
      setShowSearch(false);
    }
  }, [tab]);

  useEffect(() => {
    const init = async () => {
      await loadCurrentUser();
      await checkUserSoulcode();
    };
    init();

    const interval = setInterval(async () => {
      await checkAndCleanupExpiredPosts();
    }, 30000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkAndCleanupExpiredPosts, loadCurrentUser, checkUserSoulcode]);

  useEffect(() => {
    const triggerLoad = async () => {
      if (activeMainTab === 'feed') {
        if (activeTab === 'echoes') {
          await loadEchoFeed();
        } else {
          loadPosts();
          loadSeries();
        }
      } else {
        await loadSoulmatePosts();
      }
    };
    triggerLoad();
  }, [activeTab, activeMainTab, echoTier, mixedFeed, interestCategories, excludedCategories, loadPosts, loadSeries, loadEchoFeed, loadSoulmatePosts]);


  const handleDeleteSeries = (seriesId: string) => {
    setSeriesList(prev => prev.filter(s => s.id !== seriesId));
  };

  const handleNavClick = async (itemId: string) => {
    if (itemId === 'create') {
      // Check if create post is protected
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('action_password_hash, action_password_settings')
          .eq('id', user.id)
          .single();
        
        if (profile?.action_password_hash && profile?.action_password_settings?.createPost) {
          setPendingAction(() => () => {
            setShowCreatePost(true);
            setActiveNavItem('create');
          });
          setShowActionPasswordForCreate(true);
          return;
        }
      }
      setShowCreatePost(true);
      setActiveNavItem('create');
      return;
    }

    if (itemId === 'profile') {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        navigate(`/u/${user.id}`);
        return;
      }
    }

    navigate(`/feed/${itemId}`);
  };

  const handleBackToFeed = () => {
    navigate(-1);
    loadCurrentUser();
  };

  const handleBackToFeedFromCreate = () => {
    setShowCreatePost(false);
    setShowCreateSeries(false);
    setReplyToPost(null);
    navigate('/feed/home');
  };

  const handleBackToFeedFromEdit = () => {
    setShowEditPost(false);
    setEditingPostId(null);
    setActiveNavItem('home');
  };

  const handleBackToFeedFromSearch = () => {
    setShowSearch(false);
    navigate('/feed/home');
  };


  const handleShowEditHistory = React.useCallback((postId: string) => {
    const echoPosts = echoMatches.map(m => m.post);
    const post = [...posts, ...soulmatePosts, ...echoPosts].find(p => p.id === postId);
    const isMediaProfile = post?.author?.profile_type === 'media';

    if (isMediaProfile) {
      setProtocolPostId(postId);
      setShowCorrectionProtocol(true);
    } else {
      setEditHistoryPostId(postId);
      setShowEditHistory(true);
    }
  }, [echoMatches, posts, soulmatePosts]);

  const handleBackFromEditHistory = () => {
    setShowEditHistory(false);
    setEditHistoryPostId(null);
  };

  const handleBackFromCorrection = () => {
    setShowIssueCorrection(false);
    setCorrectionPostId(null);
    loadPosts();
  };

  const handleBackFromProtocol = () => {
    setShowCorrectionProtocol(false);
    setProtocolPostId(null);
  };

  const handleNavigateToCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('action_password_hash, action_password_settings')
        .eq('id', user.id)
        .single();
      
      if (profile?.action_password_hash && profile?.action_password_settings?.createPost) {
        setPendingAction(() => () => {
          setShowProfile(false);
          setShowCreatePost(true);
          setReplyToPost(null);
          setActiveNavItem('create');
        });
        setShowActionPasswordForCreate(true);
        return;
      }
    }
    setShowProfile(false);
    setShowCreatePost(true);
    setReplyToPost(null);
    setActiveNavItem('create');
  };

  const handlePostCreated = () => {
    if (activeMainTab === 'feed') {
      if (activeTab === 'echoes') {
        loadEchoFeed();
      } else {
        loadPosts();
        loadSeries();
      }
    } else {
      loadSoulmatePosts();
    }
  };

  const handleReact = React.useCallback(async (postId: string, reaction: 'respect' | 'reject' | 'observe' | null) => {
    console.log('🔄 Feed updating reaction state:', { postId, reaction });
    
    // Update local state
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, user_reaction: reaction }
        : post
    ));

    // Reload reaction counts for post author
    setTimeout(() => {
      loadReactionCounts(postId);
    }, 100);
  }, []);

  const loadReactionCounts = async (postId: string) => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return;
      }

      const { data, error } = await supabase.rpc('get_post_reaction_counts', {
        post_uuid: postId
      });

      if (error) {
        console.log('Reaction counts function not available:', error.message);
        return;
      }

      if (data && data.length > 0) {
        // Update the specific post's reaction counts
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, reaction_counts: data[0] }
            : post
        ));
      }
    } catch (error) {
      console.log('Error loading reaction counts:', error);
    }
  };

  const handleSave = React.useCallback(async (postId: string, shouldSave: boolean) => {
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
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, is_saved: shouldSave }
          : post
      ));
    } catch (error) {
      console.error('Error in handleSave:', error);
    }
  }, [currentUserId]);

  const handleReport = React.useCallback(async (postId: string) => {
    // TODO: Implement report functionality
    console.log('Report post:', postId);
  }, []);

  const handleEdit = React.useCallback(async (postId: string) => {
    const echoPosts = echoMatches.map(m => m.post);
    const post = [...posts, ...soulmatePosts, ...echoPosts].find(p => p.id === postId);
    const isMediaProfile = post?.author?.profile_type === 'media';

    if (isMediaProfile) {
      setCorrectionPostId(postId);
      setShowIssueCorrection(true);
    } else {
      setEditingPostId(postId);
      setShowEditPost(true);
    }
  }, [echoMatches, posts, soulmatePosts]);

  const handleProfileClick = React.useCallback((userId: string) => {
    navigate(`/u/${userId}`);
  }, [navigate]);

  const handleDelete = React.useCallback(async (postId: string) => {
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
      setPosts(prev => prev.filter((post: PostData) => post.id !== postId));
    } catch (error) {
      console.error('Error in handleDelete:', error);
    }
  }, [currentUserId]);

  if (reflectTargetPost) {
    return (
      <CreateReflect
        post={reflectTargetPost}
        onBack={() => setReflectTargetPost(null)}
        onReflectCreated={() => setReflectTargetPost(null)}
      />
    );
  }

  if (reflectionsViewPost) {
    return (
      <ReflectionsView
        post={reflectionsViewPost}
        currentUserId={currentUserId || undefined}
        onBack={() => setReflectionsViewPost(null)}
        onProfileClick={handleProfileClick}
      />
    );
  }

  if (showProfile) {
    return (
      <Profile
        userId={profileUserId || ''}
        onBack={handleBackToFeed}
        onNavigateToCreate={handleNavigateToCreate}
        onProfileClick={handleProfileClick}
      />
    );
  }

  if (showCreateSeries) {
    return (
      <CreatePostSeries
        onBack={handleBackToFeedFromCreate}
        onSeriesCreated={handlePostCreated}
      />
    );
  }

  if (showCreatePost) {
    return (
      <CreatePost
        onBack={handleBackToFeedFromCreate}
        onPostCreated={handlePostCreated}
        onCreateSeries={() => {
          setShowCreatePost(false);
          setShowCreateSeries(true);
        }}
        replyToPost={replyToPost || undefined}
      />
    );
  }

  if (showEditPost && editingPostId) {
    return <EditPost postId={editingPostId} onBack={handleBackToFeedFromEdit} onPostUpdated={handlePostCreated} />;
  }

  if (showSearch) {
    return <Search onBack={handleBackToFeedFromSearch} onProfileClick={handleProfileClick} />;
  }


  if (showEditHistory && editHistoryPostId) {
    return <EditHistory postId={editHistoryPostId} onBack={handleBackFromEditHistory} />;
  }

  if (showIssueCorrection && correctionPostId) {
    return <IssueCorrection postId={correctionPostId} onBack={handleBackFromCorrection} onCorrectionIssued={handlePostCreated} />;
  }

  if (showCorrectionProtocol && protocolPostId) {
    return <CorrectionProtocol postId={protocolPostId} onBack={handleBackFromProtocol} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-slate-300 to-slate-100 bg-clip-text text-transparent">
                FRACT
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNavItem === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`group relative flex items-center space-x-2 px-3 lg:px-4 py-2 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-slate-700/50 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="relative">
                      <Icon className={`w-6 h-6 transition-transform duration-300 ${
                        isActive ? 'scale-110' : ''
                      }`} />
                    </div>
                    <span className="font-medium hidden xl:block">{item.label}</span>
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-slate-400 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button 
                onClick={() => handleNavClick('profile')}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-colors duration-300"
              >
                <User className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 safe-area-inset-bottom">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavItem === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative flex flex-col items-center space-y-1 p-2 rounded-lg transition-all duration-300 min-w-0 ${
                  isActive
                    ? 'text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${
                    isActive ? 'scale-110' : ''
                  }`} />
                </div>
                <span className="text-xs font-medium truncate max-w-full">{item.label}</span>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Password Modal */}
      {showActionPasswordForCreate && (
        <ActionPassword
          onVerify={() => {
            setShowActionPasswordForCreate(false);
            if (pendingAction) pendingAction();
            setPendingAction(null);
          }}
          onCancel={() => {
            setShowActionPasswordForCreate(false);
            setPendingAction(null);
            setActiveNavItem('home');
          }}
          title="Security Verification"
          description="Please enter your action password to create a post."
        />
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 pb-24 lg:pb-6">
        {/* Feed Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-center">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1 border border-slate-700/50 w-full max-w-md">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveMainTab('feed')}
                  className={`relative flex-1 px-3 sm:px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
                    activeMainTab === 'feed'
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100 shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  Feed
                  {activeMainTab === 'feed' && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 opacity-20 blur-xl"></div>
                  )}
                </button>
                
                {userHasSoulcode && (
                  <button
                    onClick={() => setActiveMainTab('soulmates')}
                    className={`relative flex-1 px-3 sm:px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
                      activeMainTab === 'soulmates'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-slate-100 shadow-lg'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
                  >
                    💕 Soulmates
                    {activeMainTab === 'soulmates' && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 opacity-20 blur-xl"></div>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-tabs for Feed */}
        {activeMainTab === 'feed' && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-center">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1 border border-slate-700/50 w-full max-w-md">
                <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('discover')}
                  className={`relative flex-1 px-3 sm:px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
                    activeTab === 'discover'
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100 shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  Discover
                  {activeTab === 'discover' && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 opacity-20 blur-xl"></div>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('following')}
                  className={`relative flex-1 px-3 sm:px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
                    activeTab === 'following'
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100 shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  Following
                  {activeTab === 'following' && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 opacity-20 blur-xl"></div>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('echoes')}
                  className={`relative flex-1 px-3 sm:px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base flex items-center justify-center space-x-1.5 ${
                    activeTab === 'echoes'
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>Echoes</span>
                  {activeTab === 'echoes' && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 opacity-20 blur-xl"></div>
                  )}
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Echo Tier Sub-filters */}
        {activeMainTab === 'feed' && activeTab === 'echoes' && (
          <div className="mb-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => setEchoTier('weak')}
                  className={`group flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                    echoTier === 'weak'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-md shadow-teal-900/20'
                      : 'bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:text-teal-300 hover:border-teal-600/30'
                  }`}
                >
                  <Waves className={`w-3.5 h-3.5 transition-transform duration-300 ${echoTier === 'weak' ? 'scale-110' : 'group-hover:scale-105'}`} />
                  <span>Weak Echo</span>
                </button>

                <button
                  onClick={() => setEchoTier('strong')}
                  className={`group flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                    echoTier === 'strong'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-900/20'
                      : 'bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:text-cyan-300 hover:border-cyan-600/30'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 transition-transform duration-300 ${echoTier === 'strong' ? 'scale-110' : 'group-hover:scale-105'}`} />
                  <span>Strong Echo</span>
                </button>

                <button
                  onClick={() => setEchoTier('resonance')}
                  className={`group flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                    echoTier === 'resonance'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-900/20'
                      : 'bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:text-emerald-300 hover:border-emerald-600/30'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 transition-transform duration-300 ${echoTier === 'resonance' ? 'scale-110' : 'group-hover:scale-105'}`} />
                  <span>Total Resonance</span>
                </button>
              </div>
            </div>

            <div className="text-center mt-3">
              <p className="text-slate-500 text-xs">
                {echoTier === 'weak' && 'Posts sharing 2-3 keywords with yours -- topic similarity'}
                {echoTier === 'strong' && 'Posts sharing 5+ keywords with yours -- idea similarity'}
                {echoTier === 'resonance' && 'Posts matching keywords and sentence structure at 70%+ -- deep resonance'}
              </p>
            </div>
          </div>
        )}

        {/* Feed Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Soulmate Posts */}
          {activeMainTab === 'soulmates' && (
            <div>
              {isLoading ? (
                <div className="space-y-4 sm:space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-slate-800/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 animate-pulse">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-700 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-700 rounded w-24 sm:w-32"></div>
                          <div className="h-3 bg-slate-700 rounded w-16 sm:w-24"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-700 rounded w-full"></div>
                        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : applyCategoryFilter(hideAiPosts ? soulmatePosts.filter(p => !p.ai_flagged) : soulmatePosts).length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                      Soulmate Posts ✨
                    </h3>
                    <p className="text-slate-400">
                      Posts from people who share your exact soulcode
                    </p>
                  </div>
                  
                  {applyCategoryFilter(hideAiPosts ? soulmatePosts.filter(p => !p.ai_flagged) : soulmatePosts).map((post) => (
                    <div key={post.id} className="relative">
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white text-sm">💕</span>
                        </div>
                      </div>
                      <PostCard
                        post={post}
                        currentUserId={currentUserId || undefined}
                        onSave={handleSave}
                        onReport={handleReport}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReact={handleReact}
                        onProfileClick={handleProfileClick}
                        onShowEditHistory={handleShowEditHistory}
                        onReflect={(p: any) => setReflectTargetPost(p)}
                        onViewReflections={(p: any) => setReflectionsViewPost(p)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl sm:text-3xl">💕</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">No Soulmate Posts</h3>
                  <p className="text-slate-400 text-base sm:text-lg mb-4 sm:mb-6">
                    Your soulmates haven't posted anything yet
                  </p>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
                  >
                    Find Soulmates
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Regular Feed */}
          {activeMainTab === 'feed' && activeTab === 'discover' && (() => {
            const filteredPosts = applyCategoryFilter(
              hideAiPosts ? posts.filter(p => !p.ai_flagged) : posts
            );
            const feedItems: FeedItem[] = [
              ...filteredPosts.map(p => ({ type: 'post' as const, data: p, created_at: p.created_at })),
              ...seriesList.map(s => ({ type: 'series' as const, data: s, created_at: s.created_at })),
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            return (
              <div>
                {isLoading ? (
                  <div className="space-y-4 sm:space-y-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-slate-800/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 animate-pulse">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-700 rounded-full"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-slate-700 rounded w-24 sm:w-32"></div>
                            <div className="h-3 bg-slate-700 rounded w-16 sm:w-24"></div>
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
                  <div className="space-y-4 sm:space-y-6">
                    {feedItems.map((item) =>
                      item.type === 'post' ? (
                        <PostCard
                          key={`post-${item.data.id}`}
                          post={item.data as PostData}
                          currentUserId={currentUserId || undefined}
                          onSave={handleSave}
                          onReport={handleReport}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onReact={handleReact}
                          onProfileClick={handleProfileClick}
                          onShowEditHistory={handleShowEditHistory}
                          onReflect={(p: any) => setReflectTargetPost(p)}
                          onViewReflections={(p: any) => setReflectionsViewPost(p)}
                        />
                      ) : (
                        <PostSeriesCard
                          key={`series-${item.data.id}`}
                          series={item.data as SeriesData}
                          currentUserId={currentUserId}
                          onProfileClick={handleProfileClick}
                          onDelete={handleDeleteSeries}
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 sm:py-16 px-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                      <SearchIcon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-100" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">No posts yet</h3>
                    <p className="text-slate-400 text-base sm:text-lg mb-4 sm:mb-6">Be the first to share something!</p>
                    <button
                      onClick={handleNavigateToCreate}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-semibold rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
                    >
                      Create Post
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {activeMainTab === 'feed' && activeTab === 'following' && (
            <div>
              {isLoading ? (
                <div className="space-y-4 sm:space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-slate-800/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 animate-pulse">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-700 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-700 rounded w-24 sm:w-32"></div>
                          <div className="h-3 bg-slate-700 rounded w-16 sm:w-24"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-700 rounded w-full"></div>
                        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : applyCategoryFilter(hideAiPosts ? posts.filter(p => !p.ai_flagged) : posts).length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {applyCategoryFilter(hideAiPosts ? posts.filter(p => !p.ai_flagged) : posts).map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId ?? undefined}
                      onSave={handleSave}
                      onReport={handleReport}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onReact={handleReact}
                      onProfileClick={handleProfileClick}
                      onShowEditHistory={handleShowEditHistory}
                      onReflect={(p: any) => setReflectTargetPost(p)}
                      onViewReflections={(p: any) => setReflectionsViewPost(p)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-slate-100" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">No posts yet</h3>
                  <p className="text-slate-400 text-base sm:text-lg mb-4 sm:mb-6">Follow people to see their posts here</p>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-semibold rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
                  >
                    Find People
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Echoes Feed */}
          {activeMainTab === 'feed' && activeTab === 'echoes' && (
            <div>
              {isLoadingEchoes ? (
                <div className="space-y-4 sm:space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-slate-800/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 animate-pulse">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-900/30 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-teal-900/20 rounded w-24 sm:w-32"></div>
                          <div className="h-3 bg-slate-700 rounded w-16 sm:w-24"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-700 rounded w-full"></div>
                        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                      </div>
                      <div className="mt-3 flex items-center space-x-2">
                        <div className="h-5 bg-teal-900/20 rounded-full w-20"></div>
                        <div className="h-5 bg-teal-900/20 rounded-full w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : echoMatches.length > 0 && applyCategoryFilter((hideAiPosts ? echoMatches.filter(m => !m.post.ai_flagged) : echoMatches).map(m => m.post)).length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {(() => {
                    const base = hideAiPosts ? echoMatches.filter(m => !m.post.ai_flagged) : echoMatches;
                    const allowedIds = new Set(applyCategoryFilter(base.map(m => m.post)).map(p => p.id));
                    return base.filter(m => allowedIds.has(m.post.id));
                  })().map((match) => (
                    <div key={match.post.id} className="relative">
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className={`px-2.5 py-1 rounded-full flex items-center space-x-1 text-xs font-semibold shadow-lg ${
                          match.tier === 'resonance'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                            : match.tier === 'strong'
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                              : 'bg-gradient-to-r from-teal-600 to-teal-500 text-white'
                        }`}>
                          {match.tier === 'resonance' && <Sparkles className="w-3 h-3" />}
                          {match.tier === 'strong' && <Zap className="w-3 h-3" />}
                          {match.tier === 'weak' && <Waves className="w-3 h-3" />}
                          <span>
                            {match.tier === 'resonance' && `${match.similarityScore}%`}
                            {match.tier === 'strong' && `${match.keywordCount} kw`}
                            {match.tier === 'weak' && `${match.keywordCount} kw`}
                          </span>
                        </div>
                      </div>

                      <PostCard
                        post={match.post}
                        currentUserId={currentUserId || undefined}
                        onSave={handleSave}
                        onReport={handleReport}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReact={handleReact}
                        onProfileClick={handleProfileClick}
                        onShowEditHistory={handleShowEditHistory}
                        onReflect={(p: any) => setReflectTargetPost(p)}
                        onViewReflections={(p: any) => setReflectionsViewPost(p)}
                      />

                      {match.matchedKeywords.length > 0 && (
                        <div className="mt-2 px-4 sm:px-6 flex flex-wrap gap-1.5">
                          {match.matchedKeywords.slice(0, 8).map((kw) => (
                            <span
                              key={kw}
                              className="inline-block px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-teal-400 text-xs"
                            >
                              {kw}
                            </span>
                          ))}
                          {match.matchedKeywords.length > 8 && (
                            <span className="inline-block px-2 py-0.5 text-slate-500 text-xs">
                              +{match.matchedKeywords.length - 8} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Radio className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">No Echoes Found</h3>
                  <p className="text-slate-400 text-base sm:text-lg mb-2">
                    {echoTier === 'weak' && 'No posts share enough topics with yours yet.'}
                    {echoTier === 'strong' && 'No posts closely match your ideas yet.'}
                    {echoTier === 'resonance' && 'No deep resonance matches found yet.'}
                  </p>
                  <p className="text-slate-500 text-sm mb-6">
                    Write more posts so the system can find your echoes.
                  </p>
                  <button
                    onClick={handleNavigateToCreate}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
                  >
                    Create Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating elements for visual appeal */}
      <div className="fixed top-20 left-10 w-2 h-2 bg-slate-500 rounded-full opacity-60 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-32 right-16 w-3 h-3 bg-slate-400 rounded-full opacity-40 animate-pulse delay-1000 pointer-events-none"></div>
      <div className="fixed top-1/3 right-8 w-1 h-1 bg-slate-600 rounded-full opacity-80 animate-pulse delay-500 pointer-events-none"></div>
    </div>
  );
};

export default Feed;