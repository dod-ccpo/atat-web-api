require('dotenv').config();
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: ['**/*.test.ts'],
    transform: {
      '^.+\\.tsx?$': 'ts-jest'
    },
    reporters: [
      "default",
      ["jest-html-reporters", {
        "filename": "report.html",
        "pageTitle": "ATAT Integration Test Report",
        "expand": true,
      }]
    ],
    setupFiles: ["dotenv/config"],
  };