/**
 * Unit Tests for Security Utilities
 */

import {
  isSecureString,
  validateSecureStrings,
  sanitizeRegexInput,
  isValidObjectId,
  isValidProjectId,
  sanitizePagination,
  createSecureFilter,
  logSecurityEvent
} from '../../../src/utils/security';
import mongoose from 'mongoose';

describe('Security Utils - isSecureString', () => {
  it('should return true for valid strings', () => {
    expect(isSecureString('hello')).toBe(true);
    expect(isSecureString('test@example.com')).toBe(true);
    expect(isSecureString('')).toBe(true); // Empty string is still a string
  });

  it('should return false for non-string values', () => {
    expect(isSecureString(123)).toBe(false);
    expect(isSecureString(null)).toBe(false);
    expect(isSecureString(undefined)).toBe(false);
    expect(isSecureString({})).toBe(false);
    expect(isSecureString([])).toBe(false);
    expect(isSecureString({ $gt: '' })).toBe(false); // NoSQL injection attempt
  });

  it('should log rejection with field name', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    isSecureString(123, 'email');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Security: Rejected non-string input for email')
    );
    consoleSpy.mockRestore();
  });
});

describe('Security Utils - validateSecureStrings', () => {
  it('should validate all fields as secure strings', () => {
    const result = validateSecureStrings({
      username: 'john',
      email: 'john@example.com',
      password: 'securePass123'
    });
    
    expect(result.isValid).toBe(true);
    expect(result.invalidFields).toHaveLength(0);
  });

  it('should detect invalid fields', () => {
    const result = validateSecureStrings({
      username: 'john',
      email: { $gt: '' }, // NoSQL injection attempt
      password: 123
    });
    
    expect(result.isValid).toBe(false);
    expect(result.invalidFields).toContain('email');
    expect(result.invalidFields).toContain('password');
    expect(result.invalidFields).toHaveLength(2);
  });

  it('should handle empty objects', () => {
    const result = validateSecureStrings({});
    expect(result.isValid).toBe(true);
    expect(result.invalidFields).toHaveLength(0);
  });
});

describe('Security Utils - sanitizeRegexInput', () => {
  it('should escape special regex characters', () => {
    expect(sanitizeRegexInput('test.*')).toBe('test\\.\\*');
    expect(sanitizeRegexInput('hello[world]')).toBe('hello\\[world\\]');
    expect(sanitizeRegexInput('(a|b)+?')).toBe('\\(a\\|b\\)\\+\\?');
    expect(sanitizeRegexInput('$^{}')).toBe('\\$\\^\\{\\}');
  });

  it('should limit input length to prevent ReDoS', () => {
    const longString = 'a'.repeat(100);
    const result = sanitizeRegexInput(longString, 50);
    expect(result).toHaveLength(50);
  });

  it('should use default max length of 50', () => {
    const longString = 'a'.repeat(100);
    const result = sanitizeRegexInput(longString);
    expect(result).toHaveLength(50);
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeRegexInput(123 as any)).toBe('');
    expect(sanitizeRegexInput(null as any)).toBe('');
    expect(sanitizeRegexInput({} as any)).toBe('');
  });

  it('should handle empty strings', () => {
    expect(sanitizeRegexInput('')).toBe('');
  });
});

describe('Security Utils - isValidObjectId', () => {
  it('should validate correct ObjectIds', () => {
    const validId = new mongoose.Types.ObjectId().toString();
    expect(isValidObjectId(validId)).toBe(true);
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
  });

  it('should reject invalid ObjectIds', () => {
    expect(isValidObjectId('invalid')).toBe(false);
    expect(isValidObjectId('12345')).toBe(false);
    expect(isValidObjectId('')).toBe(false);
    expect(isValidObjectId(null)).toBe(false);
    expect(isValidObjectId(123)).toBe(false);
    expect(isValidObjectId({})).toBe(false);
  });
});

describe('Security Utils - isValidProjectId', () => {
  it('should validate ObjectIds', () => {
    const validId = new mongoose.Types.ObjectId().toString();
    expect(isValidProjectId(validId)).toBe(true);
  });

  it('should validate special project IDs', () => {
    expect(isValidProjectId('global')).toBe(true);
    expect(isValidProjectId('default')).toBe(true);
  });

  it('should reject invalid project IDs', () => {
    expect(isValidProjectId('invalid')).toBe(false);
    expect(isValidProjectId('random')).toBe(false);
    expect(isValidProjectId(123)).toBe(false);
    expect(isValidProjectId(null)).toBe(false);
  });
});

describe('Security Utils - sanitizePagination', () => {
  it('should return valid pagination values', () => {
    const result = sanitizePagination(2, 20);
    expect(result).toEqual({
      page: 2,
      limit: 20,
      skip: 20
    });
  });

  it('should use default values for invalid input', () => {
    const result = sanitizePagination('invalid', 'invalid');
    expect(result).toEqual({
      page: 1,
      limit: 10,
      skip: 0
    });
  });

  it('should enforce minimum values', () => {
    const result = sanitizePagination(0, -5);
    expect(result.page).toBe(1); // 0 becomes 1
    expect(result.limit).toBe(1); // -5 is clamped to 1
    
    // Edge case: 0 uses default (10) due to || operator
    const result2 = sanitizePagination(0, 0);
    expect(result2.page).toBe(1);
    expect(result2.limit).toBe(10); // 0 || 10 = 10
  });

  it('should enforce maximum values', () => {
    const result = sanitizePagination(2000, 500);
    expect(result.page).toBe(1000); // Max page
    expect(result.limit).toBe(100); // Max limit
  });

  it('should calculate skip correctly', () => {
    expect(sanitizePagination(1, 10).skip).toBe(0);
    expect(sanitizePagination(2, 10).skip).toBe(10);
    expect(sanitizePagination(3, 25).skip).toBe(50);
  });

  it('should handle string numbers', () => {
    const result = sanitizePagination('5', '15');
    expect(result.page).toBe(5);
    expect(result.limit).toBe(15);
  });
});

describe('Security Utils - createSecureFilter', () => {
  it('should merge base filter with allowed fields', () => {
    const baseFilter = { project: '123' };
    const allowedFields = ['status', 'priority'];
    const inputFilter = { status: 'open', priority: 'high' };
    
    const result = createSecureFilter(baseFilter, allowedFields, inputFilter);
    
    expect(result).toEqual({
      project: '123',
      status: 'open',
      priority: 'high'
    });
  });

  it('should ignore non-allowed fields', () => {
    const baseFilter = { project: '123' };
    const allowedFields = ['status'];
    const inputFilter = { 
      status: 'open', 
      malicious: 'value',
      $where: 'malicious code'
    };
    
    const result = createSecureFilter(baseFilter, allowedFields, inputFilter);
    
    expect(result).toEqual({
      project: '123',
      status: 'open'
    });
    expect(result).not.toHaveProperty('malicious');
    expect(result).not.toHaveProperty('$where');
  });

  it('should ignore non-string values', () => {
    const baseFilter = { project: '123' };
    const allowedFields = ['status', 'count'];
    const inputFilter = { 
      status: 'open',
      count: { $gt: 10 } // NoSQL injection attempt
    };
    
    const result = createSecureFilter(baseFilter, allowedFields, inputFilter);
    
    expect(result).toEqual({
      project: '123',
      status: 'open'
    });
    expect(result).not.toHaveProperty('count');
  });

  it('should handle empty input filter', () => {
    const baseFilter = { project: '123' };
    const result = createSecureFilter(baseFilter, ['status'], {});
    expect(result).toEqual({ project: '123' });
  });
});

describe('Security Utils - logSecurityEvent', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log basic security event without request', () => {
    logSecurityEvent('TEST_EVENT', 'Test details');
    
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[SECURITY\].*TEST_EVENT: Test details.*IP: unknown.*User: anonymous/)
    );
  });

  it('should log event with request data', () => {
    const mockRequest = {
      ip: '192.168.1.1',
      user: {
        id: 'user123',
        username: 'testuser'
      }
    };
    
    logSecurityEvent('LOGIN_ATTEMPT', 'Failed login', mockRequest);
    
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[SECURITY\].*LOGIN_ATTEMPT: Failed login.*IP: 192\.168\.1\.1.*User: testuser\(user123\)/)
    );
  });

  it('should handle missing user data gracefully', () => {
    const mockRequest = { ip: '10.0.0.1' };
    
    logSecurityEvent('ACCESS_DENIED', 'Unauthorized access', mockRequest);
    
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[SECURITY\].*ACCESS_DENIED.*IP: 10\.0\.0\.1.*User: anonymous/)
    );
  });

  it('should include timestamp in ISO format', () => {
    logSecurityEvent('TEST', 'Test');
    
    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    // Check if message contains ISO timestamp pattern (YYYY-MM-DDTHH:mm:ss)
    expect(loggedMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
