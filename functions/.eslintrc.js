module.exports = {
  'env': {
    es6: true,
    node: true,
  },
  'parserOptions': {
    'ecmaVersion': 2018,
  },
  'extends': [
    'eslint:recommended',
    'google',
  ],
  'rules': {
    'max-len': ['error', { 'code': 120 }], // Allow longer lines
    'object-curly-spacing': ['error', 'always'], // Fix spacing issues
    'indent': ['error', 2], // Enforce consistent 2-space indentation
  },
  'overrides': [
    {
      files: ['**/*.spec.*'],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  'globals': {},
};
