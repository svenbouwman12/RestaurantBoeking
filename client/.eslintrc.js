module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Only critical syntax checking
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-console': 'off',
    
    // React specific - relaxed
    'react/jsx-no-undef': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-uses-react': 'error',
    'react/no-unescaped-entities': 'off',
    'react/jsx-no-target-blank': 'warn',
    
    // TypeScript specific - relaxed
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    
    // Code quality - relaxed
    'prefer-const': 'warn',
    'no-var': 'warn',
    'eqeqeq': 'warn',
    'curly': 'off'
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        // TypeScript specific rules - very relaxed
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      }
    }
  ],
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 12,
    sourceType: 'module'
  },
  plugins: [
    'react',
    '@typescript-eslint'
  ]
};
