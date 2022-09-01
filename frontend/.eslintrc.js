module.exports = {
  env: {
    browser: true,
    node: true
  },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['react', '@typescript-eslint'],
  rules: {
    'react/jsx-filename-extension': 0,
    'react/jsx-props-no-spreading': 0,
    'react/jsx-key': 1,
    'react/static-property-placement': ['error', 'static public field'],
    'react/jsx-first-prop-new-line': ['error', 'multiline-multiprop'],
    'react/forbid-prop-types': ['error', { forbid: ['any'] }],
    'spaced-comment': ['warn', 'always', { markers: ['/'] }],
    'arrow-parens': ['error', 'as-needed'],
    'arrow-body-style': ['error', 'as-needed'],
    'implicit-arrow-linebreak': 0,
    'no-nested-ternary': 0,
    'multiline-ternary': 0,
    'no-unused-expressions': 0,
    'consistent-return': 0,
    'no-shadow': 0,
    'global-require': 0,
    'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['state', 'req', 'res'] }],
    'class-methods-use-this': 0,
    'default-case': ['error', { commentPattern: '^skip\\sdefault' }],
    'import/no-extraneous-dependencies': 0,
    'comma-dangle': ['error', 'never'],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn'],
    'react/react-in-jsx-scope': ['warn']
  }
};
