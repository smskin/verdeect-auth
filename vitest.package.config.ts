// Контур проверок пакета (prd.md FR-7, FR-8): архив и проект-потребитель; запуск — pnpm test:package после сборки.
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/package/**/*.spec.ts'],
        environment: 'node',
        // Тесты пакуют архив и ставят зависимости — параллельный запуск конфликтует на диске.
        fileParallelism: false,
        testTimeout: 300_000,
        hookTimeout: 300_000,
    },
});
