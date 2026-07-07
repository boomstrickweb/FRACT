import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, UserMinus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import VerificationBadge from './VerificationBadge';

interface FollowerUser {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  profile_pic_url?: string;
  created_at: string;
  is_following: boolean;
  is_verified?: boolean;
  verification_type?: string;
}

interface FollowersProps {
  onBack: () => void;
  userId?: string; // If provided, shows this user's followers list
  onProfileClick?: (userId: string) => void;
}

const Followers: React.FC<FollowersProps> = ({ onBack, userId, onProfileClick }) => {
  const [followerUsers, setFollowerUsers] = useState<FollowerUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState<string | null>(null);
  const [isOwnList, setIsOwnList] = useState(false);

  useEffect(() => {
    loadFollowers();
  }, [userId]);

  const loadFollowers = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);
      const targetUserId = userId || user.id;
      setIsOwnList(targetUserId === user.id);

      // Get users that follow the target user
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
            id,
            name,
            username,
            bio,
            profile_pic_url,
            created_at,
            is_verified,
            verification_type
          )
        `)
        .eq('following_id', targetUserId);

      if (followsError) {
        console.error('Error loading followers:', followsError);
        return;
      }

      if (!followsData) {
        setFollowerUsers([]);
        return;
      }

      // Check which users the current user is following (for follow/unfollow buttons)
      const followerIds = followsData.map(f => f.follower_id);
      let currentUserFollows: string[] = [];
      
      if (followerIds.length > 0) {
        const { data: currentFollowsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', followerIds);
        
        currentUserFollows = currentFollowsData?.map(f => f.following_id) || [];
      }

      const users: FollowerUser[] = followsData
        .filter((f: any) => f.profiles)
        .map((f: any) => ({
          id: f.profiles.id,
          name: f.profiles.name || `User ${f.profiles.id.slice(0, 8)}`,
          username: f.profiles.username,
          bio: f.profiles.bio,
          profile_pic_url: f.profiles.profile_pic_url,
          created_at: f.profiles.created_at,
          is_following: currentUserFollows.includes(f.profiles.id),
          is_verified: f.profiles.is_verified,
          verification_type: f.profiles.verification_type
        }));

      setFollowerUsers(users);
    } catch (error) {
      console.error('Error in loadFollowers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUserId,
          following_id: targetUserId
        });

      if (error) {
        console.error('Error following user:', error);
        return;
      }

      // Update local state
      setFollowerUsers(prev => prev.map(user => 
        user.id === targetUserId 
          ? { ...user, is_following: true }
          : user
      ));
    } catch (error) {
      console.error('Error in handleFollow:', error);
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId);

      if (error) {
        console.error('Error unfollowing user:', error);
        return;
      }

      // Update local state
      setFollowerUsers(prev => prev.map(user => 
        user.id === targetUserId 
          ? { ...user, is_following: false }
          : user
      ));

      setShowUnfollowConfirm(null);
    } catch (error) {
      console.error('Error in handleUnfollow:', error);
    }
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/u/${userId}`);
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
              <h1 className="text-xl font-bold text-slate-100">
                {isOwnList ? 'Followers' : 'Followers'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-slate-800/30 rounded-3xl p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-slate-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-32"></div>
                    <div className="h-3 bg-slate-700 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : followerUsers.length > 0 ? (
          <div className="space-y-4">
            {followerUsers.map((user) => (
              <div
                key={user.id}
                className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 hover:bg-slate-800/40 transition-all duration-300"
              >
                <div className="flex items-center space-x-4">
                  {/* Profile Picture */}
                  <div 
                    className="w-16 h-16 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-slate-500 transition-all duration-300"
                    onClick={() => handleProfileClick(user.id)}
                  >
                    {user.profile_pic_url ? (
                      <img
                        src={user.profile_pic_url}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                        <span className="text-slate-300 font-bold text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleProfileClick(user.id)}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-bold text-slate-100 truncate hover:text-slate-300 transition-colors">
                        {user.name}
                      </h3>
                      {user.is_verified && (
                        <VerificationBadge
                          isVerified={true}
                          verificationType={user.verification_type}
                          size="sm"
                        />
                      )}
                      <span className="text-slate-400 truncate text-sm">
                        {user.id.slice(0, 8)}...
                      </span>
                    </div>
                    
                    {user.bio && (
                      <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-1 text-slate-500 text-sm">
                      <span>Joined {formatJoinDate(user.created_at)}</span>
                    </div>
                  </div>

                  {/* Follow/Unfollow Button */}
                  {user.id !== currentUserId && (
                    <div className="flex-shrink-0">
                      {user.is_following ? (
                        <button
                          onClick={() => setShowUnfollowConfirm(user.id)}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
                        >
                          Following
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFollow(user.id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
                        >
                          Follow
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-10 h-10 text-slate-100" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-2">
              {isOwnList ? 'No followers yet' : 'No followers'}
            </h3>
            <p className="text-slate-400 text-lg">
              {isOwnList ? 'Share great content to gain followers' : 'This user has no followers yet'}
            </p>
          </div>
        )}
      </div>

      {/* Unfollow Confirmation Modal */}
      {showUnfollowConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl p-6 max-w-sm w-full border border-slate-700">
            <div className="text-center">
              <UserMinus className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-100 mb-2">Unfollow User?</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to unfollow this user? You won't see their posts in your feed anymore.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUnfollowConfirm(null)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUnfollow(showUnfollowConfirm)}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all duration-300"
                >
                  Unfollow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating elements */}
      <div className="fixed top-20 left-10 w-2 h-2 bg-slate-500 rounded-full opacity-60 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-32 right-16 w-3 h-3 bg-slate-400 rounded-full opacity-40 animate-pulse delay-1000 pointer-events-none"></div>
      <div className="fixed top-1/3 right-8 w-1 h-1 bg-slate-600 rounded-full opacity-80 animate-pulse delay-500 pointer-events-none"></div>
    </div>
  );
};

export default Followers;