import { supabase } from '../lib/supabase';

export interface SessionData {
  device_name: string;
  location: string;
  ip_address?: string;
  user_agent?: string;
}

// Get device information
const getDeviceInfo = (): string => {
  const userAgent = navigator.userAgent;
  
  // Mobile devices
  if (/Android/i.test(userAgent)) {
    const match = userAgent.match(/Android ([0-9\.]+)/);
    return `Android ${match ? match[1] : 'Device'}`;
  }
  
  if (/iPhone/i.test(userAgent)) {
    const match = userAgent.match(/OS ([0-9_]+)/);
    const version = match ? match[1].replace(/_/g, '.') : '';
    return `iPhone (iOS ${version})`;
  }
  
  if (/iPad/i.test(userAgent)) {
    const match = userAgent.match(/OS ([0-9_]+)/);
    const version = match ? match[1].replace(/_/g, '.') : '';
    return `iPad (iOS ${version})`;
  }
  
  // Desktop browsers
  if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) {
    const match = userAgent.match(/Chrome\/([0-9\.]+)/);
    return `Chrome ${match ? match[1] : ''} Desktop`;
  }
  
  if (/Firefox/i.test(userAgent)) {
    const match = userAgent.match(/Firefox\/([0-9\.]+)/);
    return `Firefox ${match ? match[1] : ''} Desktop`;
  }
  
  if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    const match = userAgent.match(/Version\/([0-9\.]+)/);
    return `Safari ${match ? match[1] : ''} Desktop`;
  }
  
  if (/Edge/i.test(userAgent)) {
    const match = userAgent.match(/Edge\/([0-9\.]+)/);
    return `Edge ${match ? match[1] : ''} Desktop`;
  }
  
  // Fallback
  return 'Unknown Device';
};

// Get approximate location (you can enhance this with a geolocation API)
const getLocation = async (): Promise<string> => {
  try {
    // Try to get timezone-based location
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = timezone.split('/');
    
    if (parts.length >= 2) {
      const region = parts[0].replace('_', ' ');
      const city = parts[1].replace('_', ' ');
      return `${city}, ${region}`;
    }
    
    return timezone.replace('_', ' ');
  } catch (error) {
    return 'Unknown Location';
  }
};

// Get IP address (simplified - in production you'd use a service)
const getIPAddress = async (): Promise<string | undefined> => {
  try {
    // In a real app, you'd call an IP service like ipapi.co or similar
    // For now, we'll skip this to avoid external dependencies
    return undefined;
  } catch (error) {
    return undefined;
  }
};

// Create or update user session
export const createUserSession = async (userId: string): Promise<void> => {
  try {
    const deviceName = getDeviceInfo();
    const location = await getLocation();
    const ipAddress = await getIPAddress();
    const userAgent = navigator.userAgent;

    // Check if a session already exists for this device/browser
    const { data: existingSessions, error: fetchError } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('device_name', deviceName)
      .eq('user_agent', userAgent);

    if (fetchError) {
      console.error('Error checking existing sessions:', fetchError);
      return;
    }

    if (existingSessions && existingSessions.length > 0) {
      // Update existing session
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({
          last_active: new Date().toISOString(),
          location: location,
          ip_address: ipAddress
        })
        .eq('id', existingSessions[0].id);

      if (updateError) {
        console.error('Error updating session:', updateError);
      } else {
        console.log('✅ Session updated successfully');
      }
    } else {
      // Create new session
      const { error: insertError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          device_name: deviceName,
          location: location,
          ip_address: ipAddress,
          user_agent: userAgent,
          last_active: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating session:', insertError);
      } else {
        console.log('✅ New session created successfully');
      }
    }
  } catch (error) {
    console.error('Error in createUserSession:', error);
  }
};

// Update session activity
export const updateSessionActivity = async (userId: string): Promise<void> => {
  try {
    const deviceName = getDeviceInfo();
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('user_sessions')
      .update({
        last_active: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('device_name', deviceName)
      .eq('user_agent', userAgent);

    if (error) {
      console.error('Error updating session activity:', error);
    }
  } catch (error) {
    console.error('Error in updateSessionActivity:', error);
  }
};

// Clean up old sessions (optional - call periodically)
export const cleanupOldSessions = async (userId: string): Promise<void> => {
  try {
    // Remove sessions older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId)
      .lt('last_active', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Error cleaning up old sessions:', error);
    }
  } catch (error) {
    console.error('Error in cleanupOldSessions:', error);
  }
};

// Delete specific session
export const deleteSession = async (sessionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteSession:', error);
    return false;
  }
};