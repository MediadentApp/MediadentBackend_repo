import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default [
  js.configs.recommended,

  {
    files: ['**/*.ts'],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },

    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
      'unused-imports': unusedImports,
    },

    rules: {
      ...tseslint.configs.recommended.rules,

      'prettier/prettier': 'off',

      '@typescript-eslint/no-explicit-any': 'warn',

      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'warn',
      'no-alert': 'error',

      // Disable base rule
      'no-redeclare': 'off',

      // Enable TS-aware rule
      '@typescript-eslint/no-redeclare': 'error',

      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
];
