module.exports = {
  "roots": [
    "<rootDir>/src"
  ],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/*.test.ts'],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
}