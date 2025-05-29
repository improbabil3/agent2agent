export default {
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)'
  ]
};
