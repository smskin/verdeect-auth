// Unit-контур verdeect-auth (prd.md §18, уровень L): src/**/*.spec.ts без БД, JWKS — локальный сервер подписчика.
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [swc.vite({ module: { type: 'es6' } })],
    test: {
        include: ['src/**/*.spec.ts'],
        environment: 'node',
    },
});
