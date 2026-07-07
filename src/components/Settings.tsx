import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Users, EyeOff, Settings as SettingsIcon, Smartphone, Monitor, Tablet, Globe, Clock, X, LogOut, Flag, HelpCircle, MessageSquare, FileText, Lock, BookOpen, Info, TrendingUp, Database, UserX, Award, CheckCircle, AlertCircle, Ban, VolumeX, ShieldAlert, Layers, Bot, Accessibility, Copyright } from 'lucide-react';
import { deleteSession, cleanupOldSessions } from '../services/sessionService';
import { supabase } from '../lib/supabase';
import { sanitizeExportData, logSecurityEvent, checkRateLimit } from '../services/securityService';
import Feedback from './Feedback';
import TOS from './TOS';
import PP from './PP';
import CS from './CS';
import CP from './CP';
import FAQ from './FAQ';
import ActionPassword from './ActionPassword';

interface ProfileData {
  id: string;
  show_following?: boolean;
  show_respected_posts?: boolean;
  show_rejected_posts?: boolean;
  show_observed_posts?: boolean;
  notifications_enabled?: boolean;
  is_admin?: boolean;
  account_status?: 'active' | 'limited';
  [key: string]: any;
}

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  blocked_user: {
    id: string;
    name: string;
    username?: string;
    profile_pic_url?: string;
  } | null;
}

interface MutedUser {
  id: string;
  muted_id: string;
  created_at: string;
  muted_user: {
    id: string;
    name: string;
    username?: string;
    profile_pic_url?: string;
  } | null;
}

interface ReportedUser {
  id: string;
  reported_id: string;
  reason: string;
  report_type: string;
  description?: string;
  status: string;
  created_at: string;
  reported_user: {
    id: string;
    name: string;
    username?: string;
    profile_pic_url?: string;
  } | null;
}

interface ReportedPost {
  id: string;
  post_id: string;
  reported_user_id: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  post: {
    id: string;
    content: string;
    post_type: string;
    is_anonymous: boolean;
    created_at: string;
  } | null;
  reported_user: {
    id: string;
    name: string;
    username?: string;
    profile_pic_url?: string;
  } | null;
}

export interface MutedWord {
  id: string;
  word: string;
  created_at: string;
}

interface UserSession {
  id: string;
  device_name: string;
  location: string;
  ip_address?: string;
  user_agent?: string;
  last_active: string;
  created_at: string;
}

interface SettingsProps {
  onBack: () => void;
  onProfileUpdated?: () => void;
  onLogout?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack, onProfileUpdated, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'privacy' | 'security' | 'moderation' | 'content' | 'sessions' | 'support'>('info');
  const [moderationSubTab, setModerationSubTab] = useState<'blocked' | 'muted' | 'reported'>('blocked');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedUser[]>([]);
  const [mutedAccounts, setMutedAccounts] = useState<MutedUser[]>([]);
  const [reportedUsers, setReportedUsers] = useState<ReportedUser[]>([]);
  const [reportedPosts, setReportedPosts] = useState<ReportedPost[]>([]);
  const [reportedSubTab, setReportedSubTab] = useState<'users' | 'posts'>('users');
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Action Password State
  const [hasActionPassword, setHasActionPassword] = useState(false);
  const [actionPasswordStep, setActionPasswordStep] = useState<'none' | 'create' | 'confirm' | 'settings'>('none');
  const [tempPassword, setTempPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [protectedActions, setProtectedActions] = useState({
    login: false,
    createPost: false,
    editProfile: false,
    settings: false,
    deleteAccount: true // Always on
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTOS, setShowTOS] = useState(false);
  const [showPP, setShowPP] = useState(false);
  const [showCS, setShowCS] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showCP, setShowCP] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSelections, setExportSelections] = useState({
    profile: true,
    posts: true,
    reactions: true,
    follows: true,
    savedPosts: true,
    sessions: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const [hideAiPosts, setHideAiPosts] = useState(false);
  const [mixedFeed, setMixedFeed] = useState(true);
  const [interestCategories, setInterestCategories] = useState<string[]>([]);
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [showActionPasswordForDelete, setShowActionPasswordForDelete] = useState(false);
  const [showActionPasswordForSettings, setShowActionPasswordForSettings] = useState(false);
  const [showActionPasswordForDisable, setShowActionPasswordForDisable] = useState(false);
  const [showActionPasswordForChange, setShowActionPasswordForChange] = useState(false);
  const [showActionPasswordForToggle, setShowActionPasswordForToggle] = useState<{id: string, newSettings: any} | null>(null);
  const [pendingSettingsTab, setPendingSettingsTab] = useState<any>(null);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        return;
      }
      
      // Clear any local storage data
      localStorage.clear();
      
      // Call the logout callback if provided
      onLogout?.();
    } catch (error) {
      console.error('Error in handleLogout:', error);
    }
  };

  useEffect(() => {
    loadSettings();

    const channel = supabase
      .channel('reports_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_reports' },
        () => { loadSettings(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reports' },
        () => { loadSettings(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      setCurrentUserId(user.id);

      // Load profile settings
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
      setHideAiPosts(profileData?.hide_ai_posts ?? false);
      setMixedFeed(profileData?.mixed_feed ?? true);
      setInterestCategories(profileData?.interest_categories ?? []);
      setExcludedCategories(profileData?.excluded_categories ?? []);
      
      // Load action password settings
      if (profileData) {
        setHasActionPassword(!!profileData.action_password_hash);
        if (profileData.action_password_settings) {
          setProtectedActions(profileData.action_password_settings);
        }
      }

      const { data: reportedData, error: reportedError } = await supabase
        .from('user_reports')
        .select(`
          *,
          reported_user:profiles!user_reports_reported_id_fkey (
            id,
            name,
            username,
            profile_pic_url
          )
        `)
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (reportedError) {
        setReportedUsers([]);
      } else {
        setReportedUsers((reportedData || []).map(item => ({
          id: item.id,
          reported_id: item.reported_id,
          reason: item.reason,
          report_type: item.report_type || 'general',
          description: item.description,
          status: item.status || 'pending',
          created_at: item.created_at,
          reported_user: item.reported_user
        })));
      }

      const { data: postReportsData, error: postReportsError } = await supabase
        .from('post_reports')
        .select(`
          *,
          post:posts!post_reports_post_id_fkey (
            id,
            content,
            post_type,
            is_anonymous,
            created_at
          ),
          reported_user:profiles!post_reports_reported_user_id_fkey (
            id,
            name,
            username,
            profile_pic_url
          )
        `)
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (postReportsError) {
        setReportedPosts([]);
      } else {
        setReportedPosts((postReportsData || []).map(item => ({
          id: item.id,
          post_id: item.post_id,
          reported_user_id: item.reported_user_id,
          reason: item.reason,
          description: item.description,
          status: item.status || 'pending',
          created_at: item.created_at,
          post: item.post,
          reported_user: item.reported_user
        })));
      }

      const { data: blockedData, error: blockedError } = await supabase
        .from('blocked_users')
        .select(`
          *,
          blocked_user:profiles!blocked_users_blocked_id_fkey (
            id,
            name,
            username,
            profile_pic_url
          )
        `)
        .eq('blocker_id', user.id);

      if (blockedError) {
        setBlockedAccounts([]);
      } else {
        setBlockedAccounts((blockedData || []).map(item => ({
          id: item.id,
          blocked_id: item.blocked_id,
          created_at: item.created_at,
          blocked_user: item.blocked_user
        })));
      }

      const { data: mutedData, error: mutedError } = await supabase
        .from('muted_users')
        .select(`
          *,
          muted_user:profiles!muted_users_muted_id_fkey (
            id,
            name,
            username,
            profile_pic_url
          )
        `)
        .eq('muter_id', user.id);

      if (mutedError) {
        setMutedAccounts([]);
      } else {
        setMutedAccounts((mutedData || []).map(item => ({
          id: item.id,
          muted_id: item.muted_id,
          created_at: item.created_at,
          muted_user: item.muted_user
        })));
      }
      // Load user sessions
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active', { ascending: false });

      console.log('📱 Loaded sessions:', sessionsData);
      setUserSessions(sessionsData || []);

      // Load user stats for Info tab
      const { data: postsData } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', user.id);

      // Get reactions FROM other users TO current user's posts
      const postIds = postsData?.map(p => p.id) || [];
      let communityReactionsData: any[] = [];

      if (postIds.length > 0) {
        const { data: reactions } = await supabase
          .from('post_reactions')
          .select('reaction_type, user_id')
          .in('post_id', postIds)
          .neq('user_id', user.id);

        communityReactionsData = reactions || [];
      }

      const { data: followersData } = await supabase
        .from('follows')
        .select('id')
        .eq('following_id', user.id);

      const { data: followingData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id);

      // Calculate community response
      const respectCount = communityReactionsData.filter(r => r.reaction_type === 'respect').length;
      const rejectCount = communityReactionsData.filter(r => r.reaction_type === 'reject').length;
      const observeCount = communityReactionsData.filter(r => r.reaction_type === 'observe').length;
      const totalReactions = respectCount + rejectCount + observeCount;

      let communityResponse = 'low activity';
      if (totalReactions >= 5) {
        if (respectCount > rejectCount && respectCount > observeCount) {
          communityResponse = 'mostly respected';
        } else if (rejectCount > respectCount && rejectCount > observeCount) {
          communityResponse = 'often rejected';
        } else {
          communityResponse = 'mixed reactions';
        }
      }

      setUserStats({
        postsCount: postsData?.length || 0,
        communityResponse,
        followersCount: followersData?.length || 0,
        followingCount: followingData?.length || 0
      });

    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfileSetting = async (field: string, value: any) => {
    if (!currentUserId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', currentUserId);

      if (error) {
        console.error('Error updating profile:', error);
        return;
      }

      setProfile((prev: any) => ({ ...prev, [field]: value }));
      onProfileUpdated?.();
    } catch (error) {
      console.error('Error in updateProfileSetting:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnblockUser = async (blockedUserId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', blockedUserId);

      if (error) {
        console.error('Error unblocking user:', error);
        return;
      }

      setBlockedAccounts(prev => prev.filter(account => account.blocked_id !== blockedUserId));
    } catch (error) {
      console.error('Error in handleUnblockUser:', error);
    }
  };

  const handleUnmuteUser = async (mutedUserId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('muted_users')
        .delete()
        .eq('muter_id', currentUserId)
        .eq('muted_id', mutedUserId);

      if (error) {
        console.error('Error unmuting user:', error);
        return;
      }

      setMutedAccounts(prev => prev.filter(account => account.muted_id !== mutedUserId));
    } catch (error) {
      console.error('Error in handleUnmuteUser:', error);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      const success = await deleteSession(sessionId);
      if (success) {
        setUserSessions(prev => prev.filter(session => session.id !== sessionId));
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const handleCleanupOldSessions = async () => {
    if (!currentUserId) return;

    try {
      await cleanupOldSessions(currentUserId);
      // Reload sessions after cleanup
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', currentUserId)
        .order('last_active', { ascending: false });

      setUserSessions(sessionsData || []);
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
  };

  const handleExportData = async () => {
    if (!currentUserId) return;

    setIsExporting(true);
    try {
      // Check rate limit (max 3 exports per hour)
      const canExport = await checkRateLimit(currentUserId, 'data_export', 3, 60);
      if (!canExport) {
        alert('Too many export requests. Please try again in an hour.');
        setIsExporting(false);
        return;
      }

      // Log security event
      await logSecurityEvent(currentUserId, {
        eventType: 'data_export_initiated',
        eventDetails: {
          selections: Object.keys(exportSelections).filter(key => exportSelections[key as keyof typeof exportSelections])
        }
      });

      const exportData: any = {};

      // Export profile data
      if (exportSelections.profile) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, name, bio, profile_pic_url, cover_pic_url, beliefs, field, profile_type, trust_score, is_verified, created_at, updated_at')
          .eq('id', currentUserId)
          .single();
        exportData.profile = profileData;
      }

      // Export posts
      if (exportSelections.posts) {
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, content, post_type, quote_signature, perspective_lock, source_type, source_description, created_at, updated_at')
          .eq('author_id', currentUserId)
          .order('created_at', { ascending: false });
        exportData.posts = postsData;
      }

      // Export reactions given
      if (exportSelections.reactions) {
        const { data: reactionsData } = await supabase
          .from('post_reactions')
          .select('reaction_type, created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false });
        exportData.reactions = reactionsData;
      }

      // Export follows
      if (exportSelections.follows) {
        const { data: followersData } = await supabase
          .from('follows')
          .select('created_at')
          .eq('following_id', currentUserId);

        const { data: followingData } = await supabase
          .from('follows')
          .select('created_at')
          .eq('follower_id', currentUserId);

        exportData.follows = {
          followers_count: followersData?.length || 0,
          following_count: followingData?.length || 0
        };
      }

      // Export saved posts
      if (exportSelections.savedPosts) {
        const { data: savedData } = await supabase
          .from('saved_posts')
          .select('created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false });
        exportData.savedPosts = savedData;
      }

      // Export sessions
      if (exportSelections.sessions) {
        const { data: sessionsData } = await supabase
          .from('user_sessions')
          .select('device_name, location, last_active, created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false });
        exportData.sessions = sessionsData;
      }

      // Sanitize the export data
      const sanitizedData = sanitizeExportData(exportData);

      // Add export metadata
      const finalExport = {
        export_date: new Date().toISOString(),
        user_id: currentUserId,
        data: sanitizedData
      };

      // Create JSON file
      const jsonString = JSON.stringify(finalExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `fract_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log successful export
      await logSecurityEvent(currentUserId, {
        eventType: 'data_export_completed',
        eventDetails: { success: true }
      });

      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting data:', error);

      // Log failed export
      if (currentUserId) {
        await logSecurityEvent(currentUserId, {
          eventType: 'data_export_failed',
          eventDetails: { error: String(error) }
        });
      }

      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', currentUserId);

      if (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account. Please try again.');
        return;
      }

      await supabase.auth.signOut();
      localStorage.clear();
      onLogout?.();
    } catch (error) {
      console.error('Error in handleDeleteAccount:', error);
      alert('An error occurred while deleting your account. Please try again later.');
    }
  };

  const getDeviceIcon = (deviceName: string) => {
    const device = deviceName.toLowerCase();
    if (device.includes('iphone') || device.includes('android')) {
      return <Smartphone className="w-5 h-5" />;
    } else if (device.includes('ipad') || device.includes('tablet')) {
      return <Tablet className="w-5 h-5" />;
    } else {
      return <Monitor className="w-5 h-5" />;
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Active now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSaveContentPreferences = async (
    patch: Partial<{
      hide_ai_posts: boolean;
      mixed_feed: boolean;
      interest_categories: string[];
      excluded_categories: string[];
    }>
  ) => {
    if (!currentUserId) return;
    setIsSavingContent(true);
    try {
      await supabase.from('profiles').update(patch).eq('id', currentUserId);
      if (patch.hide_ai_posts !== undefined) setHideAiPosts(patch.hide_ai_posts);
      if (patch.mixed_feed !== undefined) setMixedFeed(patch.mixed_feed);
      if (patch.interest_categories !== undefined) setInterestCategories(patch.interest_categories);
      if (patch.excluded_categories !== undefined) setExcludedCategories(patch.excluded_categories);
    } catch (error) {
      console.error('Error saving content preferences:', error);
    } finally {
      setIsSavingContent(false);
    }
  };

  if (showFeedback) {
    return <Feedback onBack={() => setShowFeedback(false)} />;
  }

  if (showTOS) {
    return <TOS onBack={() => setShowTOS(false)} />;
  }

  if (showPP) {
    return <PP onBack={() => setShowPP(false)} />;
  }

  if (showCS) {
    return <CS onBack={() => setShowCS(false)} />;
  }

  if (showFAQ) {
    return <FAQ onBack={() => setShowFAQ(false)} />;
  }

  if (showCP) {
    return <CP onBack={() => setShowCP(false)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-slate-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-400">Loading settings...</div>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'info', label: 'Info', icon: Info, beta: false },
    { id: 'privacy', label: 'Privacy', icon: Shield, beta: false },
    { id: 'security', label: 'Security', icon: Lock, beta: false },
    { id: 'moderation', label: 'Moderation', icon: ShieldAlert, beta: false },
    { id: 'content', label: 'Content', icon: Layers, beta: true },
    { id: 'sessions', label: 'Sessions', icon: SettingsIcon, beta: false },
    { id: 'support', label: 'Support & Help', icon: HelpCircle, beta: false },
  ];

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
              <h1 className="text-xl font-bold text-slate-100">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-slate-800/50 rounded-2xl p-1 overflow-x-auto">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={async () => {
                    if (tab.id === 'security' && hasActionPassword && protectedActions.settings) {
                      setPendingSettingsTab(tab.id);
                      setShowActionPasswordForSettings(true);
                      return;
                    }
                    setActiveTab(tab.id as any);
                  }}
                  className={`relative flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-slate-600 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tab.label}</span>
                  {tab.beta && (
                    <span className="ml-1 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold rounded-md tracking-wide leading-none">
                      BETA
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Account Information</h2>

            {/* Account Status */}
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">Account Status</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Current State</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      profile?.account_status === 'limited'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {profile?.account_status === 'limited' ? 'Limited' : 'Active'}
                    </span>
                  </div>
                  {profile?.account_status === 'limited' && (
                    <p className="text-amber-400 text-xs mt-2">
                      Some posts have reduced visibility due to policy.
                    </p>
                  )}
                </div>

                <div className="p-4 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Account Type</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      profile?.profile_type === 'media'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {profile?.profile_type === 'media' ? 'Media' : 'Personal'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Verification Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      profile?.is_verified
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {profile?.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>

                {profile?.profile_type === 'media' && (
                  <div className="p-4 bg-slate-700/30 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">Trust Score</span>
                      <span className={`text-lg font-bold ${
                        (profile?.trust_score || 0) > 0 ? 'text-green-400' :
                        (profile?.trust_score || 0) < 0 ? 'text-red-400' : 'text-slate-100'
                      }`}>
                        {(profile?.trust_score || 0) > 0 ? '+' : ''}{profile?.trust_score || 0}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs">Weighted by voter account maturity</p>
                    <div className="w-full bg-slate-600/50 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          (profile?.trust_score || 0) >= 0
                            ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                            : 'bg-gradient-to-r from-red-500 to-red-400'
                        }`}
                        style={{ width: `${Math.min(Math.abs(profile?.trust_score || 0) / 10, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="p-4 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Member Since</span>
                    <span className="text-slate-100 text-sm font-medium">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Reputation Snapshot */}
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">Reputation Snapshot</h3>
              </div>

              <div className="p-6 bg-gradient-to-br from-slate-700/30 to-slate-800/20 rounded-xl border border-slate-600/50">
                <div className="flex items-center space-x-3 mb-3">
                  <Award className="w-6 h-6 text-amber-400" />
                  <h4 className="text-lg font-semibold text-slate-200">Overall Community Response</h4>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-4 py-2 rounded-full text-base font-bold ${
                    userStats?.communityResponse === 'mostly respected'
                      ? 'bg-green-500/20 text-green-400 border border-green-700/50'
                      : userStats?.communityResponse === 'often rejected'
                      ? 'bg-red-500/20 text-red-400 border border-red-700/50'
                      : userStats?.communityResponse === 'mixed reactions'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-700/50'
                      : 'bg-slate-500/20 text-slate-400 border border-slate-700/50'
                  }`}>
                    {userStats?.communityResponse || 'low activity'}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-4">
                  Based on how other users react to your posts
                </p>
              </div>
            </div>

            {/* Data Ownership */}
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">Data Ownership</h3>
              </div>

              <div className="space-y-4">
                <p className="text-slate-300 leading-relaxed">
                  You own all content you create on FRACT. We provide tools to manage and export your data.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl border border-slate-600 hover:border-slate-500 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-3">
                      <Database className="w-5 h-5 text-blue-400" />
                      <div className="text-left">
                        <div className="text-slate-200 font-semibold">Export Your Data</div>
                        <div className="text-slate-400 text-sm">Download all your content</div>
                      </div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>

                  <button
                    onClick={() => setShowPP(true)}
                    className="flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl border border-slate-600 hover:border-slate-500 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-3">
                      <Lock className="w-5 h-5 text-amber-400" />
                      <div className="text-left">
                        <div className="text-slate-200 font-semibold">Privacy Policy</div>
                        <div className="text-slate-400 text-sm">How we handle your data</div>
                      </div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                </div>

                <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      <strong>Your Rights:</strong> You can access, correct, or delete your personal data at any time. See our Privacy Policy for details.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delete Account */}
            <div className="bg-red-900/20 backdrop-blur-sm border border-red-700/50 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center">
                  <UserX className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">Delete Account</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-300">
                      <strong>Warning:</strong> This action is permanent and cannot be undone. All your posts, interactions, and account data will be permanently deleted.
                    </div>
                  </div>
                </div>

                <div className="text-slate-300 space-y-2 text-sm">
                  <p><strong>What will be deleted:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
                    <li>Your profile and account information</li>
                    <li>All posts, comments, and corrections</li>
                    <li>Your followers and following lists</li>
                    <li>All interactions (respects, rejects, observations)</li>
                    <li>Session data and account history</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    if (hasActionPassword && protectedActions.deleteAccount) {
                      setShowActionPasswordForDelete(true);
                    } else {
                      setShowDeleteAccountConfirm(true);
                    }
                  }}
                  className="w-full px-6 py-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
                >
                  <UserX className="w-5 h-5" />
                  <span>Delete My Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Settings */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Privacy Settings</h2>
            
            <div className="space-y-4">
              {/* Show Respected Posts */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700">
                <div>
                  <h3 className="text-slate-200 font-medium">Show Respected Posts</h3>
                  <p className="text-slate-400 text-sm">Allow others to see posts you've respected</p>
                </div>
                <button
                  onClick={() => updateProfileSetting('show_respected_posts', !profile?.show_respected_posts)}
                  disabled={isSaving}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    profile?.show_respected_posts ? 'bg-green-500' : 'bg-slate-600'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                    profile?.show_respected_posts ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Show Rejected Posts */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700">
                <div>
                  <h3 className="text-slate-200 font-medium">Show Rejected Posts</h3>
                  <p className="text-slate-400 text-sm">Allow others to see posts you've rejected</p>
                </div>
                <button
                  onClick={() => updateProfileSetting('show_rejected_posts', !profile?.show_rejected_posts)}
                  disabled={isSaving}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    profile?.show_rejected_posts ? 'bg-red-500' : 'bg-slate-600'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                    profile?.show_rejected_posts ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Show Observed Posts */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700">
                <div>
                  <h3 className="text-slate-200 font-medium">Show Observed Posts</h3>
                  <p className="text-slate-400 text-sm">Allow others to see posts you've observed</p>
                </div>
                <button
                  onClick={() => updateProfileSetting('show_observed_posts', !profile?.show_observed_posts)}
                  disabled={isSaving}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    profile?.show_observed_posts ? 'bg-blue-500' : 'bg-slate-600'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                    profile?.show_observed_posts ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Security</h2>
            <p className="text-slate-400 text-sm mb-6">Manage your account security and action protection</p>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                    <Lock className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100">Action Password</h3>
                    <p className="text-slate-400 text-sm">Protect sensitive actions with a secondary password</p>
                  </div>
                </div>
                {!hasActionPassword && actionPasswordStep === 'none' && (
                  <button
                    onClick={() => setActionPasswordStep('create')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Setup
                  </button>
                )}
              </div>

              {/* Setup Flow */}
              {actionPasswordStep === 'create' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Create Action Password</label>
                    <input
                      type="password"
                      value={tempPassword}
                      onChange={(e) => {
                        setTempPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Minimum 10 characters"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <p className="text-slate-500 text-xs mt-2">
                      Requirements: Minimum 10 characters. Avoid common passwords like "password123". Passphrases are recommended.
                    </p>
                  </div>
                  {passwordError && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {passwordError}</p>}
                  <div className="flex justify-end space-x-3">
                    <button onClick={() => {setActionPasswordStep('none'); setTempPassword(''); setPasswordError('');}} className="px-4 py-2 text-slate-400 hover:text-slate-200">Cancel</button>
                    <button
                      onClick={async () => {
                        const weakPasswords = ['password123', '1234567890', 'qwertyuiop', 'actionpassword'];
                        if (tempPassword.length < 10) {
                          setPasswordError('Password must be at least 10 characters long.');
                        } else if (weakPasswords.includes(tempPassword.toLowerCase())) {
                          setPasswordError('This password is too weak. Please choose a more secure one.');
                        } else {
                          setActionPasswordStep('confirm');
                          setPasswordError('');
                        }
                      }}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {actionPasswordStep === 'confirm' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Action Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Re-enter password"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  {passwordError && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {passwordError}</p>}
                  <div className="flex justify-end space-x-3">
                    <button onClick={() => setActionPasswordStep('create')} className="px-4 py-2 text-slate-400 hover:text-slate-200">Back</button>
                    <button
                      onClick={async () => {
                        if (confirmPassword !== tempPassword) {
                          setPasswordError('Passwords do not match.');
                        } else {
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-action-password`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session?.access_token}`,
                                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                              },
                              body: JSON.stringify({ action: 'set', password: confirmPassword })
                            });
                            
                            const result = await response.json();
                            if (result.success) {
                              setHasActionPassword(true);
                              setActionPasswordStep('settings');
                              setPasswordError('');
                            } else {
                              // Filter out database-level error messages that might contain field names
                              const errorStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
                              const userFriendlyError = errorStr?.includes('action_password_hash') 
                                ? 'Failed to set action password. Please try again later.'
                                : errorStr || 'Failed to set action password.';
                              setPasswordError(userFriendlyError);
                            }
                          } catch (err) {
                            console.error(err);
                            setPasswordError('An error occurred.');
                          }
                        }
                      }}
                      className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
                    >
                      Finish Setup
                    </button>
                  </div>
                </div>
              )}

              {/* Settings View */}
              {(hasActionPassword || actionPasswordStep === 'settings') && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="pt-4 border-t border-slate-700/50">
                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Protected Actions</h4>
                    <div className="space-y-3">
                      {[
                        { id: 'login', label: 'Login', description: 'Require password when signing in' },
                        { id: 'createPost', label: 'Create Post', description: 'Require password to publish a new post' },
                        { id: 'editProfile', label: 'Edit Profile', description: 'Require password to change profile details' },
                        { id: 'settings', label: 'Settings', description: 'Require password to access security settings' },
                        { id: 'deleteAccount', label: 'Delete Account', description: 'Always protected for your security', required: true },
                      ].map((action) => (
                        <div key={action.id} className="flex items-center justify-between p-4 bg-slate-700/20 rounded-xl border border-slate-700/50">
                          <div>
                            <h5 className="text-slate-200 font-medium">{action.label}</h5>
                            <p className="text-slate-400 text-xs">{action.description}</p>
                          </div>
                          <button
                            onClick={async () => {
                              if (!action.required) {
                                const newSettings = {
                                  ...protectedActions,
                                  [action.id]: !protectedActions[action.id as keyof typeof protectedActions]
                                };
                                setShowActionPasswordForToggle({ id: action.id, newSettings });
                              }
                            }}
                            disabled={action.required}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                              protectedActions[action.id as keyof typeof protectedActions] ? 'bg-indigo-500' : 'bg-slate-600'
                            } ${action.required ? 'opacity-80 cursor-not-allowed' : ''}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                              protectedActions[action.id as keyof typeof protectedActions] ? 'left-7' : 'left-1'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4">
                    <button
                      onClick={() => setShowActionPasswordForDisable(true)}
                      className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                    >
                      Disable Action Password
                    </button>
                    <button
                      className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                      onClick={() => setShowActionPasswordForChange(true)}
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Moderation */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Moderation</h2>
            <p className="text-slate-400 text-sm mb-6">Manage blocked, muted, and reported users</p>

            <div className="flex space-x-1 bg-slate-800/60 rounded-xl p-1 mb-6">
              {[
                { id: 'blocked', label: 'Blocked', icon: Ban, count: blockedAccounts.length },
                { id: 'muted', label: 'Muted', icon: VolumeX, count: mutedAccounts.length },
                { id: 'reported', label: 'Reported', icon: Flag, count: reportedUsers.length },
              ].map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setModerationSubTab(sub.id as any)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      moderationSubTab === sub.id
                        ? 'bg-slate-600 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
                  >
                    <SubIcon className="w-4 h-4" />
                    <span>{sub.label}</span>
                    {sub.count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        moderationSubTab === sub.id ? 'bg-slate-500 text-slate-200' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {sub.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {moderationSubTab === 'blocked' && (
              <div className="space-y-4">
                <p className="text-slate-500 text-xs">Blocked users cannot see your profile, posts, or interact with you in any way. You also won't see theirs.</p>
                {blockedAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {blockedAccounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                            {account.blocked_user?.profile_pic_url ? (
                              <img
                                src={account.blocked_user.profile_pic_url}
                                alt={account.blocked_user.name || 'User'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                <span className="text-slate-300 font-bold">
                                  {account.blocked_user?.name?.charAt(0) || account.blocked_id.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-slate-200 font-medium">
                              {account.blocked_user?.name || `User ${account.blocked_id.slice(0, 8)}`}
                            </h3>
                            {account.blocked_user?.username && (
                              <p className="text-slate-400 text-sm">@{account.blocked_user.username}</p>
                            )}
                            <p className="text-slate-500 text-xs">
                              Blocked {new Date(account.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblockUser(account.blocked_id)}
                          className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-all duration-300"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Ban className="w-14 h-14 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-300 mb-1">No blocked users</h3>
                    <p className="text-slate-500 text-sm">You haven't blocked anyone yet</p>
                  </div>
                )}
              </div>
            )}

            {moderationSubTab === 'muted' && (
              <div className="space-y-4">
                <p className="text-slate-500 text-xs">Muted users' posts won't appear in your feed. They can still see your content and won't know they're muted.</p>
                {mutedAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {mutedAccounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                            {account.muted_user?.profile_pic_url ? (
                              <img
                                src={account.muted_user.profile_pic_url}
                                alt={account.muted_user.name || 'User'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                <span className="text-slate-300 font-bold">
                                  {account.muted_user?.name?.charAt(0) || account.muted_id.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-slate-200 font-medium">
                              {account.muted_user?.name || `User ${account.muted_id.slice(0, 8)}`}
                            </h3>
                            {account.muted_user?.username && (
                              <p className="text-slate-400 text-sm">@{account.muted_user.username}</p>
                            )}
                            <p className="text-slate-500 text-xs">
                              Muted {new Date(account.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnmuteUser(account.muted_id)}
                          className="px-4 py-2 bg-amber-600/80 hover:bg-amber-500 text-white text-sm font-medium rounded-xl transition-all duration-300"
                        >
                          Unmute
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <VolumeX className="w-14 h-14 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-300 mb-1">No muted users</h3>
                    <p className="text-slate-500 text-sm">You haven't muted anyone yet</p>
                  </div>
                )}
              </div>
            )}

            {moderationSubTab === 'reported' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 text-xs">Content you've reported for violating community guidelines.</p>
                  <button
                    onClick={() => loadSettings()}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded-lg transition-all duration-300"
                  >
                    Refresh
                  </button>
                </div>

                <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl">
                  <button
                    onClick={() => setReportedSubTab('users')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      reportedSubTab === 'users'
                        ? 'bg-slate-700 text-slate-100 shadow-sm'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Users</span>
                    {reportedUsers.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-slate-600/60 text-slate-300 text-xs rounded-md">
                        {reportedUsers.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setReportedSubTab('posts')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      reportedSubTab === 'posts'
                        ? 'bg-slate-700 text-slate-100 shadow-sm'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Posts</span>
                    {reportedPosts.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-slate-600/60 text-slate-300 text-xs rounded-md">
                        {reportedPosts.length}
                      </span>
                    )}
                  </button>
                </div>

                {reportedSubTab === 'users' && (
                  <>
                    {reportedUsers.length > 0 ? (
                      <div className="space-y-3">
                        {reportedUsers.map((report) => (
                          <div key={report.id} className="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                            <div className="flex items-start space-x-4">
                              <div className="w-11 h-11 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                                {report.reported_user?.profile_pic_url ? (
                                  <img
                                    src={report.reported_user.profile_pic_url}
                                    alt={report.reported_user.name || 'User'}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                    <span className="text-slate-300 font-bold">
                                      {report.reported_user?.name?.charAt(0) || report.reported_id.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-slate-200 font-semibold">
                                    {report.reported_user?.name || `User ${report.reported_id.slice(0, 8)}`}
                                  </h3>
                                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                    report.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                                    report.status === 'upheld' ? 'bg-yellow-500/20 text-yellow-400' :
                                    report.status === 'dismissed' ? 'bg-red-500/20 text-red-400' :
                                    'bg-slate-500/20 text-slate-400'
                                  }`}>
                                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                  </span>
                                </div>
                                {report.reported_user?.username && (
                                  <p className="text-slate-400 text-sm mb-2">@{report.reported_user.username}</p>
                                )}
                                <div className="space-y-1.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-slate-500 text-sm">Category:</span>
                                    <span className="text-slate-300 text-sm font-medium">
                                      {report.report_type.replace('_', ' ').charAt(0).toUpperCase() + report.report_type.replace('_', ' ').slice(1)}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-slate-500 text-sm">Reason:</span>
                                    <span className="text-slate-300 text-sm">{report.reason}</span>
                                  </div>
                                  {report.description && (
                                    <div className="mt-2">
                                      <span className="text-slate-500 text-sm">Description:</span>
                                      <p className="text-slate-300 text-sm mt-1 bg-slate-700/30 rounded-lg p-2">
                                        {report.description}
                                      </p>
                                    </div>
                                  )}
                                  <p className="text-slate-500 text-xs mt-2">
                                    Reported {new Date(report.created_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="w-14 h-14 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-300 mb-1">No reported users</h3>
                        <p className="text-slate-500 text-sm">You haven't reported any users yet</p>
                      </div>
                    )}
                  </>
                )}

                {reportedSubTab === 'posts' && (
                  <>
                    {reportedPosts.length > 0 ? (
                      <div className="space-y-3">
                        {reportedPosts.map((report) => {
                          const isAnonymous = report.post?.is_anonymous;
                          return (
                            <div key={report.id} className="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                              <div className="flex items-start space-x-4">
                                <div className="w-11 h-11 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                                  {isAnonymous ? (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                      <UserX className="w-5 h-5 text-slate-400" />
                                    </div>
                                  ) : report.reported_user?.profile_pic_url ? (
                                    <img
                                      src={report.reported_user.profile_pic_url}
                                      alt={report.reported_user.name || 'User'}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                      <span className="text-slate-300 font-bold">
                                        {report.reported_user?.name?.charAt(0) || '?'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-slate-200 font-semibold">
                                      {isAnonymous ? 'Anonymous' : (report.reported_user?.name || `User ${report.reported_user_id.slice(0, 8)}`)}
                                    </h3>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                      report.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                                      report.status === 'upheld' ? 'bg-yellow-500/20 text-yellow-400' :
                                      report.status === 'dismissed' ? 'bg-red-500/20 text-red-400' :
                                      'bg-slate-500/20 text-slate-400'
                                    }`}>
                                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                    </span>
                                  </div>
                                  {!isAnonymous && report.reported_user?.username && (
                                    <p className="text-slate-400 text-sm mb-2">@{report.reported_user.username}</p>
                                  )}
                                  {report.post && (
                                    <div className="mb-3 p-3 bg-slate-700/30 rounded-xl border border-slate-600/30">
                                      <p className="text-slate-300 text-sm line-clamp-3">
                                        {report.post.content}
                                      </p>
                                      <p className="text-slate-500 text-xs mt-1.5">
                                        Posted {new Date(report.post.created_at).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                  )}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-slate-500 text-sm">Reason:</span>
                                      <span className="text-slate-300 text-sm">{report.reason}</span>
                                    </div>
                                    {report.description && (
                                      <div className="mt-2">
                                        <span className="text-slate-500 text-sm">Description:</span>
                                        <p className="text-slate-300 text-sm mt-1 bg-slate-700/30 rounded-lg p-2">
                                          {report.description}
                                        </p>
                                      </div>
                                    )}
                                    <p className="text-slate-500 text-xs mt-2">
                                      Reported {new Date(report.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-14 h-14 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-300 mb-1">No reported posts</h3>
                        <p className="text-slate-500 text-sm">You haven't reported any posts yet</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Support & Help */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Support & Help</h2>

            <div className="space-y-4">
              {/* Help Center (FAQ) */}
              <button
                onClick={() => setShowFAQ(true)}
                className="w-full flex items-center justify-between p-6 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600/20 group-hover:bg-blue-600/30 rounded-xl flex items-center justify-center transition-all duration-300">
                    <HelpCircle className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-slate-200 font-semibold text-lg">Help Center (FAQ)</h3>
                    <p className="text-slate-400 text-sm">Find answers to common questions</p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              {/* Feedback */}
              <button
                onClick={() => setShowFeedback(true)}
                className="w-full flex items-center justify-between p-6 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-600/20 group-hover:bg-green-600/30 rounded-xl flex items-center justify-center transition-all duration-300">
                    <MessageSquare className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-slate-200 font-semibold text-lg">Feedback</h3>
                    <p className="text-slate-400 text-sm">Share your thoughts and suggestions</p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              {/* Terms of Service */}
              <button
                onClick={() => setShowTOS(true)}
                className="w-full flex items-center justify-between p-6 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-600/20 group-hover:bg-purple-600/30 rounded-xl flex items-center justify-center transition-all duration-300">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-slate-200 font-semibold text-lg">Terms of Service</h3>
                    <p className="text-slate-400 text-sm">Read our terms and conditions</p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              {/* Privacy Policy */}
              <button
                onClick={() => setShowPP(true)}
                className="w-full flex items-center justify-between p-6 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-amber-600/20 group-hover:bg-amber-600/30 rounded-xl flex items-center justify-center transition-all duration-300">
                    <Lock className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-slate-200 font-semibold text-lg">Privacy Policy</h3>
                    <p className="text-slate-400 text-sm">Learn how we protect your data</p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              {/* Community Standards */}
              <button
                onClick={() => setShowCS(true)}
                className="w-full flex items-center justify-between p-6 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-600/20 group-hover:bg-red-600/30 rounded-xl flex items-center justify-center transition-all duration-300">
                    <BookOpen className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-slate-200 font-semibold text-lg">Community Standards</h3>
                    <p className="text-slate-400 text-sm">Understand our community guidelines</p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              {/* Copyright Policy */}
              <button
                onClick={() => setShowCP(true)}
                className="w-full flex items-center justify-between p-6 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-amber-600/20 group-hover:bg-amber-600/30 rounded-xl flex items-center justify-center transition-all duration-300">
                    <Copyright className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-slate-200 font-semibold text-lg">Copyright Policy</h3>
                    <p className="text-slate-400 text-sm">Learn about intellectual property</p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (() => {
          const CATEGORIES = [
            { id: "💻 Technology, Software & Digital Culture", label: "Technology, Software & Digital Culture", icon: "💻" },
            { id: "🔭 Science & Exploration", label: "Science & Exploration", icon: "🔭" },
            { id: "🧠 Psychology, Philosophy & Human Mind", label: "Psychology, Philosophy & Human Mind", icon: "🧠" },
            { id: "🎨 Arts, Design & Creativity", label: "Arts, Design & Creativity", icon: "🎨" },
            { id: "📈 Economy, Business & Strategy", label: "Economy, Business & Strategy", icon: "📈" },
            { id: "⚖️ Politics & Governance", label: "Politics & Governance", icon: "⚖️" },
            { id: "🌍 Society & Everyday Life", label: "Society & Everyday Life", icon: "🌍" },
            { id: "🎬 Entertainment & Pop Culture", label: "Entertainment & Pop Culture", icon: "🎬" },
            { id: "🌱 Health & Wellbeing", label: "Health & Wellbeing", icon: "🌱" },
            { id: "🌐 World Affairs", label: "World Affairs", icon: "🌐" }
          ];

          const toggleCategory = (list: string[], id: string): string[] =>
            list.includes(id) ? list.filter(c => c !== id) : [...list, id];

          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
                  <Layers className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Content Preferences</h2>
                  <p className="text-slate-500 text-sm mt-1">Choose what appears in your feed</p>
                </div>
              </div>

              {/* Mixed Feed toggle */}
              <div className={`bg-slate-800/30 backdrop-blur-sm border rounded-2xl p-6 transition-all duration-300 ${
                mixedFeed ? 'border-blue-500/30' : 'border-slate-700/50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 pr-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-300 ${
                      mixedFeed ? 'bg-blue-500/20' : 'bg-slate-600/40'
                    }`}>
                      <Layers className={`w-5 h-5 transition-colors duration-300 ${mixedFeed ? 'text-blue-400' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-slate-100 font-semibold">Mixed Feed</h3>
                        {mixedFeed && (
                          <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-full">
                            On
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {mixedFeed
                          ? 'You see posts from all categories. Optionally exclude topics you\'d rather not see.'
                          : 'Only posts from your selected interest categories will appear in your feed.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSaveContentPreferences({ mixed_feed: !mixedFeed })}
                    disabled={isSavingContent}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                      mixedFeed ? 'bg-blue-600' : 'bg-slate-600'
                    } ${isSavingContent ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                      mixedFeed ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Conditional category section based on Mixed Feed state */}
              <div className={`bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 space-y-5 transition-all duration-300`}>
                {mixedFeed ? (
                  <>
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-slate-600/40 rounded-xl flex items-center justify-center">
                        <EyeOff className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100">Outside Your Interests</h3>
                        <p className="text-slate-400 text-sm">
                          Select categories you want to exclude from your feed. Leave all unselected to see everything.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CATEGORIES.map((cat) => {
                        const isExcluded = excludedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              const next = toggleCategory(excludedCategories, cat.id);
                              handleSaveContentPreferences({ excluded_categories: next });
                            }}
                            disabled={isSavingContent}
                            className={`flex items-center space-x-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                              isExcluded
                                ? 'bg-red-500/10 border-red-500/40 ring-1 ring-red-500/20'
                                : 'bg-slate-700/20 border-slate-600/30 hover:border-slate-500/50 hover:bg-slate-700/30'
                            } ${isSavingContent ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                          >
                            <span className="text-xl leading-none flex-shrink-0">{cat.icon}</span>
                            <span className={`text-sm font-medium flex-1 ${isExcluded ? 'text-red-300' : 'text-slate-300'}`}>
                              {cat.label}
                            </span>
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                              isExcluded
                                ? 'bg-red-500 border-red-500'
                                : 'border-slate-500'
                            }`}>
                              {isExcluded && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {excludedCategories.length > 0 && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                        <p className="text-slate-400 text-xs">
                          {excludedCategories.length} {excludedCategories.length === 1 ? 'category' : 'categories'} excluded from your feed
                        </p>
                        <button
                          onClick={() => handleSaveContentPreferences({ excluded_categories: [] })}
                          disabled={isSavingContent}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-200 underline underline-offset-2"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-blue-500/15 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100">Your Interests</h3>
                        <p className="text-slate-400 text-sm">
                          Select the categories you want to see. At least one must be selected.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CATEGORIES.map((cat) => {
                        const isSelected = interestCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              const next = toggleCategory(interestCategories, cat.id);
                              handleSaveContentPreferences({ interest_categories: next });
                            }}
                            disabled={isSavingContent}
                            className={`flex items-center space-x-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                              isSelected
                                ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/20'
                                : 'bg-slate-700/20 border-slate-600/30 hover:border-slate-500/50 hover:bg-slate-700/30'
                            } ${isSavingContent ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                          >
                            <span className="text-xl leading-none flex-shrink-0">{cat.icon}</span>
                            <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-blue-300' : 'text-slate-300'}`}>
                              {cat.label}
                            </span>
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-slate-500'
                            }`}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {interestCategories.length === 0 && (
                      <div className="flex items-center space-x-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <p className="text-amber-400 text-xs">
                          No categories selected — your feed will be empty until you choose at least one.
                        </p>
                      </div>
                    )}

                    {interestCategories.length > 0 && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                        <p className="text-slate-400 text-xs">
                          {interestCategories.length} {interestCategories.length === 1 ? 'category' : 'categories'} selected
                        </p>
                        <button
                          onClick={() => handleSaveContentPreferences({ interest_categories: [] })}
                          disabled={isSavingContent}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-200 underline underline-offset-2"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Hide AI Labeled Posts */}
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-5">
                  <div className="w-9 h-9 bg-rose-500/15 rounded-xl flex items-center justify-center">
                    <Bot className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">AI Content Filter</h3>
                    <p className="text-slate-400 text-sm">Control how AI-generated or AI-assisted content appears in your feed.</p>
                  </div>
                </div>

                <div className={`flex items-start justify-between p-4 rounded-xl border transition-all duration-300 ${
                  hideAiPosts
                    ? 'bg-rose-500/8 border-rose-500/30'
                    : 'bg-slate-700/20 border-slate-600/30'
                }`}>
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-slate-100 font-semibold">Hide AI Labeled Posts</span>
                      {hideAiPosts && (
                        <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      When enabled, posts flagged as AI-generated or AI-assisted by our detection system will be hidden across all feeds — Discover, Following, Echoes, and Soulmates.
                    </p>
                    {hideAiPosts && (
                      <p className="text-rose-400 text-xs mt-2 font-medium">
                        AI-labeled posts are currently hidden from your feed.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleSaveContentPreferences({ hide_ai_posts: !hideAiPosts })}
                    disabled={isSavingContent}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                      hideAiPosts ? 'bg-rose-600' : 'bg-slate-600'
                    } ${isSavingContent ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                      hideAiPosts ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Active Sessions */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-100">Active Sessions</h2>
              {userSessions.length > 1 && (
                <button
                  onClick={handleCleanupOldSessions}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-xl transition-all duration-300"
                >
                  Clean Old Sessions
                </button>
              )}
            </div>
            
            {userSessions.length > 0 ? (
              <div className="space-y-4">
                {userSessions.map((session) => (
                  <div key={session.id} className="p-6 bg-slate-800/30 rounded-2xl border border-slate-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="p-4 bg-slate-700/50 rounded-xl">
                          <div className="text-slate-300">
                            {getDeviceIcon(session.device_name)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-slate-200 font-bold text-lg mb-2">
                            {session.device_name}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                              <Globe className="w-4 h-4" />
                              <div>
                                <div className="text-slate-300 font-medium">Location</div>
                                <div className="text-slate-400 text-sm">{session.location}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                              <Clock className="w-4 h-4" />
                              <div>
                                <div className="text-slate-300 font-medium">Last Active</div>
                                <div className="text-slate-400 text-sm">{formatLastActive(session.last_active)}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-slate-700/20 rounded-lg">
                              <span className="text-slate-400 text-sm">Session Started:</span>
                              <span className="text-slate-300 text-sm font-medium">{formatDateTime(session.created_at)}</span>
                            </div>
                            
                            <div className="flex items-center justify-between p-2 bg-slate-700/20 rounded-lg">
                              <span className="text-slate-400 text-sm">Last Activity:</span>
                              <span className="text-slate-300 text-sm font-medium">{formatDateTime(session.last_active)}</span>
                            </div>
                            
                            {session.ip_address && (
                              <div className="flex items-center justify-between p-2 bg-slate-700/20 rounded-lg">
                                <span className="text-slate-400 text-sm">IP Address:</span>
                                <span className="text-slate-300 text-sm font-mono">{session.ip_address}</span>
                              </div>
                            )}
                            
                            {session.user_agent && (
                              <div className="flex items-start justify-between p-2 bg-slate-700/20 rounded-lg">
                                <span className="text-slate-400 text-sm">User Agent:</span>
                                <span className="text-slate-300 text-xs font-mono max-w-xs text-right break-all">
                                  {session.user_agent.length > 60 ? `${session.user_agent.substring(0, 60)}...` : session.user_agent}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between p-2 bg-slate-700/20 rounded-lg">
                              <span className="text-slate-400 text-sm">Session ID:</span>
                              <span className="text-slate-300 text-xs font-mono">{session.id.substring(0, 8)}...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          formatLastActive(session.last_active) === 'Active now' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-slate-600/50 text-slate-400'
                        }`}>
                          {formatLastActive(session.last_active) === 'Active now' ? '🟢 Active' : '⚫ Inactive'}
                        </div>
                        
                        <button
                          onClick={() => setShowDeleteConfirm(session.id)}
                          className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-300 text-sm font-medium"
                        >
                          End Session
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <SettingsIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-300 mb-2">No active sessions</h3>
                <p className="text-slate-500">Your session data will appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Logout Section */}
        <div className="mt-8 pt-8 border-t border-slate-700/50">
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <LogOut className="w-6 h-6 text-red-400" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Sign Out</h3>
                  <p className="text-slate-400 text-sm">
                    Sign out of your account on this device
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Session Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl p-6 max-w-sm w-full border border-slate-700">
            <div className="text-center">
              <X className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-100 mb-2">End Session?</h3>
              <p className="text-slate-400 mb-6">
                This will sign you out of this device. You'll need to sign in again to access your account.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleEndSession(showDeleteConfirm)}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all duration-300"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Password Modals */}
      {showActionPasswordForDelete && (
        <ActionPassword
          onVerify={() => {
            setShowActionPasswordForDelete(false);
            setShowDeleteAccountConfirm(true);
          }}
          onCancel={() => setShowActionPasswordForDelete(false)}
          title="Delete Account Verification"
          description="Please enter your action password to confirm account deletion."
        />
      )}

      {showActionPasswordForSettings && (
        <ActionPassword
          onVerify={() => {
            setShowActionPasswordForSettings(false);
            if (pendingSettingsTab) setActiveTab(pendingSettingsTab);
            setPendingSettingsTab(null);
          }}
          onCancel={() => {
            setShowActionPasswordForSettings(false);
            setPendingSettingsTab(null);
          }}
          title="Security Verification"
          description="Please enter your action password to access security settings."
        />
      )}
      
      {showActionPasswordForDisable && (
        <ActionPassword
          onVerify={async (password) => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-action-password`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ action: 'disable', password })
              });
              
              const result = await response.json();
              if (result.success) {
                setHasActionPassword(false);
                setActionPasswordStep('none');
                setTempPassword('');
                setConfirmPassword('');
                setShowActionPasswordForDisable(false);
                alert('Action password disabled successfully.');
              } else {
                const errorStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
                const userFriendlyError = errorStr?.includes('action_password_') 
                  ? 'Failed to disable action password. Please try again later.'
                  : errorStr || 'Failed to disable action password.';
                alert(userFriendlyError);
              }
            } catch (err) {
              console.error(err);
              alert('An error occurred.');
            }
          }}
          onCancel={() => setShowActionPasswordForDisable(false)}
          title="Disable Action Password"
          description="Please enter your action password to confirm disabling this feature."
        />
      )}

      {showActionPasswordForChange && (
        <ActionPassword
          onVerify={() => {
            setShowActionPasswordForChange(false);
            setActionPasswordStep('create');
            setTempPassword('');
            setConfirmPassword('');
          }}
          onCancel={() => setShowActionPasswordForChange(false)}
          title="Change Action Password"
          description="Please enter your CURRENT action password before setting a new one."
        />
      )}

      {showActionPasswordForToggle && (
        <ActionPassword
          onVerify={async (password) => {
            const { id, newSettings } = showActionPasswordForToggle;
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-action-password`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ 
                  action: 'update_settings', 
                  settings: newSettings,
                  password 
                })
              });
              
              const result = await response.json();
              if (result.success) {
                setProtectedActions(newSettings);
                setShowActionPasswordForToggle(null);
              } else {
                const errorStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
                const userFriendlyError = errorStr?.includes('action_password_') 
                  ? 'Failed to update settings. Please try again later.'
                  : errorStr || 'Failed to update settings.';
                alert(userFriendlyError);
              }
            } catch (err) {
              console.error(err);
              alert('An error occurred.');
            }
          }}
          onCancel={() => setShowActionPasswordForToggle(null)}
          title="Confirm Action Protection"
          description={`Please enter your action password to update the protection for ${showActionPasswordForToggle.id}.`}
        />
      )}

      {/* Delete Account Confirmation */}
      {showDeleteAccountConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-red-700/50">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100 mb-3">Delete Account?</h3>
              <p className="text-slate-300 mb-6">
                This action is <strong className="text-red-400">permanent and irreversible</strong>. All your data will be permanently deleted.
              </p>

              <div className="bg-red-950/50 border border-red-800/50 rounded-xl p-4 mb-6 text-left">
                <p className="text-red-300 text-sm mb-2">
                  <strong>This will permanently delete:</strong>
                </p>
                <ul className="text-red-300 text-sm space-y-1 list-disc list-inside">
                  <li>Your profile and all posts</li>
                  <li>All interactions and reactions</li>
                  <li>Followers and following lists</li>
                  <li>Account history and settings</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteAccountConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteAccountConfirm(false);
                    handleDeleteAccount();
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all duration-300"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Data Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-slate-700/50">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-slate-100">Export Your Data</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <p className="text-slate-400 text-sm">
                Select the data you want to include in your export
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { key: 'profile', label: 'Profile Information', icon: Users },
                { key: 'posts', label: 'Posts', icon: FileText },
                { key: 'reactions', label: 'Reactions', icon: Award },
                { key: 'follows', label: 'Followers & Following', icon: Users },
                { key: 'savedPosts', label: 'Saved Posts', icon: Database },
                { key: 'sessions', label: 'Session History', icon: SettingsIcon }
              ].map(({ key, label, icon: Icon }) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl border border-slate-600 cursor-pointer transition-all duration-300"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 text-blue-400" />
                    <span className="text-slate-200 font-medium">{label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={exportSelections[key as keyof typeof exportSelections]}
                    onChange={(e) => setExportSelections(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                    className="w-5 h-5 rounded border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                  />
                </label>
              ))}
            </div>

            <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  Your data will be exported as a JSON file that you can download.
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all duration-300"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                onClick={handleExportData}
                disabled={isExporting || !Object.values(exportSelections).some(v => v)}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-400 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5" />
                    <span>Export</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;