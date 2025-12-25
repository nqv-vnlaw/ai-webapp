import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useMemo } from 'react';
import type { AuthUser } from './types';

const ALLOWED_DOMAIN =
  (import.meta as any).env?.VITE_ALLOWED_DOMAIN || 'vnlaw.com.vn';

export function useAuth() {
  const {
    isAuthenticated,
    isLoading,
    user,
    getToken,
    login,
    logout,
    register,
  } = useKindeAuth();

  const authUser: AuthUser | null = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id || '',
      email: user.email || '',
      given_name: (user as any).given_name || (user as any).givenName,
      family_name: (user as any).family_name || (user as any).familyName,
      picture: (user as any).picture,
    };
  }, [user]);

  const isDomainAllowed = useMemo(() => {
    if (!authUser?.email) return false;
    return authUser.email.endsWith(`@${ALLOWED_DOMAIN}`);
  }, [authUser]);

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const token = await getToken();
      return token || null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    user: authUser,
    isDomainAllowed,
    getAccessToken,
    login,
    logout,
    register,
  };
}

