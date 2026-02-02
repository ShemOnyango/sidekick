module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage/unit',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/**/*.test.js',
    '!src/config/database.js' // Exclude database config from coverage
  ],
  testMatch: [
    '**/tests/unit/**/*.test.js'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.js'],
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
