module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/integration/'  // Exclude integration tests from default runs
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/middleware/auth.ts',
    'src/middleware/validation.ts',
    'src/services/NotificationService.ts',
    '!src/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  // Coverage thresholds for tested modules only
  coverageThreshold: {
    'src/utils/security.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/middleware/auth.ts': {
      branches: 75,
      functions: 100,
      lines: 90,
      statements: 90
    },
    'src/middleware/validation.ts': {
      branches: 70,
      functions: 80,
      lines: 96,
      statements: 96
    }
  },
  coverageReporters: ['text', 'lcov', 'html']
};