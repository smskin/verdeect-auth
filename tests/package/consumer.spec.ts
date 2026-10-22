// Установленный проект-потребитель (prd.md FR-8; UC-1, UC-2, UC-4; AC-1, AC-2, AC-3, AC-7; EC-1, EC-2).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    createConsumerProject,
    removeConsumerProject,
    runInConsumer,
} from './support/consumer-project.js';
import { packTarball, removeTarball, REPO_ROOT, type CommandResult } from './support/pack.js';

const IMPORT_TESTING = "await import('@verdeect/auth/testing')";

function describeResult(result: CommandResult): string {
    return `code ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
}

let tarball: string | undefined;
let core: string | undefined;
let full: string | undefined;

function project(dir: string | undefined): string {
    if (!dir) {
        throw new Error('consumer project was not created');
    }

    return dir;
}

beforeAll(async () => {
    if (!existsSync(join(REPO_ROOT, 'dist', 'index.js'))) {
        throw new Error('dist/index.js not found: run pnpm build (or pnpm pack:check) first');
    }
    tarball = await packTarball();
    core = await createConsumerProject('core', tarball);
    full = await createConsumerProject('full', tarball);
});

afterAll(async () => {
    await removeConsumerProject(core);
    await removeConsumerProject(full);
    await removeTarball(tarball);
});

describe('UC-1: подключение @verdeect/auth к сервису', () => {
    it('AC-2: проект без @nestjs/*, rxjs, reflect-metadata — установка проходит, import("@verdeect/auth") и createVerifier работают', async () => {
        const result = await runInConsumer(project(core), 'node', ['smoke.mjs']);

        expect(result.code, describeResult(result)).toBe(0);
        expect(result.stdout).toContain('core-ok');
    });

    it('AC-2: с NestJS 12.x import("@verdeect/auth/nest") работает; peer-диапазон не конфликтует при --strict-peer-dependencies (EC-2)', async () => {
        const result = await runInConsumer(project(full), 'node', ['nest-smoke.mjs']);

        expect(result.code, describeResult(result)).toBe(0);
        expect(result.stdout).toContain('nest-ok');
    });

    it('AC-3: файл со всеми тремя подпутями проходит tsc --noEmit при moduleResolution NodeNext', async () => {
        const result = await runInConsumer(project(full), 'pnpm', [
            'exec',
            'tsc',
            '-p',
            'tsconfig.json',
        ]);

        expect(result.code, describeResult(result)).toBe(0);
    });

    it('AC-3: тот же файл проходит tsc --noEmit при moduleResolution bundler (EC-1)', async () => {
        const result = await runInConsumer(project(full), 'pnpm', [
            'exec',
            'tsc',
            '-p',
            'tsconfig.bundler.json',
        ]);

        expect(result.code, describeResult(result)).toBe(0);
    });
});

describe('UC-4: production-запуск сервиса', () => {
    it('AC-1: node без условий — import("@verdeect/auth/testing") падает с ERR_PACKAGE_PATH_NOT_EXPORTED', async () => {
        const result = await runInConsumer(project(full), 'node', [
            '--input-type=module',
            '-e',
            IMPORT_TESTING,
        ]);

        expect(result.code, describeResult(result)).not.toBe(0);
        expect(result.stderr).toContain('ERR_PACKAGE_PATH_NOT_EXPORTED');
    });

    it('AC-1: node --conditions=development — import("@verdeect/auth/testing") загружается', async () => {
        const result = await runInConsumer(project(full), 'node', [
            '--conditions=development',
            '--input-type=module',
            '-e',
            IMPORT_TESTING,
        ]);

        expect(result.code, describeResult(result)).toBe(0);
    });
});

describe('UC-2: тесты сервиса с @verdeect/auth/testing', () => {
    it('AC-7: vitest в проекте-потребителе без настройки условий проходит тест с createTestSigner и createVerifier', async () => {
        const result = await runInConsumer(project(full), 'pnpm', [
            'exec',
            'vitest',
            'run',
            '--reporter=verbose',
        ]);
        const output = `${result.stdout}\n${result.stderr}`;

        expect(result.code, describeResult(result)).toBe(0);
        expect(output).toContain('AC-7');
        expect(output).toMatch(/1 passed/);
    });
});
