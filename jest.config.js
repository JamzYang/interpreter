export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testMatch: [
    '**/tests/**/*.spec.[jt]s?(x)',
    '**/tests/**/*.test.[jt]s?(x)',
    '**/__tests__/*.[jt]s?(x)'
  ],
  setupFiles: ['<rootDir>/tests/setup.js']
}; 