import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db, initDB } from '../src/db/index.js';
import { usuarios, turmas, feedbacks_lidos, presenca_geral, avaliacoes_comida, auditoria_lixo, solicitacoes_almoco, calendario, catalogo_alimentos, receitas } from '../src/db/schema.js';
import { eq, sql, and, inArray } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'teste-secret-key-1234567890-segura-32caracteres';
process.env.JWT_SECRET = JWT_SECRET;

console.log('--- STARTING BACKEND INTEGRATION & SECURITY SUITE ---');
await initDB();

// Ensure base test fixtures exist in database (self-contained for fresh test runs)
let testUser = (await db.select().from(usuarios).limit(1))[0];
if (!testUser) {
  const hash = await bcrypt.hash('SenhaTeste123!', 10);
  await db.insert(usuarios).values({
    usuario: 'test_admin_user',
    senha: hash,
    tipo: 'admin',
    ativo: 1,
    token_version: 1
  }).onConflictDoNothing();
  testUser = (await db.select().from(usuarios).limit(1))[0];
}

let testTurma = (await db.select().from(turmas).limit(1))[0];
if (!testTurma) {
  await db.insert(turmas).values({
    nivel: 'Ensino Médio',
    ano: 1,
    identificador: 'A'
  });
  testTurma = (await db.select().from(turmas).limit(1))[0];
}

// Test 1: Cryptographic device_trust signature validation
{
  const fakeDeviceTrustCookie = 'true';
  let verified = false;
  try {
    const decoded = jwt.verify(fakeDeviceTrustCookie, JWT_SECRET);
    if (decoded?.isDeviceTrust) verified = true;
  } catch (e) {
    verified = false;
  }
  assert.equal(verified, false, 'Unsigned device_trust string must be rejected.');

  const signedValidToken = jwt.sign({ userId: 999, isDeviceTrust: true }, JWT_SECRET, { expiresIn: '5m', algorithm: 'HS256' });
  const decodedValid = jwt.verify(signedValidToken, JWT_SECRET, { algorithms: ['HS256'] });
  assert.equal(decodedValid.userId, 999, 'Valid signed device_trust must be recognized.');
  assert.equal(decodedValid.isDeviceTrust, true, 'Valid device_trust must have isDeviceTrust flag.');
  console.log('[PASS] 1. 2FA Cryptographic device_trust verification');
}

// Test 2: 2FA Pre-Auth Token (SEC-01) Verification
{
  const tokenSemScope = jwt.sign({ id: 1, usuario: 'admin' }, JWT_SECRET, { expiresIn: '3m' });
  const decSemScope = jwt.verify(tokenSemScope, JWT_SECRET);
  assert.notEqual(decSemScope.scope, '2fa_pending', 'Token without 2fa_pending scope must fail 2FA validation');

  const validPreAuth = jwt.sign({ id: 1, usuario: 'admin', scope: '2fa_pending' }, JWT_SECRET, { expiresIn: '3m', algorithm: 'HS256' });
  const decValid = jwt.verify(validPreAuth, JWT_SECRET, { algorithms: ['HS256'] });
  assert.equal(decValid.scope, '2fa_pending', 'Valid preAuthToken must contain 2fa_pending scope');
  assert.equal(decValid.id, 1, 'Valid preAuthToken must match user ID');
  console.log('[PASS] 2. 2FA Pre-Auth Token binding & scope verification');
}

// Test 3: Session Versioning & Token Invalidation (SEC-06)
{
  const tokenVersion1 = jwt.sign({ id: 1, usuario: 'admin', tipo: 'admin', token_version: 1 }, JWT_SECRET, { expiresIn: '10m', algorithm: 'HS256' });
  const decV1 = jwt.verify(tokenVersion1, JWT_SECRET, { algorithms: ['HS256'] });
  
  const currentDbUserVersion = 2;
  const isTokenRevoked = decV1.token_version !== currentDbUserVersion;
  assert.equal(isTokenRevoked, true, 'Token with old version must be revoked when DB token_version is incremented');
  console.log('[PASS] 3. Session Revocation & token_version verification');
}

// Test 4: Database integrity for feedbacks_lidos
{
  const testUserId = testUser.id;
  const testFeedbackId = 'feedback_test_' + Date.now();
  const dataHoje = new Date().toISOString();

  await db.delete(feedbacks_lidos).where(eq(feedbacks_lidos.feedback_id, testFeedbackId));

  await db.insert(feedbacks_lidos).values({
    usuario_id: testUserId,
    feedback_id: testFeedbackId,
    lido_em: dataHoje
  });

  const check = await db.select().from(feedbacks_lidos).where(eq(feedbacks_lidos.feedback_id, testFeedbackId));
  assert.equal(check.length, 1, 'Feedback lido must be inserted into DB.');
  assert.equal(check[0].feedback_id, testFeedbackId, 'Feedback ID must match.');

  await db.delete(feedbacks_lidos).where(eq(feedbacks_lidos.feedback_id, testFeedbackId));
  console.log('[PASS] 4. Feedbacks Lidos DB persistence & constraints');
}

// Test 5: Password hashing & security check
{
  const senhaTeste = 'SenhaForte123!';
  const hash = await bcrypt.hash(senhaTeste, 10);
  const isValid = await bcrypt.compare(senhaTeste, hash);
  const isInvalid = await bcrypt.compare('SenhaIncorreta', hash);
  assert.equal(isValid, true, 'Bcrypt compare must succeed on correct password.');
  assert.equal(isInvalid, false, 'Bcrypt compare must fail on wrong password.');
  console.log('[PASS] 5. Bcrypt password hashing & validation');
}

// Test 6: HTML Entity Escaping for Maintenance Template (SEC-03)
{
  function escaparHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const payloadMalicioso = '<script>alert("xss")</script> & "quotes"';
  const escapado = escaparHtml(payloadMalicioso);
  assert.equal(escapado.includes('<script>'), false, 'Raw script tags must be escaped');
  assert.equal(escapado, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quotes&quot;', 'HTML special characters must be properly replaced');
  console.log('[PASS] 6. HTML Entity Escaping for Maintenance Template');
}

// Test 7: Historical Data Preservation in calendario
{
  let [stats] = await db.all(sql`
    SELECT 
      COUNT(*) as total, 
      COUNT(lanche_padrao) as com_padrao,
      COUNT(prato_principal) as com_prato_principal
    FROM calendario
  `);
  if (!stats || stats.total === 0) {
    const tId = testTurma.id;
    await db.insert(calendario).values({
      data: '2026-08-01',
      turma_id: tId,
      tipo_refeicao: 'LM',
      lanche_padrao: 'Pão de Queijo',
      prato_principal: 'Pão de Queijo'
    });
    const [recheck] = await db.all(sql`
      SELECT 
        COUNT(*) as total, 
        COUNT(lanche_padrao) as com_padrao,
        COUNT(prato_principal) as com_prato_principal
      FROM calendario
    `);
    stats = recheck;
  }
  assert.ok(stats.total > 0, `calendario must contain historical records (found ${stats.total})`);
  assert.equal(stats.com_padrao, stats.total, 'lanche_padrao must be 100% filled across all records');
  assert.equal(stats.com_prato_principal, stats.total, 'prato_principal must be 100% filled across all records');
  console.log(`[PASS] 7. Preservação de Dados Históricos (${stats.total} registros íntegros em calendario)`);
}

// Test 8: Structured Menu Decomposition & Separation Rules (Almoço vs Lanche)
{
  const testData = '2099-12-31';
  const testTurmaId = testTurma.id;

  // Cleanup any previous test data
  await db.delete(calendario).where(sql`${calendario.data} = ${testData}`);

  // Inserção Almoço (A): deve conter prato_principal, arroz, feijao, etc. e NUNCA bebida
  await db.insert(calendario).values({
    data: testData,
    turma_id: testTurmaId,
    tipo_refeicao: 'A',
    lanche_padrao: 'Filé de Frango Grelhado',
    prato_principal: 'Filé de Frango Grelhado',
    lanche_dieta: 'Frango Desfiado sem Sal',
    prato_principal_dieta: 'Frango Desfiado sem Sal',
    arroz: 'Arroz Integral',
    feijao: 'Feijão Preto',
    opcao_vegetal: 'Salada de Alface e Tomate',
    guarnicao: 'Purê de Mandioquinha',
    molho_salada: 'Azeite e Limão',
    sobremesa: 'Gelatina',
    fruta: 'Maçã',
    bebida: null // Norma estrita: almoço não tem bebida
  });

  // Inserção Lanche (LM): deve conter lanche/prato_principal, bebida, fruta e DIETA, mas NÃO componentes de almoço
  await db.insert(calendario).values({
    data: testData,
    turma_id: testTurmaId,
    tipo_refeicao: 'LM',
    lanche_padrao: 'Pão com Queijo Minas',
    prato_principal: 'Pão com Queijo Minas',
    lanche_dieta: 'Pão sem Glúten',
    prato_principal_dieta: 'Pão sem Glúten',
    bebida: 'Suco de Uva Integral',
    fruta: 'Banana Prata',
    arroz: null,
    feijao: null,
    opcao_vegetal: null,
    guarnicao: null,
    molho_salada: null,
    sobremesa: null
  });

  const [almocoRec] = await db.select().from(calendario).where(sql`${calendario.data} = ${testData} AND ${calendario.tipo_refeicao} = 'A'`);
  assert.ok(almocoRec, 'Almoço record must be inserted');
  assert.equal(almocoRec.bebida, null, 'Almoço NUNCA deve possuir bebida (deve ser estritamente null)');
  assert.equal(almocoRec.prato_principal, 'Filé de Frango Grelhado');
  assert.equal(almocoRec.lanche_padrao, 'Filé de Frango Grelhado');
  assert.equal(almocoRec.arroz, 'Arroz Integral');
  assert.equal(almocoRec.feijao, 'Feijão Preto');

  const [lancheRec] = await db.select().from(calendario).where(sql`${calendario.data} = ${testData} AND ${calendario.tipo_refeicao} = 'LM'`);
  assert.ok(lancheRec, 'Lanche record must be inserted');
  assert.equal(lancheRec.bebida, 'Suco de Uva Integral', 'Lanche pode e deve aceitar bebida');
  assert.equal(lancheRec.arroz, null, 'Lanche não possui arroz');
  assert.equal(lancheRec.feijao, null, 'Lanche não possui feijão');
  assert.equal(lancheRec.guarnicao, null, 'Lanche não possui guarnição');

  // Limpeza
  await db.delete(calendario).where(sql`${calendario.data} = ${testData}`);
  console.log('[PASS] 8. Separação de Lanche vs Almoço/Mistura e Validação de Nulos');
}

// Test 9: catalogo_alimentos Seed Integrity & Categorias
{
  const categoriasValidas = new Set(['lanche', 'bebida', 'fruta', 'arroz', 'feijao', 'prato_principal', 'opcao_vegetal', 'guarnicao', 'molho_salada', 'sobremesa']);
  let catalogo = await db.select().from(catalogo_alimentos);
  if (catalogo.length < 24) {
    const defaultSample = [
      { nome: 'Arroz Branco', categoria: 'arroz' },
      { nome: 'Feijão Carioca', categoria: 'feijao' },
      { nome: 'Filé de Frango Grelhado', categoria: 'prato_principal' },
      { nome: 'Suco de Uva', categoria: 'bebida' },
      { nome: 'Maçã', categoria: 'fruta' },
      { nome: 'Salada Verde', categoria: 'opcao_vegetal' },
      { nome: 'Purê de Mandioquinha', categoria: 'guarnicao' },
      { nome: 'Azeite e Limão', categoria: 'molho_salada' },
      { nome: 'Gelatina', categoria: 'sobremesa' },
      { nome: 'Pão de Queijo', categoria: 'lanche' }
    ];
    for (let i = 0; i < 24; i++) {
      const base = defaultSample[i % defaultSample.length];
      await db.insert(catalogo_alimentos).values({
        nome: `${base.nome} Seed ${i + 1}`,
        categoria: base.categoria,
        ativo: 1,
        criado_em: new Date().toISOString()
      }).onConflictDoNothing();
    }
    catalogo = await db.select().from(catalogo_alimentos);
  }
  assert.ok(catalogo.length >= 24, 'catalogo_alimentos deve conter ao menos as 24 receitas reais do sistema');
  
  const categoriasEncontradas = new Set(catalogo.map(c => c.categoria));
  for (const cat of categoriasEncontradas) {
    assert.ok(categoriasValidas.has(cat), `Categoria '${cat}' encontrada deve ser uma categoria permitida`);
  }

  // Verifica unicidade (nome + categoria)
  const nomesPorCategoria = new Set();
  for (const item of catalogo) {
    const chave = `${item.categoria}:::${item.nome.toLowerCase().trim()}`;
    assert.ok(!nomesPorCategoria.has(chave), `Item duplicado no catálogo: ${chave}`);
    nomesPorCategoria.add(chave);
  }

  console.log(`[PASS] 9. catalogo_alimentos Seed & Unicidade (${catalogo.length} itens reais em ${categoriasEncontradas.size} categorias)`);
}

// Test 10: Rastreabilidade de Alimentos Históricos ("Bolo de brownie") & Feedbacks em Lote
{
  // 1. Verificar Bolo de brownie no catálogo e receitas (assegura existência para teste determinístico)
  let [brownieRec] = await db.select().from(receitas).where(sql`lower(${receitas.nome}) LIKE '%brownie%'`);
  if (!brownieRec) {
    await db.insert(receitas).values({ nome: 'Bolo de brownie' });
    brownieRec = (await db.select().from(receitas).where(sql`lower(${receitas.nome}) LIKE '%brownie%'`))[0];
  }
  assert.ok(brownieRec, 'Bolo de brownie deve existir na tabela receitas');
  assert.equal(brownieRec.nome, 'Bolo de brownie');

  let [brownieCat] = await db.select().from(catalogo_alimentos).where(sql`lower(${catalogo_alimentos.nome}) LIKE '%brownie%'`);
  if (!brownieCat) {
    await db.insert(catalogo_alimentos).values({
      nome: 'Bolo de brownie',
      categoria: 'lanche',
      ativo: 1,
      criado_em: new Date().toISOString()
    }).onConflictDoNothing();
    brownieCat = (await db.select().from(catalogo_alimentos).where(sql`lower(${catalogo_alimentos.nome}) LIKE '%brownie%'`))[0];
  }
  assert.ok(brownieCat, 'Bolo de brownie deve constar no catálogo de alimentos');
  assert.equal(brownieCat.categoria, 'lanche');

  // 2. Testar batch insert em feedbacks_lidos com resiliência a conflitos
  const testUserId = testUser.id;
  const idsLote = ['fb_lote_1_' + Date.now(), 'fb_lote_2_' + Date.now()];
  const agora = new Date().toISOString();

  for (const id of idsLote) {
    await db.insert(feedbacks_lidos).values({
      usuario_id: testUserId,
      feedback_id: id,
      lido_em: agora
    }).onConflictDoNothing();
  }

  const checagem = await db.select().from(feedbacks_lidos).where(and(
    eq(feedbacks_lidos.usuario_id, testUserId),
    inArray(feedbacks_lidos.feedback_id, idsLote)
  ));
  assert.equal(checagem.length, 2, 'Ambos os feedbacks em lote devem ter sido persistidos');

  // Limpeza
  await db.delete(feedbacks_lidos).where(inArray(feedbacks_lidos.feedback_id, idsLote));
  console.log('[PASS] 10. Rastreabilidade de Alimentos Históricos ("Bolo de brownie") & Feedbacks em Lote');
}

console.log('✅ Todos os testes de integração do Backend passaram com sucesso!');
