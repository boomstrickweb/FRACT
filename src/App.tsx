import { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// Lazy load components for performance
const IntroPage = lazy(() => import('./components/IntroPage'));
const EmailAuth = lazy(() => import('./components/EmailAuth'));
const Feed = lazy(() => import('./components/Feed'));
const Preview = lazy(() => import('./components/Preview'));
const Profile = lazy(() => import('./components/Profile'));
const CreatePost = lazy(() => import('./components/CreatePost'));
const PostCard = lazy(() => import('./components/PostCard'));
const TOS = lazy(() => import('./components/TOS'));
const PP = lazy(() => import('./components/PP'));
const AvailableCountries = lazy(() => import('./components/availablecountries'));

import { supabase } from './lib/supabase';
import { updateSessionActivity } from './services/sessionService';
import { useParams } from 'react-router-dom';

function PostRoute({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(id, name, username, profile_pic_url, profile_type, is_verified, verification_type, verification_reason)
        `)
        .eq('id', postId)
        .single();
      
      if (!error && data) {
        setPost(data);
      }
      setLoading(false);
    };
    fetchPost();
  }, [postId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 border-4 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
    </div>
  );

  if (!post) return <Navigate to="/" replace />;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <button 
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
      >
        <div className="p-2 rounded-full group-hover:bg-slate-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </div>
        Back
      </button>
      <PostCard 
        post={post} 
        onProfileClick={() => {
          if (post.author?.id) {
            navigate(`/u/${post.author.id}`);
          }
        }}
        onSave={() => !isAuthenticated && navigate('/intro')}
        onReact={() => !isAuthenticated && navigate('/intro')}
      />
    </div>
  );
}

function ProfileRoute() {
  const { userId } = useParams();
  const navigate = useNavigate();

  if (!userId) return <Navigate to="/" replace />;

  return (
    <Profile 
      userId={userId} 
      onBack={() => navigate(-1)} 
      onNavigateToCreate={() => navigate('/create')}
      onJoinClick={() => navigate('/intro')}
    />
  );
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkUserSession();

    // Set up periodic session activity updates
    const activityInterval = setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await updateSessionActivity(user.id);
        }
      } catch (error) {
        console.error('Error updating session activity:', error);
      }
    }, 30 * 60 * 1000); // Update every 30 minutes (was 10)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        checkUserSession();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        if (location.pathname === '/feed') {
          navigate('/preview');
        }
      }
    });

    return () => {
      clearInterval(activityInterval);
      subscription.unsubscribe();
    };
  }, [location.pathname, navigate]);

  const checkUserSession = async () => {
    try {
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.error('Supabase configuration missing. Please check your .env file.');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check if user is logged in
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // If there's an error (like invalid JWT), clear the session
      if (error) {
        // Only sign out if it's a genuine auth error, not just a missing session
        if (error.status !== 401 && error.status !== 403 && !error.message.includes('refresh_token_not_found')) {
           console.log('Session error detected, clearing invalid session:', error.message);
           await supabase.auth.signOut();
           setIsAuthenticated(false);
           return;
        }
      }
      
      if (user) {
        // Check if user has completed profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          // User is fully set up
          setIsAuthenticated(true);
        } else {
          // No profile found, might be in the middle of signup
          console.warn('User authenticated but no profile found yet');
          setIsAuthenticated(true); // Allow them to be authenticated, EmailAuth handles profile creation
        }
      } else {
        // No user logged in
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
      // Clear any stale authentication session data for invalid tokens
      try {
        await supabase.auth.signOut();
        localStorage.clear();
      } catch (error) {
        // Silently handle sign out errors from invalid tokens
        console.debug('Cleared invalid session token');
      }
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-slate-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-2xl font-bold bg-gradient-to-r from-slate-300 to-slate-100 bg-clip-text text-transparent">
            FRACT
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="w-8 h-8 border-4 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/feed" replace /> : <Navigate to="/preview" replace />} />
          <Route path="/feed" element={isAuthenticated ? <Feed /> : <Navigate to="/preview" replace />} />
          <Route path="/feed/:tab" element={isAuthenticated ? <Feed /> : <Navigate to="/preview" replace />} />
          <Route path="/create" element={isAuthenticated ? <CreatePost onBack={() => navigate(-1)} onPostCreated={() => navigate('/feed')} /> : <Navigate to="/intro" replace />} />
          <Route path="/p/:postId" element={<PostRoute isAuthenticated={isAuthenticated} />} />
          <Route path="/u/:userId" element={<ProfileRoute />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="/preview/:tab" element={<Preview />} />
          <Route path="/intro" element={<IntroPage onGetStarted={() => navigate('/auth')} />} />
          <Route path="/auth" element={
            <EmailAuth
              onBack={() => navigate('/intro')}
              onAuthSuccess={() => navigate('/feed')}
              onNavigateToTOS={() => navigate('/tos')}
              onNavigateToPP={() => navigate('/pp')}
            />
          } />
          <Route path="/tos" element={<TOS onBack={() => navigate(-1)} />} />
          <Route path="/pp" element={<PP onBack={() => navigate(-1)} />} />
          <Route path="/availablecountries" element={<AvailableCountries />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;