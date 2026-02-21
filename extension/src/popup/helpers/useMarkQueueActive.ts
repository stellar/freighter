import { useEffect, useRef } from "react";
import { markQueueActive } from "@shared/api/internal";

/**
 * Hook to mark a queue item as active while the popup is open.
 * This prevents the queue cleanup from removing items that the user is actively viewing.
 *
 * @param uuid - The UUID of the queue item to keep active
 */
export const useMarkQueueActive = (uuid: string) => {
  const hasMarkedActive = useRef(false);

  useEffect(() => {
    if (!uuid) {
      return;
    }

    // Mark as active when the component mounts
    markQueueActive({ uuid, isActive: true });
    hasMarkedActive.current = true;

    // Mark as inactive when the component unmounts
    const cleanup = () => {
      if (hasMarkedActive.current) {
        markQueueActive({ uuid, isActive: false });
        hasMarkedActive.current = false;
      }
    };

    // Handle window close/navigation
    const handleBeforeUnload = () => {
      cleanup();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanup();
    };
  }, [uuid]);
};
