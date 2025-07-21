import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  ...svelte.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Svelte 5 runes globals
        $state: 'readonly',
        $props: 'readonly',
        $derived: 'readonly',
        $effect: 'readonly'
      },
      parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': ts
    },
    rules: {
      ...ts.configs.recommended.rules,
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Disable some rules that may conflict with Svelte patterns
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off'
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Svelte 5 runes globals
        $state: 'readonly',
        $props: 'readonly',
        $derived: 'readonly',
        $effect: 'readonly'
      },
      parserOptions: {
        parser: '@typescript-eslint/parser'
      }
    },
    plugins: {
      '@typescript-eslint': ts
    },
    rules: {
      // Disable Svelte reactivity preference for existing code patterns
      'svelte/prefer-svelte-reactivity': 'off',
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    ignores: [
      'build/',
      '.svelte-kit/',
      'dist/',
      'node_modules/',
      'src-tauri/target/'
    ]
  }
];