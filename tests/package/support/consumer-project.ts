// Помощник проекта-потребителя (prd.md FR-8; AC-1, AC-2, AC-3, AC-7): установка шаблона tests/consumer/* вне репозитория.
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT, runCommand, runOrThrow, type CommandResult } from './pack.js';

/** Шаблон проекта-потребителя. */
export type ConsumerTemplate = 'core' | 'full';

const PACKAGE_NAME = '@verdeect/auth';

/**
 * Копирует шаблон во временный каталог вне репозитория (без self-reference пакета),
 * подставляет архив вместо маркера `file:__TARBALL__` и ставит зависимости
 * с --strict-peer-dependencies (EC-2).
 */
export async function createConsumerProject(
    template: ConsumerTemplate,
    tarball: string,
): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), `verdeect-auth-consumer-${template}-`));
    console.info(`[package-check] consumer template ${template} → ${dir}`);
    await cp(join(REPO_ROOT, 'tests', 'consumer', template), dir, { recursive: true });

    const manifestPath = join(dir, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        dependencies: Record<string, string>;
    };
    manifest.dependencies[PACKAGE_NAME] = `file:${tarball}`;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    await runOrThrow('pnpm', ['install', '--strict-peer-dependencies'], dir);

    return dir;
}

/** Выполняет команду в проекте; код, stdout и stderr проверяет тест. */
export function runInConsumer(
    dir: string,
    command: string,
    args: readonly string[],
): Promise<CommandResult> {
    return runCommand(command, args, dir);
}

/** Удаляет временный проект. */
export async function removeConsumerProject(dir: string | undefined): Promise<void> {
    if (!dir) {
        return;
    }
    console.info(`[package-check] remove ${dir}`);
    await rm(dir, { recursive: true, force: true });
}
