// Flat config пакета @verdeect/auth (.ai-factory/rules/base.md, prd.md FR-6, AC-9 — TSDoc публичного API).
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsdoc from 'eslint-plugin-jsdoc';
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
        // AC-9: TSDoc у каждого экспорта src/ и у публичных членов экспортируемых интерфейсов и классов.
        // Линтер не видит реэкспорт в index.ts, поэтому документируются и внутренние экспорты.
        files: ['src/**/*.ts'],
        ignores: ['src/**/*.spec.ts'],
        plugins: { jsdoc },
        rules: {
            'jsdoc/require-jsdoc': [
                'error',
                {
                    publicOnly: true,
                    exemptEmptyConstructors: true,
                    require: {
                        FunctionDeclaration: true,
                        ClassDeclaration: true,
                        ArrowFunctionExpression: false,
                        MethodDefinition: false,
                    },
                    contexts: [
                        'TSInterfaceDeclaration',
                        'TSTypeAliasDeclaration',
                        // Только члены интерфейсов: поля литералов в приведениях и союзах документирует сам тип.
                        'TSInterfaceBody > TSPropertySignature',
                        'TSInterfaceBody > TSMethodSignature',
                        'ExportNamedDeclaration > VariableDeclaration',
                        'MethodDefinition:not([accessibility="private"]):not([kind="constructor"])',
                        'TSParameterProperty:not([accessibility="private"])',
                    ],
                },
            ],
        },
    },
    {
        files: ['*.js', '*.mjs', 'tests/consumer/**/*.mjs', 'scripts/**/*.mjs'],
        languageOptions: { globals: globals.node },
    },
    prettier,
];
