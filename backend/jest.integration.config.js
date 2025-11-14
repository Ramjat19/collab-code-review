module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: [
    '**/integration/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // NO setupFilesAfterEnv - integration tests manage their own DB
  testTimeout: 30000,
  displayName: 'integration'
};
