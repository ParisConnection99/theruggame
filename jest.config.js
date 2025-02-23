module.exports = {
    testEnvironment: "node",
    setupFiles: ["dotenv/config"],
    verbose: true,
    collectCoverage: true,
    coverageReporters: ["text", "lcov"],
    coverageDirectory: "coverage",
    testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[tj]s?(x)"],
    maxWorkers: "50%",
    testTimeout: 30000,
    collectCoverageFrom: [
      "**/*.{js,jsx}",
      "!**/node_modules/**",
      "!**/coverage/**",
      "!**/tests/**",
      "!**/.next/**",
      "!**/dist/**"
    ],
    transform: {
      "^.+\\.(js|jsx)$": ["babel-jest", {
        presets: [
          '@babel/preset-env',
          ['@babel/preset-react', { runtime: 'automatic' }]
        ]
      }]
    }
  }