// Состав и метаданные архива @verdeect/auth (prd.md r3 UC-4; AC-1, AC-4; FR-1–FR-4, FR-12; BR-3, BR-4; EC-3; D-7, D-8).
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
    packContents,
    packTarball,
    readPackedManifest,
    removeTarball,
    REPO_ROOT,
} from './support/pack.js';

const DIST = join(REPO_ROOT, 'dist');
const ENTRY_POINTS = ['dist/index', 'dist/nest/index', 'dist/testing/index'];

async function listJs(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });

    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
        .map((entry) => join(entry.parentPath, entry.name));
}

function importSpecifiers(source: string): string[] {
    const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;

    return [...source.matchAll(pattern)].map((match) => match[1] ?? '');
}

describe('UC-4: состав и метаданные пакета @verdeect/auth', () => {
    let files: readonly string[];
    let manifest: Record<string, unknown>;

    beforeAll(async () => {
        if (!existsSync(join(DIST, 'index.js'))) {
            throw new Error('dist/index.js not found: run pnpm build (or pnpm pack:check) first');
        }
        files = (await packContents()).files;
        const tarball = await packTarball();
        try {
            manifest = await readPackedManifest(tarball);
        } finally {
            await removeTarball(tarball);
        }
    });

    it('AC-4: архив содержит только package.json, README.md, CHANGELOG.md и dist/**/*.js, dist/**/*.d.ts', () => {
        const allowed = (path: string): boolean =>
            ['package.json', 'README.md', 'CHANGELOG.md', 'LICENSE'].includes(path) ||
            (path.startsWith('dist/') && (path.endsWith('.js') || path.endsWith('.d.ts')));

        expect(files.filter((path) => !allowed(path))).toEqual([]);

        const required = [
            'package.json',
            'README.md',
            'CHANGELOG.md',
            ...ENTRY_POINTS.flatMap((entry) => [`${entry}.js`, `${entry}.d.ts`]),
        ];
        expect(required.filter((path) => !files.includes(path))).toEqual([]);
    });

    it('AC-4: в архиве нет src/, *.spec.*, *.map, tsconfig*, requirements/, .ai-factory/, docs/, node_modules/ (EC-3)', () => {
        const forbidden =
            /^(src|requirements|\.ai-factory|docs|node_modules)\/|\.spec\.|\.map$|(^|\/)tsconfig/;

        expect(files.filter((path) => forbidden.test(path))).toEqual([]);
    });

    it('AC-1: dist/**/*.js вне dist/testing (ядро и nest) не импортируют testing (BR-4)', async () => {
        const testingDir = join(DIST, 'testing');
        const production = (await listJs(DIST)).filter((file) => !file.startsWith(testingDir));
        const offenders: string[] = [];
        for (const file of production) {
            const specifiers = importSpecifiers(await readFile(file, 'utf8'));
            for (const specifier of specifiers.filter((s) => s.includes('testing'))) {
                offenders.push(`${relative(REPO_ROOT, file)} → ${specifier}`);
            }
        }

        expect(offenders).toEqual([]);
    });

    it('FR-1: package.json — @verdeect/auth 1.0.0, без private, type module, engines >=22.12, sideEffects false, publishConfig public, license UNLICENSED, repository github smskin/verdeect-auth, files dist/README.md/CHANGELOG.md', () => {
        expect(manifest).toMatchObject({
            name: '@verdeect/auth',
            version: '1.0.0',
            type: 'module',
            engines: { node: '>=22.12' },
            sideEffects: false,
            publishConfig: { access: 'public' },
            license: 'UNLICENSED',
            repository: { type: 'git', url: 'git+https://github.com/smskin/verdeect-auth.git' },
            files: ['dist', 'README.md', 'CHANGELOG.md'],
        });
        expect(manifest).not.toHaveProperty('private');
    });

    it('FR-2: exports — "." и "./nest" с types и default из dist, "./testing" с types и development без default, "./package.json"; условий на src нет', () => {
        expect(manifest['exports']).toEqual({
            '.': { types: './dist/index.d.ts', default: './dist/index.js' },
            './nest': { types: './dist/nest/index.d.ts', default: './dist/nest/index.js' },
            './testing': {
                types: './dist/testing/index.d.ts',
                development: './dist/testing/index.js',
            },
            './package.json': './package.json',
        });
    });

    it('FR-4: в dependencies только jose с точной версией; @nestjs/common, @nestjs/core ^12.1.3, reflect-metadata ^0.2.2, rxjs ^7.8.2 — peer optional (EC-2, EC-3)', () => {
        const dependencies = manifest['dependencies'] as Record<string, string>;
        expect(Object.keys(dependencies)).toEqual(['jose']);
        expect(dependencies['jose']).toMatch(/^\d+\.\d+\.\d+$/);

        expect(manifest['peerDependencies']).toEqual({
            '@nestjs/common': '^12.1.3',
            '@nestjs/core': '^12.1.3',
            'reflect-metadata': '^0.2.2',
            rxjs: '^7.8.2',
        });
        expect(manifest['peerDependenciesMeta']).toEqual({
            '@nestjs/common': { optional: true },
            '@nestjs/core': { optional: true },
            'reflect-metadata': { optional: true },
            rxjs: { optional: true },
        });
    });

    it('BR-3: в архиве нет .env*, .npmrc и файлов с ключами (*.pem, *.key)', () => {
        const secrets = /(^|\/)\.env|(^|\/)\.npmrc$|\.(pem|key)$/;

        expect(files.filter((path) => secrets.test(path))).toEqual([]);
    });
});
