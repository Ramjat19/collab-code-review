/**
 * Unit Tests for Auth Middleware
 */

import jwt from 'jsonwebtoken';
import authMiddleware, { AuthRequest } from '../../../src/middleware/auth';
import { Response, NextFunction } from 'express';

describe('Auth Middleware', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  it('should authenticate request with valid token', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser'
    };

    const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });
    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.id).toBe(mockUser.id);
    expect(mockRequest.user?.email).toBe(mockUser.email);
  });

  it('should reject request without authorization header', () => {
    authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String)
      })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject request with malformed authorization header', () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat token123'
    };

    authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject request with invalid token', () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid.token.here'
    };

    authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String)
      })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject request with expired token', () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const expiredToken = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '-1h' });

    mockRequest.headers = {
      authorization: `Bearer ${expiredToken}`
    };

    authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject token signed with wrong secret', () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const wrongToken = jwt.sign(mockUser, 'wrong-secret', { expiresIn: '1h' });

    mockRequest.headers = {
      authorization: `Bearer ${wrongToken}`
    };

    authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle authorization header without Bearer prefix', () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });

    mockRequest.headers = {
      authorization: token // Missing "Bearer " prefix
    };

    authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should attach full user payload to request', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin'
    };

    const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });
    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.user).toMatchObject(mockUser);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should handle case-insensitive Bearer prefix', () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });

    mockRequest.headers = {
      authorization: `bearer ${token}` // lowercase
    };

    // Note: Standard implementation is case-sensitive
    // This test documents expected behavior
    authMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    // Should fail because "bearer" !== "Bearer"
    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });
});
