// Точка входа @verdeect/auth/testing: подписчик с mock JWKS и векторы V-1…V-8 (PRD Identity §7.5, §18; prd.md §8).
// Грузится только с условием `development` (Vitest — по умолчанию, Node — --conditions=development; FR-2, D-6):
// в production импорт падает с ERR_PACKAGE_PATH_NOT_EXPORTED. Типы доступны всегда.
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
