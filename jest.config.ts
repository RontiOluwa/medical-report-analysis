import type { Config } from 'jest';
import nextJest from 'next/jest.js';

// next/jest sets up the transformer and module aliases automatically
// so @/ imports resolve correctly in tests without extra config
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
    // Use jsdom to simulate the browser DOM environment for component tests
    testEnvironment: 'jest-environment-jsdom',

    // Run the setup file after the test framework is installed in the environment
    // This is where we extend expect() with @testing-library/jest-dom matchers
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

    // Map path aliases to match tsconfig.json so @/lib, @/app etc. resolve
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },

    // Collect coverage from all source files, not just tested ones
    collectCoverageFrom: [
        'app/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        '!app/layout.tsx',
        '!lib/prompt.ts',
        '!**/*.d.ts',
    ],
};

export default createJestConfig(config);