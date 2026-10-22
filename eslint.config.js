// Flat config пакета @verdeect/auth (.ai-factory/rules/base.md, prd.md FR-6).
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            'coverage/**',
            'requirements/**',
            '.ai-factory/**',
            '.claude/**',
            '.serena/**',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        rules: {
            curly: ['error', 'all'],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    {
        // Без этих опций consistent-type-imports требует `import type` для классов-токенов DI Nest,
        // и метаданные декораторов теряют ссылку на класс.
        files: ['src/**/*.ts', 'tests/**/*.ts', 'vitest*.config.ts'],
        languageOptions: {
            globals: globals.node,
            parserOptions: {
                emitDecoratorMetadata: true,
                experimentalDecorators: true,
            },
        },
    },
    {
        files: ['*.js', '*.mjs', 'tests/consumer/**/*.mjs'],
        languageOptions: { globals: globals.node },
    },
    prettier,
];
