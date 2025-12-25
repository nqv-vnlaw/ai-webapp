import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@vnlaw/auth';
import { ProtectedRoute } from '@vnlaw/auth';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './routes/login';
import { CallbackPage } from './routes/callback';
import { AccessDeniedPage } from './routes/access-denied';
import { IndexPage } from './routes/index';

function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}

export default App;

