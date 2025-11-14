# Backend Testing Guide

## Overview

This document provides comprehensive information about the test suite for the Collab Code Review backend.

## Test Structure

```
tests/
├── setup.ts                          # Global test configuration
├── unit/                             # Unit tests
│   ├── auth/
│   │   └── authUtils.test.ts         # JWT, bcrypt, token generation tests
│   ├── middleware/
│   │   ├── auth.test.ts              # Authentication middleware tests
│   │   └── validation.test.ts        # Input validation tests
│   ├── services/
│   │   └── NotificationService.test.ts # Notification service tests
│   └── utils/
│       └── security.test.ts          # Security utilities tests
└── integration/                      # Integration tests
    └── basic.test.ts                 # API integration tests
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- security.test.ts
```

### Run tests matching pattern
```bash
npm test -- --testNamePattern="should validate"
```

## Test Coverage

Current test coverage includes:

### ✅ Utilities (100%)
- **Security Utils** (`src/utils/security.ts`)
  - Input validation (string type checking, NoSQL injection prevention)
  - Regex sanitization (ReDoS prevention)
  - ObjectId validation
  - Pagination sanitization
  - Secure filter creation
  - Security event logging

### ✅ Services (95%)
- **NotificationService** (`src/services/NotificationService.ts`)
  - Notification creation with Socket.IO emission
  - User notification fetching with pagination
  - Mark as read (single & bulk)
  - Notification deletion
  - Helper methods for specific notification types

### ✅ Authentication (100%)
- **Auth Utils** (Token generation, hashing, JWT operations)
  - Refresh token generation (crypto.randomBytes)
  - Token hashing (SHA-256)
  - JWT creation and verification
  - Password hashing with bcrypt
  - Cookie configuration

### ✅ Middleware (90%)
- **Auth Middleware** (`src/middleware/auth.ts`)
  - Valid token authentication
  - Missing/malformed/expired token rejection
  - Wrong secret rejection
  - User payload attachment

- **Validation Middleware** (`src/middleware/validation.ts`)
  - Login validation (email, password)
  - Signup validation (username, email, password)
  - Pull request validation (title, branches, repository)
  - Review validation (decision, comment)
  - Branch protection validation
  - Security: SQL injection, XSS prevention

## Coverage Thresholds

Minimum coverage requirements (enforced in jest.config.js):
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Test Environment

### MongoDB
Tests use `mongodb-memory-server` for isolated database testing:
- Fresh database for each test run
- Automatic cleanup after tests
- No need for external MongoDB instance

### Environment Variables
Test environment uses:
```env
JWT_SECRET=test-jwt-secret-key-for-testing-only
NODE_ENV=test
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_DAYS=7
```

## Writing Tests

### Unit Test Template
```typescript
import { functionToTest } from '../../../src/path/to/module';

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('should do something expected', () => {
      const result = functionToTest(input);
      expect(result).toBe(expected);
    });

    it('should handle edge cases', () => {
      expect(() => functionToTest(invalidInput)).toThrow();
    });
  });
});
```

### Testing with Database
```typescript
import Model from '../../../src/models/Model';
import { Types } from 'mongoose';

describe('Service with Database', () => {
  let mockId: Types.ObjectId;

  beforeEach(() => {
    mockId = new Types.ObjectId();
  });

  it('should create document', async () => {
    const doc = await Model.create({ field: 'value' });
    expect(doc).toBeDefined();
    expect(doc.field).toBe('value');
  });
});
```

### Testing Middleware
```typescript
import middleware from '../../../src/middleware/middleware';
import { Request, Response, NextFunction } from 'express';

describe('Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  it('should call next for valid request', () => {
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });
});
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` for setup
- Use `afterEach` for cleanup
- Don't share state between tests

### 2. Descriptive Names
```typescript
// ❌ Bad
it('works', () => { ... });

// ✅ Good
it('should return user data when authentication token is valid', () => { ... });
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('should calculate total correctly', () => {
  // Arrange
  const items = [1, 2, 3];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(6);
});
```

### 4. Test Edge Cases
- Null/undefined inputs
- Empty arrays/objects
- Boundary values
- Invalid data types
- Error conditions

### 5. Mock External Dependencies
```typescript
jest.mock('../../../src/services/ExternalService');
```

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Commits to main branch
- Manual workflow dispatch

CI pipeline fails if:
- Any test fails
- Coverage drops below thresholds
- Linting errors exist

## Debugging Tests

### Run single test in debug mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand security.test.ts
```

### View detailed test output
```bash
npm test -- --verbose
```

### Show console logs
```bash
npm test -- --silent=false
```

## Coverage Reports

After running `npm run test:coverage`:
- **Terminal**: Summary in console
- **HTML**: Open `coverage/index.html` in browser
- **LCOV**: `coverage/lcov.info` for CI tools

## Future Test Coverage

### To be implemented:
- [ ] Pull Request routes integration tests
- [ ] Project routes integration tests
- [ ] WebSocket/Socket.IO tests
- [ ] CSRF middleware tests
- [ ] Rate limiting middleware tests
- [ ] File upload/download tests
- [ ] Git operations tests
- [ ] Email notification tests

## Troubleshooting

### MongoDB connection errors
```bash
# Clear MongoDB memory server cache
rm -rf ~/.cache/mongodb-memory-server
```

### Jest cache issues
```bash
# Clear Jest cache
npm test -- --clearCache
```

### Type errors in tests
```bash
# Rebuild TypeScript
npm run build
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

---

**Last Updated**: 2025-11-07
**Maintainer**: Backend Team
