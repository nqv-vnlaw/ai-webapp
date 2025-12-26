/**
 * ChatSkeleton Component
 *
 * Loading skeleton for chat messages during API calls.
 * Shows animated placeholder for assistant message generation.
 *
 * Reference: FR-CHAT-02
 */

export interface ChatSkeletonProps {
  /**
   * Number of skeleton lines to show (default: 3)
   */
  lines?: number;
}

export function ChatSkeleton({ lines = 3 }: ChatSkeletonProps) {
  return (
    <div className="flex gap-3 justify-start">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 animate-pulse" />

      {/* Message skeleton */}
      <div className="flex flex-col gap-2 max-w-[80%]">
        <div className="bg-gray-100 rounded-lg px-4 py-3 space-y-2">
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={`h-4 bg-gray-200 rounded animate-pulse ${
                index === lines - 1 ? 'w-3/4' : 'w-full'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

