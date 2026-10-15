import assert from 'node:assert/strict';
import { processarAnalyticsBI } from '../site/src/utils/analytics.js';
import { sincronizarTempo, getServerTime } from '../site/src/utils/time.js';

console.log('--- STARTING ADVERSARIAL STRESS TEST ---');

// Stress Test 1: Non-object parameters to processarAnalyticsBI
try {
  console.log('Adversarial 1: Primitive types for filtros and parametros...');
  const res1 = processarAnalyticsBI([], 'filtro_string', 12345);
  assert.ok(res1 && typeof res1 === 'object');
  console.log('[PASS] Adversarial 1 passed');
} catch (e) {
  console.error('[FAIL] Adversarial 1:', e);
  process.exit(1);
}

// Stress Test 2: Extreme values, Infinity, NaN, unicode, empty strings
try {
  console.log('Adversarial 2: Extreme numeric values and NaN...');
  const dirtyData = [
    {
      data: '2026-08-20',
      turno: 'Manhã',
      lanche_padrao: '🍌 Banana Com Açúcar & Canela 🍰',
      lixo_limpo: Infinity,
      lixo_sujo: -Infinity,
      aprovacao: 999999999999,
      rejeicao: -100,
      presenca_total: NaN,
      observacoes: ['   ', '\t\n', 'Crítica construtiva com emojis 🔥💯']
    },
    {
      data: '2026-08-21',
      turno: 'Noite',
      lanche_padrao: '__proto__',
      lixo_limpo: 'NaN',
      lixo_sujo: undefined,
      aprovacao: null,
      rejeicao: false,
      observacoes: 'Uma string direta'
    }
  ];

  const res2 = processarAnalyticsBI(dirtyData, { filtroTurnoBI: 'Todos' }, {});
  assert.ok(res2);
  assert.ok(Array.isArray(res2.muralFeedbacks));
  assert.equal(res2.muralFeedbacks.length, 2);
  assert.equal(res2.muralFeedbacks[0].texto, 'Crítica construtiva com emojis 🔥💯');
  assert.equal(res2.muralFeedbacks[1].texto, 'Uma string direta');
  console.log('[PASS] Adversarial 2 passed');
} catch (e) {
  console.error('[FAIL] Adversarial 2:', e);
  process.exit(1);
}

// Stress Test 3: Volume and performance stress (10,000 records)
try {
  console.log('Adversarial 3: Volume stress with 10,000 records...');
  const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
    data: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
    turno: i % 3 === 0 ? 'Manhã' : (i % 3 === 1 ? 'Tarde' : 'Noite'),
    lanche_padrao: `Prato_${i % 20}`,
    lixo_limpo: (Math.random() * 50).toFixed(2),
    lixo_sujo: (Math.random() * 30).toFixed(2),
    aprovacao: Math.floor(Math.random() * 200),
    rejeicao: Math.floor(Math.random() * 50),
    presenca_total: 250,
    observacoes: i % 10 === 0 ? `Feedback número ${i}` : (i % 20 === 0 ? [`Multi ${i}`, `Outro ${i}`] : null)
  }));

  const t0 = performance.now();
  const res3 = processarAnalyticsBI(largeDataset, { filtroTurnoBI: 'Manhã' }, { lancheA: 'Prato_1', lancheB: 'Prato_2' });
  const t1 = performance.now();
  
  assert.ok(res3);
  assert.ok(res3.dadosBIFiltrados.length > 0);
  assert.ok(res3.muralFeedbacks.length > 0);
  console.log(`[PASS] Adversarial 3 passed in ${(t1 - t0).toFixed(2)}ms`);
} catch (e) {
  console.error('[FAIL] Adversarial 3:', e);
  process.exit(1);
}

// Stress Test 4: Time sync rapid multi-call and invalid payloads
try {
  console.log('Adversarial 4: Time sync resilience...');
  const tests = [
    { timestamp: "0" },
    { timestamp: "-100" },
    { timestamp: "999999999999999999999" }, // huge number
    { timestamp: {} },
    { timestamp: [] },
    { timestamp: true }
  ];

  for (const payload of tests) {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => payload
    });
    sincronizarTempo();
  }

  const finalTime = getServerTime();
  assert.ok(finalTime instanceof Date);
  assert.ok(!isNaN(finalTime.getTime()));
  console.log('[PASS] Adversarial 4 passed');
} catch (e) {
  console.error('[FAIL] Adversarial 4:', e);
  process.exit(1);
}

console.log('--- ALL ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY ---');
process.exit(0);
