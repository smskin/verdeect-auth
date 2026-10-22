// Помощник упаковки для проверок пакета (prd.md FR-7, FR-8, AC-4): состав архива, .tgz, упакованный package.json.
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const COMMAND_TIMEOUT_MS = 280_000;

/** Корень репозитория пакета. */
export const REPO_ROOT = resolve(import.meta.dirname, '../../..');

/** Результат команды без исключения при ненулевом коде. */
export interface CommandResult {
    readonly code: number;
    readonly stdout: string;
    readonly stderr: string;
}

/** Состав архива по `npm pack --dry-run`. */
export interface PackContents {
    readonly filename: string;
    readonly files: readonly string[];
}

interface ExecFailure {
    readonly code?: number | string;
    readonly stdout?: string;
    readonly stderr?: string;
}

/** Запускает команду без shell и возвращает код, stdout и stderr; не выбрасывает при ненулевом коде. */
export async function runCommand(
    command: string,
    args: readonly string[],
    cwd: string,
): Promise<CommandResult> {
    console.info(`[package-check] ${command} ${args.join(' ')} (cwd: ${cwd})`);
    try {
        const { stdout, stderr } = await execFileAsync(command, args, {
            cwd,
            maxBuffer: 64 * 1024 * 1024,
            // Меньше testTimeout/hookTimeout (300 с): зависший процесс убивается вместе с упавшим тестом.
            timeout: COMMAND_TIMEOUT_MS,
            killSignal: 'SIGKILL',
        });

        return { code: 0, stdout, stderr };
    } catch (error) {
        const failure = error as ExecFailure;

        return {
            code: typeof failure.code === 'number' ? failure.code : 1,
            stdout: failure.stdout ?? '',
            stderr: failure.stderr ?? String(error),
        };
    }
}

/** Как runCommand, но ненулевой код — исключение с командой, кодом и stderr. */
export async function runOrThrow(
    command: string,
    args: readonly string[],
    cwd: string,
): Promise<CommandResult> {
    const result = await runCommand(command, args, cwd);
    if (result.code !== 0) {
        throw new Error(
            `[package-check] ${command} ${args.join(' ')} failed with code ${result.code}:\n${result.stderr}`,
        );
    }

    return result;
}

/** Состав архива: `npm pack --dry-run --json` в корне репозитория. */
export async function packContents(): Promise<PackContents> {
    const { stdout } = await runOrThrow('npm', ['pack', '--dry-run', '--json'], REPO_ROOT);
    const parsed = JSON.parse(stdout) as { filename: string; files: { path: string }[] }[];
    const entry = parsed[0];
    if (!entry) {
        throw new Error('[package-check] npm pack --dry-run returned no entries');
    }

    return { filename: entry.filename, files: entry.files.map((file) => file.path) };
}

/** Упаковывает пакет в новый временный каталог и возвращает абсолютный путь к .tgz. */
export async function packTarball(): Promise<string> {
    const destination = await mkdtemp(join(tmpdir(), 'verdeect-auth-pack-'));
    const { stdout } = await runOrThrow(
        'pnpm',
        ['pack', '--pack-destination', destination],
        REPO_ROOT,
    );
    const tarball = stdout
        .trim()
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.endsWith('.tgz'));
    if (!tarball) {
        throw new Error(`[package-check] pnpm pack printed no .tgz path:\n${stdout}`);
    }

    return resolve(destination, tarball);
}

/** Читает package.json из архива: распаковка системным tar во временный каталог. */
export async function readPackedManifest(tarball: string): Promise<Record<string, unknown>> {
    const target = await mkdtemp(join(tmpdir(), 'verdeect-auth-unpack-'));
    try {
        await runOrThrow('tar', ['-xzf', tarball, '-C', target], target);
        const raw = await readFile(join(target, 'package', 'package.json'), 'utf8');

        return JSON.parse(raw) as Record<string, unknown>;
    } finally {
        await rm(target, { recursive: true, force: true });
    }
}

/** Удаляет временный каталог архива, созданный packTarball. */
export async function removeTarball(tarball: string | undefined): Promise<void> {
    if (!tarball) {
        return;
    }
    console.info(`[package-check] remove ${dirname(tarball)}`);
    await rm(dirname(tarball), { recursive: true, force: true });
}
