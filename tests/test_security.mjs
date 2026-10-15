import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
const authRoute = readFileSync(new URL('../src/routes/auth.js', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.match(
  server,
  /express\.json\(\{\s*limit:\s*['"]100kb['"]\s*}\)/,
  'JSON request bodies must have a size limit.',
);

assert.doesNotMatch(
  server,
  /res\.status\(500\)\.json\(\{\s*erro:[^}]*causa:/,
  'Internal exception details must not be returned to API clients.',
);

assert.equal(
  manifest.dependencies.bcrypt,
  '^6.0.0',
  'The vulnerable bcrypt 5 dependency chain must not be used.',
);

assert.match(
  authRoute,
  /secure:\s*usarCookieSeguro/,
  'Authentication cookies must use the cookie security configuration variable.',
);

assert.match(
  server,
  /process\.env\.JWT_SECRET.*length\s*<\s*32/,
  'Server must enforce JWT_SECRET presence and minimum 32-character length on startup.',
);

assert.match(
  server,
  /camposSensiveis\s*=\s*\[.*'preAuthToken'.*'device_trust'.*'two_factor_secret'.*'recovery_codes'/,
  'Audit trail logger must mask authentication and 2FA tokens before persistence.',
);

const adminRoute = readFileSync(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
assert.match(
  adminRoute,
  /router\.post\('\/admin\/purge',\s*exigirRevalidacao2FA/,
  'Destructive purge route must require explicit 2FA revalidation.',
);
assert.match(
  adminRoute,
  /router\.post\('\/admin\/usuarios\/:id\/reset',\s*exigirRevalidacao2FA/,
  'Password reset of users by admin must require explicit 2FA revalidation.',
);

const vinculacaoScript = readFileSync(new URL('../src/scripts/vincularSenaiPersonaliza.js', import.meta.url), 'utf8');
const nomesReaisProibidos = ['João Gabriel Rodrigues', 'Matheus Bastos', 'Helena de Medeiros', 'Mariana Vitória Moura'];
for (const nome of nomesReaisProibidos) {
  assert.equal(
    vinculacaoScript.includes(nome),
    false,
    `Real student name '${nome}' must not be present in scripts (LGPD compliance).`
  );
}

console.log('✅ Todos os testes de segurança do backend passaram com sucesso!');
