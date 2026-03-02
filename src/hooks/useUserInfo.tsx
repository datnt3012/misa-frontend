import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/api/auth.api';

interface UserInfo {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
}

// Cache for user info to prevent multiple API calls
const userInfoCache: Record<string, UserInfo> = {};
const pendingFetches: Record<string, Promise<UserInfo | null> | null> = {};

interface UsersResponse {
  data?: UserInfo[];
  users?: UserInfo[];
  rows?: UserInfo[];
}

const fetchUserInfoFromApi = async (userId: string): Promise<UserInfo | null> => {
  try {
    const response = await authApi.getUsers() as UsersResponse | UserInfo[];
    let users: UserInfo[] = [];
    if (Array.isArray(response)) {
      users = response;
    } else if (response && Array.isArray((response as UsersResponse).data)) {
      users = (response as UsersResponse).data || [];
    } else if (response && Array.isArray((response as UsersResponse).users)) {
      users = (response as UsersResponse).users || [];
    } else if (response && (response as UsersResponse).rows && Array.isArray((response as UsersResponse).rows)) {
      users = (response as UsersResponse).rows || [];
    }
    
    const user = users.find((u: UserInfo) => u.id === userId);
    if (user) {
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch user info:', err);
    return null;
  }
};

export const useUserInfo = (userId: string | null) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserInfo = useCallback(async (id: string) => {
    // Check if we have cached data
    if (userInfoCache[id]) {
      setUserInfo(userInfoCache[id]);
      return;
    }

    // Check if there's already a pending fetch for this user
    if (pendingFetches[id]) {
      const cachedUser = await pendingFetches[id];
      if (cachedUser) {
        userInfoCache[id] = cachedUser;
      }
      setUserInfo(cachedUser);
      return;
    }

    setLoading(true);
    setError(null);

    // Create a pending fetch promise
    const fetchPromise = fetchUserInfoFromApi(id);
    pendingFetches[id] = fetchPromise;

    try {
      const user = await fetchPromise;
      if (user) {
        userInfoCache[id] = user;
        setUserInfo(user);
      } else {
        setUserInfo(null);
      }
    } catch (err) {
      setError('Failed to fetch user info');
      setUserInfo(null);
    } finally {
      setLoading(false);
      pendingFetches[id] = null;
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setUserInfo(null);
      return;
    }
    loadUserInfo(userId);
  }, [userId, loadUserInfo]);

  return { userInfo, loading, error };
};
