// Тест сервиса-потребителя с @verdeect/auth/testing (prd.md UC-2, AC-7): Vitest без настройки условий.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createVerifier } from '@verdeect/auth';
import { createTestSigner, TEST_RESOURCE, type TestSigner } from '@verdeect/auth/testing';

describe('UC-2: тесты сервиса с @verdeect/auth/testing', () => {
    let signer: TestSigner;

    beforeAll(async () => {
        signer = await createTestSigner();
    });

    afterAll(async () => {
        await signer.close();
    });

    it('AC-7: createTestSigner из @verdeect/auth/testing подписывает userToken, createVerifier из @verdeect/auth принимает его как kind user', async () => {
        const verifier = createVerifier({ issuers: [signer.issuer], resource: TEST_RESOURCE });

        const principal = await verifier.verify(await signer.userToken());

        expect(principal.kind).toBe('user');
        expect(principal.sub).not.toBe('');
        expect(principal.clientId).toBeTruthy();
    });
});
