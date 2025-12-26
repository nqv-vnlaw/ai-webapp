import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@vnlaw/auth';
import { ProtectedRoute } from '@vnlaw/auth';
import { ApiClientProvider } from '@vnlaw/api-client';
import { createQueryClient } from './lib/query-client';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './routes/login';
import { CallbackPage } from './routes/callback';
import { AccessDeniedPage } from './routes/access-denied';
import { IndexPage } from './routes/index';

// Create QueryClient instance (singleton)
const queryClient = createQueryClient();

function App() {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  return (
    <QueryClientProvider client={queryClient}>
      {isDemoMode && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-200 text-yellow-900 border-b-2 border-orange-500 py-2 px-4 text-center text-sm font-semibold">
          ⚠️ DEMO MODE - Using mock data - Not connected to real services
        </div>
      )}
      <AuthProvider>
        <ApiClientProvider>
          <div className={isDemoMode ? 'pt-12' : undefined}>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/callback" element={<CallbackPage />} />
                <Route path="/access-denied" element={<AccessDeniedPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <IndexPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </div>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
