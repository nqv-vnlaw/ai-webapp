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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider>
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
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

