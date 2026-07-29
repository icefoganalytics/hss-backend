/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // The base tsconfig restricts typeRoots to ./@types (the custom Express
  // augmentation), which hides node_modules/@types/jest. Re-include the default
  // type roots and jest/node types for tests only, leaving the production
  // `tsc` build (npm run build:api) unchanged.
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          types: ['jest', 'node'],
          typeRoots: ['./@types', './node_modules/@types'],
        },
      },
    ],
  },
};
