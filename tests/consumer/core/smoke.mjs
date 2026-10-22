// Ядро @verdeect/auth без NestJS (prd.md AC-2, UC-1 alt-1): импорт и createVerifier без сети.
import { createRequire } from 'node:module';

function fail(message) {
    console.error(`core smoke failed: ${message}`);
    process.exit(1);
}

const auth = await import('@verdeect/auth');

const verifier = auth.createVerifier({
    issuers: [{ iss: 'https://id.example.test', jwksUri: 'https://id.example.test/jwks' }],
    resource: 'https://api.example.test',
});
if (typeof verifier.verify !== 'function') {
    fail('createVerifier returned no verify function');
}
if (typeof auth.VerifyError !== 'function') {
    fail('VerifyError is not a constructor');
}

try {
    createRequire(import.meta.url).resolve('@nestjs/common');
    fail('@nestjs/common is resolvable, the project must not contain NestJS');
} catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND') {
        throw error;
    }
}

console.log('core-ok');
