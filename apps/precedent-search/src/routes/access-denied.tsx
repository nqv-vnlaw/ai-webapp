import { useAuth } from '@vnlaw/auth';
import { useNavigate } from 'react-router-dom';

export function AccessDeniedPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-4 text-gray-600">
            Access to this application is restricted to VNlaw employees with{' '}
            <span className="font-semibold">@vnlaw.com.vn</span> email
            addresses.
          </p>
          {user?.email && (
            <p className="mt-2 text-sm text-gray-500">
              You are signed in as: <span className="font-mono">{user.email}</span>
            </p>
          )}
        </div>
        <div>
          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Sign Out
          </button>
        </div>
        <p className="text-xs text-gray-400">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
}

