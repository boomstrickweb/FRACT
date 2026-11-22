import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, Save, User, Image, Sparkles, X, Check, Shield, Info, ChevronDown, ChevronUp, AlertCircle, Fingerprint, Heart } from 'lucide-react';
import { supabase, wrapMediaUrl } from '../lib/supabase';
import { uploadToR2 } from '../lib/r2.ts';
import BlueskyIcon from './BlueskyIcon';
import { initiateBlueskyOAuth, handleBlueskyOAuthCallback, disconnectBlueskyProfile } from '../services/blueskyService';
import { getGenderIconConfig, getOrientationIconConfig, getBeliefIconConfig, getFieldIconConfig } from '../lib/categoryIcons';

interface EditProfileProps {
  onBack: () => void;
  onProfileUpdated?: () => void;
}

interface ProfileData {
  id: string;
  name: string;
  pronouns?: string;
  gender?: string;
  sexual_orientation?: string;
  sexual_orientation_consent?: boolean;
  bio?: string;
  profile_pic_url?: string;
  cover_pic_url?: string;
  beliefs?: string;
  field?: string;
  bluesky_handle?: string | null;
  bluesky_did?: string | null;
}

const pronounsList = [
  'she / her',
  'he / him',
  'they / them',
  'it / its',
  'ze / zir',
  'xe / xem',
  'ey / em',
  'fae / faer',
  've / ver',
  'any pronouns',
  'ask me',
  'no pronouns'
];

const genderList = [
  'Woman',
  'Man',
  'Non-binary',
  'Trans woman',
  'Trans man',
  'Genderfluid',
  'Agender',
  'Genderqueer',
  'Bigender',
  'Demigender',
  'Transfeminine',
  'Transmasculine',
  'Questioning',
  'Another identity',
  'Prefer not to say'
];

const sexualOrientationList = [
  'Heterosexual / Straight',
  'Gay',
  'Lesbian',
  'Bisexual',
  'Pansexual',
  'Omnisexual',
  'Polysexual',
  'Queer',
  'Asexual',
  'Demisexual',
  'Graysexual',
  'Androsexual',
  'Gynesexual',
  'Skoliosexual',
  'Cupiosexual',
  'Fraysexual',
  'Lithosexual / Akoisexual',
  'Pomosexual',
  'Questioning',
  'Another identity'
];

const beliefs = [
  'Libertarian', 'Analyst', 'Humanist', 'Radical', 'Low-Profile',
  'Satirical', 'Minimalist', 'Nihilist', 'Debater', 'Expat Voice', 'Centrist',
  'Anarchist', 'Stoic', 'Skeptic'
];

const fields = [
  'Politics', 'Science/Tech', 'Philosophy/Psychology', 'Art/Culture',
  'Law/Justice', 'Economics/Finance', 'Media/Journalism', 'AI/Future Tech',
  'Space/Astronomy', 'Literature/Writing', 'Activism/Protest Culture'
];

// Helper to parse comma separated values to array
function parseList(val?: string | null): string[] {
  if (!val) return [];
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

const EditProfile: React.FC<EditProfileProps> = ({ onBack, onProfileUpdated }) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  // Basic info state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  // Identity & Expression state (multi-selects)
  const [selectedPronouns, setSelectedPronouns] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string[]>([]);
  const [selectedOrientation, setSelectedOrientation] = useState<string[]>([]);
  const [orientationConsent, setOrientationConsent] = useState(false);
  const [orientationConsentConfirmed, setOrientationConsentConfirmed] = useState(false);

  // Interests & Perspectives state
  const [selectedBelief, setSelectedBelief] = useState('');
  const [selectedField, setSelectedField] = useState('');

  // Image uploads
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [coverPic, setCoverPic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [coverPicPreview, setCoverPicPreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Bluesky connection state
  const [blueskyHandle, setBlueskyHandle] = useState<string>('');
  const [isConnectingBluesky, setIsConnectingBluesky] = useState(false);
  const [isDisconnectingBluesky, setIsDisconnectingBluesky] = useState(false);

  const profilePicRef = useRef<HTMLInputElement>(null);
  const coverPicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
    checkOAuthCallback();

    const handleWindowFocus = () => {
      loadProfile();
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  const checkOAuthCallback = async () => {
    try {
      const res = await handleBlueskyOAuthCallback();
      if (res.handled) {
        if (res.success && res.handle) {
          setBlueskyHandle(res.handle);
          onProfileUpdated?.();
        } else if (res.error) {
          setError(res.error);
        }
      }
    } catch (err) {
      console.error('Error handling Bluesky OAuth callback:', err);
    }
  };

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        setError('Failed to load profile');
        return;
      }

      setProfileData(profile);
      setName(profile.name || '');
      setBio(profile.bio || '');
      setSelectedPronouns(parseList(profile.pronouns));
      setSelectedGender(parseList(profile.gender));
      setSelectedOrientation(parseList(profile.sexual_orientation));
      setOrientationConsent(!!profile.sexual_orientation_consent);
      setOrientationConsentConfirmed(!!profile.sexual_orientation_consent);
      setSelectedBelief(profile.beliefs || '');
      setSelectedField(profile.field || '');

      setProfilePicPreview(profile.profile_pic_url);
      setCoverPicPreview(profile.cover_pic_url);
      setBlueskyHandle(profile.bluesky_handle || '');

    } catch (error) {
      console.error('Error in loadProfile:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthorizeBlueskyOAuth = async () => {
    setIsConnectingBluesky(true);
    setError('');
    try {
      const { authUrl } = await initiateBlueskyOAuth();
      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Bluesky OAuth');
      setIsConnectingBluesky(false);
    }
  };

  const handleDisconnectBluesky = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Bluesky account?')) return;
    setIsDisconnectingBluesky(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const res = await disconnectBlueskyProfile(user.id);
      if (res.success) {
        setBlueskyHandle('');
        onProfileUpdated?.();
      } else {
        setError(res.error || 'Failed to disconnect Bluesky');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect Bluesky');
    } finally {
      setIsDisconnectingBluesky(false);
    }
  };

  const handleFileSelect = (type: 'profile' | 'cover', file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (type === 'profile') {
        setProfilePic(file);
        setProfilePicPreview(preview);
      } else {
        setCoverPic(file);
        setCoverPicPreview(preview);
      }
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const uploadImage = async (file: File, bucket: string, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const publicUrl = await uploadToR2(bucket, filePath, file);
      return publicUrl;
    } catch (error) {
      console.error('Error in uploadImage:', error);
      return null;
    }
  };

  // Toggle helpers for multi-selects
  const togglePronoun = (item: string) => {
    setSelectedPronouns(prev => 
      prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]
    );
  };

  const toggleGender = (item: string) => {
    setSelectedGender(prev => 
      prev.includes(item) ? prev.filter(g => g !== item) : [...prev, item]
    );
  };

  const toggleOrientation = (item: string) => {
    setSelectedOrientation(prev => {
      const updated = prev.includes(item) ? prev.filter(o => o !== item) : [...prev, item];
      if (updated.length === 0) {
        setOrientationConsent(false);
        setOrientationConsentConfirmed(false);
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setError('');

    // Check GDPR consent for Sexual Orientation
    if (selectedOrientation.length > 0 && !orientationConsent) {
      setError('Please check the GDPR consent checkbox to save your sexual orientation on your profile, or deselect it.');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('User not authenticated');
        return;
      }

      let profilePicUrl = profileData?.profile_pic_url;
      let coverPicUrl = profileData?.cover_pic_url;

      // Upload new profile picture if selected
      if (profilePic) {
        const uploadedUrl = await uploadImage(profilePic, 'profile-pictures', user.id);
        if (uploadedUrl) {
          profilePicUrl = uploadedUrl;
        } else {
          setError('Failed to upload profile picture');
          return;
        }
      }

      // Upload new cover picture if selected
      if (coverPic) {
        const uploadedUrl = await uploadImage(coverPic, 'cover-pictures', user.id);
        if (uploadedUrl) {
          coverPicUrl = uploadedUrl;
        } else {
          setError('Failed to upload cover picture');
          return;
        }
      }

      const pronounsStr = selectedPronouns.length > 0 ? selectedPronouns.join(', ') : null;
      const genderStr = selectedGender.length > 0 ? selectedGender.join(', ') : null;
      const orientationStr = selectedOrientation.length > 0 ? selectedOrientation.join(', ') : null;
      const hasConsent = selectedOrientation.length > 0 ? orientationConsent : false;

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: name.trim() || null,
          pronouns: pronounsStr,
          gender: genderStr,
          sexual_orientation: orientationStr,
          sexual_orientation_consent: hasConsent,
          bio: bio.trim() || null,
          beliefs: selectedBelief || null,
          field: selectedField || null,
          profile_pic_url: profilePicUrl,
          cover_pic_url: coverPicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        setError('Failed to update profile. Please try again.');
        return;
      }

      onProfileUpdated?.();
      onBack();

    } catch (error) {
      console.error('Error in handleSave:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
              <h1 className="text-xl font-bold text-slate-100">Edit Profile</h1>
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 backdrop-blur-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-10">
          
          {/* =========================================
              SECTION 1: Basic Information
             ========================================= */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-5 sm:p-6 space-y-6 backdrop-blur-sm">
            <div className="border-b border-slate-700/50 pb-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" />
                <span>Basic Information</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage your public avatar, name, and bio.</p>
            </div>

            {/* Photos Container */}
            <div className="space-y-6">
              {/* Cover Photo */}
              <div className="space-y-2">
                <label className="block text-slate-300 text-sm font-medium">Cover Photo</label>
                <div className="relative">
                  <div className="h-40 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 rounded-2xl overflow-hidden relative">
                    {coverPicPreview ? (
                      <img
                        src={wrapMediaUrl(coverPicPreview)}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image className="w-12 h-12 text-slate-300/30" />
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => coverPicRef.current?.click()}
                      className="absolute top-3 right-3 p-2.5 bg-slate-900/60 backdrop-blur-sm rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-md"
                      title="Change Cover Photo"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <input
                    ref={coverPicRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('cover', file);
                    }}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Profile Picture */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
                    {profilePicPreview ? (
                      <img
                        src={wrapMediaUrl(profilePicPreview)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => profilePicRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full flex items-center justify-center shadow-md transition-all"
                    title="Change Profile Picture"
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                  
                  <input
                    ref={profilePicRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('profile', file);
                    }}
                    className="hidden"
                  />
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium text-sm">Profile Picture</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Recommended 400x400px (Max 5MB)</p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium text-sm">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
                className="w-full p-3.5 bg-slate-900/60 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm transition-all"
                maxLength={50}
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium text-sm">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                className="w-full p-3.5 bg-slate-900/60 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm transition-all resize-none"
                maxLength={160}
              />
              <p className="text-slate-500 text-xs text-right">
                {bio.length}/160
              </p>
            </div>
          </div>

          {/* =========================================
              SECTION 2: Identity & Expression
             ========================================= */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-5 sm:p-6 space-y-6 backdrop-blur-sm">
            <div className="border-b border-slate-700/50 pb-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Identity & Expression</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Select multiple options that reflect your identity.</p>
            </div>

            {/* 1. Pronouns (Multi-select) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-medium text-sm">
                  Pronouns <span className="text-xs text-slate-400 font-normal">(Multi-select)</span>
                </label>
                {selectedPronouns.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPronouns([])}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Clear ({selectedPronouns.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {pronounsList.map((pronoun) => {
                  const isSelected = selectedPronouns.includes(pronoun);
                  return (
                    <button
                      key={pronoun}
                      type="button"
                      onClick={() => togglePronoun(pronoun)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                        isSelected
                          ? 'bg-slate-700 text-white border-slate-500 shadow-sm'
                          : 'bg-slate-900/50 text-slate-300 border-slate-700/70 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-200" />}
                      <span>{pronoun}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Gender (Multi-select) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-700/40">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-medium text-sm">
                  Gender <span className="text-xs text-slate-400 font-normal">(Multi-select)</span>
                </label>
                {selectedGender.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedGender([])}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Clear ({selectedGender.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {genderList.map((gender) => {
                  const isSelected = selectedGender.includes(gender);
                  const iconConfig = getGenderIconConfig(gender);
                  const IconComp = iconConfig.icon;
                  return (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => toggleGender(gender)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                        isSelected
                          ? 'bg-slate-700 text-white border-slate-500 shadow-sm'
                          : 'bg-slate-900/50 text-slate-300 border-slate-700/70 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : iconConfig.colorClass}`} />
                      <span>{gender}</span>
                      {isSelected && <Check className="w-3 h-3 text-slate-200 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Sexual Orientation (Multi-select) */}
            <div className="space-y-3 pt-2 border-t border-slate-700/40">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-medium text-sm">
                  Sexual Orientation <span className="text-xs text-slate-400 font-normal">(Multi-select)</span>
                </label>
                {selectedOrientation.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrientation([]);
                      setOrientationConsent(false);
                      setOrientationConsentConfirmed(false);
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Clear ({selectedOrientation.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {sexualOrientationList.map((orientation) => {
                  const isSelected = selectedOrientation.includes(orientation);
                  const iconConfig = getOrientationIconConfig(orientation);
                  const IconComp = iconConfig.icon;
                  return (
                    <button
                      key={orientation}
                      type="button"
                      onClick={() => toggleOrientation(orientation)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                        isSelected
                          ? 'bg-rose-950/60 text-rose-200 border-rose-500/60 shadow-sm'
                          : 'bg-slate-900/50 text-slate-300 border-slate-700/70 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-300' : iconConfig.colorClass}`} />
                      <span>{orientation}</span>
                      {isSelected && <Check className="w-3 h-3 text-rose-300 ml-0.5" />}
                    </button>
                  );
                })}
              </div>

              {/* GDPR Sensitive Personal Data & Consent Box */}
              {selectedOrientation.length > 0 && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30 space-y-3 animate-fade-in">
                  <div className="flex items-start space-x-2.5">
                    <Shield className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-rose-200 uppercase tracking-wider">
                        GDPR Sensitive Personal Data Notice
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Sexual orientation is considered sensitive personal data under GDPR. By choosing to add this information, you explicitly consent to FRACT processing it solely for displaying it on your profile. This information will never be used for advertising, profiling, recommendations, or shared with third parties for their own purposes. You can remove it at any time.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-start sm:items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={orientationConsent}
                        onChange={(e) => {
                          setOrientationConsent(e.target.checked);
                          if (!e.target.checked) {
                            setOrientationConsentConfirmed(false);
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900 mt-0.5 sm:mt-0 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-slate-200 leading-snug">
                        I explicitly consent to FRACT processing my sexual orientation for display on my profile.
                      </span>
                    </label>

                    {orientationConsent && !orientationConsentConfirmed && (
                      <button
                        type="button"
                        onClick={() => setOrientationConsentConfirmed(true)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-xl transition-all shadow whitespace-nowrap self-end sm:self-auto"
                      >
                        Continue
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* =========================================
              SECTION 3: Interests & Perspectives
             ========================================= */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-5 sm:p-6 space-y-6 backdrop-blur-sm">
            <div className="border-b border-slate-700/50 pb-3">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Interests & Perspectives</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Select your primary alignment and domain of interest.</p>
            </div>

            {/* Field of Interest */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium text-sm">Field of Interest</label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full p-3.5 bg-slate-900/60 border border-slate-700 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
              >
                <option value="">Select your field</option>
                {fields.map((field) => (
                  <option key={field} value={field} className="bg-slate-800">
                    {field}
                  </option>
                ))}
              </select>
            </div>

            {/* Beliefs */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium text-sm">Beliefs</label>
              <select
                value={selectedBelief}
                onChange={(e) => setSelectedBelief(e.target.value)}
                className="w-full p-3.5 bg-slate-900/60 border border-slate-700 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
              >
                <option value="">Select your beliefs</option>
                {beliefs.map((belief) => (
                  <option key={belief} value={belief} className="bg-slate-800">
                    {belief}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* =========================================
              SECTION 4: Bluesky Integration
             ========================================= */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center space-x-2">
              <BlueskyIcon className="w-5 h-5 text-sky-400 fill-current" />
              <span>Bluesky Integration</span>
            </h3>
            
            <div className="p-5 bg-slate-800/40 border border-slate-700/60 rounded-3xl backdrop-blur-sm">
              {blueskyHandle ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                      <BlueskyIcon className="w-6 h-6 text-sky-400 fill-current" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">Connected</span>
                      </div>
                      <a
                        href={`https://bsky.app/profile/${blueskyHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-100 font-semibold hover:text-sky-400 transition-colors inline-flex items-center space-x-1 mt-1 text-base"
                      >
                        <span>@{blueskyHandle}</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleDisconnectBluesky}
                      disabled={isDisconnectingBluesky}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50"
                    >
                      {isDisconnectingBluesky ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-slate-200 font-medium text-base">Link your Bluesky account</h4>
                    <p className="text-slate-400 text-sm mt-1">
                      Authorize with Bluesky to display your verified Bluesky handle on your FRACT profile.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAuthorizeBlueskyOAuth}
                    disabled={isConnectingBluesky}
                    className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-[#0285FF] hover:bg-[#0070d8] text-white font-medium rounded-xl transition-all duration-300 shadow-md hover:shadow-sky-500/20 whitespace-nowrap transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    <BlueskyIcon className="w-4 h-4 fill-current" />
                    <span>{isConnectingBluesky ? 'Redirecting to Bluesky...' : 'Authorize with Bluesky (OAuth)'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EditProfile;
