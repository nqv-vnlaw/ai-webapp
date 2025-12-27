/**
 * ToastContainer Component
 *
 * Container for rendering toast notification stack.
 * Fixed position with proper z-index for layering.
 *
 * Reference: FR-ERR-01
 */

import { Toast, type ToastType } from './Toast';

/**
 * Toast data structure
 */
export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  requestId?: string;
  duration?: number;
}

/**
 * ToastContainer props
 */
export interface ToastContainerProps {
  /**
   * Array of toast data to render
   */
  toasts: ToastData[];

  /**
   * Callback when a toast is dismissed
   */
  onDismiss: (id: string) => void;

  /**
   * Maximum number of toasts to show (default: 5)
   */
  maxVisible?: number;
}

/**
 * ToastContainer component
 *
 * Renders a stack of toast notifications in a fixed position.
 * Limits visible toasts to prevent overwhelming the UI.
 *
 * @example
 * ```tsx
 * <ToastContainer
 *   toasts={toasts}
 *   onDismiss={(id) => removeToast(id)}
 *   maxVisible={5}
 * />
 * ```
 */
export function ToastContainer({
  toasts,
  onDismiss,
  maxVisible = 5,
}: ToastContainerProps) {
  // Show only the most recent toasts
  const visibleToasts = toasts.slice(-maxVisible);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed z-50 bottom-4 right-4 flex flex-col gap-2 max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2 max-sm:bottom-4"
      aria-label="Notifications"
    >
      {visibleToasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          requestId={toast.requestId}
          onDismiss={onDismiss}
          duration={toast.duration}
        />
      ))}
    </div>
  );
}
