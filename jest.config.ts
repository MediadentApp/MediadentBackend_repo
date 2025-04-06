import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm', // Use the ESM preset
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      useESM: true, // Enable ESM support for Jest
    },
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'], // Ensure Jest knows how to treat these as ESM
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1', // Adjust module aliasing
  },
};

export default config;
