// Unit (prd.md §18, уровень L): createVerifier по векторам V-1…V-8 и токен агента.
// Требования: requirements/0000-identity-server/prd.md §7.5, §7.1, §7.2; files/01-contracts-excerpt.md §5.4;
// UC-14 (основной поток, A2), AC-7.1, AC-7.3.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createVerifier, VerifyError, type Verifier } from './index.js';
import {
    createTestSigner,
    TEST_ORCHESTRATOR_ISS,
    TEST_RESOURCE,
    tokenVectors,
    type TestSigner,
    type VectorSigners,
} from './testing/index.js';

async function rejection(promise: Promise<unknown>): Promise<VerifyError> {
    const error: unknown = await promise.then(
        () => null,
        (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(VerifyError);

    return error as VerifyError;
}

describe('UC-14: проверка токена сервисом', () => {
    let identity: TestSigner;
    let orchestrator: TestSigner;
    let signers: VectorSigners;
    let verifier: Verifier;

    beforeAll(async () => {
        identity = await createTestSigner();
        orchestrator = await createTestSigner({ iss: TEST_ORCHESTRATOR_ISS, kinds: ['agent'] });
        signers = { identity, orchestrator };
        verifier = createVerifier({
            issuers: [identity.issuer, orchestrator.issuer],
            resource: TEST_RESOURCE,
        });
    });

    afterAll(async () => {
        await identity.close();
        await orchestrator.close();
    });

    it.each(tokenVectors.map((vector) => [vector.id, vector.title, vector] as const))(
        'AC-7.1: вектор %s — %s',
        async (_id, _title, vector) => {
            const token = await vector.token(signers);
            const expected = vector.expect;

            if ('rule' in expected) {
                const error = await rejection(verifier.verify(token));
                expect({ rule: error.rule, reason: error.reason }).toEqual(expected);
                return;
            }

            const principal = await verifier.verify(token);
            expect(principal.kind).toBe(expected.kind);
            expect(principal).toMatchObject(expected.fields ?? {});
            expect(principal).not.toHaveProperty('roles');
        },
    );

    it('AC-7.3: токен Orchestrator с act=agent → kind agent с asid, wid, prof, pep, tenant, tenantId', async () => {
        const principal = await verifier.verify(await orchestrator.agentToken());

        expect(principal).toEqual({
            kind: 'agent',
            sub: 'acc_test_user',
            clientId: null,
            scopes: [],
            tenant: 'acme',
            tenantId: 'org_test_acme',
            asid: 'agent-session-id',
            wid: 'worker-id',
            prof: 'profile-id',
            pep: 42,
        });
    });

    it('AC-7.3: act=agent от издателя без agent в kinds → отказ V-6', async () => {
        const error = await rejection(verifier.verify(await identity.agentToken()));
        expect(error.rule).toBe('V-6');
    });

    it('AC-7.3: токен Orchestrator без act → отказ V-6', async () => {
        const error = await rejection(
            verifier.verify(await orchestrator.agentToken({ act: undefined })),
        );
        expect(error.rule).toBe('V-6');
    });

    it('AC-7.3: токен агента без pep → отказ V-7', async () => {
        const error = await rejection(
            verifier.verify(await orchestrator.agentToken({ pep: undefined })),
        );
        expect(error.rule).toBe('V-7');
    });

    it('AC-7.3: typ ≠ at+jwt → отказ V-1', async () => {
        const token = await orchestrator.sign(
            { iss: TEST_ORCHESTRATOR_ISS, aud: TEST_RESOURCE, iat: 1, exp: 2, act: 'agent' },
            { typ: 'JWT' },
        );
        const error = await rejection(verifier.verify(token));
        expect(error.rule).toBe('V-1');
    });

    it('AC-7.3: чужой aud → отказ V-5', async () => {
        const token = await orchestrator.agentToken({ aud: ['https://other.example'] });
        const error = await rejection(verifier.verify(token));
        expect(error.rule).toBe('V-5');
    });

    it('UC-14: пользовательский токен по образцу prd.md §7.1 → kind user, scopes [verdeect, tenant:acme], tenant и tenantId', async () => {
        const token = await identity.userToken({
            scope: 'verdeect tenant:acme',
            tenant: 'acme',
            tenant_id: 'org_test_acme',
        });

        expect(await verifier.verify(token)).toEqual({
            kind: 'user',
            sub: 'acc_test_user',
            clientId: 'verdeect-bff-app',
            sid: 'sid_test',
            scopes: ['verdeect', 'tenant:acme'],
            tenant: 'acme',
            tenantId: 'org_test_acme',
        });
    });

    it('UC-14: сервисный токен по образцу §7.2 → kind service без tenant', async () => {
        const token = await identity.serviceToken({ tenant: 'acme', tenant_id: 'org_test_acme' });

        expect(await verifier.verify(token)).toEqual({
            kind: 'service',
            sub: 'verdeect-platform',
            clientId: 'verdeect-platform',
            scopes: ['identity:users.read'],
        });
    });

    it('V-2: неизвестный iss отклоняется без запроса JWKS', async () => {
        const stranger = await createTestSigner({ iss: 'https://evil.example' });
        try {
            const isolated = createVerifier({
                issuers: [identity.issuer],
                resource: TEST_RESOURCE,
            });
            const error = await rejection(isolated.verify(await stranger.userToken()));

            expect(error.reason).toBe('issuer_unknown');
            expect(stranger.jwksRequests()).toBe(0);
        } finally {
            await stranger.close();
        }
    });

    it('createVerifier: пустой список издателей / повтор iss / пустой resource → ошибка конфигурации', () => {
        expect(() => createVerifier({ issuers: [], resource: TEST_RESOURCE })).toThrow(/issuers/);
        expect(() =>
            createVerifier({
                issuers: [identity.issuer, identity.issuer],
                resource: TEST_RESOURCE,
            }),
        ).toThrow(/duplicate issuer/);
        expect(() => createVerifier({ issuers: [identity.issuer], resource: '' })).toThrow(
            /resource/,
        );
    });
});
