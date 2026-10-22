// Публичный API @verdeect/auth (prd.md §8, AC-9; FR-9 — TSDoc): экспорты трёх подпутей, README, CHANGELOG, правило линтера.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT } from './support/pack.js';

/** Таблица prd.md §8: значения и типы по подпутям. */
const EXPECTED_EXPORTS: Record<string, readonly string[]> = {
    'dist/index.d.ts': [
        'createVerifier',
        'VerifyError',
        'TokenKind',
        'TrustedIssuer',
        'VerifierOptions',
        'UserPrincipal',
        'ServicePrincipal',
        'AgentPrincipal',
        'Principal',
        'Verifier',
        'VerifyReason',
        'VerifyRule',
    ],
    'dist/nest/index.d.ts': [
        'VerdeectAuthModule',
        'VerdeectAuthGuard',
        'VERDEECT_VERIFIER',
        'RequireTenant',
        'RequireScope',
        'RequireUser',
        'RequireService',
        'principalOf',
        'PrincipalCarrier',
        'VerdeectAuthModuleOptions',
        'VerdeectAuthAsyncOptions',
    ],
    'dist/testing/index.d.ts': [
        'createTestSigner',
        'tokenVectors',
        'TEST_IDENTITY_ISS',
        'TEST_ORCHESTRATOR_ISS',
        'TEST_RESOURCE',
        'Claims',
        'Header',
        'TestSigner',
        'TestSignerOptions',
        'TokenVector',
        'VectorExpectation',
        'VectorSigners',
    ],
};

const PROBE_PATH = 'src/__tsdoc-probe__.ts';

/** Имена экспортов каждого .d.ts по TypeScript Compiler API. */
function actualExports(): Record<string, string[]> {
    const files = Object.keys(EXPECTED_EXPORTS).map((file) => join(REPO_ROOT, file));
    const program = ts.createProgram(files, {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        noEmit: true,
        skipLibCheck: true,
    });
    const checker = program.getTypeChecker();

    return Object.fromEntries(
        Object.keys(EXPECTED_EXPORTS).map((file) => {
            const source = program.getSourceFile(join(REPO_ROOT, file));
            const symbol = source ? checker.getSymbolAtLocation(source) : undefined;
            if (!symbol) {
                throw new Error(`[package-check] no module symbol for ${file}`);
            }

            return [
                file,
                checker
                    .getExportsOfModule(symbol)
                    .map((entry) => entry.name)
                    .sort(),
            ];
        }),
    );
}

async function jsdocErrors(code: string): Promise<string[]> {
    const eslint = new ESLint({ cwd: REPO_ROOT });
    const [result] = await eslint.lintText(code, { filePath: join(REPO_ROOT, PROBE_PATH) });

    return (result?.messages ?? [])
        .map((message) => message.ruleId ?? '')
        .filter((ruleId) => ruleId.startsWith('jsdoc/'));
}

describe('UC-3: публичный API @verdeect/auth', () => {
    let readme: string;
    let changelog: string;

    beforeAll(async () => {
        if (!existsSync(join(REPO_ROOT, 'dist', 'index.d.ts'))) {
            throw new Error('dist/index.d.ts not found: run pnpm build (or pnpm pack:check) first');
        }
        readme = await readFile(join(REPO_ROOT, 'README.md'), 'utf8');
        changelog = await readFile(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    });

    it('AC-9: экспорты ".", "./nest", "./testing" совпадают с таблицей §8 (значения и типы)', () => {
        const expected = Object.fromEntries(
            Object.entries(EXPECTED_EXPORTS).map(([file, names]) => [file, [...names].sort()]),
        );

        expect(actualExports()).toEqual(expected);
    });

    it('AC-9: каждое имя экспорта есть в README.md и в CHANGELOG.md', () => {
        // Только в обратных кавычках: Principal, Verifier, Claims, Header встречаются и в обычном тексте.
        const names = Object.values(EXPECTED_EXPORTS).flat();
        const missing = (text: string): string[] =>
            names.filter((name) => !text.includes(`\`${name}\``));

        expect({ readme: missing(readme), changelog: missing(changelog) }).toEqual({
            readme: [],
            changelog: [],
        });
    });

    it('AC-9: make lint требует TSDoc — экспорт без комментария в src/ даёт jsdoc/require-jsdoc', async () => {
        expect(await jsdocErrors('export function undocumented(): void {}\n')).toContain(
            'jsdoc/require-jsdoc',
        );
        expect(
            await jsdocErrors('/** Описание. */\nexport function documented(): void {}\n'),
        ).toEqual([]);
        expect(
            await jsdocErrors(
                '/** Описание. */\nexport interface Probe {\n    readonly field: string;\n}\n',
            ),
        ).toContain('jsdoc/require-jsdoc');
    });
});
