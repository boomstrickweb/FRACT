import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, Save, User, Image, Heart, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EditProfileProps {
  onBack: () => void;
  onProfileUpdated?: () => void;
}

interface ProfileData {
  id: string;
  name: string;
  bio?: string;
  profile_pic_url?: string;
  cover_pic_url?: string;
  beliefs?: string;
  field?: string;
  soulcode?: {
    core_drive: string;
    value_spectrum: string;
    social_vibe: string;
  };
}

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

const soulcodeOptions = {
  core_drive: ['freedom', 'order', 'impact', 'ambition', 'connection', 'discovery'],
  value_spectrum: ['rationalist', 'humanist', 'individualist', 'collectivist', 'existentialist', 'pragmatist'],
  social_vibe: ['calm', 'intense', 'playful', 'bold', 'private', 'chaotic']
};

const EditProfile: React.FC<EditProfileProps> = ({ onBack, onProfileUpdated }) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    beliefs: '',
    field: '',
  });
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [coverPic, setCoverPic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [coverPicPreview, setCoverPicPreview] = useState<string | null>(null);
  const [soulcode, setSoulcode] = useState({
    core_drive: '',
    value_spectrum: '',
    social_vibe: ''
  });
  const [showSoulcode, setShowSoulcode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const profilePicRef = useRef<HTMLInputElement>(null);
  const coverPicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

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
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        beliefs: profile.beliefs || '',
        field: profile.field || '',
      });
      setProfilePicPreview(profile.profile_pic_url);
      setCoverPicPreview(profile.cover_pic_url);

      // Load soulcode
      const { data: soulcodeData } = await supabase
        .from('soulcodes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (soulcodeData) {
        setSoulcode({
          core_drive: soulcodeData.core_drive,
          value_spectrum: soulcodeData.value_spectrum,
          social_vibe: soulcodeData.social_vibe
        });
      }

    } catch (error) {
      console.error('Error in loadProfile:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
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
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error in uploadImage:', error);
      return null;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

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

      // Save soulcode if provided
      if (showSoulcode && soulcode.core_drive && soulcode.value_spectrum && soulcode.social_vibe) {
        const { error: soulcodeError } = await supabase
          .from('soulcodes')
          .upsert({
            user_id: user.id,
            core_drive: soulcode.core_drive,
            value_spectrum: soulcode.value_spectrum,
            social_vibe: soulcode.social_vibe,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (soulcodeError) {
          console.error('Error saving soulcode:', soulcodeError);
          setError('Failed to save soulcode. Please try again.');
          return;
        }
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim() || null,
          bio: formData.bio.trim() || null,
          beliefs: formData.beliefs || null,
          field: formData.field || null,
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
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Cover Photo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Cover Photo</h3>
            <div className="relative">
              <div className="h-48 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 rounded-3xl overflow-hidden relative">
                {coverPicPreview ? (
                  <img
                    src={coverPicPreview}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image className="w-16 h-16 text-slate-300/30" />
                  </div>
                )}
                
                <button
                  onClick={() => coverPicRef.current?.click()}
                  className="absolute top-4 right-4 p-3 bg-slate-900/50 backdrop-blur-sm rounded-2xl hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
                >
                  <Camera className="w-5 h-5" />
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Profile Picture</h3>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-slate-800/50 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                  {profilePicPreview ? (
                    <img
                      src={profilePicPreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                
                <button
                  onClick={() => profilePicRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center shadow-lg hover:from-slate-500 hover:to-slate-600 transition-all duration-300"
                >
                  <Camera className="w-4 h-4 text-white" />
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
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-medium">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Your display name"
              className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
              maxLength={50}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-medium">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none"
              maxLength={160}
            />
            <p className="text-slate-500 text-sm text-right">
              {formData.bio.length}/160
            </p>
          </div>

          {/* Beliefs */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-medium">Beliefs</label>
            <select
              value={formData.beliefs}
              onChange={(e) => setFormData(prev => ({ ...prev, beliefs: e.target.value }))}
              className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
            >
              <option value="">Select your beliefs</option>
              {beliefs.map((belief) => (
                <option key={belief} value={belief} className="bg-slate-800">
                  {belief}
                </option>
              ))}
            </select>
          </div>

          {/* Field */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-medium">Field of Interest</label>
            <select
              value={formData.field}
              onChange={(e) => setFormData(prev => ({ ...prev, field: e.target.value }))}
              className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
            >
              <option value="">Select your field</option>
              {fields.map((field) => (
                <option key={field} value={field} className="bg-slate-800">
                  {field}
                </option>
              ))}
            </select>
          </div>

          {/* Soulcode Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-200">Create Soulcode</h3>
              <button
                onClick={() => setShowSoulcode(!showSoulcode)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                <Heart className="w-4 h-4" />
                <span>{showSoulcode ? 'Hide Soulcode' : 'Create Soulcode'}</span>
              </button>
            </div>
            
            {showSoulcode && (
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-3xl p-6 space-y-6">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <h4 className="text-xl font-bold text-slate-100">Find Your Soulmate</h4>
                    <Sparkles className="w-6 h-6 text-pink-400" />
                  </div>
                  <p className="text-slate-300 text-sm">
                    Create your unique soulcode to find your perfect match
                  </p>
                </div>

                {/* Core Drive */}
                <div className="space-y-3">
                  <label className="block text-purple-300 font-semibold">Core Drive</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {soulcodeOptions.core_drive.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSoulcode(prev => ({ ...prev, core_drive: option }))}
                        className={`p-3 rounded-xl font-medium transition-all duration-300 capitalize ${
                          soulcode.core_drive === option
                            ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-purple-600/30 hover:text-purple-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Value Spectrum */}
                <div className="space-y-3">
                  <label className="block text-pink-300 font-semibold">Value Spectrum</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {soulcodeOptions.value_spectrum.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSoulcode(prev => ({ ...prev, value_spectrum: option }))}
                        className={`p-3 rounded-xl font-medium transition-all duration-300 capitalize ${
                          soulcode.value_spectrum === option
                            ? 'bg-pink-600 text-white shadow-lg transform scale-105'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-pink-600/30 hover:text-pink-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Vibe */}
                <div className="space-y-3">
                  <label className="block text-blue-300 font-semibold">Social Vibe</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {soulcodeOptions.social_vibe.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSoulcode(prev => ({ ...prev, social_vibe: option }))}
                        className={`p-3 rounded-xl font-medium transition-all duration-300 capitalize ${
                          soulcode.social_vibe === option
                            ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-blue-600/30 hover:text-blue-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Soulcode Preview */}
                {soulcode.core_drive && soulcode.value_spectrum && soulcode.social_vibe && (
                  <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-600">
                    <h5 className="text-slate-200 font-semibold mb-2">Your Soulcode:</h5>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm font-medium">
                        {soulcode.core_drive}
                      </span>
                      <span className="px-3 py-1 bg-pink-600/20 text-pink-300 rounded-full text-sm font-medium">
                        {soulcode.value_spectrum}
                      </span>
                      <span className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm font-medium">
                        {soulcode.social_vibe}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;