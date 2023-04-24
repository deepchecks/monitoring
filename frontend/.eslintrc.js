module.exports = {
  env: {
    browser: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['react', 'react-hooks', '@typescript-eslint'],
  rules: {
    'react/jsx-key': 1,
    'react/static-property-placement': ['error', 'static public field'],
    'react/jsx-first-prop-new-line': ['error', 'multiline-multiprop'],
    'react/forbid-prop-types': [
      'error',
      {
        forbid: ['any']
      }
    ],
    'spaced-comment': [
      'warn',
      'always',
      {
        markers: ['/']
      }
    ],
    'arrow-parens': ['error', 'as-needed'],
    'no-param-reassign': [
      'error',
      {
        props: true,
        ignorePropertyModificationsFor: ['state', 'req', 'res']
      }
    ],
    'default-case': [
      'error',
      {
        commentPattern: '^skip\\sdefault'
      }
    ],
    'comma-dangle': ['error', 'never'],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn'],
    'react/react-in-jsx-scope': ['warn'],
    'react-hooks/exhaustive-deps': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-var-requires': 0
  },

  ignorePatterns: ['generated.ts']
};
