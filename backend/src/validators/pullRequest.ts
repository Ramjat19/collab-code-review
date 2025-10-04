import { body, param, query } from 'express-validator';

export const validateCreatePR = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format'),
  
  body('sourceBranch')
    .notEmpty()
    .withMessage('Source branch is required')
    .matches(/^[a-zA-Z0-9/_-]+$/)
    .withMessage('Invalid branch name format'),
  
  body('targetBranch')
    .notEmpty()
    .withMessage('Target branch is required')
    .matches(/^[a-zA-Z0-9/_-]+$/)
    .withMessage('Invalid branch name format'),
  
  body('files')
    .isArray({ min: 1 })
    .withMessage('At least one file change is required'),
  
  body('files.*.path')
    .notEmpty()
    .withMessage('File path is required'),
  
  body('files.*.changeType')
    .isIn(['added', 'modified', 'deleted'])
    .withMessage('Invalid change type'),
  
  body('assignees')
    .optional()
    .isArray()
    .withMessage('Assignees must be an array'),
  
  body('assignees.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid assignee ID format')
];

export const validateAddComment = [
  param('id')
    .isMongoId()
    .withMessage('Invalid pull request ID format'),
  
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  
  body('filePath')
    .optional()
    .notEmpty()
    .withMessage('File path cannot be empty if provided'),
  
  body('lineNumber')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Line number must be a positive integer')
];

export const validateSubmitReview = [
  param('id')
    .isMongoId()
    .withMessage('Invalid pull request ID format'),
  
  body('decision')
    .isIn(['approved', 'changes_requested', 'commented'])
    .withMessage('Invalid review decision'),
  
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Review comment cannot exceed 1000 characters')
];

export const validateUpdateStatus = [
  param('id')
    .isMongoId()
    .withMessage('Invalid pull request ID format'),
  
  body('status')
    .isIn(['open', 'closed', 'merged', 'draft'])
    .withMessage('Invalid status value')
];

export const validateGetPRsByRepository = [
  param('projectId')
    .isMongoId()
    .withMessage('Invalid project ID format'),
  
  query('status')
    .optional()
    .isIn(['open', 'closed', 'merged', 'draft'])
    .withMessage('Invalid status filter'),
  
  query('author')
    .optional()
    .isMongoId()
    .withMessage('Invalid author ID format')
];

export const validateGetPRById = [
  param('id')
    .isMongoId()
    .withMessage('Invalid pull request ID format')
];