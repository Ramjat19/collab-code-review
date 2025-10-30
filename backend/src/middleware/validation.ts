import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { sanitizeRegexInput as securitySanitizeRegex } from '../utils/security';

// Custom validation functions
const isValidObjectId = (value: string) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const isValidProjectId = (value: string) => {
  return value === 'global' || value === 'default' || isValidObjectId(value);
};

// Utility function to sanitize regex input to prevent ReDoS attacks
export const sanitizeRegexInput = securitySanitizeRegex;

// Validation result handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? (err as any).path : 'unknown',
        message: err.msg,
        value: err.type === 'field' ? (err as any).value : undefined
      }))
    });
  }
  next();
};

// Auth Validation Schemas
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters'),
  handleValidationErrors
];

export const validateSignup = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
  handleValidationErrors
];

// Pull Request Validation Schemas
export const validateCreatePR = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters')
    .trim(),
  body('sourceBranch')
    .matches(/^[a-zA-Z0-9/_-]+$/)
    .withMessage('Source branch name contains invalid characters'),
  body('targetBranch')
    .matches(/^[a-zA-Z0-9/_-]+$/)
    .withMessage('Target branch name contains invalid characters'),
  body('repository')
    .custom(isValidObjectId)
    .withMessage('Invalid repository ID'),
  handleValidationErrors
];

export const validatePRReview = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid pull request ID'),
  body('decision')
    .isIn(['approved', 'rejected', 'comment'])
    .withMessage('Decision must be approved, rejected, or comment'),
  body('comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Comment cannot exceed 2000 characters')
    .trim(),
  handleValidationErrors
];

// Branch Protection Validation Schemas
export const validateBranchProtectionRules = [
  body('projectId')
    .custom(isValidProjectId)
    .withMessage('Invalid project ID'),
  body('rules.requiredReviewers')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Required reviewers must be between 0 and 10'),
  handleValidationErrors
];

// Merge Validation Schemas
export const validateMerge = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid pull request ID'),
  body('mergeMethod')
    .optional()
    .isIn(['merge', 'squash', 'rebase'])
    .withMessage('Merge method must be merge, squash, or rebase'),
  handleValidationErrors
];

export const validateForceMerge = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid pull request ID'),
  body('reason')
    .isLength({ min: 10, max: 500 })
    .withMessage('Force merge reason must be between 10 and 500 characters')
    .trim(),
  body('mergeMethod')
    .optional()
    .isIn(['merge', 'squash', 'rebase'])
    .withMessage('Merge method must be merge, squash, or rebase'),
  handleValidationErrors
];

// Generic ID Validation
export const validateObjectId = (paramName: string = 'id') => [
  param(paramName)
    .custom(isValidObjectId)
    .withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

// Query Parameter Validation
export const validateProjectQuery = [
  query('projectId')
    .optional()
    .custom(isValidProjectId)
    .withMessage('Invalid project ID in query'),
  handleValidationErrors
];

// Pull Request Query Validation
export const validatePRQuery = [
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?'"()]+$/)
    .withMessage('Search query contains invalid characters'),
  query('status')
    .optional()
    .isIn(['open', 'closed', 'merged', 'all'])
    .withMessage('Status must be open, closed, merged, or all'),
  query('assignedTo')
    .optional()
    .isIn(['me', 'unassigned'])
    .withMessage('AssignedTo must be me or unassigned'),
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];