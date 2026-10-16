// Unit (prd.md §18, уровень L): кэш JWKS и перечитывание по неизвестному kid не чаще раза в 60 с (V-3).
// Требования: requirements/0000-identity-server/prd.md §7.5 V-3; files/01-contracts-excerpt.md §5.3; UC-14 A1; AC-7.2.
// Фейковые таймеры подменяют только Date (окно cooldown jose считает от Date.now); сеть и сервер — настоящие.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createVerifier, VerifyError, type Verifier } from './index.js';
import { createTestSigner, TEST_RESOURCE, type TestSigner } from './testing/index.js';

const START = new Date('2026-10-16T10:00:00Z');

function shiftClock(ms: number): void {
    vi.setSystemTime(Date.now() + ms);
}

describe('UC-14: кэш JWKS', () => {
    let signer: TestSigner;
    let verifier: Verifier;

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(START);
        signer = await createTestSigner();
        verifier = createVerifier({ issuers: [signer.issuer], resource: TEST_RESOURCE });
    });

    afterEach(async () => {
        vi.useRealTimers();
        await signer.close();
    });

    it('AC-7.2: второй токен с известным kid не делает запросов к JWKS', async () => {
        await verifier.verify(await signer.userToken());
        await verifier.verify(await signer.serviceToken());

        expect(signer.jwksRequests()).toBe(1);
    });

    it('AC-7.2: неизвестный kid после ротации → ровно один повторный запрос JWKS и токен принят', async () => {
        await verifier.verify(await signer.userToken());
        await signer.rotate();
        shiftClock(61_000);

        const principal = await verifier.verify(await signer.userToken());

        expect(principal.kind).toBe('user');
        expect(signer.jwksRequests()).toBe(2);
    });

    it('AC-7.2: второй неизвестный kid в пределах 60 с → без запроса, отказ V-3 kid_unknown', async () => {
        await verifier.verify(await signer.userToken());
        await signer.rotate();
        shiftClock(61_000);
        await verifier.verify(await signer.userToken());
        await signer.rotate();
        shiftClock(30_000);

        const error: unknown = await verifier
            .verify(await signer.userToken())
            .catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(VerifyError);
        expect(error).toMatchObject({ rule: 'V-3', reason: 'kid_unknown' });
        expect(signer.jwksRequests()).toBe(2);
    });

    it('AC-7.2: после 60 с неизвестный kid снова вызывает один запрос', async () => {
        await verifier.verify(await signer.userToken());
        await signer.rotate();
        const token = await signer.userToken();
        await verifier.verify(token).catch(() => undefined);
        expect(signer.jwksRequests()).toBe(1);

        shiftClock(61_000);
        const principal = await verifier.verify(token);

        expect(principal.kind).toBe('user');
        expect(signer.jwksRequests()).toBe(2);
    });

    it('UC-14: JWKS недоступен (сервер подписчика закрыт) → verify бросает не VerifyError', async () => {
        const token = await signer.userToken();
        await signer.close();

        const error: unknown = await verifier.verify(token).catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(VerifyError);
    });
});
