// Документация пакета (prd.md r3: FR-9, §9; AC-10; BR-2): файлы §9, относительные ссылки, разделы README, точная версия.
// Проверяемые файлы — документация пакета: README.md, CHANGELOG.md, AGENTS.md, docs/**/*.md (служебные requirements/,
// .ai-factory/, .claude/ — входные требования и инструменты агентов, план E2 «Requirements Reconciliation»).
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT } from './support/pack.js';

const ROOT_DOCS = ['README.md', 'CHANGELOG.md', 'AGENTS.md'];
const GUIDES = ['getting-started.md', 'nestjs.md', 'testing.md', 'errors.md', 'releasing.md'];
const README_SECTIONS = [
    'установка',
    'быстрый старт',
    'v-1',
    'principal',
    'nestjs',
    'тесты',
    'версионирование',
];

interface MarkdownFile {
    readonly path: string;
    readonly text: string;
}

/** Текст без fenced-блоков и inline-кода: `handlers[kind](principal)` в примерах — не ссылка. */
function withoutCode(text: string): string {
    return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function links(text: string): string[] {
    return [...withoutCode(text).matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1] ?? '');
}

function isRelative(link: string): boolean {
    return !/^[a-z][a-z0-9+.-]*:/i.test(link) && !link.startsWith('#');
}

describe('FR-9: документация пакета', () => {
    let files: MarkdownFile[];
    let readme: string;

    beforeAll(async () => {
        const docs = (await readdir(join(REPO_ROOT, 'docs'), { recursive: true }))
            .filter((path) => path.endsWith('.md'))
            .map((path) => join('docs', path));
        files = await Promise.all(
            [...ROOT_DOCS, ...docs].map(async (path) => ({
                path,
                text: await readFile(join(REPO_ROOT, path), 'utf8'),
            })),
        );
        readme = files.find((file) => file.path === 'README.md')?.text ?? '';
    });

    it('FR-9: есть все файлы §9 — README.md, CHANGELOG.md, AGENTS.md, docs/getting-started.md, nestjs.md, testing.md, errors.md, releasing.md', () => {
        const required = [...ROOT_DOCS, ...GUIDES.map((guide) => join('docs', guide))];

        expect(required.filter((path) => !existsSync(join(REPO_ROOT, path)))).toEqual([]);
    });

    it('AC-10: относительные ссылки в Markdown ведут на существующие файлы', () => {
        const broken = files.flatMap((file) =>
            links(file.text)
                .filter(isRelative)
                .filter((link) => {
                    const target = join(
                        REPO_ROOT,
                        dirname(file.path),
                        decodeURI(link.split('#')[0] ?? ''),
                    );

                    return !existsSync(target) || relative(REPO_ROOT, target).startsWith('..');
                })
                .map((link) => `${file.path} → ${link}`),
        );

        expect(broken).toEqual([]);
    });

    it('AC-10: в Markdown нет ссылок ../../ и путей verdeect-identity/ как относительных ссылок', () => {
        const offenders = files.flatMap((file) =>
            links(file.text)
                .filter(isRelative)
                .filter((link) => link.includes('../../') || link.includes('verdeect-identity/'))
                .map((link) => `${file.path} → ${link}`),
        );

        expect(offenders).toEqual([]);
    });

    it('AC-10: в README есть разделы — установка, быстрый старт, правила V-1…V-8, Principal, NestJS, тесты, версионирование', () => {
        const headings = [...readme.matchAll(/^## (.+)$/gm)].map((match) =>
            (match[1] ?? '').toLowerCase(),
        );

        expect(
            README_SECTIONS.filter(
                (section) => !headings.some((heading) => heading.includes(section)),
            ),
        ).toEqual([]);
    });

    it('BR-2: README показывает установку с точной версией — @verdeect/auth@<version> и --save-exact', async () => {
        const { version } = JSON.parse(await readFile(join(REPO_ROOT, 'package.json'), 'utf8')) as {
            version: string;
        };

        expect(readme).toContain(`pnpm add @verdeect/auth@${version} --save-exact`);
    });
});
