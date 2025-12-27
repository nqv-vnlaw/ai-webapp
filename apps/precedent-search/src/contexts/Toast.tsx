/**
 * ToastProvider Context
 *
 * Provides toast notification functionality throughout the application.
 * Manages toast state and provides helper functions for showing toasts.
 *
 * Reference: FR-ERR-01
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { ToastContainer, type ToastData } from '../components/error/ToastContainer';
import type { ToastType } from '../components/error/Toast';

/**
 * Options for showing a toast
 */
export interface ShowToastOptions {
  /**
   * Optional request ID for support reference
   */
  requestId?: string;

  /**
   * Auto-dismiss duration in milliseconds (default: 5000)
   * Set to 0 to disable auto-dismiss
   */
  duration?: number;
}

/**
 * Toast context value
 */
interface ToastContextValue {
  /**
   * Show a toast notification
   */
  showToast: (message: string, type: ToastType, options?: ShowToastOptions) => void;

  /**
   * Show an error toast (convenience function)
   */
  showError: (message: string, requestId?: string) => void;

  /**
   * Show a success toast (convenience function)
   */
  showSuccess: (message: string) => void;

  /**
   * Show a warning toast (convenience function)
   */
  showWarning: (message: string) => void;

  /**
   * Show an info toast (convenience function)
   */
  showInfo: (message: string) => void;

  /**
   * Dismiss a specific toast by ID
   */
  dismissToast: (id: string) => void;

  /**
   * Dismiss all toasts
   */
  dismissAll: () => void;
}

/**
 * Default context value (no-op functions)
 */
const defaultContextValue: ToastContextValue = {
  showToast: () => {},
  showError: () => {},
  showSuccess: () => {},
  showWarning: () => {},
  showInfo: () => {},
  dismissToast: () => {},
  dismissAll: () => {},
};

/**
 * Toast context
 */
const ToastContext = createContext<ToastContextValue>(defaultContextValue);

/**
 * Generate unique toast ID
 */
function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Props for ToastProvider
 */
export interface ToastProviderProps {
  children: ReactNode;

  /**
   * Maximum number of visible toasts (default: 5)
   */
  maxVisible?: number;

  /**
   * Default toast duration in milliseconds (default: 5000)
   */
  defaultDuration?: number;
}

/**
 * ToastProvider component
 *
 * Wrap your app with this provider to enable toast notifications.
 *
 * @example
 * ```tsx
 * // In App.tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 *
 * // In any component
 * const { showSuccess, showError } = useToast();
 * showSuccess('Operation completed!');
 * showError('Something went wrong', 'req-123');
 * ```
 */
export function ToastProvider({
  children,
  maxVisible = 5,
  defaultDuration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType, options?: ShowToastOptions) => {
      const newToast: ToastData = {
        id: generateToastId(),
        message,
        type,
        requestId: options?.requestId,
        duration: options?.duration ?? defaultDuration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    [defaultDuration]
  );

  const showError = useCallback(
    (message: string, requestId?: string) => {
      showToast(message, 'error', { requestId, duration: 8000 }); // Errors stay longer
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string) => {
      showToast(message, 'success');
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string) => {
      showToast(message, 'warning', { duration: 6000 });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string) => {
      showToast(message, 'info');
    },
    [showToast]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextValue = {
    showToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    dismissToast,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        maxVisible={maxVisible}
      />
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast functions
 *
 * @returns Toast context value with showToast, showError, showSuccess, etc.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { showSuccess, showError } = useToast();
 *
 *   const handleSubmit = async () => {
 *     try {
 *       await submitData();
 *       showSuccess('Data saved successfully!');
 *     } catch (error) {
 *       showError('Failed to save data', error.requestId);
 *     }
 *   };
 *
 *   return <button onClick={handleSubmit}>Submit</button>;
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context;
}
