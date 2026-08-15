module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jestSetup.js'],

  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|webp|svg)$':
      '<rootDir>/__mocks__/fileMock.js',

    '^react-native-vector-icons/.*$':
      '<rootDir>/__mocks__/react-native-vector-icons.js',

    '^react-native-linear-gradient$':
      '<rootDir>/__mocks__/react-native-linear-gradient.js',

    '^react-native-blob-util$':
      '<rootDir>/__mocks__/react-native-blob-util.js',

    '^react-native-html-to-pdf$':
      '<rootDir>/__mocks__/react-native-html-to-pdf.js',
  },

  transformIgnorePatterns: [
    'node_modules/(?!(' +
    [
      '@react-native',
      'react-native',
      '@react-navigation',
      '@reduxjs',
      'react-redux',
      'immer',
    ].join('|') +
    ')/)',
  ],
};