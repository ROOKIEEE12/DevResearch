import { ResearchSession } from '@/types/research';
import { MOCK_SESSIONS } from './mock-data';

const SESSIONS_STORAGE_KEY = 'devresearch_sessions_v1';
const ACTIVE_SESSION_STORAGE_KEY = 'devresearch_active_session_id_v1';

/**
 * Loads sessions from localStorage with fallback to MOCK_SESSIONS
 */
export function loadSavedSessions(): ResearchSession[] {
  if (typeof window === 'undefined') {
    return MOCK_SESSIONS;
  }

  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) {
      // First visit: save initial mock sessions
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(MOCK_SESSIONS));
      return MOCK_SESSIONS;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }

    return MOCK_SESSIONS;
  } catch (err) {
    console.error('Failed to load sessions from localStorage:', err);
    return MOCK_SESSIONS;
  }
}

/**
 * Saves sessions to localStorage
 */
export function saveSessions(sessions: ResearchSession[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to save sessions to localStorage:', err);
  }
}

/**
 * Loads the last active session ID from localStorage
 */
export function loadActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Saves the active session ID to localStorage
 */
export function saveActiveSessionId(id: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    if (id) {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save active session ID to localStorage:', err);
  }
}

