// backend/jest.config.js
export default {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js'],
  transform: {},
  testTimeout: 10000,
  // Force exit after tests complete
  forceExit: true,
  // Detect open handles
  detectOpenHandles: false,
};