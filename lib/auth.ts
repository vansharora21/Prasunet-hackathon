'use client';

/**
 * Static demo authentication for Causeway.
 *
 * No backend — credentials are checked against a hardcoded demo account and
 * the session is kept in sessionStorage. Good enough for a hackathon demo;
 * swap for a real auth provider (NextAuth, Supabase Auth, etc.) later.
 */

const AUTH_KEY = 'causeway:auth';
const SESSION_KEY = 'causeway:user';

export const DEMO_CREDENTIALS = {
  email: 'admin@causeway.com',
  password: 'admin123',
};

export type AuthUser = {
  name: string;
  role: string;
  email: string;
};

const DEMO_USER: AuthUser = {
  name: 'Arjun Mehta',
  role: 'Senior Investigator',
  email: DEMO_CREDENTIALS.email,
};

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(AUTH_KEY) === '1';
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Validate static credentials. Returns the user on success, null on failure.
 */
export function login(email: string, password: string): AuthUser | null {
  const ok =
    email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
    password === DEMO_CREDENTIALS.password;

  if (!ok) return null;

  window.sessionStorage.setItem(AUTH_KEY, '1');
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_USER));
  return DEMO_USER;
}

export function logout(): void {
  window.sessionStorage.removeItem(AUTH_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
}