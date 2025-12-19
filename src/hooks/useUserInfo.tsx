import { useState, useEffect } from 'react';
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
export const useUserInfo = (userId: string | null) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!userId) {
        setUserInfo(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Get all users and find the one with matching ID
        const response = await authApi.getUsers();
        // Handle different response structures
        let users = [];
        if (Array.isArray(response)) {
          users = response;
        } else if (response && Array.isArray(response.data)) {
          users = response.data;
        } else if (response && Array.isArray(response.users)) {
          users = response.users;
        } else if (response && response.rows && Array.isArray(response.rows)) {
          users = response.rows;
        }
        const user = users.find(u => u.id === userId);
        if (user) {
          setUserInfo({
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          });
        } else {
          setUserInfo(null);
        }
      } catch (err) {
        setError('Failed to fetch user info');
        setUserInfo(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUserInfo();
  }, [userId]);
  return { userInfo, loading, error };
};