/**
 * Message caching utility for A/B testing
 * Stores messages in localStorage to ensure each user sees the same message
 * for a given context/stage until they complete the expected action.
 */

interface CachedMessage {
  id: number;
  message_text: string;
  context: string;
  tone?: string;
  length?: string;
  cachedAt: number; // timestamp
}

const CACHE_PREFIX = 'journal_message_';

/**
 * Generate cache key based on context and user state
 */
function getCacheKey(context: string, userState?: string): string {
  if (userState) {
    return `${CACHE_PREFIX}${context}_${userState}`;
  }
  return `${CACHE_PREFIX}${context}`;
}

/**
 * Get cached message for a specific context and user state
 * Returns null if no cached message exists or if cache is invalid
 */
export function getCachedMessage(
  context: string,
  userState?: string
): CachedMessage | null {
  try {
    const key = getCacheKey(context, userState);
    const cached = localStorage.getItem(key);

    if (!cached) {
      return null;
    }

    const message: CachedMessage = JSON.parse(cached);

    // Validate message structure
    if (!message.id || !message.message_text) {
      clearCachedMessage(context, userState);
      return null;
    }

    return message;
  } catch (error) {
    console.error('Error reading cached message:', error);
    return null;
  }
}

/**
 * Cache a message for a specific context and user state
 */
export function setCachedMessage(
  message: any,
  context: string,
  userState?: string
): void {
  try {
    const key = getCacheKey(context, userState);
    const cached: CachedMessage = {
      id: message.id,
      message_text: message.message_text,
      context: message.context,
      tone: message.tone,
      length: message.length,
      cachedAt: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error('Error caching message:', error);
  }
}

/**
 * Clear cached message for a specific context and user state
 * Call this when user completes the expected action for this stage
 */
export function clearCachedMessage(
  context: string,
  userState?: string
): void {
  try {
    const key = getCacheKey(context, userState);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cached message:', error);
  }
}

/**
 * Clear all cached messages
 * Useful for testing or if user logs out
 */
export function clearAllCachedMessages(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing all cached messages:', error);
  }
}
