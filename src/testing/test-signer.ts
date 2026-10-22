// createTestSigner (PRD Identity §7.5, §18 уровень L: mock JWKS; 01 §5.3; AC-7.1–7.4). generic: помощник для тестов
// потребителей, не тест. Ed25519-ключи живут только в памяти; JWKS отдаёт локальный HTTP-сервер на 127.0.0.1.
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey, type JWK } from 'jose';
import type { TokenKind, TrustedIssuer } from '../index.js';

/** `iss` подписчика по умолчанию — Identity (kinds `user`, `service`). */
export const TEST_IDENTITY_ISS = 'https://id.verdeect.ru';
/** `iss` подписчика Orchestrator для векторов агента (kinds `agent`). */
export const TEST_ORCHESTRATOR_ISS = 'https://orchestrator.verdeect.internal';
/** Сервер ресурсов (`aud`) токенов подписчика и векторов. */
export const TEST_RESOURCE = 'https://api.verdeect.ru';

/** Claim'ы токена: значение undefined убирает поле из результата. */
export type Claims = Record<string, unknown>;
/** Заголовок JWS: значение undefined убирает поле из результата. */
export type Header = Record<string, unknown>;

/** Параметры {@link createTestSigner}. */
export interface TestSignerOptions {
    /** `iss` подписчика; по умолчанию {@link TEST_IDENTITY_ISS}. */
    readonly iss?: string;
    /** Виды токенов в `issuer.kinds`; по умолчанию как у `createVerifier` (`user`, `service`). */
    readonly kinds?: readonly TokenKind[];
}

/** Тестовый издатель токенов с локальным JWKS; создаётся {@link createTestSigner}. */
export interface TestSigner {
    /** Готовый TrustedIssuer для createVerifier: iss, jwksUri локального сервера, kinds. */
    readonly issuer: TrustedIssuer;
    /** Сколько раз запрошен JWKS (AC-7.2). */
    jwksRequests(): number;
    /** Новый ключ становится текущим для подписи и публикуется в JWKS (старый остаётся). */
    rotate(): Promise<void>;
    /** Подпись текущим ключом; заголовок по умолчанию {typ: at+jwt, alg: EdDSA, kid}. */
    sign(claims: Claims, header?: Header): Promise<string>;
    /** Подпись новым ключом с новым kid, который никогда не публикуется (V-3). */
    signWithUnpublishedKey(claims: Claims): Promise<string>;
    /** Подпись чужим ключом с текущим kid (V-2: недействительная подпись). */
    signWithForeignKey(claims: Claims): Promise<string>;
    /** Три части с произвольным заголовком (любой alg) и заведомо неверной подписью. */
    forge(header: Header, claims: Claims): string;
    /** Токен пользователя по образцу PRD Identity §7.1 (tenant/tenant_id задаются аргументом). */
    userToken(overrides?: Claims): Promise<string>;
    /** Сервисный токен по образцу PRD Identity §7.2: sub = client_id. */
    serviceToken(overrides?: Claims): Promise<string>;
    /** Токен агента по образцу 01 §5.4: act = agent. */
    agentToken(overrides?: Claims): Promise<string>;
    /** Останавливает сервер JWKS; повторный вызов — без ошибки. */
    close(): Promise<void>;
}

interface SigningKey {
    readonly kid: string;
    readonly privateKey: CryptoKey;
    readonly jwk: JWK;
}

/**
 * Поднимает тестового издателя: Ed25519-ключ в памяти и JWKS на локальном HTTP-сервере `127.0.0.1`.
 * Только для тестов: подпуть `@verdeect/auth/testing` грузится лишь с условием `development`.
 *
 * @param options - `iss` и `kinds` издателя.
 * @returns {@link TestSigner}; после тестов вызвать `close()`.
 *
 * @example
 * ```ts
 * const identity = await createTestSigner();
 * const verifier = createVerifier({ issuers: [identity.issuer], resource: TEST_RESOURCE });
 * await verifier.verify(await identity.userToken({ tenant: 'acme', tenant_id: 'org_acme' }));
 * await identity.close();
 * ```
 */
export async function createTestSigner(options: TestSignerOptions = {}): Promise<TestSigner> {
    const iss = options.iss ?? TEST_IDENTITY_ISS;
    let current = await newKey();
    const published: SigningKey[] = [current];
    let requests = 0;

    const server = createServer((_req, res) => {
        requests += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ keys: published.map((key) => key.jwk) }));
    });
    const port = await listen(server);

    const sign = (
        claims: Claims,
        header: Header = {},
        key: SigningKey = current,
    ): Promise<string> => {
        const protectedHeader = compact({ typ: 'at+jwt', alg: 'EdDSA', kid: key.kid, ...header });

        return new SignJWT(compact(claims))
            .setProtectedHeader(protectedHeader as { alg: string })
            .sign(key.privateKey);
    };

    const base = (lifetimeSec: number): Claims => {
        const now = Math.floor(Date.now() / 1000);

        return { iss, aud: [TEST_RESOURCE], iat: now, exp: now + lifetimeSec, jti: randomUUID() };
    };

    return {
        issuer: {
            iss,
            jwksUri: `http://127.0.0.1:${port}/jwks`,
            kinds: options.kinds ?? ['user', 'service'],
        },
        jwksRequests: () => requests,
        async rotate() {
            current = await newKey();
            published.push(current);
        },
        sign: (claims, header) => sign(claims, header),
        async signWithUnpublishedKey(claims) {
            return sign(claims, {}, await newKey());
        },
        async signWithForeignKey(claims) {
            const foreign = await newKey();

            return sign(claims, {}, { ...foreign, kid: current.kid });
        },
        forge(header, claims) {
            return [
                encode(compact(header)),
                encode(compact(claims)),
                randomBytes(64).toString('base64url'),
            ].join('.');
        },
        userToken(overrides = {}) {
            return sign({
                ...base(300),
                sub: 'acc_test_user',
                client_id: 'verdeect-bff-app',
                sid: 'sid_test',
                scope: 'verdeect',
                ...overrides,
            });
        },
        serviceToken(overrides = {}) {
            return sign({
                ...base(600),
                sub: 'verdeect-platform',
                client_id: 'verdeect-platform',
                scope: 'identity:users.read',
                ...overrides,
            });
        },
        agentToken(overrides = {}) {
            return sign({
                ...base(300),
                sub: 'acc_test_user',
                tenant: 'acme',
                tenant_id: 'org_test_acme',
                asid: 'agent-session-id',
                wid: 'worker-id',
                prof: 'profile-id',
                pep: 42,
                act: 'agent',
                ...overrides,
            });
        },
        close: () => stop(server),
    };
}

async function newKey(): Promise<SigningKey> {
    const kid = randomUUID();
    const { publicKey, privateKey } = await generateKeyPair('EdDSA');
    const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'EdDSA', use: 'sig' };

    return { kid, privateKey, jwk };
}

function compact(values: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

function encode(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function listen(server: Server): Promise<number> {
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port));
    });
}

/** Повторный вызов — без ошибки. */
function stop(server: Server): Promise<void> {
    if (!server.listening) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        // fetch держит keep-alive соединения — без этого close ждёт их таймаута.
        server.closeAllConnections();
    });
}
