// Точка входа verdeect-auth/testing: подписчик с mock JWKS и векторы V-1…V-8 (prd.md §7.5, §18).
export {
    createTestSigner,
    TEST_IDENTITY_ISS,
    TEST_ORCHESTRATOR_ISS,
    TEST_RESOURCE,
    type Claims,
    type Header,
    type TestSigner,
    type TestSignerOptions,
} from './test-signer.js';
export {
    tokenVectors,
    type TokenVector,
    type VectorExpectation,
    type VectorSigners,
} from './vectors.js';
