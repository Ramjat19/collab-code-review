/**
 * Security utilities for preventing common web application vulnerabilities
 */

import mongoose from 'mongoose';

/**
 * Validates that an input is a primitive string (prevents NoSQL injection)
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns boolean indicating if value is a safe string
 */
export const isSecureString = (value: any, fieldName?: string): value is string => {
  if (typeof value !== 'string') {
    console.log(`Security: Rejected non-string input for ${fieldName || 'field'}: ${typeof value}`);
    return false;
  }
  return true;
};

/**
 * Validates multiple fields are secure strings
 * @param fields - Object with field names and values
 * @returns Object with validation results
 */
export const validateSecureStrings = (fields: Record<string, any>) => {
  const invalidFields: string[] = [];
  
  for (const [fieldName, value] of Object.entries(fields)) {
    if (!isSecureString(value, fieldName)) {
      invalidFields.push(fieldName);
    }
  }
  
  return {
    isValid: invalidFields.length === 0,
    invalidFields
  };
};

/**
 * Sanitizes regex input to prevent ReDoS attacks
 * @param input - The input string to sanitize
 * @param maxLength - Maximum allowed length (default: 50)
 * @returns Sanitized string safe for regex usage
 */
export const sanitizeRegexInput = (input: string, maxLength: number = 50): string => {
  if (!isSecureString(input)) {
    return '';
  }
  
  // Escape special regex characters and limit length
  return input
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .substring(0, maxLength); // Limit length to prevent ReDoS
};

/**
 * Validates that a value is a valid MongoDB ObjectId
 * @param value - The value to validate
 * @returns boolean indicating if value is valid ObjectId
 */
export const isValidObjectId = (value: any): value is string => {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
};

/**
 * Validates that a value is a valid project ID (ObjectId, 'global', or 'default')
 * @param value - The value to validate
 * @returns boolean indicating if value is valid project ID
 */
export const isValidProjectId = (value: any): value is string => {
  return typeof value === 'string' && 
         (value === 'global' || value === 'default' || mongoose.Types.ObjectId.isValid(value));
};

/**
 * Sanitizes pagination parameters
 * @param page - Page number
 * @param limit - Items per page
 * @returns Sanitized pagination object
 */
export const sanitizePagination = (page: any, limit: any) => {
  const pageNum = Math.max(1, Math.min(1000, parseInt(page as string) || 1));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 10));
  
  return {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum
  };
};

/**
 * Creates a secure filter object for database queries
 * @param baseFilter - Base filter object
 * @param allowedFields - Array of allowed field names
 * @param inputFilter - User-provided filter object
 * @returns Sanitized filter object
 */
export const createSecureFilter = (
  baseFilter: Record<string, any>, 
  allowedFields: string[], 
  inputFilter: Record<string, any>
): Record<string, any> => {
  const secureFilter = { ...baseFilter };
  
  for (const [key, value] of Object.entries(inputFilter)) {
    if (allowedFields.includes(key) && isSecureString(value)) {
      secureFilter[key] = value;
    }
  }
  
  return secureFilter;
};

/**
 * Logs security events for monitoring
 * @param event - Type of security event
 * @param details - Additional details about the event
 * @param request - Express request object (optional)
 */
export const logSecurityEvent = (
  event: string, 
  details: string, 
  request?: any
) => {
  const timestamp = new Date().toISOString();
  const ip = request?.ip || 'unknown';
  const userId = request?.user?.id || 'anonymous';
  const username = request?.user?.username || 'anonymous';
  
  console.log(`[SECURITY] ${timestamp} - ${event}: ${details} | IP: ${ip} | User: ${username}(${userId})`);
};