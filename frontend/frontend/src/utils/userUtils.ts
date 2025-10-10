/**
 * Utility functions for user-related operations
 */

export interface User {
  _id?: string;
  username?: string;
  email?: string;
}

/**
 * Safely get the first character of a username for avatar display
 */
export const getUserInitial = (user: User | undefined | null): string => {
  return user?.username?.charAt(0)?.toUpperCase() || '?';
};

/**
 * Safely get a username with fallback
 */
export const getUsername = (user: User | undefined | null): string => {
  return user?.username || 'Unknown';
};

/**
 * Safely get user email with fallback
 */
export const getUserEmail = (user: User | undefined | null): string => {
  return user?.email || 'Unknown';
};

/**
 * Check if user object has valid data
 */
export const isValidUser = (user: unknown): user is User => {
  return user !== null && typeof user === 'object' && 'username' in user && typeof (user as { username: unknown }).username === 'string';
};