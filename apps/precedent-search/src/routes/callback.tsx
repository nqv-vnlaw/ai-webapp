import { useAuth } from '@vnlaw/auth';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function CallbackPage() {
  const { isAuthenticated, isLoading, isDomainAllowed } = useAuth();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects if auth state updates multiple times
    if (hasRedirected.current || isLoading) {
      return;
    }

    if (isAuthenticated && isDomainAllowed) {
      // Successful authentication with allowed domain
      hasRedirected.current = true;
      navigate('/', { replace: true });
    } else if (isAuthenticated && !isDomainAllowed) {
      // Authenticated but domain not allowed
      hasRedirected.current = true;
      navigate('/access-denied', { replace: true });
    } else {
      // Not authenticated, redirect to login
      hasRedirected.current = true;
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, isDomainAllowed, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}

