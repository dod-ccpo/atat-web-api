module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/api', '<rootDir>/utils'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  collectCoverage: true,
};
