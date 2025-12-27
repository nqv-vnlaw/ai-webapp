/**
 * Toast Component
 *
 * Individual toast notification component with variants and animations.
 * Uses only Tailwind CSS for styling.
 *
 * Reference: FR-ERR-01
 */

import { useEffect, useState, useCallback } from 'react';

/**
 * Toast type variants
 */
export type ToastType = 'error' | 'success' | 'warning' | 'info';

/**
 * Toast props
 */
export interface ToastProps {
  /**
   * Unique identifier for the toast
   */
  id: string;

  /**
   * Toast message to display
   */
  message: string;

  /**
   * Toast type (determines styling)
   */
  type: ToastType;

  /**
   * Optional request ID for support reference
   */
  requestId?: string;

  /**
   * Callback when toast is dismissed
   */
  onDismiss: (id: string) => void;

  /**
   * Auto-dismiss duration in milliseconds (default: 5000)
   * Set to 0 to disable auto-dismiss
   */
  duration?: number;
}

/**
 * Get styles for toast type
 */
function getToastStyles(type: ToastType): {
  container: string;
  icon: string;
  iconPath: string;
} {
  switch (type) {
    case 'error':
      return {
        container: 'bg-red-50 border-red-200 text-red-800',
        icon: 'text-red-500',
        iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      };
    case 'success':
      return {
        container: 'bg-green-50 border-green-200 text-green-800',
        icon: 'text-green-500',
        iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      };
    case 'warning':
      return {
        container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        icon: 'text-yellow-500',
        iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      };
    case 'info':
      return {
        container: 'bg-blue-50 border-blue-200 text-blue-800',
        icon: 'text-blue-500',
        iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      };
  }
}

/**
 * Toast component
 *
 * Displays a toast notification with animations and auto-dismiss.
 *
 * @example
 * ```tsx
 * <Toast
 *   id="toast-1"
 *   message="Operation successful!"
 *   type="success"
 *   onDismiss={(id) => removeToast(id)}
 * />
 * ```
 */
export function Toast({
  id,
  message,
  type,
  requestId,
  onDismiss,
  duration = 5000,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const styles = getToastStyles(type);

  const handleDismiss = useCallback(() => {
    setIsLeaving(true);
    // Wait for exit animation before removing
    setTimeout(() => {
      onDismiss(id);
    }, 300);
  }, [id, onDismiss]);

  // Enter animation
  useEffect(() => {
    // Small delay to trigger enter animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(handleDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, handleDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        w-full max-w-sm p-4 border rounded-lg shadow-lg
        transition-all duration-300 ease-in-out
        ${styles.container}
        ${isVisible && !isLeaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={styles.iconPath}
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">
            {message}
          </p>
          {requestId && (
            <p className="mt-1 text-xs opacity-75">
              Request ID: <code className="font-mono">{requestId}</code>
            </p>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className={`
            flex-shrink-0 p-1 rounded-md
            hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
            transition-colors
          `}
          aria-label="Dismiss notification"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
