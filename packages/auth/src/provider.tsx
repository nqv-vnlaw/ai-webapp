import { KindeProvider, useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { AuthContext, type AuthContextValue } from './context';
import { ALLOWED_DOMAIN, getKindeConfig, IS_DEMO_MODE } from './env';
import type { AuthUser } from './types';

// Validate Kinde config at module load time (not during render)
// This provides clearer error messages and fails fast
let kindeConfig: ReturnType<typeof getKindeConfig> | null = null;
if (!IS_DEMO_MODE) {
  try {
    kindeConfig = getKindeConfig();
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error occurred while validating Kinde configuration';
    throw new Error(
      `[VNlaw Auth] Configuration error: ${errorMessage}\n\n` +
        'Please ensure the following environment variables are set:\n' +
        '  - VITE_KINDE_DOMAIN\n' +
        '  - VITE_KINDE_CLIENT_ID\n' +
        '  - VITE_KINDE_REDIRECT_URI\n' +
        '  - VITE_KINDE_LOGOUT_URI\n' +
        '\n' +
        'Or set VITE_DEMO_MODE=true to use demo mode (for preview deployments).',
    );
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

function isEmailAllowed(email: string, allowedDomain: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedDomain = allowedDomain.trim().replace(/^@/, '').toLowerCase();
  return normalizedEmail.endsWith(`@${normalizedDomain}`);
}

function DemoAuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const user: AuthUser | null = useMemo(() => {
    if (!isAuthenticated) return null;
    return {
      id: 'demo-user',
      email: 'demo@vnlaw.com.vn',
      given_name: 'Demo',
      family_name: 'User',
    };
  }, [isAuthenticated]);

  const value: AuthContextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading: false,
      user,
      isDomainAllowed: isAuthenticated,
      getAccessToken: async () => null,
      login: async () => setIsAuthenticated(true),
      logout: async () => setIsAuthenticated(false),
      register: async () => setIsAuthenticated(true),
    }),
    [isAuthenticated, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function KindeAuthProvider({ children }: AuthProviderProps) {
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
      id: user.id,
      email: user.email ?? '',
      given_name: user.givenName,
      family_name: user.familyName,
      picture: user.picture,
    };
  }, [user]);

  const isDomainAllowed = useMemo(() => {
    if (!authUser?.email) return false;
    return isEmailAllowed(authUser.email, ALLOWED_DOMAIN);
  }, [authUser]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = await getToken();
      return token ?? null;
    } catch (_error) {
      // Avoid logging potentially sensitive error details.
      console.error('Failed to get access token');
      return null;
    }
  }, [getToken]);

  const value: AuthContextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user: authUser,
      isDomainAllowed,
      getAccessToken,
      login: async () => login(),
      logout: async () => logout(),
      register: async () => register(),
    }),
    [
      isAuthenticated,
      isLoading,
      authUser,
      isDomainAllowed,
      getAccessToken,
      login,
      logout,
      register,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: AuthProviderProps) {
  if (IS_DEMO_MODE) {
    return <DemoAuthProvider>{children}</DemoAuthProvider>;
  }

  // Config was validated at module load time, so it's safe to use here
  if (!kindeConfig) {
    throw new Error(
      '[VNlaw Auth] Kinde configuration is missing. This should not happen in production mode.',
    );
  }

  const { domain, clientId, redirectUri, logoutUri } = kindeConfig;

  return (
    <KindeProvider
      domain={domain}
      clientId={clientId}
      redirectUri={redirectUri}
      logoutUri={logoutUri}
    >
      <KindeAuthProvider>{children}</KindeAuthProvider>
    </KindeProvider>
  );
}
