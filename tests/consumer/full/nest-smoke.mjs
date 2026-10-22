// Адаптер @verdeect/auth/nest в проекте с NestJS 12 (prd.md AC-2, UC-1).
import 'reflect-metadata';

function fail(message) {
    console.error(`nest smoke failed: ${message}`);
    process.exit(1);
}

const nest = await import('@verdeect/auth/nest');

if (typeof nest.VerdeectAuthModule !== 'function') {
    fail('VerdeectAuthModule is not a class');
}
if (typeof nest.VerdeectAuthGuard !== 'function') {
    fail('VerdeectAuthGuard is not a class');
}
if (
    typeof nest.VerdeectAuthModule.forRoot !== 'function' ||
    typeof nest.VerdeectAuthModule.forRootAsync !== 'function'
) {
    fail('VerdeectAuthModule.forRoot/forRootAsync are missing');
}
if (typeof nest.VERDEECT_VERIFIER !== 'symbol') {
    fail('VERDEECT_VERIFIER is not a symbol');
}

console.log('nest-ok');
