import { KindeProvider } from '@kinde-oss/kinde-auth-react';
import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const domain = (import.meta as any).env?.VITE_KINDE_DOMAIN;
  const clientId = (import.meta as any).env?.VITE_KINDE_CLIENT_ID;
  const redirectUri = (import.meta as any).env?.VITE_KINDE_REDIRECT_URI;
  const logoutUri = (import.meta as any).env?.VITE_KINDE_LOGOUT_URI;

  if (!domain || !clientId || !redirectUri || !logoutUri) {
    throw new Error(
      'Missing required Kinde environment variables. Please check your .env file.',
    );
  }

  return (
    <KindeProvider
      domain={domain}
      clientId={clientId}
      redirectUri={redirectUri}
      logoutUri={logoutUri}
    >
      {children}
    </KindeProvider>
  );
}

