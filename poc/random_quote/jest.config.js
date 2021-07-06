module.exports = {
  "roots": [
    "<rootDir>/src"
  ],
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/"
  ],
  coverageProvider: "v8",
  coverageThreshold: {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": -10
    }
  },
  testPathIgnorePatterns: [
    "/node_modules/"
  ],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/*.test.ts'],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
}