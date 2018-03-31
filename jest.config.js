module.exports = {
    collectCoverage: false,
    collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/index.js', '!**/node_modules/**'],
    coveragePathIgnorePatterns: ['/node_modules/', '/__.+__/'],
    coverageDirectory: 'coverage',
    coverageReporters: ['json', 'lcov', 'text-summary'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    reporters: ['default'],
    roots: ['<rootDir>/src'],
    setupTestFrameworkScriptFile: './src/__tests__/setup.js',
    testEnvironment: 'node',
    testLocationInResults: false,
    testMatch: ['**/__tests__/**/*.spec.js?(x)'],
    testPathIgnorePatterns: ['/node_modules/', './dist/', '\\.snap$'],
    testResultsProcessor: 'jest-sonar-reporter',
    transform: { '^.+\.js$': 'babel-jest' },
    verbose: false
};
