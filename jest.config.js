const nextJest = require('next/jest.js');

// next/jest sets up the transformer and module aliases automatically
// so @/ imports resolve correctly in tests without extra config
const createJestConfig = nextJest({ dir: './' });

const config = {
    // Use jsdom to simulate the browser DOM environment for component tests
    testEnvironment: 'jest-environment-jsdom',

    // Run the setup file after the test framework is installed
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

    // Map path aliases to match tsconfig.json
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },

    // Collect coverage from all source files
    collectCoverageFrom: [
        'app/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        '!app/layout.tsx',
        '!lib/prompt.ts',
        '!**/*.d.ts',
    ],
};

module.exports = createJestConfig(config);