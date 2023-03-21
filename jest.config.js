module.exports = {
  setupFiles: ["<rootDir>/.jest/setEnvVars.js"],
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  collectCoverage: true,
};
