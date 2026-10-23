import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserCheck, Shield, Award, Compass, Filter } from 'lucide-react';
import { supabase, wrapMediaUrl } from '../lib/supabase';

const FIELD_OPTIONS = [
  'Politics', 'Science/Tech', 'Philosophy/Psychology', 'Art/Culture',
  'Law/Justice', 'Economics/Finance', 'Media/Journalism', 'AI/Future Tech',
  'Space/Astronomy', 'Literature/Writing', 'Activism/Protest Culture'
];

interface ProfileItem {
  id: string;
  name: string;
  username: string;
  bio?: string;
  profile_pic_url?: string;
  beliefs?: string;
  field?: string;
  profile_type?: string;
  is_verified?: boolean;
  verification_type?: string;
  verification_reason?: string;
  trust_score?: number;
  is_following?: boolean;
}

const FindFieldOfInterest: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myField, setMyField] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('');
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followingLoading, setFollowingLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadUserAndProfiles();
  }, []);

  const loadUserAndProfiles = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      setCurrentUser(user);

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('field')
        .eq('id', user.id)
        .single();

      const userField = profile?.field || 'Science/Tech';
      setMyField(profile?.field || '');
      setSelectedField(userField);

      // Load following list
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const fSet = new Set<string>((follows || []).map(f => f.following_id));
      setFollowingIds(fSet);

      await fetchProfilesForField(userField, user.id, fSet);
    } catch (err) {
      console.error('Error loading field discovery:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfilesForField = async (field: string, currentUserId: string, fSet: Set<string>) => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching profiles for field:', field);
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('id, name, username, bio, profile_pic_url, beliefs, field, profile_type, is_verified, verification_type, verification_reason, trust_score')
        .ilike('field', `%${field}%`)
        .neq('id', currentUserId)
        .limit(50);

      if (error) {
        console.error('Error fetching matching profiles for field:', error);
        setProfiles([]);
        return;
      }

      console.log('✅ Found profiles for field:', field, profilesData);

      const list: ProfileItem[] = (profilesData || []).map(p => ({
        ...p,
        is_following: fSet.has(p.id)
      }));

      setProfiles(list);
    } catch (err) {
      console.error('Error fetching profiles for field:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectField = (field: string) => {
    setSelectedField(field);
    if (currentUser) {
      fetchProfilesForField(field, currentUser.id, followingIds);
    }
  };

  const handleToggleFollow = async (profileId: string) => {
    if (!currentUser) return;
    const isCurrentlyFollowing = followingIds.has(profileId);

    setFollowingLoading(prev => ({ ...prev, [profileId]: true }));
    try {
      if (isCurrentlyFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileId);

        if (!error) {
          setFollowingIds(prev => {
            const next = new Set(prev);
            next.delete(profileId);
            return next;
          });
          setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, is_following: false } : p));
        }
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: profileId
          });

        if (!error) {
          setFollowingIds(prev => {
            const next = new Set(prev);
            next.add(profileId);
            return next;
          });
          setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, is_following: true } : p));
        }
      }
    } catch (err) {
      console.error('Error updating follow:', err);
    } finally {
      setFollowingLoading(prev => ({ ...prev, [profileId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  Field of Interest Discovery
                </h1>
                <p className="text-xs text-slate-400">
                  {myField ? `Your field: ${myField}` : 'Discover voices within domain expertise & interests'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Field Filters */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Select Field of Interest</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FIELD_OPTIONS.map((field) => {
              const isSelected = selectedField === field;
              const isMyField = myField === field;
              return (
                <button
                  key={field}
                  onClick={() => handleSelectField(field)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                    isSelected
                      ? 'bg-cyan-600/30 text-cyan-200 border-cyan-500/50 ring-1 ring-cyan-500/30'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  {field}
                  {isMyField && <span className="ml-1.5 text-[10px] text-cyan-400 font-bold">• You</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Finding experts and enthusiasts...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/30 border border-slate-700/40 rounded-2xl p-8">
            <Compass className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-200">No profiles found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              No one has listed "{selectedField}" as their field of interest yet. Explore other fields above!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition-all rounded-2xl p-4 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => navigate(`/u/${profile.id}`)}
                      className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                    >
                      <div className="relative">
                        <img
                          src={wrapMediaUrl(profile.profile_pic_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=1e293b&color=cbd5e1`}
                          alt={profile.name}
                          className="w-12 h-12 rounded-full object-cover border border-slate-600 group-hover:border-cyan-400 transition-colors"
                        />
                        {profile.is_verified && (
                          <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                            {profile.verification_type === 'gold' ? (
                              <Award className="w-4 h-4 text-amber-400 fill-amber-400" />
                            ) : (
                              <Shield className="w-4 h-4 text-blue-400 fill-blue-400" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                            {profile.name}
                          </h4>
                          {profile.profile_type === 'organization' && (
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                              ORG
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">@{profile.username}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFollow(profile.id)}
                      disabled={followingLoading[profile.id]}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 ${
                        profile.is_following
                          ? 'bg-slate-700/60 text-slate-300 hover:bg-red-500/20 hover:text-red-300 border border-slate-600/50'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                      }`}
                    >
                      {profile.is_following ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>

                  {profile.bio && (
                    <p
                      onClick={() => navigate(`/u/${profile.id}`)}
                      className="text-xs text-slate-300 mt-3 line-clamp-2 cursor-pointer leading-relaxed"
                    >
                      {profile.bio}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {profile.field && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                        {profile.field}
                      </span>
                    )}
                    {profile.beliefs && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-700/40 border border-slate-600/30 text-slate-400">
                        {profile.beliefs}
                      </span>
                    )}
                  </div>
                  {profile.trust_score !== undefined && (
                    <span className="text-slate-400 font-mono">
                      Trust: <span className="text-slate-200">{profile.trust_score}%</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindFieldOfInterest;
