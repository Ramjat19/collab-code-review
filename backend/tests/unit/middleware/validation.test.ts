/**
 * Unit Tests for Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  validateLogin,
  validateSignup,
  validateCreatePR,
  validatePRReview,
  validateBranchProtectionRules,
  handleValidationErrors
} from '../../../src/middleware/validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  const runValidation = async (validations: any[]) => {
    for (const validation of validations) {
      await validation(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
    }
  };

  describe('Login Validation', () => {
    it('should accept valid login credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'validPassword123'
      };

      await runValidation(validateLogin);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject invalid email format', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'password123'
      };

      await runValidation(validateLogin);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed'
        })
      );
    });

    it('should reject missing password', async () => {
      mockRequest.body = {
        email: 'test@example.com'
        // password missing
      };

      await runValidation(validateLogin);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject short password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: '12345' // Less than 6 characters
      };

      await runValidation(validateLogin);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Signup Validation', () => {
    it('should accept valid signup data', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123'
      };

      await runValidation(validateSignup);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject short username', async () => {
      mockRequest.body = {
        username: 'ab', // Too short
        email: 'test@example.com',
        password: 'password123'
      };

      await runValidation(validateSignup);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject username with special characters', async () => {
      mockRequest.body = {
        username: 'test@user!', // Invalid characters
        email: 'test@example.com',
        password: 'password123'
      };

      await runValidation(validateSignup);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject weak password', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: '1234567' // Less than 8 characters
      };

      await runValidation(validateSignup);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should accept valid special characters in username', async () => {
      mockRequest.body = {
        username: 'test-user_123',
        email: 'test@example.com',
        password: 'SecurePass123'
      };

      await runValidation(validateSignup);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Create PR Validation', () => {
    it('should accept valid PR data', async () => {
      mockRequest.body = {
        title: 'Fix bug in authentication',
        description: 'This PR fixes the login issue',
        sourceBranch: 'feature/fix-auth',
        targetBranch: 'main',
        repository: '507f1f77bcf86cd799439011' // Valid ObjectId
      };

      await runValidation(validateCreatePR);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject invalid branch name', async () => {
      mockRequest.body = {
        title: 'Test PR',
        sourceBranch: 'feature/fix auth', // Space is invalid
        targetBranch: 'main',
        repository: '507f1f77bcf86cd799439011'
      };

      await runValidation(validateCreatePR);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid repository ID', async () => {
      mockRequest.body = {
        title: 'Test PR',
        sourceBranch: 'feature/test',
        targetBranch: 'main',
        repository: 'invalid-id'
      };

      await runValidation(validateCreatePR);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject title that is too long', async () => {
      mockRequest.body = {
        title: 'a'.repeat(201), // Exceeds 200 character limit
        sourceBranch: 'feature/test',
        targetBranch: 'main',
        repository: '507f1f77bcf86cd799439011'
      };

      await runValidation(validateCreatePR);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('PR Review Validation', () => {
    it('should accept valid review', async () => {
      mockRequest.params = {
        id: '507f1f77bcf86cd799439011'
      };
      mockRequest.body = {
        decision: 'approved',
        comment: 'Looks good!'
      };

      await runValidation(validatePRReview);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject invalid decision', async () => {
      mockRequest.params = {
        id: '507f1f77bcf86cd799439011'
      };
      mockRequest.body = {
        decision: 'invalid-decision',
        comment: 'Test'
      };

      await runValidation(validatePRReview);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid PR ID', async () => {
      mockRequest.params = {
        id: 'invalid-id'
      };
      mockRequest.body = {
        decision: 'approved'
      };

      await runValidation(validatePRReview);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Branch Protection Validation', () => {
    it('should accept valid branch protection rules', async () => {
      mockRequest.body = {
        projectId: '507f1f77bcf86cd799439011',
        rules: {
          requiredReviewers: 2
        }
      };

      await runValidation(validateBranchProtectionRules);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should accept special project IDs', async () => {
      mockRequest.body = {
        projectId: 'global',
        rules: {
          requiredReviewers: 1
        }
      };

      await runValidation(validateBranchProtectionRules);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject too many required reviewers', async () => {
      mockRequest.body = {
        projectId: '507f1f77bcf86cd799439011',
        rules: {
          requiredReviewers: 15 // Exceeds max of 10
        }
      };

      await runValidation(validateBranchProtectionRules);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle SQL injection attempts', async () => {
      mockRequest.body = {
        username: "admin'--",
        email: 'test@example.com',
        password: 'password123'
      };

      await runValidation(validateSignup);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle empty request body', async () => {
      mockRequest.body = {};

      await runValidation(validateLogin);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should normalize email to lowercase', async () => {
      mockRequest.body = {
        email: 'Test@Example.COM',
        password: 'password123'
      };

      // Run validation middlewares (excluding the error handler)
      for (const validation of validateLogin.slice(0, -1)) {
        await validation(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }

      // Email should be normalized
      expect(mockRequest.body.email).toBe('test@example.com');
    });
  });
});

