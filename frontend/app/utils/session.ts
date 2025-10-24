// Utility to generate and manage session IDs for tracking
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('session_id');

  if (!sessionId) {
    // Generate a unique session ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('session_id', sessionId);
  }

  return sessionId;
}

// Clear session ID (useful for testing)
export function clearSessionId(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('session_id');
  }
}
