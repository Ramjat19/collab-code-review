import { describe, it, expect } from 'vitest';
import {
  getUserInitial,
  getUsername,
  getUserEmail,
  isValidUser,
  type User,
} from './userUtils';

describe('userUtils', () => {
  describe('getUserInitial', () => {
    it('should return first letter uppercase from valid username', () => {
      const user: User = { username: 'john', email: 'john@example.com' };
      expect(getUserInitial(user)).toBe('J');
    });

    it('should return uppercase letter even if username is lowercase', () => {
      const user: User = { username: 'alice', email: 'alice@example.com' };
      expect(getUserInitial(user)).toBe('A');
    });

    it('should handle uppercase username', () => {
      const user: User = { username: 'BOB', email: 'bob@example.com' };
      expect(getUserInitial(user)).toBe('B');
    });

    it('should return "?" for undefined user', () => {
      expect(getUserInitial(undefined)).toBe('?');
    });

    it('should return "?" for null user', () => {
      expect(getUserInitial(null)).toBe('?');
    });

    it('should return "?" for user with undefined username', () => {
      const user: User = { email: 'test@example.com' };
      expect(getUserInitial(user)).toBe('?');
    });

    it('should return "?" for user with empty username', () => {
      const user: User = { username: '', email: 'test@example.com' };
      expect(getUserInitial(user)).toBe('?');
    });

    it('should handle special characters in username', () => {
      const user: User = { username: '!special', email: 'test@example.com' };
      expect(getUserInitial(user)).toBe('!');
    });

    it('should handle numbers in username', () => {
      const user: User = { username: '123user', email: 'test@example.com' };
      expect(getUserInitial(user)).toBe('1');
    });
  });

  describe('getUsername', () => {
    it('should return username for valid user', () => {
      const user: User = { username: 'john_doe', email: 'john@example.com' };
      expect(getUsername(user)).toBe('john_doe');
    });

    it('should return "Unknown" for undefined user', () => {
      expect(getUsername(undefined)).toBe('Unknown');
    });

    it('should return "Unknown" for null user', () => {
      expect(getUsername(null)).toBe('Unknown');
    });

    it('should return "Unknown" for user without username', () => {
      const user: User = { email: 'test@example.com' };
      expect(getUsername(user)).toBe('Unknown');
    });

    it('should return "Unknown" for user with empty username', () => {
      const user: User = { username: '', email: 'test@example.com' };
      expect(getUsername(user)).toBe('Unknown');
    });

    it('should handle username with spaces', () => {
      const user: User = { username: 'John Doe', email: 'john@example.com' };
      expect(getUsername(user)).toBe('John Doe');
    });

    it('should handle username with special characters', () => {
      const user: User = { username: 'user-name_123', email: 'test@example.com' };
      expect(getUsername(user)).toBe('user-name_123');
    });
  });

  describe('getUserEmail', () => {
    it('should return email for valid user', () => {
      const user: User = { username: 'john', email: 'john@example.com' };
      expect(getUserEmail(user)).toBe('john@example.com');
    });

    it('should return "Unknown" for undefined user', () => {
      expect(getUserEmail(undefined)).toBe('Unknown');
    });

    it('should return "Unknown" for null user', () => {
      expect(getUserEmail(null)).toBe('Unknown');
    });

    it('should return "Unknown" for user without email', () => {
      const user: User = { username: 'john' };
      expect(getUserEmail(user)).toBe('Unknown');
    });

    it('should return "Unknown" for user with empty email', () => {
      const user: User = { username: 'john', email: '' };
      expect(getUserEmail(user)).toBe('Unknown');
    });

    it('should handle complex email addresses', () => {
      const user: User = { 
        username: 'john', 
        email: 'john.doe+tag@subdomain.example.com' 
      };
      expect(getUserEmail(user)).toBe('john.doe+tag@subdomain.example.com');
    });
  });

  describe('isValidUser', () => {
    it('should return true for valid user with username', () => {
      const user = { username: 'john', email: 'john@example.com' };
      expect(isValidUser(user)).toBe(true);
    });

    it('should return true for user with only username', () => {
      const user = { username: 'john' };
      expect(isValidUser(user)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidUser(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidUser(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isValidUser('string')).toBe(false);
      expect(isValidUser(123)).toBe(false);
      expect(isValidUser(true)).toBe(false);
    });

    it('should return false for object without username', () => {
      const user = { email: 'test@example.com' };
      expect(isValidUser(user)).toBe(false);
    });

    it('should return false for object with non-string username', () => {
      const user = { username: 123 };
      expect(isValidUser(user)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isValidUser({})).toBe(false);
    });

    it('should return false for array', () => {
      expect(isValidUser([])).toBe(false);
    });

    it('should return true for user with all fields', () => {
      const user = { 
        _id: '123', 
        username: 'john', 
        email: 'john@example.com' 
      };
      expect(isValidUser(user)).toBe(true);
    });

    it('should handle user with empty string username', () => {
      const user = { username: '' };
      expect(isValidUser(user)).toBe(true); // Empty string is still a string
    });
  });
});
