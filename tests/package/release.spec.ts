// Выпуск версии (prd.md r3: UC-3 main, alt-1, err-1, err-2; AC-8, AC-11; FR-10, FR-11, FR-12; BR-1; D-7, D-8).
// Сухой прогон scripts/publish.mjs против локального реестра на node:http — без сети и без публикации.
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { REPO_ROOT, runCommand, type CommandResult } from './support/pack.js';

type RegistryMode = 'missing' | 'published';

interface WorkflowStep {
    readonly uses?: string;
    readonly run?: string;
    readonly with?: Record<string, unknown>;
    readonly env?: Record<string, string>;
    readonly 'continue-on-error'?: unknown;
}

interface WorkflowJob {
    readonly needs?: string | readonly string[];
    readonly if?: string;
    readonly environment?: string;
    readonly permissions?: Record<string, string>;
    readonly strategy?: { readonly matrix?: { readonly node?: readonly number[] } };
    readonly steps: readonly WorkflowStep[];
    readonly 'continue-on-error'?: unknown;
}

interface Workflow {
    readonly on: {
        readonly push?: {
            readonly branches?: readonly string[];
            readonly tags?: readonly string[];
        };
        readonly pull_request?: unknown;
    };
    readonly permissions?: Record<string, string>;
    readonly jobs: Record<string, WorkflowJob>;
}

const PUBLISH_LINE = '[publish] npm publish';

function needsOf(job: WorkflowJob | undefined): string[] {
    const needs = job?.needs ?? [];

    return typeof needs === 'string' ? [needs] : [...needs];
}

function describeResult(result: CommandResult): string {
    return `code ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
}

describe('UC-3: выпуск версии', () => {
    let workflow: Workflow;
    let version: string;
    let packageName: string;
    let registry: Server;
    let registryUrl: string;
    let mode: RegistryMode = 'missing';
    let configDir: string;

    beforeAll(async () => {
        workflow = parse(
            await readFile(join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8'),
        ) as Workflow;
        const manifest = JSON.parse(await readFile(join(REPO_ROOT, 'package.json'), 'utf8')) as {
            name: string;
            version: string;
        };
        version = manifest.version;
        packageName = manifest.name;

        registry = createServer((request, response) => {
            console.info(`[package-check] registry ${mode} ${request.method} ${request.url}`);
            response.setHeader('content-type', 'application/json');
            if (mode === 'missing') {
                response.statusCode = 404;
                response.end(JSON.stringify({ error: 'Not found' }));

                return;
            }
            response.end(
                JSON.stringify({
                    name: packageName,
                    'dist-tags': { latest: version },
                    versions: { [version]: { name: packageName, version } },
                }),
            );
        });
        await new Promise<void>((resolve) => registry.listen(0, '127.0.0.1', resolve));
        registryUrl = `http://127.0.0.1:${(registry.address() as AddressInfo).port}/`;

        // Пустой пользовательский конфиг npm: @verdeect:registry и токены из ~/.npmrc не перебьют локальный реестр.
        configDir = await mkdtemp(join(tmpdir(), 'verdeect-auth-npmrc-'));
        await writeFile(join(configDir, '.npmrc'), '');
    });

    afterAll(async () => {
        await new Promise<void>((resolve) => registry.close(() => resolve()));
        await rm(configDir, { recursive: true, force: true });
    });

    async function dryRun(tag: string, registryMode: RegistryMode): Promise<CommandResult> {
        mode = registryMode;

        return runCommand('node', ['scripts/publish.mjs', '--dry-run'], REPO_ROOT, {
            GITHUB_REF_NAME: tag,
            npm_config_registry: registryUrl,
            npm_config_userconfig: join(configDir, '.npmrc'),
        });
    }

    it('AC-8: push в ветку и pull_request — job publish не создаётся (if только для refs/tags/v)', () => {
        const publish = workflow.jobs['publish'];

        expect(publish?.if).toBe("startsWith(github.ref, 'refs/tags/v')");
        for (const [name, job] of Object.entries(workflow.jobs)) {
            if (name !== 'publish') {
                expect(job.if, name).toBeUndefined();
            }
        }
    });

    it('AC-8: publish нуждается во всех проверках (lint, test, build), без continue-on-error, environment npm, NODE_AUTH_TOKEN из secrets.NPM_TOKEN, permissions contents read и id-token write только у publish', () => {
        expect(needsOf(workflow.jobs['publish']).sort()).toEqual(['build', 'lint', 'test']);
        expect(needsOf(workflow.jobs['build'])).toEqual(['test']);
        expect(needsOf(workflow.jobs['test'])).toEqual(['lint']);
        expect(needsOf(workflow.jobs['lint'])).toEqual([]);

        const publish = workflow.jobs['publish'];
        expect(publish?.environment).toBe('npm');

        // Минимальные права: workflow — только чтение; id-token (provenance npm) — только у publish.
        expect(workflow.permissions).toEqual({ contents: 'read' });
        expect(publish?.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
        const withPermissions = Object.entries(workflow.jobs)
            .filter(([, job]) => job.permissions !== undefined)
            .map(([name]) => name);
        expect(withPermissions).toEqual(['publish']);
        const publishStep = publish?.steps.find((step) =>
            step.run?.includes('scripts/publish.mjs'),
        );
        expect(publishStep?.run).toBe('node scripts/publish.mjs');
        expect(publishStep?.env?.['NODE_AUTH_TOKEN']).toBe('${{ secrets.NPM_TOKEN }}');

        const loose = Object.entries(workflow.jobs).flatMap(([name, job]) => [
            ...(job['continue-on-error'] === undefined ? [] : [name]),
            ...job.steps
                .filter((step) => step['continue-on-error'] !== undefined)
                .map(() => `${name} step`),
        ]);
        expect(loose).toEqual([]);
    });

    it('FR-11: jobs lint → test → build → publish (D-8, GitHub Actions); test — матрица Node 22 и 24 (D-7); триггеры push и pull_request', () => {
        expect(Object.keys(workflow.jobs)).toEqual(['lint', 'test', 'build', 'publish']);
        expect(workflow.on.push?.branches).toEqual(['**']);
        expect(workflow.on.push?.tags).toEqual(['v[0-9]+.[0-9]+.[0-9]+']);
        expect(workflow.on).toHaveProperty('pull_request');

        expect(workflow.jobs['test']?.strategy?.matrix?.node).toEqual([22, 24]);
        for (const name of ['lint', 'build', 'publish']) {
            const setup = workflow.jobs[name]?.steps.find((step) =>
                step.uses?.startsWith('actions/setup-node@'),
            );
            expect(setup?.with?.['node-version'], name).toBe(22);
        }

        const runs = (name: string): string[] =>
            (workflow.jobs[name]?.steps ?? []).flatMap((step) => (step.run ? [step.run] : []));
        expect(runs('lint')).toEqual(['make install', 'make lint', 'make analyse']);
        expect(runs('test')).toEqual(['make install', 'make test']);
        expect(runs('build')).toEqual(['make install', 'make build pack-check']);
    });

    it('AC-8: тег v1.0.0 при version 1.0.0 — сухой прогон доходит до npm publish --dry-run, код 0', async () => {
        const result = await dryRun(`v${version}`, 'missing');

        expect(result.code, describeResult(result)).toBe(0);
        expect(result.stdout).toContain(`${PUBLISH_LINE} --access public --dry-run`);
    });

    it('AC-8: тег v1.0.1 при version 1.0.0 — падение до npm publish с сообщением о несовпадении', async () => {
        const [major, minor, patch] = version.split('.').map(Number);
        const result = await dryRun(`v${major}.${minor}.${(patch ?? 0) + 1}`, 'missing');

        expect(result.code, describeResult(result)).not.toBe(0);
        expect(result.stderr).toContain('не совпадает');
        expect(result.stdout).not.toContain(PUBLISH_LINE);
    });

    it('AC-8: версия уже в npm — падение до npm publish', async () => {
        const result = await dryRun(`v${version}`, 'published');

        expect(result.code, describeResult(result)).not.toBe(0);
        expect(result.stderr).toContain('уже опубликована');
        expect(result.stdout).not.toContain(PUBLISH_LINE);
    });

    it('AC-8: тег не по шаблону v<semver> — падение до npm publish', async () => {
        const result = await dryRun('v1.0', 'missing');

        expect(result.code, describeResult(result)).not.toBe(0);
        expect(result.stderr).toContain('не соответствует шаблону');
        expect(result.stdout).not.toContain(PUBLISH_LINE);
    });

    it('AC-11: Makefile — цели install, lint, analyse, test, build, pack-check, ci, clean; ci = lint analyse test build pack-check; Docker-целей нет (FR-10)', async () => {
        const makefile = await readFile(join(REPO_ROOT, 'Makefile'), 'utf8');
        const targets = [...makefile.matchAll(/^([a-z][a-z-]*):/gm)].map((match) => match[1]);

        for (const target of [
            'install',
            'lint',
            'analyse',
            'test',
            'build',
            'pack-check',
            'ci',
            'clean',
        ]) {
            expect(targets, target).toContain(target);
        }
        expect(makefile).toMatch(/^ci: lint analyse test build pack-check(\s|$)/m);
        // Комментарий Makefile упоминает Docker («без Docker»), поэтому проверяются только цели и рецепты.
        const recipes = makefile.split('\n').filter((line) => line.startsWith('\t'));
        expect(targets.filter((target) => /docker|compose/i.test(target ?? ''))).toEqual([]);
        expect(recipes.filter((line) => /docker|compose/i.test(line))).toEqual([]);
    });

    it('AC-11: CHANGELOG.md — Keep a Changelog, раздел [1.0.0] с текстом FR-12', async () => {
        const changelog = await readFile(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');

        expect(changelog).toContain('keepachangelog.com');
        expect(changelog).toContain('## [Unreleased]');
        expect(changelog).toMatch(/^## \[1\.0\.0\] - \d{4}-\d{2}-\d{2}$/m);
        expect(changelog).toContain(
            'Вынос из `verdeect-identity` без изменения поведения, новое имя `@verdeect/auth`, подпуть `testing` закрыт для production.',
        );
    });

    it('AC-11: docs/releasing.md описывает UC-3 — version, CHANGELOG, тег vX.Y.Z, NPM_TOKEN, мажорная версия при ломающем изменении (BR-1)', async () => {
        const releasing = await readFile(join(REPO_ROOT, 'docs/releasing.md'), 'utf8');

        for (const fragment of [
            'UC-3',
            '`version`',
            'CHANGELOG.md',
            'git tag vX.Y.Z',
            'NPM_TOKEN',
            'мажорная',
            'Как обновиться',
        ]) {
            expect(releasing, fragment).toContain(fragment);
        }
    });
});
