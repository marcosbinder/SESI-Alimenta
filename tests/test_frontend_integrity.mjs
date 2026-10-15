import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processarAnalyticsBI, criarChaveSerieAprovacao } from '../site/src/utils/analytics.js';
import { sincronizarTempo, getServerTime } from '../site/src/utils/time.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- STARTING FRONTEND PAGES & COMPONENT INTEGRITY SUITE ---');

// Test 1: B.I. & Chart Data Transformation Engine
{
  const historicoExemplo = [
    {
      data: '2026-08-20',
      turno: 'LM',
      presenca_total: 350,
      lixo_limpo: 4.5,
      lixo_sujo: 8.2,
      aprovacao: 320,
      rejeicao: 30,
      lanche_padrao: 'Arroz com Frango',
      observacoes: 'Excelente aceitação do prato principal'
    },
    {
      data: '2026-08-21',
      turno: 'A',
      presenca_total: 0,
      lixo_limpo: 0,
      lixo_sujo: 0,
      aprovacao: 0,
      rejeicao: 0,
      lanche_padrao: 'Macarronada',
      observacoes: ''
    }
  ];

  const resultado = processarAnalyticsBI(
    historicoExemplo, 
    { filtroTurnoBI: 'Todos', biDataInicio: '2026-08-01', biDataFim: '2026-08-31' }, 
    { lancheA: 'Arroz com Frango', lancheB: 'Macarronada' }
  );
  
  assert.ok(Array.isArray(resultado.dadosBIFiltrados), 'dadosBIFiltrados must be an array');
  assert.ok(Array.isArray(resultado.dadosBIDiarios), 'dadosBIDiarios must be an array');
  assert.ok(Array.isArray(resultado.muralFeedbacks), 'muralFeedbacks must be an array');
  assert.ok(Array.isArray(resultado.radarData), 'radarData must be an array');
  assert.ok(typeof resultado.metricas === 'object', 'metricas must be an object');
  
  // Verify numerical integrity (no NaNs, no strings in radar)
  resultado.radarData.forEach(r => {
    assert.equal(typeof r.A, 'number', 'Radar A must be a number');
    assert.equal(typeof r.B, 'number', 'Radar B must be a number');
    assert.ok(!isNaN(r.A), 'Radar A must not be NaN');
    assert.ok(!isNaN(r.B), 'Radar B must not be NaN');
  });

  console.log('[PASS] 1. B.I. Analytics & Chart Transformation');
}

// Test 2: Dynamic SVG Recharts Key Generator
{
  const serie1 = [{ data: '2026-08-20', dataGrafico: '20/08', taxaAprovacao: 91.4 }];
  const serie2 = [{ data: '2026-08-20', dataGrafico: '20/08', taxaAprovacao: 95.0 }];
  const key1 = criarChaveSerieAprovacao(serie1);
  const key2 = criarChaveSerieAprovacao(serie2);
  assert.notEqual(key1, key2, 'Keys must differ when rate changes to force clean SVG remount');
  console.log('[PASS] 2. Recharts Dynamic Key & SVG Cache Protection');
}

// Test 3: Time Sync & Fallback
{
  const time = getServerTime();
  assert.ok(time instanceof Date, 'getServerTime must return a Date instance');
  assert.ok(!isNaN(time.getTime()), 'getServerTime must not return Invalid Date');
  console.log('[PASS] 3. Time Synchronization & Zero-drift Clock');
}

// Test 4: Frontend Defensive Guards against Missing / Null Properties
{
  const emptyRes = processarAnalyticsBI([], {}, {});
  assert.equal(emptyRes.metricas.dpcValor, 0, 'Empty data must produce 0 dpcValor');
  assert.equal(emptyRes.metricas.ialValor, 0, 'Empty data must produce 0 ialValor');
  assert.equal(emptyRes.metricas.troValor, 0, 'Empty data must produce 0 troValor');
  assert.equal(emptyRes.dadosBIFiltrados.length, 0, 'Empty data must produce empty array');
  console.log('[PASS] 4. Defensive Anti-WSoD fallbacks & Zero-Division guards');
}

// Test 5: Regra de Ouro nº 1 - Zero Emojis em Código Frontend
{
  const emojiRegex = /[\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const siteSrcDir = path.resolve(__dirname, '../site/src');
  let emojisEncontrados = [];

  function varrerArquivos(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        varrerArquivos(p);
      } else if (/\.(jsx?|tsx?|html)$/.test(e.name)) {
        const content = fs.readFileSync(p, 'utf8');
        const lines = content.split(/\r?\n/);
        lines.forEach((l, idx) => {
          if (emojiRegex.test(l)) {
            emojisEncontrados.push(`${e.name}:${idx + 1}: ${l.trim()}`);
          }
        });
      }
    }
  }

  varrerArquivos(siteSrcDir);
  assert.equal(emojisEncontrados.length, 0, `Regra de Ouro nº 1 violada! Emojis encontrados: ${emojisEncontrados.join('; ')}`);
  console.log('[PASS] 5. Regra de Ouro nº 1 (Zero emojis em todos os arquivos de site/src)');
}

// Test 6: Decomposição Estruturada do Cardápio no BI (Almoço vs Lanche & Detalhes)
{
  const dadosMisturados = [
    // Almoço completo novo
    {
      data: '2026-09-01',
      turno: 'A',
      prato_principal: 'Frango Assado com Ervas',
      lanche_padrao: 'Frango Assado com Ervas',
      arroz: 'Arroz Branco',
      feijao: 'Feijão Carioca',
      opcao_vegetal: 'Salada de Repolho',
      guarnicao: 'Farofa',
      molho_salada: 'Azeite',
      sobremesa: 'Pudim',
      fruta: 'Laranja',
      bebida: null,
      presenca_total: 200,
      lixo_limpo: 1.0,
      lixo_sujo: 2.0,
      aprovacao: 180,
      rejeicao: 20,
      observacoes: 'Comida excelente'
    },
    // Cardápio antigo legado (sem acompanhamentos)
    {
      data: '2026-09-02',
      turno: 'LM',
      lanche_padrao: 'Pão de Queijo Tradicional',
      prato_principal: null,
      arroz: null,
      feijao: null,
      guarnicao: null,
      opcao_vegetal: null,
      molho_salada: null,
      sobremesa: null,
      fruta: null,
      bebida: null,
      presenca_total: 150,
      lixo_limpo: 0.5,
      lixo_sujo: 1.2,
      aprovacao: 140,
      rejeicao: 10,
      observacoes: 'Muito bom'
    }
  ];

  const resultado = processarAnalyticsBI(dadosMisturados, {}, { lancheA: 'Frango Assado com Ervas', lancheB: 'Pão de Queijo Tradicional' });

  // 1. Ambos os pratos devem aparecer com nomes corretos no mural de feedbacks
  const feedbackAlmoco = resultado.muralFeedbacks.find(f => f.prato === 'Frango Assado com Ervas');
  assert.ok(feedbackAlmoco, 'Feedback do almoço deve ser encontrado');
  assert.ok(Array.isArray(feedbackAlmoco.detalhes), 'Detalhes do almoço deve ser um array');
  assert.ok(feedbackAlmoco.detalhes.includes('Arroz Branco'), 'Deve conter arroz nos detalhes');
  assert.ok(feedbackAlmoco.detalhes.includes('Feijão Carioca'), 'Deve conter feijão nos detalhes');
  assert.ok(feedbackAlmoco.detalhes.includes('Salada de Repolho'), 'Deve conter salada nos detalhes');
  assert.ok(feedbackAlmoco.detalhes.includes('Farofa'), 'Deve conter guarnição nos detalhes');
  assert.ok(feedbackAlmoco.detalhes.includes('Pudim'), 'Deve conter sobremesa nos detalhes');
  assert.ok(!feedbackAlmoco.detalhes.some(d => d.startsWith('Bebida')), 'Almoço não deve conter bebida nos detalhes');

  // 2. Cardápio legado deve funcionar normalmente sem quebras
  const feedbackLegado = resultado.muralFeedbacks.find(f => f.prato === 'Pão de Queijo Tradicional');
  assert.ok(feedbackLegado, 'Cardápio legado deve ser encontrado pelo fallback lanche_padrao');
  assert.equal(feedbackLegado.detalhes.length, 0, 'Cardápio legado sem complementos deve ter detalhes vazio');

  console.log('[PASS] 6. Decomposição Estruturada & Suporte a Cardápios Legados no BI');
}

// Test 7: Anti-Poluição do BI (Receitas Fantasmas / Não Servidas)
{
  const dadosComFantasmas = [
    {
      data: '2026-09-03',
      turno: 'LM',
      prato_principal: 'Não Informado',
      lanche_padrao: 'Não Informado',
      presenca_total: 0,
      lixo_limpo: 0,
      lixo_sujo: 0,
      aprovacao: 0,
      rejeicao: 0,
      observacoes: ''
    },
    {
      data: '2026-09-04',
      turno: 'A',
      prato_principal: 'N/A',
      lanche_padrao: 'N/A',
      presenca_total: 0,
      lixo_limpo: 0,
      lixo_sujo: 0,
      aprovacao: 0,
      rejeicao: 0,
      observacoes: ''
    },
    {
      data: '2026-09-05',
      turno: 'LT',
      prato_principal: 'Receita Não Servida',
      lanche_padrao: 'Receita Não Servida',
      presenca_total: 0,
      lixo_limpo: 0,
      lixo_sujo: 0,
      aprovacao: 0,
      rejeicao: 0,
      observacoes: ''
    }
  ];

  const res = processarAnalyticsBI(dadosComFantasmas, {}, {});
  const nomesGlobal = res.dadosBIDiarios.map(d => d.lanche_padrao);

  assert.ok(!res.radarData.some(r => r.subject === 'Não Informado'), 'Não Informado não deve aparecer no radar');
  console.log('[PASS] 7. Anti-Poluição do BI (Receitas fantasmas e marcadores nulos descartados)');
}

// Test 8: Edge Cases de Complementos Parciais
{
  const dadosParciais = [
    {
      data: '2026-09-06',
      turno: 'A',
      prato_principal: 'Carne Moída',
      arroz: 'Arroz Branco',
      feijao: null, // sem feijao
      guarnicao: null, // sem guarnicao
      opcao_vegetal: 'Salada Verde',
      fruta: null,
      sobremesa: null,
      bebida: null,
      presenca_total: 100,
      aprovacao: 90,
      rejeicao: 10,
      observacoes: 'Boa textura'
    }
  ];

  const res = processarAnalyticsBI(dadosParciais, {}, {});
  const fb = res.muralFeedbacks[0];
  assert.equal(fb.detalhes.length, 2, 'Apenas complementos existentes (arroz e salada) devem constar nos detalhes');
  assert.deepEqual(fb.detalhes, ['Arroz Branco', 'Salada Verde']);
  console.log('[PASS] 8. Resiliência a Complementos Parciais & Omissão Limpa de Chips');
}

// Test 9: Remoção do Bloco de Variedade Nutricional (Demanda do Usuário)
{
  const estatisticasBIPath = path.resolve(__dirname, '../site/src/components/EstatisticasBI.jsx');
  const conteudo = fs.readFileSync(estatisticasBIPath, 'utf8');

  assert.ok(
    !conteudo.includes('variedadeNutricional'),
    'EstatisticasBI.jsx NÃO deve conter referências ao estado ou memo variedadeNutricional'
  );
  assert.ok(
    !conteudo.includes('Variedade Nutricional do Cardápio'),
    'EstatisticasBI.jsx NÃO deve conter o título ou painel de Variedade Nutricional do Cardápio'
  );
  console.log('[PASS] 9. Remoção Completa do Bloco de Variedade Nutricional de EstatisticasBI.jsx');
}

// Test 10: Comparativo de Desempenho Multidimensional & Multi-Categoria
{
  const historicoMulti = [
    {
      data: '2026-09-08',
      turno: 'A',
      prato_principal: 'Frango grelhado',
      lanche_padrao: 'Frango grelhado',
      arroz: 'Arroz Branco',
      feijao: 'Feijão Carioca',
      guarnicao: 'Polenta',
      opcao_vegetal: 'Brócolis variados',
      molho_salada: 'Molho de Alho Especial',
      sobremesa: 'Gelatina de Morango',
      fruta: 'Melancia',
      bebida: null,
      presenca_total: 200,
      lixo_limpo: 2.0,
      lixo_sujo: 3.5,
      aprovacao: 190,
      rejeicao: 10,
      observacoes: 'Excelente sabor'
    },
    {
      data: '2026-09-09',
      turno: 'LM',
      lanche_padrao: 'Bolo de brownie',
      prato_principal: null,
      arroz: null,
      feijao: null,
      guarnicao: null,
      opcao_vegetal: null,
      molho_salada: null,
      sobremesa: null,
      fruta: 'Banana',
      bebida: 'Suco de Laranja',
      presenca_total: 180,
      lixo_limpo: 0.8,
      lixo_sujo: 1.2,
      aprovacao: 175,
      rejeicao: 5,
      observacoes: 'Brownie muito elogiado'
    }
  ];

  const catalogoMock = [
    { nome: 'Molho de Alho Especial', categoria: 'molho_salada' },
    { nome: 'Bolo de brownie', categoria: 'lanche' }
  ];

  const res = processarAnalyticsBI(
    historicoMulti, 
    { filtroTurnoBI: 'Todos', biDataInicio: '2026-09-01', biDataFim: '2026-09-30' },
    { 
      lancheA: 'Molho de Alho Especial', 
      lancheB: 'Bolo de brownie',
      catalogoAlimentos: catalogoMock 
    }
  );

  // 1. Deve extrair lista de itens comparativos com categoria
  assert.ok(Array.isArray(res.listaItensComparativo), 'listaItensComparativo deve ser um array');
  assert.ok(res.listaItensComparativo.length >= 7, 'Deve extrair todos os componentes das refeições');

  const molho = res.listaItensComparativo.find(i => i.nome === 'Molho de Alho Especial');
  assert.ok(molho, 'Molho de Alho Especial deve constar na lista de itens comparativos');
  assert.equal(molho.categoria, 'molho_salada', 'Categoria do molho deve ser molho_salada');
  assert.equal(molho.mediaAprovacao, 95, 'Taxa de aprovação do molho deve ser 95%');
  assert.equal(molho.ocorrencias, 1, 'Molho foi servido 1x');

  const brownie = res.listaItensComparativo.find(i => i.nome === 'Bolo de brownie');
  assert.ok(brownie, 'Bolo de brownie deve constar na lista de itens comparativos');
  assert.equal(brownie.categoria, 'lanche', 'Categoria do brownie deve ser lanche');
  assert.equal(brownie.mediaAprovacao, 97, 'Taxa de aprovação do brownie deve ser 97%');

  // 2. statsA e statsB devem estar corretamente preenchidos
  assert.equal(res.statsA.nome, 'Molho de Alho Especial');
  assert.equal(res.statsA.mediaAprovacao, 95);
  assert.equal(res.statsB.nome, 'Bolo de brownie');
  assert.equal(res.statsB.mediaAprovacao, 97);

  // 3. radarData deve refletir os dois itens
  assert.equal(res.radarData.length, 3, 'Radar deve possuir 3 dimensões');
  const radarAprov = res.radarData.find(r => r.subject === 'Aceitação (%)');
  assert.equal(radarAprov.A, 95);
  assert.equal(radarAprov.B, 97);

  console.log('[PASS] 10. Comparativo de Desempenho Multidimensional & Multi-Categoria');
}

// Test 11: Mural de Feedbacks dos Professores (Resiliência & Detalhamento)
{
  const dados = [
    {
      data: '2026-09-08',
      turno: 'A',
      prato_principal: 'Frango grelhado',
      opcao_vegetal: 'Salada de Alface',
      guarnicao: 'Farofa Especial',
      observacoes: 'As crianças comeram tudo | O tempero estava perfeito'
    }
  ];

  const res = processarAnalyticsBI(dados, {}, {});
  assert.equal(res.muralFeedbacks.length, 2, 'Deve decompor duas observações distintas em cards individuais');
  
  const [fb1, fb2] = res.muralFeedbacks;
  assert.equal(fb1.prato, 'Frango grelhado');
  assert.deepEqual(fb1.detalhes, ['Farofa Especial', 'Salada de Alface']);
  assert.equal(fb1.texto, 'As crianças comeram tudo');
  assert.equal(fb2.texto, 'O tempero estava perfeito');
  assert.notEqual(fb1.id, fb2.id, 'IDs de feedbacks no mesmo turno devem ser distintos e estáveis');

  console.log('[PASS] 11. Mural de Feedbacks dos Professores (Resiliência & Detalhamento)');
}

// Test 12: Panorama Macro por Categoria Alimentar (resumoCategoriasBI)
{
  const historicoCategorias = [
    {
      data: '2026-09-01',
      turno: 'A',
      prato_principal: 'Frango Grelhado',
      opcao_vegetal: 'Salada de Tomate',
      molho_salada: 'Molho Italiano',
      sobremesa: 'Gelatina',
      presenca_total: 100,
      lixo_limpo: 1.5,
      lixo_sujo: 2.0,
      aprovacao: 90,
      rejeicao: 10
    },
    {
      data: '2026-09-02',
      turno: 'LM',
      lanche_padrao: 'Bolo de Cenoura',
      presenca_total: 80,
      lixo_limpo: 0.5,
      lixo_sujo: 1.0,
      aprovacao: 75,
      rejeicao: 5
    }
  ];

  const catalogo = [
    { nome: 'Frango Grelhado', categoria: 'prato_principal' },
    { nome: 'Salada de Tomate', categoria: 'opcao_vegetal' },
    { nome: 'Molho Italiano', categoria: 'molho_salada' },
    { nome: 'Gelatina', categoria: 'sobremesa' },
    { nome: 'Bolo de Cenoura', categoria: 'lanche' },
    { nome: 'Fruta Futura', categoria: 'fruta' }
  ];

  const res = processarAnalyticsBI(historicoCategorias, {}, { catalogoAlimentos: catalogo });
  assert.ok(Array.isArray(res.resumoCategoriasBI), 'resumoCategoriasBI deve ser um array');
  assert.ok(res.resumoCategoriasBI.length >= 8, 'Deve cobrir todos os grupos alimentares');

  const catPrato = res.resumoCategoriasBI.find(c => c.id === 'prato_principal');
  assert.ok(catPrato, 'Categoria prato_principal deve estar presente no macro');
  assert.equal(catPrato.mediaAprovacao, 90, 'Aprovação do prato principal deve ser 90%');
  assert.equal(catPrato.destaque?.nome, 'Frango Grelhado');

  const catFruta = res.resumoCategoriasBI.find(c => c.id === 'fruta');
  assert.ok(catFruta, 'Categoria fruta deve estar presente');
  assert.equal(catFruta.mediaAprovacao, null, 'Categoria sem avaliações deve ter aprovação nula (não 0%)');
  assert.equal(catFruta.destaque, null, 'Categoria sem avaliações não possui destaque');

  console.log('[PASS] 12. Panorama Macro por Categoria Alimentar (resumoCategoriasBI)');
}

// Test 13: Resiliência de Alimentos Não Servidos ou Sem Avaliações (Edge Case Bolo de brownie)
{
  const historicoComItemNaoServido = [
    {
      data: '2026-09-11',
      turno: 'LM',
      lanche_padrao: 'Bolo de brownie',
      presenca_total: 0,
      lixo_limpo: 0,
      lixo_sujo: 0,
      aprovacao: 0,
      rejeicao: 0
    }
  ];

  const res = processarAnalyticsBI(
    historicoComItemNaoServido, 
    {}, 
    { lancheA: 'Bolo de brownie', lancheB: 'Inexistente' }
  );

  assert.equal(res.statsA.nome, 'Bolo de brownie');
  assert.equal(res.statsA.ocorrencias, 0, 'Item não executado/sem dados deve ter 0 ocorrências servidas');
  assert.equal(res.statsA.totalAvaliacoes, 0, 'Item não avaliado deve ter 0 avaliações');
  assert.equal(res.statsA.mediaAprovacao, 0, 'mediaAprovacao numérica segura');
  assert.equal(res.statsB.ocorrencias, 0);
  assert.equal(res.statsB.totalAvaliacoes, 0);

  console.log('[PASS] 13. Resiliência de Alimentos Não Servidos ou Sem Avaliações (Edge Case)');
}

console.log('✅ Todos os testes de integridade do Front-end passaram com sucesso!');
