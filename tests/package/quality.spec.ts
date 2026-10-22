// Проверки качества пакета (prd.md AC-5, AC-6; FR-5, FR-7): publint, attw и перенесённые unit-тесты.
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT, runCommand, type CommandResult } from './support/pack.js';

/** Базовый уровень Identity packages/verdeect-auth на момент выноса (AC-6). */
const BASELINE_TESTS = 89;
const BASELINE_FILES = ['verifier.spec.ts', 'verifier.jwks.spec.ts', 'verdeect-auth.guard.spec.ts'];
const IDENTITY_IDS = ['AC-7.1', 'AC-7.2', 'AC-7.3', 'AC-7.4'];

interface VitestJsonReport {
    readonly numTotalTests: number;
    readonly numPassedTests: number;
    readonly testResults: readonly {
        readonly name: string;
        readonly assertionResults: readonly { readonly fullName: string }[];
    }[];
}

function describeResult(result: CommandResult): string {
    return `code ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
}

describe('UC-4: качество пакета @verdeect/auth', () => {
    beforeAll(() => {
        if (!existsSync(join(REPO_ROOT, 'dist', 'index.js'))) {
            throw new Error('dist/index.js not found: run pnpm build (or pnpm pack:check) first');
        }
    });

    it('AC-5: publint --strict — 0 ошибок и предупреждений; attw --pack --profile esm-only — 0 проблем', async () => {
        const publint = await runCommand('pnpm', ['exec', 'publint', '--strict'], REPO_ROOT);
        expect(publint.code, describeResult(publint)).toBe(0);

        const attw = await runCommand(
            'pnpm',
            ['exec', 'attw', '--pack', '.', '--profile', 'esm-only'],
            REPO_ROOT,
        );
        expect(attw.code, describeResult(attw)).toBe(0);
    });

    it('AC-6: перенесённые тесты зелёные, их не меньше 89 в 3 spec-файлах, в именах остались AC-7.1–7.4 (FR-5)', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'verdeect-auth-unit-'));
        const outputFile = join(dir, 'report.json');
        try {
            const result = await runCommand(
                'pnpm',
                ['exec', 'vitest', 'run', '--reporter=json', `--outputFile=${outputFile}`],
                REPO_ROOT,
            );
            expect(result.code, describeResult(result)).toBe(0);

            const report = JSON.parse(await readFile(outputFile, 'utf8')) as VitestJsonReport;
            const files = report.testResults.map((file) => basename(file.name)).sort();
            const names = report.testResults.flatMap((file) =>
                file.assertionResults.map((test) => test.fullName),
            );

            expect(files).toEqual([...BASELINE_FILES].sort());
            expect(report.numTotalTests).toBeGreaterThanOrEqual(BASELINE_TESTS);
            expect(report.numPassedTests).toBe(report.numTotalTests);
            expect(IDENTITY_IDS.filter((id) => !names.some((name) => name.includes(id)))).toEqual(
                [],
            );
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
