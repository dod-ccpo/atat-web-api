module.exports = {
  setupFiles: ["<rootDir>/.jest/setEnvVars.js"],
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "api/util/csp-request.ts",
    // "lib/custom-resources/endpoint-ips-test-fixtures.ts"
  ]
};
