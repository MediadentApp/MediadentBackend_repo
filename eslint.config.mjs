import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig, globalIgnores } from 'eslint/config';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores(['**/dist', '**/node_modules']),
  {
    extends: compat.extends('airbnb-base', 'plugin:@typescript-eslint/recommended',
      // 'plugin:prettier/recommended'
    ),

    plugins: {
      '@typescript-eslint': typescriptEslint,
      'unused-imports': unusedImports,
      prettier: 'eslint-plugin-prettier',
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },

    // settings: {
    //     "import/resolver": {
    //         typescript: {
    //             alwaysTryTypes: true,
    //         },
    //     },
    // },

    rules: {
      // "prettier/prettier": "error", // temporary disabled
      '@typescript-eslint/no-unused-vars': ['error'],
      'arrow-body-style': ['error', 'as-needed'],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',

          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      'import/extensions': [
        'error',
        'ignorePackages',
        {
          ts: 'always',
        },
      ],

      'import/no-unresolved': 'off',

      // Warn or error for unused imports
      'unused-imports/no-unused-imports': 'error',
      // Optionally also remove unused variables, unless prefixed with _
      'unused-imports/no-unused-vars': [
        'error',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unused-vars': 'off', // disable to avoid duplicate warnings

      'no-console': 'warn',
      'no-alert': 'error',
    },
  },
]);
