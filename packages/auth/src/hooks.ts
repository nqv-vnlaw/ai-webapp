import { useAuthContext } from './context';

export function useAuth() {
  const {
    isAuthenticated,
    isLoading,
    user,
    isDomainAllowed,
    getAccessToken,
    login,
    logout,
    register,
  } = useAuthContext();

  return {
    isAuthenticated,
    isLoading,
    user,
    isDomainAllowed,
    getAccessToken,
    login,
    logout,
    register,
  };
}
