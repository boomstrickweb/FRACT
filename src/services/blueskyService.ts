import { supabase } from '../lib/supabase';

export interface BlueskyActorProfile {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

// Generate secure random string for OAuth state and PKCE verifier
function generateRandomString(length: number = 43): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map(val => charset[val % charset.length])
    .join('');
}

// Generate base64url encoded SHA-256 hash for PKCE challenge
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Resolves a Bluesky handle or DID to an AT Protocol actor profile
 */
export const resolveBlueskyProfile = async (handleOrDid: string): Promise<BlueskyActorProfile> => {
  let cleanInput = handleOrDid.trim().replace(/^@/, '');
  if (!cleanInput.includes('.') && !cleanInput.startsWith('did:')) {
    cleanInput = `${cleanInput}.bsky.social`;
  }

  const response = await fetch(
    `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(cleanInput)}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Could not find Bluesky account @${cleanInput}`);
  }

  const data = await response.json();
  return {
    did: data.did,
    handle: data.handle,
    displayName: data.displayName,
    description: data.description,
    avatar: data.avatar,
    banner: data.banner,
    followersCount: data.followersCount,
    followsCount: data.followsCount,
    postsCount: data.postsCount,
  };
};

/**
 * Initiates Bluesky OAuth flow
 */
export const initiateBlueskyOAuth = async (handle?: string): Promise<{ authUrl: string; state: string }> => {
  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store in both localStorage and sessionStorage for cross-tab support
  localStorage.setItem('bsky_oauth_state', state);
  localStorage.setItem('bsky_oauth_verifier', codeVerifier);
  sessionStorage.setItem('bsky_oauth_state', state);
  sessionStorage.setItem('bsky_oauth_verifier', codeVerifier);
  if (handle) {
    localStorage.setItem('bsky_oauth_handle', handle);
    sessionStorage.setItem('bsky_oauth_handle', handle);
  }

  // AT Protocol OAuth strictly requires 127.0.0.1 instead of localhost for loopback redirect URIs
  let origin = window.location.origin;
  if (origin.includes('//localhost')) {
    origin = origin.replace('//localhost', '//127.0.0.1');
  }
  const redirectUri = `${origin}${window.location.pathname}`;
  
  // AT Protocol / Bluesky OAuth authorization endpoint
  const authUrl = new URL('https://bsky.social/oauth/authorize');
  authUrl.searchParams.set('client_id', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'atproto transition:generic');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  if (handle) {
    authUrl.searchParams.set('login_hint', handle);
  }

  return {
    authUrl: authUrl.toString(),
    state,
  };
};

/**
 * Links a Bluesky account to the current user's profile in Supabase
 */
export const linkBlueskyProfile = async (
  userId: string,
  handle: string,
  did?: string
): Promise<{ success: boolean; handle: string; did?: string; error?: string }> => {
  try {
    const cleanHandle = handle.trim().replace(/^@/, '');
    
    // If DID is not provided, attempt to resolve it
    let resolvedDid = did;
    if (!resolvedDid) {
      try {
        const profile = await resolveBlueskyProfile(cleanHandle);
        resolvedDid = profile.did;
      } catch (err) {
        console.warn('Could not resolve DID for handle:', cleanHandle, err);
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        bluesky_handle: cleanHandle,
        bluesky_did: resolvedDid || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error linking Bluesky profile in database:', error);
      return { success: false, handle: cleanHandle, error: error.message };
    }

    return { success: true, handle: cleanHandle, did: resolvedDid };
  } catch (error: any) {
    console.error('Error in linkBlueskyProfile:', error);
    return { success: false, handle, error: error.message || 'Failed to link Bluesky account' };
  }
};

/**
 * Disconnects/Unlinks the Bluesky account from the user's profile in Supabase
 */
export const disconnectBlueskyProfile = async (
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        bluesky_handle: null,
        bluesky_did: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error disconnecting Bluesky profile:', error);
      return { success: false, error: error.message };
    }

    localStorage.removeItem('bsky_oauth_state');
    localStorage.removeItem('bsky_oauth_verifier');
    localStorage.removeItem('bsky_oauth_handle');
    sessionStorage.removeItem('bsky_oauth_state');
    sessionStorage.removeItem('bsky_oauth_verifier');
    sessionStorage.removeItem('bsky_oauth_handle');

    return { success: true };
  } catch (error: any) {
    console.error('Error in disconnectBlueskyProfile:', error);
    return { success: false, error: error.message || 'Failed to disconnect Bluesky account' };
  }
};
