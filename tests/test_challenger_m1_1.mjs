import assert from 'node:assert/strict';
import { criarChaveSerieAprovacao, processarAnalyticsBI } from '../site/src/utils/analytics.js';
import { sincronizarTempo, getServerTime } from '../site/src/utils/time.js';

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
    console.log(`[PASS] ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message, stack: err.stack });
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`[PASS] ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message, stack: err.stack });
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

console.log('--- STARTING EMPIRICAL CHALLENGER TESTS ---');

// === TEST GROUP 1: processarAnalyticsBI edge cases ===

test('1.1 processarAnalyticsBI(null, null, null)', () => {
  const res = processarAnalyticsBI(null, null, null);
  assert.ok(res, 'Must return an object');
  assert.ok(Array.isArray(res.dadosBIFiltrados), 'dadosBIFiltrados must be array');
  assert.equal(res.dadosBIFiltrados.length, 0);
  assert.ok(Array.isArray(res.listaPratosGlobal), 'listaPratosGlobal must be array');
  assert.equal(res.listaPratosGlobal.length, 0);
  assert.ok(Array.isArray(res.topAceitacao), 'topAceitacao must be array');
  assert.ok(Array.isArray(res.topSujo), 'topSujo must be array');
  assert.ok(Array.isArray(res.topLimpo), 'topLimpo must be array');
  assert.ok(Array.isArray(res.radarData), 'radarData must be array');
  assert.equal(res.radarData.length, 3);
  assert.ok(res.metricas, 'metricas must exist');
  assert.equal(res.metricas.sumSobra, 0);
  assert.equal(res.metricas.dpcValor, 0);
  assert.equal(res.metricas.ialValor, 0);
  assert.equal(res.metricas.troValor, 0);
  assert.ok(Array.isArray(res.muralFeedbacks), 'muralFeedbacks must be array');
  assert.equal(res.muralFeedbacks.length, 0);
});

test('1.2 processarAnalyticsBI(undefined, {}, {})', () => {
  const res = processarAnalyticsBI(undefined, {}, {});
  assert.ok(res);
  assert.equal(res.dadosBIFiltrados.length, 0);
  assert.equal(res.listaPratosGlobal.length, 0);
  assert.equal(res.muralFeedbacks.length, 0);
});

test('1.3 processarAnalyticsBI with string numbers and string observacoes', () => {
  const sample = [
    {
      data: '2026-08-20',
      turno: 'Manhã',
      lanche_padrao: 'Arroz',
      lixo_limpo: "10.5",
      lixo_sujo: "5.2",
      aprovacao: "15",
      rejeicao: "2",
      observacoes: "Texto puro em vez de array"
    }
  ];
  const res = processarAnalyticsBI(sample, { filtroTurnoBI: 'Todos' }, {});
  assert.equal(res.dadosBIFiltrados.length, 1);
  assert.equal(res.dadosBIFiltrados[0].taxaAprovacao, Math.round((15 / 17) * 100)); // 88%
  assert.equal(res.listaPratosGlobal.length, 1);
  assert.equal(res.listaPratosGlobal[0].nome, 'Arroz');
  assert.equal(res.listaPratosGlobal[0].mediaLimpo, 10.5);
  assert.equal(res.listaPratosGlobal[0].mediaSujo, 5.2);
  assert.equal(res.listaPratosGlobal[0].mediaAprovacao, 88);
  assert.equal(typeof res.radarData[0].A, 'number');
  assert.equal(typeof res.radarData[1].A, 'number');
  assert.equal(typeof res.radarData[2].A, 'number');
  assert.equal(res.muralFeedbacks.length, 1);
  assert.equal(res.muralFeedbacks[0].texto, "Texto puro em vez de array");
  assert.equal(res.muralFeedbacks[0].prato, "Arroz");
  assert.equal(res.muralFeedbacks[0].turno, "Manhã");
});

test('1.4 processarAnalyticsBI with null/undefined elements in array and empty fields', () => {
  const sample = [
    null,
    undefined,
    {},
    {
      data: null,
      turno: null,
      lanche_padrao: null,
      lixo_limpo: null,
      lixo_sujo: undefined,
      aprovacao: NaN,
      rejeicao: 'invalid',
      observacoes: null
    },
    {
      data: '2026-08-21',
      turno: 'Tarde',
      lanche_padrao: 'Feijão',
      lixo_limpo: 0,
      lixo_sujo: 0,
      aprovacao: 0,
      rejeicao: 0,
      observacoes: ['', '  ', null, undefined, 'Observação válida']
    }
  ];
  const res = processarAnalyticsBI(sample, { filtroTurnoBI: 'Todos', biDataInicio: '2026-08-01', biDataFim: '2026-08-31' }, {
    lancheA: 'Feijão',
    lancheB: 'Inexistente',
    formatarDataSimples: null,
    mapNomesTurnos: { Tarde: 'Turno da Tarde' }
  });
  
  assert.ok(res.dadosBIFiltrados.length >= 1);
  assert.equal(res.listaPratosGlobal.length, 1);
  assert.equal(res.listaPratosGlobal[0].nome, 'Feijão');
  assert.equal(res.radarData[0].A, 0);
  assert.equal(res.radarData[0].B, 0);
  assert.equal(res.muralFeedbacks.length, 1);
  assert.equal(res.muralFeedbacks[0].texto, 'Observação válida');
  assert.equal(res.muralFeedbacks[0].turno, 'Turno da Tarde');
});

test('1.5 processarAnalyticsBI division by zero safety in metrics', () => {
  const sample = [
    {
      data: '2026-08-20',
      turno: 'Manhã',
      lanche_padrao: 'Biscoito',
      lixo_limpo: 0,
      lixo_sujo: 0,
      aprovacao: 0,
      rejeicao: 0,
      presenca_total: 0
    }
  ];
  const res = processarAnalyticsBI(sample, {}, {});
  assert.equal(res.metricas.dpcValor, 0);
  assert.equal(res.metricas.ialValor, 0);
  assert.equal(res.metricas.troValor, 0);
  assert.ok(Number.isFinite(res.metricas.dpcValor));
  assert.ok(Number.isFinite(res.metricas.ialValor));
  assert.ok(Number.isFinite(res.metricas.troValor));
});

test('1.6 criarChaveSerieAprovacao muda quando um ponto da linha muda', () => {
  const serieInicial = [
    { data: '2026-08-20', dataGrafico: '20/08', taxaAprovacao: 80 },
    { data: '2026-08-24', dataGrafico: '24/08', taxaAprovacao: 0 },
    { data: '2026-08-25', dataGrafico: '25/08', taxaAprovacao: 60 }
  ];
  const serieAtualizada = [...serieInicial.slice(0, 2), { ...serieInicial[2], taxaAprovacao: 90 }];

  assert.notEqual(
    criarChaveSerieAprovacao(serieInicial),
    criarChaveSerieAprovacao(serieAtualizada),
    'a chave deve obrigar o Recharts a reconstruir o SVG quando os dados da linha forem atualizados'
  );
});

// === TEST GROUP 2: time.js sync and getServerTime safety ===

await testAsync('2.1 getServerTime() with initial default state', async () => {
  const initialTime = getServerTime();
  assert.ok(initialTime instanceof Date);
  assert.ok(!isNaN(initialTime.getTime()));
  assert.doesNotThrow(() => initialTime.toISOString());
});

await testAsync('2.2 sincronizarTempo with string timestamp "1724150000000"', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ timestamp: "1724150000000" })
  });

  try {
    const ok = await sincronizarTempo();
    assert.equal(ok, true);
    const serverTime = getServerTime();
    assert.ok(serverTime instanceof Date);
    assert.ok(!isNaN(serverTime.getTime()));
    assert.doesNotThrow(() => {
      const iso = serverTime.toISOString();
      assert.ok(iso.startsWith('2024-') || iso.startsWith('2026-'));
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await testAsync('2.3 sincronizarTempo with negative timestamp', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ timestamp: -5000 })
  });

  try {
    const ok = await sincronizarTempo();
    assert.equal(ok, false, 'Negative timestamp should trigger fallback');
    const serverTime = getServerTime();
    assert.ok(serverTime instanceof Date);
    assert.ok(!isNaN(serverTime.getTime()));
    assert.doesNotThrow(() => serverTime.toISOString());
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await testAsync('2.4 sincronizarTempo with NaN / string garbage timestamp', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ timestamp: "abc_not_a_number" })
  });

  try {
    const ok = await sincronizarTempo();
    assert.equal(ok, false, 'NaN timestamp should trigger fallback');
    const serverTime = getServerTime();
    assert.ok(serverTime instanceof Date);
    assert.ok(!isNaN(serverTime.getTime()));
    assert.doesNotThrow(() => serverTime.toISOString());
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await testAsync('2.5 sincronizarTempo with network error / rejected fetch', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('Network failure simulation');
  };

  try {
    const ok = await sincronizarTempo();
    assert.equal(ok, false, 'Network failure should safely fallback');
    const serverTime = getServerTime();
    assert.ok(serverTime instanceof Date);
    assert.ok(!isNaN(serverTime.getTime()));
    assert.doesNotThrow(() => serverTime.toISOString());
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await testAsync('2.6 sincronizarTempo with malformed JSON response ({})', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({})
  });

  try {
    const ok = await sincronizarTempo();
    assert.equal(ok, false, 'Empty payload should fallback');
    const serverTime = getServerTime();
    assert.ok(serverTime instanceof Date);
    assert.ok(!isNaN(serverTime.getTime()));
    assert.doesNotThrow(() => serverTime.toISOString());
  } finally {
    globalThis.fetch = originalFetch;
  }
});

console.log('\n--- TEST SUMMARY ---');
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
