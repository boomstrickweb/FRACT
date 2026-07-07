import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Settings as SettingsIcon, CreditCard as Edit3, Users, UserPlus, UserMinus, MoreHorizontal, Flag, VolumeX, Ban, Plus, Heart, X, Eye, Newspaper, ShieldAlert, TrendingUp, FileEdit, Link2, AlertTriangle, Scale, Bookmark, BookOpen, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PostCard from './PostCard';
import PostSeriesCard from './PostSeriesCard';
import EditProfile from './EditProfile';
import EditPost from './EditPost';
import EditPostSeries from './EditPostSeries';
import EditHistory from './EditHistory';
import IssueCorrection from './IssueCorrection';
import CorrectionProtocol from './CorrectionProtocol';
import Settings from './Settings';
import ReportModal from './ReportModal';
import VerificationBadge from './VerificationBadge';
import AccountScopeDeclaration from './AccountScopeDeclaration';
import ReflectionsView from './ReflectionsView';
import ActionPassword from './ActionPassword';

interface ProfileData {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  profile_pic_url?: string;
  cover_pic_url?: string;
  beliefs?: string;
  field?: string;
  created_at: string;
  show_following: boolean;
  show_respected_posts: boolean;
  show_rejected_posts: boolean;
  show_observed_posts: boolean;
  is_verified?: boolean;
  verification_type?: string;
  verification_reason?: string;
  profile_type?: string;
  trust_score?: number;
  user_verifications?: {
    verification_type: string;
    verification_reason?: string;
    verified_at: string;
    is_active: boolean;
  }[];
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
  reaction_counts?: {
    respect_count: number;
    reject_count: number;
    observe_count: number;
  };
}

interface SeriesChapter {
  id: string;
  chapter_number: number;
  title: string | null;
  content: string;
}

interface PostSeriesData {
  id: string;
  author_id: string;
  title: string;
  is_anonymous: boolean;
  is_explicit: boolean;
  created_at: string;
  author?: {
    id: string;
    name: string;
    username?: string;
    profile_pic_url?: string;
    is_verified?: boolean;
    verification_type?: string;
    verification_reason?: string;
  };
  chapters: SeriesChapter[];
}

interface ProfileProps {
  userId?: string;
  onBack: () => void;
  onNavigateToCreate?: () => void;
  onProfileClick?: (userId: string) => void;
  onJoinClick?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ userId: propsUserId, onBack, onNavigateToCreate, onProfileClick, onJoinClick }) => {
  const { username: urlUsername } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [reactionPosts, setReactionPosts] = useState<{
    respected: PostData[];
    rejected: PostData[];
    observed: PostData[];
  }>({
    respected: [],
    rejected: [],
    observed: []
  });
  const [activeTab, setActiveTab] = useState<'posts' | 'series' | 'reflections' | 'respected' | 'rejected' | 'observed' | 'following' | 'saved'>('posts');
  const [seriesList, setSeriesList] = useState<PostSeriesData[]>([]);
  const [showEditSeries, setShowEditSeries] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [followingUsers, setFollowingUsers] = useState<Record<string, any>[]>([]);
  const [savedPosts, setSavedPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditPost, setShowEditPost] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [showIssueCorrection, setShowIssueCorrection] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editHistoryPostId, setEditHistoryPostId] = useState<string | null>(null);
  const [correctionPostId, setCorrectionPostId] = useState<string | null>(null);
  const [showCorrectionProtocol, setShowCorrectionProtocol] = useState(false);
  const [protocolPostId, setProtocolPostId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showMediaConversionModal, setShowMediaConversionModal] = useState(false);
  const [showAccountScopeDeclaration, setShowAccountScopeDeclaration] = useState(false);
  const [isBlockedRelationship, setIsBlockedRelationship] = useState(false);
  const [accountScopeCovers, setAccountScopeCovers] = useState<string[]>([]);
  const [accountScopeDoesNotCover, setAccountScopeDoesNotCover] = useState<string[]>([]);
  const [userReflections, setUserReflections] = useState<Record<string, any>[]>([]);
  const [viewReflectionsPost, setViewReflectionsPost] = useState<PostData | null>(null);
  const [showActionPasswordForProfile, setShowActionPasswordForProfile] = useState(false);
  const [pendingProfileAction, setPendingProfileAction] = useState<(() => void) | null>(null);
  const [profileProtectionType, setProfileProtectionType] = useState<'editProfile' | 'settings' | null>(null);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  const loadSeries = React.useCallback(async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_series')
        .select(`
          *,
          author:profiles!post_series_author_id_fkey (
            id, name, username, profile_pic_url, is_verified, verification_type, verification_reason
          ),
          chapters:series_chapters (
            id, chapter_number, title, content
          )
        `)
        .eq('author_id', targetUserId)
        .eq('is_anonymous', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading series:', error);
        return;
      }

      setSeriesList(data || []);
    } catch (error) {
      console.error('Error loading series:', error);
    }
  }, []);

  const loadAccountScope = React.useCallback(async (targetUserId: string) => {
    try {
      const { data: coversData, error: coversError } = await supabase
        .from('account_scope_covers')
        .select('topic')
        .eq('user_id', targetUserId);

      if (coversError) {
        console.error('Error loading account scope covers:', coversError);
      } else {
        setAccountScopeCovers(coversData?.map(item => item.topic) || []);
      }

      const { data: doesNotCoverData, error: doesNotCoverError } = await supabase
        .from('account_scope_does_not_cover')
        .select('item')
        .eq('user_id', targetUserId);

      if (doesNotCoverError) {
        console.error('Error loading account scope exclusions:', doesNotCoverError);
      } else {
        setAccountScopeDoesNotCover(doesNotCoverData?.map(item => item.item) || []);
      }
    } catch (error) {
      console.error('Error in loadAccountScope:', error);
    }
  }, []);

  const loadPosts = React.useCallback(async (targetUserId: string, loggedInUserId?: string | null) => {
    try {
      const query = supabase
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
            verification_reason,
            profile_type
          )
        `)
        .eq('author_id', targetUserId)
        .eq('is_anonymous', false);

      const effectiveUserId = loggedInUserId;
      const moderationFilter = effectiveUserId 
        ? `moderation_score.lt.3,moderation_score.is.null,moderation_reason.eq.spam,author_id.eq.${effectiveUserId}`
        : `moderation_score.lt.3,moderation_score.is.null,moderation_reason.eq.spam`;

      const { data: postsData, error: postsError } = await query
        .or(moderationFilter)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) {
        console.error('Error loading posts:', postsError);
        return;
      }

      // Check which posts are saved and get user reactions
      if (effectiveUserId && postsData && postsData.length > 0) {
        const postIds = postsData.map((post: PostData) => post.id);
        
        // Parallelize enrichment fetches
        const [savedPostsRes, userReactionsRes] = await Promise.all([
          supabase
            .from('saved_posts')
            .select('post_id')
            .eq('user_id', effectiveUserId)
            .in('post_id', postIds),
          supabase
            .from('post_reactions')
            .select('post_id, reaction_type')
            .eq('user_id', effectiveUserId)
            .in('post_id', postIds)
        ]);

        const savedPosts = savedPostsRes.data;
        const userReactions = userReactionsRes.data;

        const savedPostIds = new Set(savedPosts?.map(sp => sp.post_id) || []);
        const reactionMap = new Map(userReactions?.map(r => [r.post_id, r.reaction_type]) || []);

        const enrichedPosts = postsData.map(post => ({
          ...post,
          is_saved: savedPostIds.has(post.id),
          is_reposted: false,
          user_reaction: reactionMap.get(post.id) || null
        }));

        setPosts(enrichedPosts);
      } else {
        setPosts(postsData || []);
      }
    } catch (error) {
      console.error('Error in loadPosts:', error);
    }
  }, []);

  const loadSavedPosts = React.useCallback(async (targetUserId: string, loggedInUserId?: string | null) => {
    try {
      const effectiveUserId = loggedInUserId;

      if (!effectiveUserId || targetUserId !== effectiveUserId) {
        setSavedPosts([]);
        return;
      }

      const { data: savedData, error: savedError } = await supabase
        .from('saved_posts')
        .select(`
          post_id,
          created_at,
          posts (
            *,
            author:profiles!posts_author_id_fkey (
              id,
              name,
              username,
              profile_pic_url,
              is_verified,
              verification_type,
              verification_reason,
              profile_type
            )
          )
        `)
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (savedError) {
        console.error('Error loading saved posts:', savedError);
        return;
      }

      const postsData = savedData?.map((item: any) => item.posts).filter(Boolean) || [];

      if (postsData.length > 0) {
        const postIds = postsData.map((post: any) => post.id);

        const { data: userReactions } = await supabase
          .from('post_reactions')
          .select('post_id, reaction_type')
          .eq('user_id', effectiveUserId)
          .in('post_id', postIds);

        const reactionMap = new Map(userReactions?.map(r => [r.post_id, r.reaction_type]) || []);

        const enrichedPosts = postsData.map((post: any) => ({
          ...post,
          is_saved: true,
          is_reposted: false,
          user_reaction: reactionMap.get(post.id) || null
        }));

        setSavedPosts(enrichedPosts);
      } else {
        setSavedPosts([]);
      }
    } catch (error) {
      console.error('Error in loadSavedPosts:', error);
      setSavedPosts([]);
    }
  }, []);

  const loadReactionPosts = React.useCallback(async (targetUserId: string, profileData: any, loggedInUserId?: string | null) => {
    try {
      console.log('📊 Loading reaction posts for user:', targetUserId);

      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.log('Supabase not configured, skipping reaction posts');
        return;
      }

      const reactionPosts = {
        respected: [] as PostData[],
        rejected: [] as PostData[],
        observed: [] as PostData[]
      };

      // Load all reaction types in parallel
      const reactionTypes: ('respect' | 'reject' | 'observe')[] = ['respect', 'reject', 'observe'];
      
      const isActuallyOwnProfile = targetUserId === loggedInUserId;

      const reactionPromises = reactionTypes.map(async (reactionType) => {
        // Only load if visible
        if (reactionType === 'respect' && !profileData.show_respected_posts && !isActuallyOwnProfile) return { reactionType, posts: [] };
        if (reactionType === 'reject' && !profileData.show_rejected_posts && !isActuallyOwnProfile) return { reactionType, posts: [] };
        if (reactionType === 'observe' && !profileData.show_observed_posts && !isActuallyOwnProfile) return { reactionType, posts: [] };

        const { data: reactions, error } = await supabase
          .from('post_reactions')
          .select(`
            post_id,
            created_at,
            posts (
              *,
              author:profiles!posts_author_id_fkey (
                id,
                name,
                profile_pic_url,
                is_verified,
                verification_type,
                profile_type
              )
            )
          `)
          .eq('user_id', targetUserId)
          .eq('reaction_type', reactionType)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error(`Error loading ${reactionType} posts:`, error);
          return { reactionType, posts: [] };
        }

        const posts: any[] = (reactions?.map((r: any) => r.posts)
          .filter((post: any) => post !== null && post !== undefined)
          .filter((post: any) => {
            if (isActuallyOwnProfile && post.is_anonymous && post.author_id === targetUserId) {
              return false;
            }
            return true;
          })) || [];
        
        // Return immediately without enrichment for background loading
        return { reactionType, posts: posts as PostData[] };
      });

      const results = await Promise.all(reactionPromises);
      
      results.forEach(({ reactionType, posts }) => {
        if (reactionType === 'respect') reactionPosts.respected = posts;
        else if (reactionType === 'reject') reactionPosts.rejected = posts;
        else if (reactionType === 'observe') reactionPosts.observed = posts;
      });

      setReactionPosts(reactionPosts);

      // Now perform enrichment for all reaction posts in parallel
      const allReactionPosts = [...reactionPosts.respected, ...reactionPosts.rejected, ...reactionPosts.observed];
      if (loggedInUserId && allReactionPosts.length > 0) {
        const postIds = Array.from(new Set(allReactionPosts.map(p => p.id)));
        
        // Chunk large sets of IDs to avoid potential query length limits
        const chunkSize = 50;
        for (let i = 0; i < postIds.length; i += chunkSize) {
          const chunk = postIds.slice(i, i + chunkSize);
          
          const [savedPostsRes, userReactionsRes] = await Promise.all([
            supabase
              .from('saved_posts')
              .select('post_id')
              .eq('user_id', loggedInUserId)
              .in('post_id', chunk),
            supabase
              .from('post_reactions')
              .select('post_id, reaction_type')
              .eq('user_id', loggedInUserId)
              .in('post_id', chunk)
          ]);

          const savedPostIds = new Set(savedPostsRes.data?.map((sp: any) => sp.post_id) || []);
          const reactionMap = new Map(userReactionsRes.data?.map((r: any) => [r.post_id, r.reaction_type]) || []);

          const updateEnrichment = (post: PostData) => {
            if (chunk.includes(post.id)) {
              post.is_saved = savedPostIds.has(post.id);
              post.user_reaction = reactionMap.get(post.id) || null;
            }
          };

          reactionPosts.respected.forEach(updateEnrichment);
          reactionPosts.rejected.forEach(updateEnrichment);
          reactionPosts.observed.forEach(updateEnrichment);
        }
        
        setReactionPosts({ ...reactionPosts });
      }

      console.log('📊 Final reaction posts:', {
        respected: reactionPosts.respected.length,
        rejected: reactionPosts.rejected.length,
        observed: reactionPosts.observed.length
      });
    } catch (error) {
      console.error('Error loading reaction posts:', error);
    }
  }, []);

  const checkAndCleanupExpiredPosts = React.useCallback(async (targetUserId: string, loggedInUserId: string | null, profileData: any) => {
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
          // Reload posts, saved posts, and reaction posts to update the UI
          if (profileData && targetUserId) {
            await loadPosts(targetUserId, loggedInUserId);
            await loadSavedPosts(targetUserId, loggedInUserId);
            await loadReactionPosts(targetUserId, profileData, loggedInUserId);
          }
        }
      }
    } catch (error) {
      console.log('Cleanup check failed:', error);
    }
  }, []);

  const loadFollowStatus = React.useCallback(async (currentUserId: string, targetUserId: string) => {
    try {
      const [followRes, followersCountRes, followingCountRes] = await Promise.all([
        supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId)
          .maybeSingle(),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', targetUserId),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', targetUserId)
      ]);

      setIsFollowing(!!followRes.data);
      setFollowersCount(followersCountRes.count || 0);
      setFollowingCount(followingCountRes.count || 0);
    } catch (error) {
      console.error('Error loading follow status:', error);
    }
  }, []);

  const loadFollowingUsers = React.useCallback(async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          created_at,
          following:profiles!follows_following_id_fkey (
            id,
            name,
            profile_pic_url,
            bio,
            is_verified,
            verification_type,
            profile_type
          )
        `)
        .eq('follower_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading following users:', error);
        return;
      }

      setFollowingUsers(data || []);
    } catch (error) {
      console.error('Error in loadFollowingUsers:', error);
    }
  }, []);

  const loadReflections = React.useCallback(async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('reflections')
        .select(`
          *,
          post:posts!reflections_post_id_fkey (
            id, content, post_type, quote_signature, voice_url, is_anonymous, author_id,
            author:profiles!posts_author_id_fkey (
              id, name, username, profile_pic_url
            )
          )
        `)
        .eq('author_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading reflections:', error);
        return;
      }

      setUserReflections(data || []);
    } catch (err) {
      console.error('Error in loadReflections:', err);
    }
  }, []);

  const loadProfile = React.useCallback(async (specificUserId?: string) => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      setCurrentUserId(user?.id || null);
      
      // Determine which user's profile to load
      const targetUserId = specificUserId || propsUserId || viewingUserId || user?.id;
      if (!targetUserId) {
        setIsLoading(false);
        return;
      }
      
      setIsOwnProfile(targetUserId === user?.id);

      // Load profile data
      // Only load sensitive data (phone_number, password_hash, etc.) if viewing own profile
      const isViewingOwnProfile = targetUserId === user?.id;
      const profileSelect = isViewingOwnProfile
        ? `*,
          user_verifications!user_verifications_user_id_fkey (
            verification_type,
            verification_reason,
            verified_at,
            is_active
          )`
        : `id, username, name, bio, profile_pic_url, cover_pic_url, profile_completed,
          beliefs, field, notifications_enabled, show_following, show_respected_posts,
          show_rejected_posts, show_observed_posts, is_deactivated, deactivated_at,
          two_factor_enabled, is_verified, verification_type, verification_reason, profile_type,
          media_converted_at, trust_score, created_at, updated_at,
          user_verifications!user_verifications_user_id_fkey (
            verification_type,
            verification_reason,
            verified_at,
            is_active
          )`;

      const { data, error: profileError } = await (supabase
        .from('profiles')
        .select(profileSelect)
        .eq('id', targetUserId)
        .maybeSingle() as any);
      
      const profileData = data as ProfileData;

      if (profileError || (!profileData && !isOwnProfile)) {
        console.error('Error loading profile:', profileError || 'Profile not found');
        setIsLoading(false);
        return;
      }

      if (!profileData && isOwnProfile) {
        // If it's the current user's profile and doesn't exist, create it
        if (user && targetUserId === user.id) {
          console.log('Creating missing profile for current user...');
          
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              phone_number: user.email || '',
              country_code: '+1',
              profile_completed: false,
              name: user.email?.split('@')[0] || 'User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (createError) {
            console.error('Error creating profile:', createError);
            return;
          }
          
          // Reload profile after creation
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (newProfile) {
            setProfile(newProfile);
          }
        }
        return;
      }

      if (!isViewingOwnProfile && user?.id) {
        const { data: blockCheck } = await supabase.rpc('is_blocked_either_direction', {
          user_a: user.id,
          user_b: targetUserId
        });
        if (blockCheck) {
          setIsBlockedRelationship(true);
          setProfile(profileData);
          setIsLoading(false);
          return;
        }
      }

      setProfile(profileData);
      setIsLoading(false);

      // If user has verification record but profile isn't marked as verified, sync it
      if (profileData && profileData.user_verifications && profileData.user_verifications.length > 0) {
        const activeVerification = profileData.user_verifications.find((v: any) => v.is_active);
        if (activeVerification && !profileData.is_verified) {
          // Sync verification status to profile
          await supabase
            .from('profiles')
            .update({
              is_verified: true,
              verification_type: activeVerification.verification_type
            })
            .eq('id', targetUserId);
          
          // Update local state
          setProfile(prev => prev ? {
            ...prev,
            is_verified: true,
            verification_type: activeVerification.verification_type,
            verification_reason: activeVerification.verification_reason
          } : null);
        }
      }

      // Parallel load of secondary data
      const loadPromises = [];

      // Load posts
      const postsPromise = loadPosts(targetUserId, user?.id);
      loadPromises.push(postsPromise);

      // Wait for primary content first to show it ASAP
      await postsPromise;
      setIsLoading(false); // We can stop showing the main spinner once posts are here

      // Load remaining data in background
      const backgroundPromises = [];

      // Load post series
      backgroundPromises.push(loadSeries(targetUserId));

      // Load reflections (only for own profile)
      if (targetUserId === user?.id) {
        backgroundPromises.push(loadReflections(targetUserId));
      }

      // Load saved posts (only for own profile)
      if (targetUserId === user?.id) {
        backgroundPromises.push(loadSavedPosts(targetUserId, user?.id));
      }

      // Load reaction posts if it's own profile or if user allows showing reactions
      if (profileData && (targetUserId === user?.id || profileData.show_respected_posts || profileData.show_rejected_posts || profileData.show_observed_posts)) {
        backgroundPromises.push(loadReactionPosts(targetUserId, profileData, user?.id));
      }

      // Load follow status and counts
      if (user?.id && targetUserId !== user.id) {
        backgroundPromises.push(loadFollowStatus(user.id, targetUserId));
      }

      // Load account scope data if it's a media profile
      if (profileData && profileData.profile_type === 'media') {
        backgroundPromises.push(loadAccountScope(targetUserId));
      }

      // Load following users - only for own profile (following list is now always private)
      if (targetUserId === user?.id) {
        backgroundPromises.push(loadFollowingUsers(targetUserId));
      }

      await Promise.all(backgroundPromises);

    } catch (error) {
      console.error('Error in loadProfile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [propsUserId, viewingUserId, loadPosts, loadSeries, loadReflections, loadSavedPosts, loadReactionPosts, loadFollowStatus, loadAccountScope, loadFollowingUsers]);

  // Initial profile load
  useEffect(() => {
    const initProfile = async () => {
      let targetUserId = propsUserId;
      
      // If we have a username in the URL, fetch its ID
      if (urlUsername) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', urlUsername)
          .single();
        
        if (!error && data) {
          targetUserId = data.id;
        } else {
          // If user not found by username, fallback or redirect
          console.error('User not found:', urlUsername);
        }
      }

      // Fallback to localStorage if still no target
      if (!targetUserId) {
        targetUserId = localStorage.getItem('viewingUserId') || undefined;
      }

      if (targetUserId) {
        setViewingUserId(targetUserId);
      } else {
        // Handle own profile case if no target and logged in
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          setViewingUserId(user.id);
        }
      }
    };

    initProfile();
    
    // Start cleanup interval
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const targetUserId = viewingUserId || propsUserId || session?.user?.id;
      if (targetUserId && profile) {
        await checkAndCleanupExpiredPosts(targetUserId, session?.user?.id || null, profile);
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [propsUserId, urlUsername, profile, viewingUserId, checkAndCleanupExpiredPosts]);

  // Load profile when viewingUserId changes
  useEffect(() => {
    if (viewingUserId) {
      loadProfile(viewingUserId);
    }
  }, [viewingUserId, loadProfile]);

  const handleFollow = async () => {
    if (!currentUserId) {
      if (onJoinClick) onJoinClick();
      return;
    }
    if (!profile) return;

    try {
      if (isFollowing) {
        setShowUnfollowConfirm(true);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: profile.id
          });

        if (error) {
          console.error('Error following user:', error);
          return;
        }

        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error in handleFollow:', error);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUserId || !profile) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id);

      if (error) {
        console.error('Error unfollowing user:', error);
        return;
      }

      setIsFollowing(false);
      setShowUnfollowConfirm(false);
    } catch (error) {
      console.error('Error in handleUnfollow:', error);
    }
  };

  const handleReportUser = async (userId: string, reportType: string, reason: string, description: string) => {
    if (!currentUserId) {
      if (onJoinClick) onJoinClick();
      return;
    }

    try {
      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: currentUserId,
          reported_id: userId,
          report_type: reportType,
          reason: reason,
          description: description
        });

      if (error) {
        console.error('Error reporting user:', error);
        return;
      }

      setShowReportModal(false);
    } catch (error) {
      console.error('Error in handleReportUser:', error);
    }
  };

  const handleMuteUser = async () => {
    if (!currentUserId) {
      if (onJoinClick) onJoinClick();
      return;
    }
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('muted_users')
        .insert({
          muter_id: currentUserId,
          muted_id: profile.id
        });

      if (error) {
        console.error('Error muting user:', error);
        return;
      }

      onBack();
    } catch (error) {
      console.error('Error in handleMuteUser:', error);
    }
  };

  const handleBlockUser = async () => {
    if (!currentUserId) {
      if (onJoinClick) onJoinClick();
      return;
    }
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUserId,
          blocked_id: profile.id
        });

      if (error) {
        console.error('Error blocking user:', error);
        return;
      }

      onBack();
    } catch (error) {
      console.error('Error in handleBlockUser:', error);
    }
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

      // Update local state for all post arrays
      const updatePostsArray = (posts: PostData[]) =>
        posts.map(post =>
          post.id === postId
            ? { ...post, is_saved: shouldSave }
            : post
        );

      setPosts(updatePostsArray);
      setReactionPosts(prev => ({
        respected: updatePostsArray(prev.respected),
        rejected: updatePostsArray(prev.rejected),
        observed: updatePostsArray(prev.observed)
      }));

      // Update saved posts array
      if (shouldSave) {
        // Reload saved posts to include the newly saved post
        if (profile?.id && currentUserId === profile.id) {
          await loadSavedPosts(profile.id, currentUserId);
        }
      } else {
        // Remove the unsaved post from savedPosts array
        setSavedPosts(prev => prev.filter(post => post.id !== postId));
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
    }
  };

  const handleReact = async (postId: string, reaction: 'respect' | 'reject' | 'observe' | null) => {
    console.log('👤 Profile handling reaction:', { postId, reaction });
    
    // Update local state immediately for better UX
    const updatePostsArray = (posts: PostData[]) => 
      posts.map(post => 
        post.id === postId 
          ? { ...post, user_reaction: reaction }
          : post
      );

    setPosts(updatePostsArray);
    setReactionPosts(prev => ({
      respected: updatePostsArray(prev.respected),
      rejected: updatePostsArray(prev.rejected),
      observed: updatePostsArray(prev.observed)
    }));
    
    // Reload reaction posts to reflect changes in tabs
    if (profile && currentUserId) {
      setTimeout(() => {
        loadReactionPosts(viewingUserId || profile.id, profile);
      }, 500);
    }
  };

  const handleReport = async (postId: string) => {
    console.log('Report post:', postId);
  };

  const handleEdit = async (postId: string) => {
    const allPosts = [...posts, ...reactionPosts.respected, ...reactionPosts.rejected, ...reactionPosts.observed];
    const post = allPosts.find(p => p.id === postId);
    const isMediaProfile = post?.author?.profile_type === 'media';

    if (isMediaProfile) {
      setCorrectionPostId(postId);
      setShowIssueCorrection(true);
    } else {
      setEditingPostId(postId);
      setShowEditPost(true);
    }
  };

  const handleShowEditHistory = (postId: string) => {
    const allPosts = [...posts, ...reactionPosts.respected, ...reactionPosts.rejected, ...reactionPosts.observed, ...savedPosts];
    const post = allPosts.find(p => p.id === postId);
    const isMediaProfile = post?.author?.profile_type === 'media';

    if (isMediaProfile) {
      setProtocolPostId(postId);
      setShowCorrectionProtocol(true);
    } else {
      setEditHistoryPostId(postId);
      setShowEditHistory(true);
    }
  };

  const handleBackFromEditHistory = () => {
    setShowEditHistory(false);
    setEditHistoryPostId(null);
  };

  const handleBackFromProtocol = () => {
    setShowCorrectionProtocol(false);
    setProtocolPostId(null);
  };

  const handleBackFromEdit = () => {
    setShowEditPost(false);
    setEditingPostId(null);
    loadProfile();
  };

  const handleBackFromCorrection = () => {
    setShowIssueCorrection(false);
    setCorrectionPostId(null);
    loadProfile();
  };

  const handlePostUpdated = () => {
    loadProfile();
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
      const filterPosts = (posts: PostData[]) => posts.filter(post => post.id !== postId);
      
      setPosts(filterPosts);
      setReactionPosts(prev => ({
        respected: filterPosts(prev.respected),
        rejected: filterPosts(prev.rejected),
        observed: filterPosts(prev.observed)
      }));
    } catch (error) {
      console.error('Error in handleDelete:', error);
    }
  };

  const handleProfileClick = (targetUserId: string) => {
    navigate(`/u/${targetUserId}`);
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getDisplayName = () => {
    if (!profile) return 'Unknown User';
    return profile.name || `User ${profile.id.slice(0, 8)}`;
  };

  const getCurrentPosts = (): any[] => {
    switch (activeTab) {
      case 'respected':
        return (isOwnProfile || profile?.show_respected_posts) ? reactionPosts.respected : [];
      case 'rejected':
        return (isOwnProfile || profile?.show_rejected_posts) ? reactionPosts.rejected : [];
      case 'observed':
        return (isOwnProfile || profile?.show_observed_posts) ? reactionPosts.observed : [];
      case 'saved':
        return isOwnProfile ? savedPosts : [];
      default:
        return posts;
    }
  };

  const getTabCount = (tab: 'posts' | 'series' | 'reflections' | 'respected' | 'rejected' | 'observed' | 'following' | 'saved') => {
    switch (tab) {
      case 'series':
        return seriesList.length;
      case 'reflections':
        return userReflections.length;
      case 'respected':
        return reactionPosts.respected.length;
      case 'rejected':
        return reactionPosts.rejected.length;
      case 'observed':
        return reactionPosts.observed.length;
      case 'following':
        return followingUsers.length;
      case 'saved':
        return savedPosts.length;
      default:
        return posts.length;
    }
  };

  const handleEditSeries = (seriesId: string) => {
    setEditingSeriesId(seriesId);
    setShowEditSeries(true);
  };

  const handleDeleteSeries = (seriesId: string) => {
    setSeriesList(prev => prev.filter(s => s.id !== seriesId));
  };

  const shouldShowTab = (tab: 'respected' | 'rejected' | 'observed' | 'following') => {
    if (!profile) return false;
    if (isOwnProfile) return true;

    switch (tab) {
      case 'respected':
        return profile.show_respected_posts;
      case 'rejected':
        return profile.show_rejected_posts;
      case 'observed':
        return profile.show_observed_posts;
      case 'following':
        return false; // Following list is now always private
      default:
        return false;
    }
  };

  if (showEditProfile) {
    return <EditProfile onBack={() => setShowEditProfile(false)} onProfileUpdated={loadProfile} />;
  }

  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} onProfileUpdated={loadProfile} onLogout={() => window.location.reload()} />;
  }

  if (showAccountScopeDeclaration) {
    return (
      <AccountScopeDeclaration
        onBack={() => setShowAccountScopeDeclaration(false)}
        onComplete={() => {
          setShowAccountScopeDeclaration(false);
          loadProfile();
        }}
      />
    );
  }

  if (showEditPost && editingPostId) {
    return <EditPost postId={editingPostId} onBack={handleBackFromEdit} onPostUpdated={handlePostUpdated} />;
  }

  if (showEditSeries && editingSeriesId) {
    return (
      <EditPostSeries
        seriesId={editingSeriesId}
        onBack={() => {
          setShowEditSeries(false);
          setEditingSeriesId(null);
        }}
        onSeriesUpdated={() => {
          if (profile) loadSeries(userId || profile.id);
        }}
      />
    );
  }

  if (showEditHistory && editHistoryPostId) {
    return <EditHistory postId={editHistoryPostId} onBack={handleBackFromEditHistory} />;
  }

  if (showIssueCorrection && correctionPostId) {
    return <IssueCorrection postId={correctionPostId} onBack={handleBackFromCorrection} onCorrectionIssued={handlePostUpdated} />;
  }

  if (showCorrectionProtocol && protocolPostId) {
    return <CorrectionProtocol postId={protocolPostId} onBack={handleBackFromProtocol} />;
  }

  if (viewReflectionsPost) {
    return (
      <ReflectionsView
        post={viewReflectionsPost}
        currentUserId={currentUserId || undefined}
        onBack={() => setViewReflectionsPost(null)}
        onProfileClick={handleProfileClick}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-slate-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-400">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-100 mb-2">Profile not found</div>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-semibold rounded-2xl transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isBlockedRelationship && !isOwnProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
        <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-slate-100 ml-4">
                @{profile.username || 'User'}
              </h1>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-32">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <Ban className="w-10 h-10 text-slate-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-200 mb-2">This account is blocked</h2>
          <p className="text-slate-400 text-center max-w-sm">
            You can't view this profile or interact with this user.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 pb-24 lg:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-100">{getDisplayName()}</h1>
                <p className="text-slate-400 text-sm">{posts.length} posts</p>
              </div>
            </div>
            
            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-2 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-xl z-10 min-w-[160px]">
                  {isOwnProfile ? (
                    <>
                      <button
                        onClick={async () => {
                          setShowMenu(false);
                          
                          // Check for Action Password protection
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            const { data: profile } = await supabase
                              .from('profiles')
                              .select('action_password_hash, action_password_settings')
                              .eq('id', user.id)
                              .single();
                            
                            if (profile?.action_password_hash && profile?.action_password_settings?.editProfile) {
                              setPendingProfileAction(() => () => setShowEditProfile(true));
                              setProfileProtectionType('editProfile');
                              setShowActionPasswordForProfile(true);
                              return;
                            }
                          }
                          setShowEditProfile(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-slate-200 hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Profile</span>
                      </button>
                      <button
                        onClick={async () => {
                          setShowMenu(false);
                          
                          // Check for Action Password protection
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            const { data: profile } = await supabase
                              .from('profiles')
                              .select('action_password_hash, action_password_settings')
                              .eq('id', user.id)
                              .single();
                            
                            if (profile?.action_password_hash && profile?.action_password_settings?.settings) {
                              setPendingProfileAction(() => () => setShowSettings(true));
                              setProfileProtectionType('settings');
                              setShowActionPasswordForProfile(true);
                              return;
                            }
                          }
                          setShowSettings(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-slate-200 hover:text-white"
                      >
                        <SettingsIcon className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleMuteUser();
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-amber-400 hover:text-amber-300"
                      >
                        <VolumeX className="w-4 h-4" />
                        <span>Mute User</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleBlockUser();
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-red-400 hover:text-red-300"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Block User</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowReportModal(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-red-400 hover:text-red-300"
                      >
                        <Flag className="w-4 h-4" />
                        <span>Report User</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        {/* Cover Photo */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 rounded-b-3xl overflow-hidden">
          {profile.cover_pic_url ? (
            <img
              src={profile.cover_pic_url.includes('supabase.co') && profile.cover_pic_url.includes('cover-pictures')
                ? `${profile.cover_pic_url}?width=1200&height=400&resize=cover`
                : profile.cover_pic_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700"></div>
          )}
        </div>

        {/* Profile Info */}
        <div className="relative px-6 pb-6">
          {/* Profile Picture */}
          <div className="flex items-end justify-between -mt-16 mb-4">
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-800 border-4 border-slate-900 overflow-hidden">
                {profile.profile_pic_url ? (
                  <img
                    src={profile.profile_pic_url.includes('supabase.co') && profile.profile_pic_url.includes('profile-pictures')
                      ? `${profile.profile_pic_url}?width=256&height=256&resize=cover`
                      : profile.profile_pic_url}
                    alt={getDisplayName()}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                    <User className="w-10 h-10 sm:w-16 sm:h-16 text-slate-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {isOwnProfile ? (
                <div className="flex items-center space-x-2">
                  {profile?.profile_type !== 'media' && (
                    <button
                      onClick={() => setShowMediaConversionModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Newspaper className="w-4 h-4 inline mr-2" />
                      Convert to Media
                    </button>
                  )}
                  <button
                    onClick={onNavigateToCreate}
                    className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Create Post
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleFollow}
                    className={`px-4 py-2 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                      isFollowing
                        ? 'bg-slate-600 hover:bg-slate-500 text-white'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4 inline mr-2" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 inline mr-2" />
                        Follow
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-2xl font-bold text-slate-100">{getDisplayName()}</h1>
              {profile.is_verified && (
                <VerificationBadge
                  isVerified={true}
                  verificationType={profile.verification_type}
                  verificationReason={profile.verification_reason}
                  size="lg"
                />
              )}
            </div>
            
            {profile.username && (
              <p className="text-slate-400 mb-3">@{profile.username}</p>
            )}
            
            {profile.bio && (
              <p className="text-slate-300 mb-4 leading-relaxed">{profile.bio}</p>
            )}

            {/* Additional Info */}
            <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm mb-4">
              {profile.beliefs && (
                <div className="flex items-center space-x-1">
                  <span>🎯</span>
                  <span>{profile.beliefs}</span>
                </div>
              )}
              
              {profile.field && (
                <div className="flex items-center space-x-1">
                  <span>💼</span>
                  <span>{profile.field}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {formatJoinDate(profile.created_at)}</span>
              </div>
            </div>

            {/* Follow Stats */}
            {/* No follower/following stats shown - completely private */}

            {/* Media Profile Information */}
            {profile.profile_type === 'media' && (
              <div className="mt-6 space-y-4">
                {/* Trust Score */}
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center">
                        <Scale className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-slate-200 font-semibold">Trust Score</h3>
                        <p className="text-slate-400 text-xs">Weighted by voter maturity</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${
                        (profile.trust_score || 0) > 0 ? 'text-green-400' :
                        (profile.trust_score || 0) < 0 ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        {(profile.trust_score || 0) > 0 ? '+' : ''}{profile.trust_score || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Scope Declaration */}
                {(accountScopeCovers.length > 0 || accountScopeDoesNotCover.length > 0) && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Newspaper className="w-5 h-5 text-orange-400" />
                      <h3 className="text-slate-200 font-semibold">Account Scope Declaration</h3>
                    </div>

                    {/* What We Cover */}
                    {accountScopeCovers.length > 0 && (
                      <div>
                        <h4 className="text-green-400 font-medium text-sm mb-2 flex items-center space-x-2">
                          <span className="text-lg">✓</span>
                          <span>We Cover:</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {accountScopeCovers.map((topic, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-300 rounded-lg text-sm"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* What We Don't Cover */}
                    {accountScopeDoesNotCover.length > 0 && (
                      <div>
                        <h4 className="text-red-400 font-medium text-sm mb-2 flex items-center space-x-2">
                          <span className="text-lg">✗</span>
                          <span>We Don't Cover:</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {accountScopeDoesNotCover.map((item, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-sm"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-700/50 mb-6">
            <nav className="flex space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'posts'
                    ? 'border-slate-400 text-slate-200'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                Posts ({getTabCount('posts')})
              </button>

              <button
                onClick={() => setActiveTab('series')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-1 ${
                  activeTab === 'series'
                    ? 'border-teal-400 text-teal-300'
                    : 'border-transparent text-slate-500 hover:text-teal-300 hover:border-teal-600'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Series ({getTabCount('series')})</span>
              </button>

              {isOwnProfile && (
                <button
                  onClick={() => setActiveTab('reflections')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-1 ${
                    activeTab === 'reflections'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-500 hover:text-cyan-300 hover:border-cyan-600'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Reflections ({getTabCount('reflections')})</span>
                </button>
              )}

              {(isOwnProfile || shouldShowTab('respected')) && (
                <button
                  onClick={() => setActiveTab('respected')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-1 ${
                    activeTab === 'respected'
                      ? 'border-green-400 text-green-300'
                      : 'border-transparent text-slate-500 hover:text-green-300 hover:border-green-600'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span>Respected ({getTabCount('respected')})</span>
                </button>
              )}
              
              {(isOwnProfile || shouldShowTab('rejected')) && (
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-1 ${
                    activeTab === 'rejected'
                      ? 'border-red-400 text-red-300'
                      : 'border-transparent text-slate-500 hover:text-red-300 hover:border-red-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>Rejected ({getTabCount('rejected')})</span>
                </button>
              )}
              
              {(isOwnProfile || shouldShowTab('observed')) && (
                <button
                  onClick={() => setActiveTab('observed')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-1 ${
                    activeTab === 'observed'
                      ? 'border-blue-400 text-blue-300'
                      : 'border-transparent text-slate-500 hover:text-blue-300 hover:border-blue-600'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Observed ({getTabCount('observed')})</span>
                </button>
              )}

              {isOwnProfile && (
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-1 ${
                    activeTab === 'saved'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-slate-500 hover:text-amber-300 hover:border-amber-600'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Saved ({getTabCount('saved')})</span>
                </button>
              )}

              {(isOwnProfile || shouldShowTab('following')) && (
                <button
                  onClick={() => setActiveTab('following')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center space-x-1 ${
                    activeTab === 'following'
                      ? 'border-orange-400 text-orange-300'
                      : 'border-transparent text-slate-500 hover:text-orange-300 hover:border-orange-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Following ({getTabCount('following')})</span>
                </button>
              )}
            </nav>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'reflections' ? (
              userReflections.length > 0 ? (
                <div className="space-y-4">
                  {userReflections.map((reflection) => (
                    <div
                      key={reflection.id}
                      className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 hover:bg-slate-800/40 transition-all duration-300"
                    >
                      {reflection.is_anonymous ? (
                        <div className="mb-3 bg-slate-700/30 border border-slate-600/40 rounded-xl px-3 py-2 flex items-center space-x-2">
                          <span className="text-slate-500 text-xs italic">Posted anonymously — post context hidden</span>
                        </div>
                      ) : (
                        reflection.post && (
                          <button
                            onClick={() => setViewReflectionsPost(reflection.post)}
                            className="w-full text-left mb-3 p-3 bg-slate-800/50 border border-slate-700/40 rounded-xl hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all duration-200 group"
                          >
                            <div className="flex items-center space-x-2 mb-1.5">
                              <span className="text-slate-400 text-xs">Reflected on post by</span>
                              <span className="text-slate-300 text-xs font-medium">
                                {reflection.post.is_anonymous ? 'Anonymous' : reflection.post.author?.name || 'Unknown'}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                              {reflection.post.post_type === 'voice' ? 'Voice Note' : reflection.post.content}
                            </p>
                            <span className="text-cyan-500 text-xs group-hover:text-cyan-400 transition-colors mt-1 inline-block">
                              View all reflections →
                            </span>
                          </button>
                        )
                      )}
                      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{reflection.content}</p>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/30">
                        <span className="text-slate-500 text-xs">
                          {new Date(reflection.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </span>
                        {!reflection.is_anonymous && reflection.post && (
                          <button
                            onClick={() => setViewReflectionsPost(reflection.post)}
                            className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors text-xs"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Edit Reflection</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-600/20 to-teal-600/20 border border-cyan-500/20 rounded-2xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100 mb-2">No reflections yet</h3>
                  <p className="text-slate-400 text-lg">When you reflect on posts, they'll appear here.</p>
                </div>
              )
            ) : activeTab === 'series' ? (
              seriesList.length > 0 ? (
                <div className="space-y-6">
                  {seriesList.map((series) => (
                    <div key={series.id} className="relative group">
                      <PostSeriesCard
                        series={series}
                        currentUserId={currentUserId}
                        onProfileClick={handleProfileClick}
                        onDelete={handleDeleteSeries}
                      />
                      {isOwnProfile && (
                        <button
                          onClick={() => handleEditSeries(series.id)}
                          className="absolute top-4 right-14 opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 px-3 py-1.5 bg-teal-600/80 hover:bg-teal-600 text-white rounded-lg text-xs font-medium transition-all duration-200 backdrop-blur-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-teal-600/20 to-cyan-600/20 border border-teal-500/20 rounded-2xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-10 h-10 text-teal-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100 mb-2">No series yet</h3>
                  <p className="text-slate-400 text-lg">
                    {isOwnProfile ? 'Create your first post series!' : 'This user has no post series'}
                  </p>
                </div>
              )
            ) : activeTab === 'following' ? (
              followingUsers.length > 0 ? (
                <div className="space-y-4">
                  {followingUsers.map((follow: any) => (
                    <div
                      key={follow.following_id}
                      onClick={() => onProfileClick?.(follow.following.id)}
                      className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-2xl transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          {follow.following.profile_pic_url ? (
                            <img
                              src={follow.following.profile_pic_url}
                              alt={follow.following.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                              <User className="w-6 h-6 text-slate-200" />
                            </div>
                          )}
                          {follow.following.is_verified && (
                            <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                follow.following.verification_type === 'celebrity' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                follow.following.verification_type === 'government' ? 'bg-gradient-to-r from-slate-400 to-slate-500' :
                                'bg-gradient-to-r from-blue-500 to-blue-600'
                              }`}>
                                <span className="text-[10px]">✓</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-slate-200 font-semibold truncate">{follow.following.name}</h3>
                            {follow.following.profile_type === 'media' && (
                              <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded-md text-xs font-medium">
                                Media
                              </span>
                            )}
                          </div>
                          {follow.following.bio && (
                            <p className="text-slate-400 text-sm line-clamp-1">{follow.following.bio}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <Users className="w-10 h-10 text-slate-100" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100 mb-2">Not following anyone yet</h3>
                  <p className="text-slate-400 text-lg">
                    {isOwnProfile ? 'Start following users to see them here' : 'This user is not following anyone'}
                  </p>
                </div>
              )
            ) : (getCurrentPosts() as any[]).length > 0 ? (
              (getCurrentPosts() as any[]).map((post: any) => (
                <PostCard
                  key={post.id}
                  post={post as PostData}
                  currentUserId={currentUserId || undefined}
                  onSave={handleSave}
                  onReport={handleReport}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReact={handleReact}
                  onProfileClick={handleProfileClick}
                  onShowEditHistory={handleShowEditHistory}
                  onViewReflections={(p: any) => setViewReflectionsPost(p)}
                />
              ))
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="w-10 h-10 text-slate-100" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">
                  {activeTab === 'posts' ? 'No posts yet' : `No ${activeTab} posts`}
                </h3>
                <p className="text-slate-400 text-lg">
                  {isOwnProfile && activeTab === 'posts' 
                    ? 'Share your first post!' 
                    : `No ${activeTab} posts to show`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unfollow Confirmation Modal */}
      {showUnfollowConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl p-6 max-w-sm w-full border border-slate-700">
            <div className="text-center">
              <UserMinus className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-100 mb-2">Unfollow {getDisplayName()}?</h3>
              <p className="text-slate-400 mb-6">
                You won't see their posts in your feed anymore.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUnfollowConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnfollow}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all duration-300"
                >
                  Unfollow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Password Modal */}
      {showActionPasswordForProfile && (
        <ActionPassword
          onVerify={() => {
            setShowActionPasswordForProfile(false);
            if (pendingProfileAction) pendingProfileAction();
            setPendingProfileAction(null);
          }}
          onCancel={() => {
            setShowActionPasswordForProfile(false);
            setPendingProfileAction(null);
          }}
          title="Security Verification"
          description={`Please enter your action password to access ${profileProtectionType === 'settings' ? 'settings' : 'edit profile'}.`}
        />
      )}

      {/* Report Modal */}
      {showReportModal && profile && (
        <ReportModal
          targetType="user"
          targetId={profile.id}
          targetName={getDisplayName() || undefined}
          onClose={() => setShowReportModal(false)}
          onReport={handleReportUser}
        />
      )}

      {/* Media Profile Conversion Modal */}
      {showMediaConversionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl max-w-4xl w-full border border-orange-500/30 shadow-2xl my-8">
            {/* Header */}
            <div className="relative p-6 border-b border-slate-700/50 bg-gradient-to-r from-orange-600/20 to-red-600/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                    <Newspaper className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Convert to Media Profile</h2>
                    <p className="text-orange-300 text-sm mt-1">Transition from Freedom to Responsibility</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMediaConversionModal(false)}
                  className="p-2 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Formula */}
              <div className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-2xl p-6 border border-slate-600/50">
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-300 mb-4">Fundamental Principle</div>
                  <div className="flex items-center justify-center space-x-4 text-base sm:text-lg">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-blue-400" />
                      <span className="text-blue-400 font-bold">Normal Profile</span>
                    </div>
                    <span className="text-slate-500 font-bold">=</span>
                    <span className="text-slate-300 font-semibold">Freedom of Thought</span>
                  </div>
                  <div className="my-3 text-slate-500">vs</div>
                  <div className="flex items-center justify-center space-x-4 text-base sm:text-lg">
                    <div className="flex items-center space-x-2">
                      <Newspaper className="w-5 h-5 text-orange-400" />
                      <span className="text-orange-400 font-bold">Media Profile</span>
                    </div>
                    <span className="text-slate-500 font-bold">=</span>
                    <span className="text-slate-300 font-semibold">Social Responsibility</span>
                  </div>
                </div>
              </div>

              {/* Warnings Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="text-xl font-bold text-red-400">Critical Warnings</h3>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-red-400 font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-red-300 font-semibold text-lg">
                        Media Profiles are held to higher standards of accuracy and responsibility.
                      </p>
                      <p className="text-red-400/70 text-sm mt-2">
                        Every statement you make will be scrutinized under professional standards.
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-red-500/20"></div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-red-400 font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-red-300 font-semibold text-lg">
                        The transition is one-time, meaning you cannot return to a normal profile.
                      </p>
                      <p className="text-red-400/70 text-sm mt-2">
                        This is a permanent decision. Consider carefully before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privileges Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <h3 className="text-xl font-bold text-green-400">Media Profile Privileges</h3>
                </div>

                <div className="space-y-3">
                  {/* Trust Score */}
                  <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-5 hover:bg-slate-700/40 transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-100 mb-2">1. Trust Score</h4>
                        <ul className="space-y-2 text-slate-300 text-sm">
                          <li className="flex items-start space-x-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>Trust is measured and displayed publicly</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>Long-term reputation is formed based on accuracy</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-orange-400 mt-1">⚠</span>
                            <span className="text-orange-300"><strong>Responsibility:</strong> Every post affects your reputation</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right to Correction */}
                  <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-5 hover:bg-slate-700/40 transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileEdit className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-100 mb-2">2. Right to Correction</h4>
                        <p className="text-slate-400 text-sm mb-3">With mandatory transparency</p>
                        <ul className="space-y-2 text-slate-300 text-sm">
                          <li className="flex items-start space-x-2">
                            <span className="text-amber-400 mt-1">•</span>
                            <span>Media Profile posts CAN be edited</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-amber-400 mt-1">•</span>
                            <span>Edit history is ALWAYS public and visible</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-amber-400 mt-1">•</span>
                            <span>A "Correction issued" label appears automatically</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Source Field */}
                  <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-5 hover:bg-slate-700/40 transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Link2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-100 mb-2">3. Source Field</h4>
                        <p className="text-slate-400 text-sm mb-3">Optional but encouraged</p>
                        <ul className="space-y-2 text-slate-300 text-sm">
                          <li className="flex items-start space-x-2">
                            <span className="text-green-400 mt-1">•</span>
                            <span>Source field is open by default in every post</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-green-400 mt-1">•</span>
                            <span>Can be a link or text reference</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-orange-400 mt-1">⚠</span>
                            <span className="text-orange-300">If left empty: "No source provided" label appears</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Stronger Report Impact */}
                  <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-5 hover:bg-slate-700/40 transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ShieldAlert className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-100 mb-2">4. Stronger Report Impact</h4>
                        <ul className="space-y-2 text-slate-300 text-sm">
                          <li className="flex items-start space-x-2">
                            <span className="text-red-400 mt-1">•</span>
                            <span>Reports made on Media Profiles enter the queue faster</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-red-400 mt-1">•</span>
                            <span>Prioritized in the "Court system"</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-orange-400 mt-1">⚠</span>
                            <span className="text-orange-300"><strong>Why:</strong> Media error = impact on society</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Account Scope Declaration */}
                  <div className="bg-slate-700/30 border border-slate-600/50 rounded-2xl p-5 hover:bg-slate-700/40 transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Scale className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-100 mb-2">5. Account Scope Declaration</h4>
                        <p className="text-slate-400 text-sm mb-3">Responsibility Statement</p>
                        <ul className="space-y-2 text-slate-300 text-sm">
                          <li className="flex items-start space-x-2">
                            <span className="text-purple-400 mt-1">•</span>
                            <span>Media Profile clearly declares its scope of authority</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-purple-400 mt-1">•</span>
                            <span>Defines areas of expertise and coverage</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-purple-400 mt-1">•</span>
                            <span>Transparent about limitations and biases</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700/50 bg-slate-800/50">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="text-slate-400 text-sm text-center sm:text-left">
                  <p>This action cannot be undone. Please read carefully.</p>
                </div>
                <div className="flex space-x-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowMediaConversionModal(false)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowMediaConversionModal(false);
                      setShowAccountScopeDeclaration(true);
                    }}
                    className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105"
                  >
                    I Understand, Convert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;