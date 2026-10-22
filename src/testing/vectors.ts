// Векторы V-1…V-8 (PRD Identity §7.5 «векторы»; AC-7.1, AC-7.3). generic: экспортируемые данные для тестов потребителей.
// Verifier для векторов: issuers [identity.issuer, orchestrator.issuer], resource TEST_RESOURCE, допуск 30 с.
import { TEST_RESOURCE, type Claims, type TestSigner } from './test-signer.js';
import type { TokenKind } from '../index.js';
import type { VerifyReason, VerifyRule } from '../verify-error.js';

/** Подписчики: Identity (kinds user, service) и Orchestrator (kinds agent). */
export interface VectorSigners {
    /** Подписчик Identity: `createTestSigner()`. */
    readonly identity: TestSigner;
    /** Подписчик Orchestrator: `createTestSigner({ iss: TEST_ORCHESTRATOR_ISS, kinds: ['agent'] })`. */
    readonly orchestrator: TestSigner;
}

/**
 * Ожидаемый результат вектора: `{kind, fields?}` — токен принят, `Principal` нужного вида с этими полями;
 * `{rule, reason}` — токен отклонён `VerifyError` с этими полями.
 */
export type VectorExpectation =
    | { readonly kind: TokenKind; readonly fields?: Readonly<Record<string, unknown>> }
    | { readonly rule: VerifyRule; readonly reason: VerifyReason };

/** Один тестовый вектор правил V-1…V-8. */
export interface TokenVector {
    /** Стабильный идентификатор вектора. */
    readonly id: string;
    /** Проверяемое правило. */
    readonly rule: VerifyRule;
    /** Описание сценария. */
    readonly title: string;
    /** Строит токен вектора подписчиками Identity и Orchestrator. */
    token(signers: VectorSigners): Promise<string>;
    /** Ожидаемый результат проверки. */
    readonly expect: VectorExpectation;
}

const now = (): number => Math.floor(Date.now() / 1000);

/** Claim'ы пользовательского токена без подписи — для векторов с нестандартным заголовком. */
function userClaims(signer: TestSigner, overrides: Claims = {}): Claims {
    return {
        iss: signer.issuer.iss,
        aud: [TEST_RESOURCE],
        sub: 'acc_test_user',
        client_id: 'verdeect-bff-app',
        sid: 'sid_test',
        scope: 'verdeect',
        iat: now(),
        exp: now() + 300,
        ...overrides,
    };
}

const rejected = (rule: VerifyRule, reason: VerifyReason): VectorExpectation => ({ rule, reason });

/**
 * Векторы V-1…V-8 для тестов сервиса. Verifier для них: issuers `[identity.issuer, orchestrator.issuer]`,
 * resource {@link TEST_RESOURCE}, допуск часов 30 с.
 *
 * @example
 * ```ts
 * it.each(tokenVectors)('$id: $title', async (vector) => {
 *     const jwt = await vector.token({ identity, orchestrator });
 *     // проверить ответ маршрута по vector.expect
 * });
 * ```
 */
export const tokenVectors: readonly TokenVector[] = [
    // V-1 — заголовок
    {
        id: 'V-1.1',
        rule: 'V-1',
        title: 'typ application/at+jwt принят',
        token: ({ identity }) => identity.sign(userClaims(identity), { typ: 'application/at+jwt' }),
        expect: { kind: 'user' },
    },
    {
        id: 'V-1.2',
        rule: 'V-1',
        title: 'typ JWT — отказ',
        token: ({ identity }) => identity.sign(userClaims(identity), { typ: 'JWT' }),
        expect: rejected('V-1', 'typ_mismatch'),
    },
    {
        id: 'V-1.3',
        rule: 'V-1',
        title: 'без typ — отказ',
        token: ({ identity }) => identity.sign(userClaims(identity), { typ: undefined }),
        expect: rejected('V-1', 'typ_mismatch'),
    },
    {
        id: 'V-1.4',
        rule: 'V-1',
        title: 'alg HS256 — отказ',
        token: async ({ identity }) =>
            identity.forge({ typ: 'at+jwt', alg: 'HS256', kid: 'k1' }, userClaims(identity)),
        expect: rejected('V-1', 'alg_not_allowed'),
    },
    {
        id: 'V-1.5',
        rule: 'V-1',
        title: 'alg ES256 — отказ',
        token: async ({ identity }) =>
            identity.forge({ typ: 'at+jwt', alg: 'ES256', kid: 'k1' }, userClaims(identity)),
        expect: rejected('V-1', 'alg_not_allowed'),
    },
    {
        id: 'V-1.6',
        rule: 'V-1',
        title: 'alg none — отказ',
        token: async ({ identity }) =>
            identity.forge({ typ: 'at+jwt', alg: 'none', kid: 'k1' }, userClaims(identity)),
        expect: rejected('V-1', 'alg_not_allowed'),
    },
    {
        id: 'V-1.7',
        rule: 'V-1',
        title: 'без kid — отказ',
        token: ({ identity }) => identity.sign(userClaims(identity), { kid: undefined }),
        expect: rejected('V-1', 'kid_missing'),
    },
    {
        id: 'V-1.8',
        rule: 'V-1',
        title: 'не JWS — отказ',
        token: async () => 'not-a-jwt',
        expect: rejected('V-1', 'malformed'),
    },
    // V-2 — издатель и подпись
    {
        id: 'V-2.1',
        rule: 'V-2',
        title: 'iss из списка, подпись его ключом — принят',
        token: ({ identity }) => identity.userToken(),
        expect: { kind: 'user' },
    },
    {
        id: 'V-2.2',
        rule: 'V-2',
        title: 'iss вне списка — отказ',
        token: async ({ identity }) =>
            identity.forge(
                { typ: 'at+jwt', alg: 'EdDSA', kid: 'k1' },
                userClaims(identity, { iss: 'https://evil.example' }),
            ),
        expect: rejected('V-2', 'issuer_unknown'),
    },
    {
        id: 'V-2.3',
        rule: 'V-2',
        title: 'подпись чужим ключом с тем же kid — отказ',
        token: ({ identity }) => identity.signWithForeignKey(userClaims(identity)),
        expect: rejected('V-2', 'signature_invalid'),
    },
    // V-3 — kid
    {
        id: 'V-3.1',
        rule: 'V-3',
        title: 'kid из JWKS — принят',
        token: ({ identity }) => identity.serviceToken(),
        expect: { kind: 'service' },
    },
    {
        id: 'V-3.2',
        rule: 'V-3',
        title: 'kid, которого нет в JWKS, — отказ',
        token: ({ identity }) => identity.signWithUnpublishedKey(userClaims(identity)),
        expect: rejected('V-3', 'kid_unknown'),
    },
    // V-4 — exp и iat
    {
        id: 'V-4.1',
        rule: 'V-4',
        title: 'без exp — отказ',
        token: ({ identity }) => identity.userToken({ exp: undefined }),
        expect: rejected('V-4', 'exp_missing'),
    },
    {
        id: 'V-4.2',
        rule: 'V-4',
        title: 'без iat — отказ',
        token: ({ identity }) => identity.userToken({ iat: undefined }),
        expect: rejected('V-4', 'iat_missing'),
    },
    {
        id: 'V-4.3',
        rule: 'V-4',
        title: 'истёк больше чем на допуск — отказ',
        token: ({ identity }) => identity.userToken({ iat: now() - 400, exp: now() - 60 }),
        expect: rejected('V-4', 'expired'),
    },
    {
        id: 'V-4.4',
        rule: 'V-4',
        title: 'истёк в пределах допуска — принят',
        token: ({ identity }) => identity.userToken({ iat: now() - 310, exp: now() - 10 }),
        expect: { kind: 'user' },
    },
    {
        id: 'V-4.5',
        rule: 'V-4',
        title: 'iat в будущем больше допуска — отказ',
        token: ({ identity }) => identity.userToken({ iat: now() + 120, exp: now() + 420 }),
        expect: rejected('V-4', 'iat_in_future'),
    },
    {
        id: 'V-4.6',
        rule: 'V-4',
        title: 'iat в будущем в пределах допуска — принят',
        token: ({ identity }) => identity.userToken({ iat: now() + 10 }),
        expect: { kind: 'user' },
    },
    // V-5 — aud
    {
        id: 'V-5.1',
        rule: 'V-5',
        title: 'чужой aud — отказ',
        token: ({ identity }) => identity.userToken({ aud: ['https://other.example'] }),
        expect: rejected('V-5', 'audience_mismatch'),
    },
    {
        id: 'V-5.2',
        rule: 'V-5',
        title: 'aud списком с resource — принят',
        token: ({ identity }) =>
            identity.userToken({ aud: ['https://other.example', TEST_RESOURCE] }),
        expect: { kind: 'user' },
    },
    {
        id: 'V-5.3',
        rule: 'V-5',
        title: 'aud строкой, равной resource, — принят',
        token: ({ identity }) => identity.userToken({ aud: TEST_RESOURCE }),
        expect: { kind: 'user' },
    },
    {
        id: 'V-5.4',
        rule: 'V-5',
        title: 'без aud — отказ',
        token: ({ identity }) => identity.userToken({ aud: undefined }),
        expect: rejected('V-5', 'audience_mismatch'),
    },
    // V-6 — вид
    {
        id: 'V-6.1',
        rule: 'V-6',
        title: 'есть sid и client_id — user',
        token: ({ identity }) => identity.userToken(),
        expect: {
            kind: 'user',
            fields: { sub: 'acc_test_user', clientId: 'verdeect-bff-app', sid: 'sid_test' },
        },
    },
    {
        id: 'V-6.2',
        rule: 'V-6',
        title: 'sub = client_id без sid — service',
        token: ({ identity }) => identity.serviceToken(),
        expect: {
            kind: 'service',
            fields: { sub: 'verdeect-platform', clientId: 'verdeect-platform' },
        },
    },
    {
        id: 'V-6.3',
        rule: 'V-6',
        title: 'sub = client_id с sid — user',
        token: ({ identity }) => identity.userToken({ sub: 'verdeect-bff-app' }),
        expect: { kind: 'user', fields: { sub: 'verdeect-bff-app', sid: 'sid_test' } },
    },
    {
        id: 'V-6.4',
        rule: 'V-6',
        title: 'нет sid и sub ≠ client_id — отказ',
        token: ({ identity }) => identity.userToken({ sid: undefined }),
        expect: rejected('V-6', 'kind_unresolved'),
    },
    {
        id: 'V-6.5',
        rule: 'V-6',
        title: 'act agent у издателя без agent в kinds — отказ',
        token: ({ identity }) => identity.agentToken(),
        expect: rejected('V-6', 'kind_not_allowed'),
    },
    {
        id: 'V-6.6',
        rule: 'V-6',
        title: 'токен издателя [agent] без act — отказ',
        token: ({ orchestrator }) => orchestrator.agentToken({ act: undefined }),
        expect: rejected('V-6', 'kind_unresolved'),
    },
    {
        id: 'V-6.7',
        rule: 'V-6',
        title: 'act с другим значением — отказ',
        token: ({ orchestrator }) => orchestrator.agentToken({ act: 'human' }),
        expect: rejected('V-6', 'kind_unresolved'),
    },
    {
        id: 'V-6.8',
        rule: 'V-6',
        title: 'сервисный токен у издателя [agent] — отказ',
        token: ({ orchestrator }) => orchestrator.serviceToken(),
        expect: rejected('V-6', 'kind_not_allowed'),
    },
    {
        id: 'V-6.9',
        rule: 'V-6',
        title: 'посторонний claim roles игнорируется',
        token: ({ identity }) => identity.userToken({ roles: ['admin'] }),
        expect: { kind: 'user' },
    },
    // V-7 — токен агента
    {
        id: 'V-7.1',
        rule: 'V-7',
        title: 'агент со всеми полями, wid строкой',
        token: ({ orchestrator }) => orchestrator.agentToken(),
        expect: {
            kind: 'agent',
            fields: {
                sub: 'acc_test_user',
                tenant: 'acme',
                tenantId: 'org_test_acme',
                asid: 'agent-session-id',
                wid: 'worker-id',
                prof: 'profile-id',
                pep: 42,
            },
        },
    },
    {
        id: 'V-7.2',
        rule: 'V-7',
        title: 'агент с wid null',
        token: ({ orchestrator }) => orchestrator.agentToken({ wid: null }),
        expect: { kind: 'agent', fields: { wid: null } },
    },
    {
        id: 'V-7.3',
        rule: 'V-7',
        title: 'агент без client_id и scope — clientId null, scopes пустой',
        token: ({ orchestrator }) => orchestrator.agentToken(),
        expect: { kind: 'agent', fields: { clientId: null, scopes: [] } },
    },
    {
        id: 'V-7.4',
        rule: 'V-7',
        title: 'агент с client_id и scope',
        token: ({ orchestrator }) =>
            orchestrator.agentToken({ client_id: 'agent-runner', scope: 'verdeect' }),
        expect: { kind: 'agent', fields: { clientId: 'agent-runner', scopes: ['verdeect'] } },
    },
    {
        id: 'V-7.5',
        rule: 'V-7',
        title: 'агент без pep — отказ',
        token: ({ orchestrator }) => orchestrator.agentToken({ pep: undefined }),
        expect: rejected('V-7', 'agent_claim_missing'),
    },
    {
        id: 'V-7.6',
        rule: 'V-7',
        title: 'pep дробный — отказ',
        token: ({ orchestrator }) => orchestrator.agentToken({ pep: 1.5 }),
        expect: rejected('V-7', 'pep_not_integer'),
    },
    {
        id: 'V-7.7',
        rule: 'V-7',
        title: 'pep строкой — отказ',
        token: ({ orchestrator }) => orchestrator.agentToken({ pep: '42' }),
        expect: rejected('V-7', 'pep_not_integer'),
    },
    {
        id: 'V-7.8',
        rule: 'V-7',
        title: 'агент без asid — отказ',
        token: ({ orchestrator }) => orchestrator.agentToken({ asid: undefined }),
        expect: rejected('V-7', 'agent_claim_missing'),
    },
    {
        id: 'V-7.9',
        rule: 'V-7',
        title: 'агент без tenant_id — отказ',
        token: ({ orchestrator }) => orchestrator.agentToken({ tenant_id: undefined }),
        expect: rejected('V-7', 'agent_claim_missing'),
    },
    // V-8 — tenant ⇔ tenant_id
    {
        id: 'V-8.1',
        rule: 'V-8',
        title: 'tenant и tenant_id отсутствуют — null',
        token: ({ identity }) => identity.userToken(),
        expect: { kind: 'user', fields: { tenant: null, tenantId: null } },
    },
    {
        id: 'V-8.2',
        rule: 'V-8',
        title: 'tenant и tenant_id заданы',
        token: ({ identity }) => identity.userToken({ tenant: 'acme', tenant_id: 'org_test_acme' }),
        expect: { kind: 'user', fields: { tenant: 'acme', tenantId: 'org_test_acme' } },
    },
    {
        id: 'V-8.3',
        rule: 'V-8',
        title: 'tenant без tenant_id — отказ',
        token: ({ identity }) => identity.userToken({ tenant: 'acme' }),
        expect: rejected('V-8', 'tenant_pair_broken'),
    },
    {
        id: 'V-8.4',
        rule: 'V-8',
        title: 'tenant_id без tenant — отказ',
        token: ({ identity }) => identity.userToken({ tenant_id: 'org_test_acme' }),
        expect: rejected('V-8', 'tenant_pair_broken'),
    },
];
