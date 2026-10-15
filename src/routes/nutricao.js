/**
 * Módulo de Nutrição e Produção Alimentar
 * 
 * Regras de Negócio:
 * 1. Projeção de Refeições: Dimensiona porções por turno (LM, A, LT) cruzando presenças lançadas pelos professores,
 *    pedidos de contraturno aprovados pela coordenação e fichas clínicas de dietas restritivas.
 * 2. Calendário Pedagógico & Escolar: Contempla grades com dias específicos para turmas SENAI e trilhas do Personaliza,
 *    desconsiderando automaticamente recessos e feriados cadastrados.
 * 3. Auditoria de Desperdício: Registra pesagens de sobra limpa (panela) e resto ingesta (prato) para cálculo do BI.
 */
const express = require('express');
const { eq, and, like, sql, gte, asc } = require('drizzle-orm');
const { calcularSimilaridade } = require('../utils/fuzzy.js');
const { z } = require('zod');
const { db } = require('../db');
const { turmas, alunos_especiais, presenca_geral, presenca_restricoes, auditoria_lixo, receitas, catalogo_alimentos, calendario, avaliacoes_comida, dias_nao_letivos, dias_ignorados_turma, usuarios, aluno_turmas, restricoes, aluno_restricoes, solicitacoes_almoco, logs_sistema, parametros_sistema, feedbacks_lidos } = require('../db/schema');
const { verificarToken, autorizar } = require('../middlewares/auth');

const router = express.Router();

const limparTexto = (str) => {
  if (typeof str !== 'string') return null;
  const s = str.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  return s || null;
};

const cronogramaPersonaliza = { 1: [7, 8, 9], 2: [7, 9], 3: [8, 9], 4: [7, 8, 9], 5: [7, 8, 9] };
const JWT_SECRET = process.env.JWT_SECRET;

function isValidSenaiDay(ano, diaDaSemana) {
    if (ano === 2) return diaDaSemana === 2 || diaDaSemana === 4; // Terça e Quinta
    if (ano === 3) return diaDaSemana === 1 || diaDaSemana === 5; // Segunda e Sexta
    return false;
}

function getHoje() {
  const d = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function getUltimoDiaLetivo(dataAtualStr) {
  let data = new Date(dataAtualStr + 'T12:00:00-03:00');
  let dataStr = '';
  while (true) {
    data.setDate(data.getDate() - 1);
    dataStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    const diaSemana = data.getDay();
    if (diaSemana === 0) continue;
    const feriado = await db.select().from(dias_nao_letivos).where(eq(dias_nao_letivos.data, dataStr));
    if (feriado.length > 0) continue;
    break;
  }
  return dataStr;
}

router.use(verificarToken);
const apenasCozinha = autorizar(['cozinha']);



router.get('/painel-cozinha/pendencias', apenasCozinha, async (req, res, next) => {
  try {
    const hoje = getHoje();
    const ontem = await getUltimoDiaLetivo(hoje);
    
    const turmasDB = await db.select().from(turmas);
    
    const presencasOntem = await db.select().from(presenca_geral).where(eq(presenca_geral.data, ontem));
    const turnosEsperadosLixo = new Set();
    
    presencasOntem.forEach(p => {
       const turma = turmasDB.find(t => t.id === p.turma_id);
       if (!turma) return;
       
       const dataObj = new Date(ontem + 'T12:00:00-03:00');
       const diaDaSemana = dataObj.getDay();
       const nivelNorm = turma.nivel.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
       
       if (nivelNorm === 'Fundamental 1') { 
         turnosEsperadosLixo.add('LM'); 
         if (diaDaSemana !== 3) { turnosEsperadosLixo.add('A'); turnosEsperadosLixo.add('LT'); }
       }
      else if (nivelNorm === 'Fundamental 2') { turnosEsperadosLixo.add(Number(turma.ano) === 9 ? 'LM' : 'LT'); }
       else if (nivelNorm === 'Ensino Tecnico (SENAI)') {
          if (isValidSenaiDay(Number(turma.ano), diaDaSemana)) {
            turnosEsperadosLixo.add('LM'); turnosEsperadosLixo.add('A'); turnosEsperadosLixo.add('LT');
          }
       }
       else if (nivelNorm === 'Ensino Medio') {
          const is2AnoFora = Number(turma.ano) === 2 && (diaDaSemana === 2 || diaDaSemana === 4);
          const is3AnoFora = Number(turma.ano) === 3 && (diaDaSemana === 1);
          if (is2AnoFora || is3AnoFora) return;
          turnosEsperadosLixo.add('LM');
       }
       else if (nivelNorm === 'Personaliza') {
          turnosEsperadosLixo.add('A');
       }
    });
    
    const lixoOntem = await db.select().from(auditoria_lixo).where(eq(auditoria_lixo.data, ontem));
    const turnosComLixo = lixoOntem.map(l => l.tipo_refeicao);
    const lixoPendente = Array.from(turnosEsperadosLixo).filter(t => !turnosComLixo.includes(t));
    
    const d = new Date(); d.setDate(d.getDate() - 15);
    const dataCorte = d.toISOString().split('T')[0];
    
    const presencasPassadas = await db.select().from(presenca_geral).where(and(gte(presenca_geral.data, dataCorte), sql`${presenca_geral.data} <= ${hoje}`));
    const cardapiosPassados = await db.select().from(calendario).where(and(gte(calendario.data, dataCorte), sql`${calendario.data} <= ${hoje}`));
    
    const cardapiosPendentes = [];
    
    presencasPassadas.forEach(p => {
       const turma = turmasDB.find(t => t.id === p.turma_id);
       if (!turma) return;
       
       const dataObj = new Date(p.data + 'T12:00:00-03:00');
       const diaDaSemana = dataObj.getDay();
       const nivelNorm = turma.nivel.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
       
       let refeicoesEsperadas = [];
       if (nivelNorm === 'Fundamental 1') refeicoesEsperadas = diaDaSemana === 3 ? ['LM'] : ['LM', 'A', 'LT'];
      else if (nivelNorm === 'Fundamental 2') refeicoesEsperadas = Number(turma.ano) === 9 ? ['LM'] : ['LT'];
       else if (nivelNorm === 'Ensino Tecnico (SENAI)') {
          if (isValidSenaiDay(Number(turma.ano), diaDaSemana)) refeicoesEsperadas = ['LM', 'A', 'LT'];
       }
       else if (nivelNorm === 'Ensino Medio') {
          const is2AnoFora = Number(turma.ano) === 2 && (diaDaSemana === 2 || diaDaSemana === 4);
          const is3AnoFora = Number(turma.ano) === 3 && (diaDaSemana === 1);
          if (is2AnoFora || is3AnoFora) return;
          refeicoesEsperadas = ['LM'];
       }
       else if (nivelNorm === 'Personaliza') {
          refeicoesEsperadas = ['A'];
       }
       
       refeicoesEsperadas.forEach(ref => {
         const tiposCompativeis = nivelNorm === 'Fundamental 2' && Number(turma.ano) === 9 && ref === 'LM' ? ['LM', 'LT'] : [ref];
         const temCardapio = cardapiosPassados.find(c => c.data === p.data && c.turma_id === p.turma_id && tiposCompativeis.includes(c.tipo_refeicao));
          if (!temCardapio) {
             const id_pendencia = `${p.data}_${ref}_${p.turma_id}`;
             if (!cardapiosPendentes.some(c => c.id_pendencia === id_pendencia)) {
                 cardapiosPendentes.push({
                   id_pendencia,
                   data: p.data,
                   turno: ref,
                   turma_id: p.turma_id
                 });
             }
          }
       });
    });

    const cardapiosFaltantesHoje = [];
    const feriadoHoje = await db.select().from(dias_nao_letivos).where(eq(dias_nao_letivos.data, hoje));
    
    if (feriadoHoje.length === 0) {
        const todasTurmas = await db.select().from(turmas);
        const cardapiosHoje = await db.select().from(calendario).where(eq(calendario.data, hoje));
        const diasIgnoradosHoje = await db.select().from(dias_ignorados_turma).where(eq(dias_ignorados_turma.data, hoje));
        const ignoradosHojeSet = new Set(diasIgnoradosHoje.map(d => d.turma_id));
        
        const dataObjHoje = new Date(hoje + 'T12:00:00-03:00');
        const diaDaSemanaHoje = dataObjHoje.getDay();
        
        if (diaDaSemanaHoje !== 0) {
            todasTurmas.forEach(t => {
               if (ignoradosHojeSet.has(t.id)) return;

               const nivelNorm = t.nivel.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
               let refeicoesEsperadas = [];
               
               if (nivelNorm === 'Fundamental 1') refeicoesEsperadas = diaDaSemanaHoje === 3 ? ['LM'] : ['LM', 'A', 'LT'];
               else if (nivelNorm === 'Fundamental 2') refeicoesEsperadas = Number(t.ano) === 9 ? ['LM'] : ['LT'];
               else if (nivelNorm === 'Ensino Tecnico (SENAI)') {
                  if (isValidSenaiDay(Number(t.ano), diaDaSemanaHoje)) refeicoesEsperadas = ['LM', 'A', 'LT'];
               }
               else if (nivelNorm === 'Ensino Medio') {
                  const is2AnoFora = Number(t.ano) === 2 && (diaDaSemanaHoje === 2 || diaDaSemanaHoje === 4);
                  const is3AnoFora = Number(t.ano) === 3 && (diaDaSemanaHoje === 1);
                  if (!is2AnoFora && !is3AnoFora) refeicoesEsperadas = ['LM'];
               }
               else if (nivelNorm === 'Personaliza') {
                  refeicoesEsperadas = ['A'];
               }
               
               refeicoesEsperadas.forEach(ref => {
                  const temCardapio = cardapiosHoje.find(c => c.turma_id === t.id && c.tipo_refeicao === ref);
                  if (!temCardapio) {
                     cardapiosFaltantesHoje.push({ turma_id: t.id, turno: ref });
                  }
               });
            });
        }
    }

    res.json({
      sucesso: true,
      turnos_sem_lixo: lixoPendente,
      data_lixo_pendente: ontem,
      cardapios_retroativos: cardapiosPendentes,
      cardapios_hoje_faltantes: cardapiosFaltantesHoje
    });

  } catch (erro) {
    next(erro);
  }
});

router.post('/feriados', apenasCozinha, async (req, res, next) => {
  try {
    const schema = z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), descricao: z.string().optional() });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Data inválida.' });
    
    const { data, descricao } = parse.data;
    const existe = await db.select().from(dias_nao_letivos).where(eq(dias_nao_letivos.data, data));
    
    if (existe.length === 0) {
      await db.insert(dias_nao_letivos).values({ data, descricao: descricao || 'Feriado Escolar' });
    }
    res.json({ sucesso: true, status: 'adicionado' });
  } catch (erro) { next(erro); }
});

router.post('/ignorar-turma', apenasCozinha, async (req, res, next) => {
  try {
    const { data, turma_id } = req.body;
    if (!data || !turma_id) return res.status(400).json({ erro: 'Data e turma_id são obrigatórios.' });
    
    await db.insert(dias_ignorados_turma).values({ data, turma_id }).onConflictDoNothing();
    res.json({ sucesso: true, status: 'ignorado' });
  } catch (erro) { next(erro); }
});

router.delete('/ignorar-turma', apenasCozinha, async (req, res, next) => {
  try {
    const { data, turma_id } = req.body;
    if (!data || !turma_id) return res.status(400).json({ erro: 'Data e turma_id são obrigatórios.' });
    
    await db.delete(dias_ignorados_turma).where(and(eq(dias_ignorados_turma.data, data), eq(dias_ignorados_turma.turma_id, turma_id)));
    res.json({ sucesso: true, status: 'removido' });
  } catch (erro) { next(erro); }
});

router.delete('/feriados/:data', apenasCozinha, async (req, res, next) => {
  try {
    const data = req.params.data;
    await db.delete(dias_nao_letivos).where(eq(dias_nao_letivos.data, data));
    res.json({ sucesso: true, status: 'removido' });
  } catch (erro) { next(erro); }
});

router.get('/feriados', apenasCozinha, async (req, res, next) => {
  try {
    const dados = await db.select().from(dias_nao_letivos);
    res.json({ sucesso: true, dados });
  } catch (erro) { next(erro); }
});

router.get('/painel-cozinha/dashboard', apenasCozinha, async (req, res, next) => {
  try {
    const d = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const dataBusca = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const diaDaSemana = d.getDay();
    
    const feriado = await db.select().from(dias_nao_letivos).where(eq(dias_nao_letivos.data, dataBusca));
    if (feriado.length > 0) return res.json({ sucesso: true, isFeriado: true });
    
    const todasTurmas = await db.select().from(turmas);
    const presencasHoje = await db.select().from(presenca_geral).where(eq(presenca_geral.data, dataBusca));
    const alunosEsp = await db.select().from(alunos_especiais);
    const vinculosTurmas = await db.select().from(aluno_turmas);
    const presencasEsp = await db.select().from(presenca_restricoes).where(eq(presenca_restricoes.data, dataBusca));
    const restricoesDb = await db.select().from(restricoes);
    const mapRestricoes = await db.select().from(aluno_restricoes);
    
    const extrasAprovados = await db.select({
      nome: solicitacoes_almoco.aluno_nome,
      sobrenome: solicitacoes_almoco.aluno_sobrenome,
      chamada: solicitacoes_almoco.chamada,
      turma_id: solicitacoes_almoco.turma_id,
      motivo: solicitacoes_almoco.motivo,
      datas: solicitacoes_almoco.datas,
      is_dieta: solicitacoes_almoco.is_dieta
    }).from(solicitacoes_almoco).where(eq(solicitacoes_almoco.status, 'Aprovado'));

    const dashboard = {
      LM: { confirmados: 0, projecao_extra: 0, salas_pendentes: [], salas_confirmadas: [], dietas_total: 0, lista_dietas: [], extras_total: 0, lista_extras: [] },
      A:  { confirmados: 0, projecao_extra: 0, salas_pendentes: [], salas_confirmadas: [], dietas_total: 0, lista_dietas: [], extras_total: 0, lista_extras: [] },
      LT: { confirmados: 0, projecao_extra: 0, salas_pendentes: [], salas_confirmadas: [], dietas_total: 0, lista_dietas: [], extras_total: 0, lista_extras: [] }
    };
    
    const alunosAtendidos = { LM: new Set(), A: new Set(), LT: new Set() };
    
    for (const turma of todasTurmas) {
      if (!turma.nivel) continue;
      const nivelNorm = turma.nivel.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let refeicoesDaTurma = [];
       
      if (nivelNorm === 'Fundamental 1') refeicoesDaTurma = diaDaSemana === 3 ? ['LM'] : ['LM', 'A', 'LT'];
      else if (nivelNorm === 'Fundamental 2') refeicoesDaTurma = Number(turma.ano) === 9 ? ['LM'] : ['LT'];
      else if (nivelNorm === 'Ensino Tecnico (SENAI)') {
        if (isValidSenaiDay(Number(turma.ano), diaDaSemana)) {
          refeicoesDaTurma = ['LM', 'A', 'LT'];
        }
      }
      else if (nivelNorm === 'Ensino Medio') {
        const is2AnoFora = Number(turma.ano) === 2 && (diaDaSemana === 2 || diaDaSemana === 4);
        const is3AnoFora = Number(turma.ano) === 3 && (diaDaSemana === 1);
        if (is2AnoFora || is3AnoFora) continue;
        refeicoesDaTurma = ['LM'];
      }
      else if (nivelNorm === 'Personaliza') {
        refeicoesDaTurma = ['A'];
      } else continue;
       
      let siglaNivel = nivelNorm === 'Fundamental 1' ? 'Fund I' : nivelNorm === 'Fundamental 2' ? 'Fund II' : nivelNorm === 'Ensino Tecnico (SENAI)' ? 'Técnico' : 'EM';
      let nomeAmigavel = `${turma.ano === 0 ? '' : turma.ano + 'º '}${turma.identificador}`;
      if (nivelNorm === 'Ensino Medio') nomeAmigavel += ' (EM)';
      if (nivelNorm === 'Personaliza') { nomeAmigavel = `Pers. ${turma.ano}º ${turma.identificador}`; siglaNivel = 'Personaliza'; }
       
      for (const ref of refeicoesDaTurma) {
        const presencaDaTurma = presencasHoje.find(p => Number(p.turma_id) === Number(turma.id) && (p.tipo_refeicao === ref || p.tipo_refeicao === 'Geral'));
        if (presencaDaTurma) {
          let qtdRegular = presencaDaTurma.quantidade;
          let dietasNaSala = 0;

          for (const aluno of alunosEsp) {
            const temVinculo = vinculosTurmas.some(v => v.aluno_id === aluno.id && v.turma_id === turma.id);
            if (temVinculo) {
              const pDieta = presencasEsp.find(p => Number(p.aluno_id) === Number(aluno.id) && (p.tipo_refeicao === ref || p.tipo_refeicao === 'Geral'));
              const idString = String(aluno.id);
               
              if (pDieta && pDieta.presente === 1 && !alunosAtendidos[ref].has(idString)) {
                alunosAtendidos[ref].add(idString);
                dashboard[ref].dietas_total += 1;
                dietasNaSala += 1;
                 
                const vinculosRestricao = mapRestricoes.filter(r => r.aluno_id === aluno.id);
                const nomesRestricoes = vinculosRestricao.map(vr => {
                  const r = restricoesDb.find(x => x.id === vr.restricao_id);
                  return r ? r.nome : null;
                }).filter(Boolean);
                const restricaoNome = nomesRestricoes.length > 0 ? nomesRestricoes.join(' • ') : 'Especial';
                dashboard[ref].lista_dietas.push({ 
                  nome: aluno.nome, 
                  sala: nomeAmigavel, 
                  restricao: restricaoNome,
                  restricoes: nomesRestricoes 
                });
              }
            }
          }

          qtdRegular = Math.max(0, qtdRegular - dietasNaSala);
          dashboard[ref].confirmados += qtdRegular;
          dashboard[ref].salas_confirmadas.push({ 
             sala: nomeAmigavel, 
             nivel: siglaNivel, 
             quantidade: qtdRegular,
            quantidade_extra: 0
          });
        } else {
          dashboard[ref].salas_pendentes.push(nomeAmigavel);
          dashboard[ref].projecao_extra += 32;
        }
      }
    }
    
    const [anoBusca, mesBusca, diaBusca] = dataBusca.split('-');
    const dataFormatadaBR = `${diaBusca}/${mesBusca}/${anoBusca}`;

    extrasAprovados.forEach(extra => {
      if (!extra.datas.includes(dataFormatadaBR)) return;
      const turmaDoExtra = todasTurmas.find(t => t.id === extra.turma_id);
       
      let nomeSalaExtra = 'S/N';
      let siglaNivelExtra = 'S/N';
       
      if (turmaDoExtra) {
         const nivelNorm = turmaDoExtra.nivel.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
         nomeSalaExtra = `${turmaDoExtra.ano === 0 ? '' : turmaDoExtra.ano + 'º '}${turmaDoExtra.identificador}`;
         if (nivelNorm === 'Ensino Medio') nomeSalaExtra += ' (EM)';
         if (nivelNorm === 'Personaliza') {
           nomeSalaExtra = `Pers. ${turmaDoExtra.ano}º ${turmaDoExtra.identificador}`;
           siglaNivelExtra = 'Personaliza'; 
          }
         else { siglaNivelExtra = nivelNorm === 'Fundamental 1' ? 'Fund I' : nivelNorm === 'Fundamental 2' ? 'Fund II' : nivelNorm === 'Ensino Tecnico (SENAI)' ? 'Técnico' : 'EM'; }
      }
       
      dashboard['A'].extras_total += 1;
      dashboard['A'].confirmados += 1;
       
      dashboard['A'].lista_extras.push({
        nome: `${extra.nome} ${extra.sobrenome}`,
        chamada: extra.chamada,
        sala: nomeSalaExtra,
        motivo: extra.motivo,
        datas: extra.datas,
        is_dieta: extra.is_dieta
      });

      const salaRaioX = dashboard['A'].salas_confirmadas.find(s => s.sala === nomeSalaExtra);
      if (salaRaioX) {
        salaRaioX.quantidade_extra += 1;
      } else {
        dashboard['A'].salas_confirmadas.push({
          sala: nomeSalaExtra,
          nivel: siglaNivelExtra,
          quantidade: 0,
          quantidade_extra: 1
        });
      }
    });

    res.json({ sucesso: true, dashboard, isFeriado: false });
  } catch (erro) {
    next(erro);
  }
});

router.get('/painel-cozinha/resumo-dia/:data', apenasCozinha, async (req, res, next) => {
  try {
    const { data } = req.params;
    const cardapio = await db.select().from(calendario).where(eq(calendario.data, data));
    const lixo = await db.select().from(auditoria_lixo).where(eq(auditoria_lixo.data, data));
    const avaliacoes = await db.select().from(avaliacoes_comida).where(eq(avaliacoes_comida.data, data));
    const presencas = await db.select().from(presenca_geral).where(eq(presenca_geral.data, data));
    const dietas = await db.select().from(presenca_restricoes).where(and(eq(presenca_restricoes.data, data), eq(presenca_restricoes.presente, 1)));
    
    const ignoradas_bd = await db.select().from(dias_ignorados_turma).where(eq(dias_ignorados_turma.data, data));
    const turmas_ignoradas = ignoradas_bd.map(i => i.turma_id);

    res.json({ sucesso: true, dados: { cardapio, lixo, avaliacoes, presencas, dietas, turmas_ignoradas } });
  } catch (erro) { next(erro); }
});

router.get('/painel-cozinha/relatorio-mensal/:ano/:mes', autorizar(['cozinha', 'coordenacao']), async (req, res, next) => {
  try {
    const { ano, mes } = req.params;
    const prefixo = `${ano}-${String(mes).padStart(2, '0')}%`;

    const [presencasDb] = await db.select({ total: sql`SUM(${presenca_geral.quantidade})` })
                                  .from(presenca_geral).where(like(presenca_geral.data, prefixo));
    const [dietasDb] = await db.select({ total: sql`COUNT(*)` })
                               .from(presenca_restricoes).where(and(like(presenca_restricoes.data, prefixo), eq(presenca_restricoes.presente, 1)));
    const [lixoDb] = await db.select({
                               sobra: sql`SUM(${auditoria_lixo.lixo_limpo_kg})`,
                               resto: sql`SUM(${auditoria_lixo.lixo_sujo_kg})`
                             }).from(auditoria_lixo).where(like(auditoria_lixo.data, prefixo));

    const presencasDiarias = await db.select().from(presenca_geral).where(like(presenca_geral.data, prefixo));
    const lixoDiario = await db.select().from(auditoria_lixo).where(like(auditoria_lixo.data, prefixo));

    const diasMap = {};
    presencasDiarias.forEach(p => {
       if (!diasMap[p.data]) diasMap[p.data] = { data: p.data, refeicoes: 0, lixoLimpo: 0, lixoSujo: 0 };
       diasMap[p.data].refeicoes += p.quantidade;
    });

    lixoDiario.forEach(l => {
       if (!diasMap[l.data]) diasMap[l.data] = { data: l.data, refeicoes: 0, lixoLimpo: 0, lixoSujo: 0 };
       diasMap[l.data].lixoLimpo += l.lixo_limpo_kg;
       diasMap[l.data].lixoSujo += l.lixo_sujo_kg;
    });

    const dias = Object.values(diasMap).sort((a, b) => new Date(a.data) - new Date(b.data));

    res.json({
        sucesso: true,
        dados: {
          totalRefeicoes: Number(presencasDb?.total) || 0,
          totalDietas: Number(dietasDb?.total) || 0,
          lixoSobra: Number(lixoDb?.sobra) || 0,
          lixoResto: Number(lixoDb?.resto) || 0,
          dias
        }
      });
  } catch (erro) { next(erro); }
});

router.post('/auditoria-lixo', apenasCozinha, async (req, res, next) => {
  try {
    const schema = z.object({
        tipo_refeicao: z.enum(['LM', 'A', 'LT']),
        lixo_limpo_kg: z.preprocess(v => Number(v), z.number().min(0)),
        lixo_sujo_kg: z.preprocess(v => Number(v), z.number().min(0)),
        data_ref: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato ISO de data inválido.").optional()
      });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Dados de peso corrompidos ou turno inválido.' });

    const { tipo_refeicao, lixo_limpo_kg, lixo_sujo_kg, data_ref } = parse.data;
    const dataHoje = getHoje();
    const alvoData = data_ref || dataHoje;

    if (alvoData > dataHoje) {
        return res.status(403).json({ erro: 'Falha de Integridade: Não é possível auditar sobra e resto de lixo em datas do futuro.' });
    }

    if (alvoData === dataHoje) {
       const horaAtual = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).getHours();
       if (tipo_refeicao === 'A' && horaAtual < 10) return res.status(422).json({ erro: 'Bloqueio de Relógio: Almoço só pode ser auditado após 10h00.' });
       if (tipo_refeicao === 'LT' && horaAtual < 12) return res.status(422).json({ erro: 'Bloqueio de Relógio: Lanche da Tarde só pode ser auditado após 12h00.' });
    }

    const existe = await db.select().from(auditoria_lixo).where(and(eq(auditoria_lixo.data, alvoData), eq(auditoria_lixo.tipo_refeicao, tipo_refeicao)));
    
    if(existe.length > 0) {
      if (alvoData < dataHoje) return res.status(403).json({ erro: 'Selo de Auditoria: Não permitido adulterar pesagens de lixo retroativas.' });
      
      await db.update(auditoria_lixo)
        .set({ lixo_limpo_kg, lixo_sujo_kg })
        .where(and(eq(auditoria_lixo.data, alvoData), eq(auditoria_lixo.tipo_refeicao, tipo_refeicao)));
    } else {
      await db.insert(auditoria_lixo).values({ data: alvoData, tipo_refeicao, lixo_limpo_kg, lixo_sujo_kg });
    }

    try {
      const { broadcastEvento } = require('../websocket');
      broadcastEvento('cozinha_atualizada', { tipo: 'lixo', data: alvoData });
    } catch (wsErr) {}

    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

router.get('/painel-cozinha/bi', autorizar(['cozinha', 'coordenacao']), async (req, res, next) => {
  try {
    const dataCorteObj = new Date();
    dataCorteObj.setMonth(dataCorteObj.getMonth() - 6);
    const dataCorte = `${dataCorteObj.getFullYear()}-${String(dataCorteObj.getMonth() + 1).padStart(2, '0')}-${String(dataCorteObj.getDate()).padStart(2, '0')}`;
    
    const relatoriosRaw = await db.all(sql`
      WITH Turnos AS (
         SELECT data, tipo_refeicao FROM auditoria_lixo WHERE data >= ${dataCorte}
         UNION SELECT data, tipo_refeicao FROM avaliacoes_comida WHERE data >= ${dataCorte}
         UNION SELECT data, tipo_refeicao FROM calendario WHERE data >= ${dataCorte}
         /* Removido o SELECT do presenca_geral daqui para não criar um turno fantasma chamado 'Geral' */
       ),
       AggAvaliacoes AS (
         SELECT data, tipo_refeicao, SUM(gostaram) as aprovacao, SUM(nao_gostaram) as rejeicao, GROUP_CONCAT(observacao, ' | ') as observacoes
         FROM avaliacoes_comida WHERE data >= ${dataCorte} GROUP BY data, tipo_refeicao
       ),
       AggPresencas AS (
         SELECT 
           c.data, 
           c.tipo_refeicao, 
           SUM(pg.quantidade) as presenca_total
         FROM calendario c
         INNER JOIN presenca_geral pg 
           ON c.data = pg.data 
           AND c.turma_id = pg.turma_id 
           AND (pg.tipo_refeicao = c.tipo_refeicao OR pg.tipo_refeicao = 'Geral')
         WHERE c.data >= ${dataCorte}
         GROUP BY c.data, c.tipo_refeicao
       ),
        AggCardapio AS (
          SELECT 
            data, tipo_refeicao, 
            MAX(lanche_padrao) as lanche_padrao,
            MAX(prato_principal) as prato_principal,
            MAX(bebida) as bebida,
            MAX(fruta) as fruta,
            MAX(arroz) as arroz,
            MAX(feijao) as feijao,
            MAX(opcao_vegetal) as opcao_vegetal,
            MAX(guarnicao) as guarnicao,
            MAX(molho_salada) as molho_salada,
            MAX(sobremesa) as sobremesa
          FROM calendario WHERE data >= ${dataCorte} GROUP BY data, tipo_refeicao
        )
      SELECT 
        t.data, t.tipo_refeicao as turno,
        COALESCE(c.prato_principal, c.lanche_padrao, 'Não Informado') as prato_principal,
        COALESCE(c.lanche_padrao, c.prato_principal, 'Não Informado') as lanche_padrao,
        c.bebida,
        c.fruta,
        c.arroz,
        c.feijao,
        c.opcao_vegetal,
        c.guarnicao,
        c.molho_salada,
        c.sobremesa,
        COALESCE(al.lixo_limpo_kg, 0) as lixo_limpo,
        COALESCE(al.lixo_sujo_kg, 0) as lixo_sujo,
        COALESCE(ac.aprovacao, 0) as aprovacao,
        COALESCE(ac.rejeicao, 0) as rejeicao,
        COALESCE(pg.presenca_total, 0) as presenca_total,
        ac.observacoes as observacoes_concat
      FROM Turnos t
      LEFT JOIN AggCardapio c ON t.data = c.data AND t.tipo_refeicao = c.tipo_refeicao
      LEFT JOIN auditoria_lixo al ON t.data = al.data AND t.tipo_refeicao = al.tipo_refeicao
      LEFT JOIN AggAvaliacoes ac ON t.data = ac.data AND t.tipo_refeicao = ac.tipo_refeicao
      LEFT JOIN AggPresencas pg ON t.data = pg.data AND t.tipo_refeicao = pg.tipo_refeicao
      ORDER BY t.data DESC
    `);

    const dadosTratados = relatoriosRaw.map(r => {
       const totalAvaliacoes = r.aprovacao + r.rejeicao;
       const taxaAprovacao = totalAvaliacoes > 0 ? Math.round((r.aprovacao / totalAvaliacoes) * 100) : 0;
         
       let observacoes = [];
        if (r.observacoes_concat) {
            observacoes = r.observacoes_concat.split(' | ').filter(obs => obs.trim() !== '');
        }

        return {
            data: r.data,
            turno: r.turno,
            lanche_padrao: r.lanche_padrao,
            prato_principal: r.prato_principal,
            bebida: r.bebida,
            fruta: r.fruta,
            arroz: r.arroz,
            feijao: r.feijao,
            opcao_vegetal: r.opcao_vegetal,
            guarnicao: r.guarnicao,
            molho_salada: r.molho_salada,
            sobremesa: r.sobremesa,
            lixo_limpo: r.lixo_limpo,
            lixo_sujo: r.lixo_sujo,
            aprovacao: r.aprovacao,
            rejeicao: r.rejeicao,
            presenca_total: r.presenca_total,
            observacoes,
            taxaAprovacao
        };
    });
    
    res.json({ sucesso: true, dados: dadosTratados });
  } catch (erro) {
     next(erro); 
  }
});

router.get('/painel-cozinha/feedbacks-lidos', autorizar(['cozinha', 'coordenacao', 'admin']), async (req, res, next) => {
  try {
    const usuarioId = req.usuarioLogado.id;
    const lidos = await db.select({ feedback_id: feedbacks_lidos.feedback_id })
      .from(feedbacks_lidos)
      .where(eq(feedbacks_lidos.usuario_id, usuarioId));
    res.json({ sucesso: true, lidos: lidos.map(l => l.feedback_id) });
  } catch (erro) { next(erro); }
});

router.post('/painel-cozinha/feedbacks-lidos/alternar', autorizar(['cozinha', 'coordenacao', 'admin']), async (req, res, next) => {
  try {
    const usuarioId = req.usuarioLogado.id;
    const { feedbackId } = req.body || {};
    if (!feedbackId || typeof feedbackId !== 'string') {
      return res.status(400).json({ erro: 'ID de feedback inválido.' });
    }
    
    const existe = await db.select()
      .from(feedbacks_lidos)
      .where(and(eq(feedbacks_lidos.usuario_id, usuarioId), eq(feedbacks_lidos.feedback_id, feedbackId)));
      
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    if (existe.length > 0) {
      await db.delete(feedbacks_lidos)
        .where(and(eq(feedbacks_lidos.usuario_id, usuarioId), eq(feedbacks_lidos.feedback_id, feedbackId)));
      return res.json({ sucesso: true, lido: false });
    } else {
      await db.insert(feedbacks_lidos).values({
        usuario_id: usuarioId,
        feedback_id: feedbackId,
        lido_em: agora
      });
      return res.json({ sucesso: true, lido: true });
    }
  } catch (erro) { next(erro); }
});

router.post('/painel-cozinha/feedbacks-lidos/marcar-todos', autorizar(['cozinha', 'coordenacao', 'admin']), async (req, res, next) => {
  try {
    const usuarioId = req.usuarioLogado.id;
    const { listaIds } = req.body || {};
    if (!Array.isArray(listaIds) || listaIds.length === 0) {
      return res.json({ sucesso: true, marcados: 0 });
    }

    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    for (const fbId of listaIds) {
      if (typeof fbId === 'string' && fbId.trim()) {
        try {
          await db.insert(feedbacks_lidos).values({
            usuario_id: usuarioId,
            feedback_id: fbId,
            lido_em: agora
          }).onConflictDoNothing();
        } catch {}
      }
    }
    res.json({ sucesso: true, marcados: listaIds.length });
  } catch (erro) { next(erro); }
});

router.get('/alunos-especiais/todos', apenasCozinha, async (req, res, next) => {
  try {
    const alunosMapeados = await db.all(sql`
      SELECT 
        ae.id,
        ae.nome,
        GROUP_CONCAT(DISTINCT r.nome) as restricao,
        at_base.turma_id as sala_regular_id,
        at_senai.turma_id as sala_tecnica_id,
        at_pers.turma_id as sala_personaliza_id,
        COALESCE(
          CASE WHEN t_base.nivel = 'Ensino Médio' THEN t_base.ano || 'º ' || t_base.identificador || ' (EM)'
               ELSE t_base.ano || 'º ' || t_base.identificador END, 
           'S/N'
        ) as salaFormatada,
        t_senai.identificador as senaiFormatado,
        CASE WHEN t_pers.id IS NOT NULL THEN 'Pers. ' || t_pers.ano || 'º ' || t_pers.identificador ELSE NULL END as personalizaFormatado
      FROM alunos_especiais ae
      LEFT JOIN aluno_restricoes ar ON ae.id = ar.aluno_id
      LEFT JOIN restricoes r ON ar.restricao_id = r.id
      LEFT JOIN aluno_turmas at_base ON ae.id = at_base.aluno_id AND at_base.tipo_vinculo = 'Base'
      LEFT JOIN turmas t_base ON at_base.turma_id = t_base.id
      LEFT JOIN aluno_turmas at_senai ON ae.id = at_senai.aluno_id AND at_senai.tipo_vinculo = 'SENAI'
      LEFT JOIN turmas t_senai ON at_senai.turma_id = t_senai.id
      LEFT JOIN aluno_turmas at_pers ON ae.id = at_pers.aluno_id AND at_pers.tipo_vinculo = 'Personaliza'
      LEFT JOIN turmas t_pers ON at_pers.turma_id = t_pers.id
      GROUP BY ae.id
      ORDER BY ae.id DESC
    `);
    
    const dados = alunosMapeados.map(a => {
      const restricoesArr = a.restricao ? a.restricao.split(',').map(s => s.trim()).filter(Boolean) : [];
      return {
        ...a,
        restricoes: restricoesArr,
        restricaoFormatada: restricoesArr.length > 0 ? restricoesArr.join(' • ') : 'Não informada'
      };
    });

    res.json({ sucesso: true, dados });
  } catch (erro) { next(erro); }
});

router.get('/restricoes/todas', autorizar(['cozinha', 'professor', 'coordenacao']), async (req, res, next) => {
  try {
    const lista = await db.select().from(restricoes).orderBy(restricoes.nome);
    res.json({ sucesso: true, dados: lista.map(r => r.nome) });
  } catch (erro) { next(erro); }
});

router.post('/alunos-especiais/salvar', apenasCozinha, async (req, res, next) => {
  try {
    const schema = z.object({
       id: z.union([z.number().int().positive(), z.string()]).optional().nullable().transform(v => (v && !isNaN(Number(v)) && Number(v) > 0) ? Number(v) : null),
       nome: z.string().min(1, 'Nome do aluno é obrigatório.'),
       restricao: z.union([z.string(), z.array(z.string())]).optional().nullable(),
       restricoes: z.array(z.string()).optional().nullable(),
       turma_id: z.union([z.number().int().positive(), z.string()]).transform(v => Number(v)),
       turma_senai_id: z.union([z.number().int().positive(), z.string()]).optional().nullable().transform(v => (v && !isNaN(Number(v)) && Number(v) > 0) ? Number(v) : null),
       turma_personaliza_id: z.union([z.number().int().positive(), z.string()]).optional().nullable().transform(v => (v && !isNaN(Number(v)) && Number(v) > 0) ? Number(v) : null)
     });
    
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Dados inválidos: verifique o preenchimento da turma e nome.' });
    
    const { id, nome, restricao, restricoes: restricoesArray, turma_id, turma_senai_id, turma_personaliza_id } = parse.data;
    
    // Normalizar lista de restrições (pode vir como array de tags ou string com vírgulas/barras)
    let listaNomes = [];
    if (Array.isArray(restricoesArray) && restricoesArray.length > 0) {
      listaNomes = restricoesArray;
    } else if (Array.isArray(restricao)) {
      listaNomes = restricao;
    } else if (typeof restricao === 'string' && restricao.trim()) {
      listaNomes = restricao.split(/[/,]/).map(s => s.trim()).filter(Boolean);
    }
    
    if (listaNomes.length === 0) {
      return res.status(400).json({ erro: 'Informe ao menos uma condição ou restrição clínica.' });
    }

    await db.transaction(async (tx) => {
      let alunoId = id;

      if (alunoId) {
        await tx.update(alunos_especiais).set({ nome: nome.trim() }).where(eq(alunos_especiais.id, alunoId));
        await tx.delete(aluno_turmas).where(eq(aluno_turmas.aluno_id, alunoId));
        await tx.delete(aluno_restricoes).where(eq(aluno_restricoes.aluno_id, alunoId));
      } else {
        const novoAluno = await tx.insert(alunos_especiais).values({ nome: nome.trim() }).returning({ id: alunos_especiais.id });
        alunoId = novoAluno[0].id;
      }

      await tx.insert(aluno_turmas).values({ aluno_id: alunoId, turma_id: turma_id, tipo_vinculo: 'Base' });
      
      if (turma_senai_id) {
        await tx.insert(aluno_turmas).values({ aluno_id: alunoId, turma_id: turma_senai_id, tipo_vinculo: 'SENAI' });
      }

      if (turma_personaliza_id) {
        await tx.insert(aluno_turmas).values({ aluno_id: alunoId, turma_id: turma_personaliza_id, tipo_vinculo: 'Personaliza' });
      }

      for (const nomeRest of listaNomes) {
        const nomeLimpo = nomeRest.trim();
        if (!nomeLimpo) continue;

        let restExists = await tx.select().from(restricoes).where(eq(restricoes.nome, nomeLimpo));
        let restId;
        if (restExists.length > 0) {
          restId = restExists[0].id;
        } else {
          const novaRest = await tx.insert(restricoes).values({ nome: nomeLimpo }).returning({ id: restricoes.id });
          restId = novaRest[0].id;
        }

        await tx.insert(aluno_restricoes).values({ aluno_id: alunoId, restricao_id: restId });
      }
    });
    
    try {
      const { broadcastEvento } = require('../websocket');
      broadcastEvento('cozinha_atualizada', { tipo: 'dieta', aluno_id: id });
    } catch (wsErr) {}

    res.json({ sucesso: true, mensagem: id ? 'Ficha clínica atualizada!' : 'Ficha clínica registrada!' });
  } catch (erro) {
    next(erro);
  }
});

router.delete('/alunos-especiais/:id', apenasCozinha, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ erro: 'ID inválido.' });
    let deletado = false;

    await db.transaction(async (tx) => {
      await tx.delete(presenca_restricoes).where(eq(presenca_restricoes.aluno_id, id));
       const resultado = await tx.delete(alunos_especiais).where(eq(alunos_especiais.id, id)).returning({ id: alunos_especiais.id });
      if (resultado.length > 0) deletado = true;
    });
    
    if (!deletado) return res.status(404).json({ erro: 'Aluno não encontrado ou já excluído.' });
    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

router.get('/receitas/todas', autorizar(['cozinha', 'coordenacao']), async (req, res, next) => {
  try {
    const dados = await db.select().from(receitas);
    res.json({ sucesso: true, dados });
  } catch (erro) { next(erro); }
});

router.get('/catalogo-alimentos', autorizar(['cozinha', 'coordenacao', 'admin', 'professor']), async (req, res, next) => {
  try {
    const { categoria, apenasAtivos } = req.query;
    let condicoes = [];
    if (categoria) {
      condicoes.push(eq(catalogo_alimentos.categoria, categoria));
    }
    if (apenasAtivos === 'true' || apenasAtivos === true) {
      condicoes.push(eq(catalogo_alimentos.ativo, 1));
    }
    const dados = condicoes.length > 0 
      ? await db.select().from(catalogo_alimentos).where(and(...condicoes)).orderBy(asc(catalogo_alimentos.nome))
      : await db.select().from(catalogo_alimentos).orderBy(asc(catalogo_alimentos.nome));
    res.json({ sucesso: true, dados });
  } catch (erro) { next(erro); }
});

router.post('/catalogo-alimentos', apenasCozinha, async (req, res, next) => {
  try {
    const schema = z.object({
      nome: z.string().min(1, 'Nome é obrigatório.'),
      categoria: z.enum([
        'lanche', 'bebida', 'fruta', 'arroz', 'feijao',
        'prato_principal', 'opcao_vegetal', 'guarnicao', 'molho_salada', 'sobremesa'
      ])
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Dados inválidos para o catálogo.' });

    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const nomeLimpo = limparTexto(parse.data.nome);
    if (!nomeLimpo) return res.status(400).json({ erro: 'Nome é obrigatório.' });

    await db.insert(catalogo_alimentos).values({
      nome: nomeLimpo,
      categoria: parse.data.categoria,
      ativo: 1,
      criado_em: agora
    }).onConflictDoNothing();

    res.json({ sucesso: true, nome: nomeLimpo });
  } catch (erro) { next(erro); }
});

router.post('/calendario/salvar', apenasCozinha, async (req, res, next) => {
  try {
    const schema = z.object({
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        turmas_ids: z.array(z.number().int().positive()).min(1, "Selecione ao menos uma turma."),
        tipo_refeicao: z.enum(['LM', 'A', 'LT']),
        lanche_padrao: z.string().optional().nullable(),
        lanche_dieta: z.string().optional().nullable(),
        // Componentes estruturados
        lanche: z.string().optional().nullable(),
        bebida: z.string().optional().nullable(),
        fruta: z.string().optional().nullable(),
        arroz: z.string().optional().nullable(),
        feijao: z.string().optional().nullable(),
        prato_principal: z.string().optional().nullable(),
        opcao_vegetal: z.string().optional().nullable(),
        guarnicao: z.string().optional().nullable(),
        molho_salada: z.string().optional().nullable(),
        sobremesa: z.string().optional().nullable(),
        prato_principal_dieta: z.string().optional().nullable(),
        ignorarSimilaridade: z.boolean().optional()
      });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Violação de regras no envio do cardápio.' });

    const { 
      data, turmas_ids, tipo_refeicao, 
      lanche_padrao, lanche_dieta,
      lanche, bebida, fruta, arroz, feijao,
      prato_principal, opcao_vegetal, guarnicao, molho_salada,
      sobremesa, prato_principal_dieta,
      ignorarSimilaridade 
    } = parse.data;

    let padraoFinal = '';
    let dietaFinal = null;
    let pratoPrincipalFinal = null;
    let bebidaFinal = null;
    let frutaFinal = limparTexto(fruta);
    let arrozFinal = limparTexto(arroz);
    let feijaoFinal = limparTexto(feijao);
    let opcaoVegetalFinal = limparTexto(opcao_vegetal);
    let guarnicaoFinal = limparTexto(guarnicao);
    let molhoSaladaFinal = limparTexto(molho_salada);
    let sobremesaFinal = limparTexto(sobremesa);
    let pratoPrincipalDietaFinal = null;

    if (tipo_refeicao === 'A') {
      pratoPrincipalFinal = limparTexto(prato_principal) || limparTexto(lanche_padrao) || '';
      if (!pratoPrincipalFinal) {
        return res.status(400).json({ erro: 'Prato Principal (Mistura) é obrigatório para o almoço.' });
      }
      padraoFinal = pratoPrincipalFinal;
      pratoPrincipalDietaFinal = limparTexto(prato_principal_dieta) || limparTexto(lanche_dieta) || null;
      dietaFinal = pratoPrincipalDietaFinal;
      bebidaFinal = null; // Almoço NÃO tem bebida conforme norma nutricional
    } else {
      // Lanches (LM / LT)
      padraoFinal = limparTexto(lanche) || limparTexto(prato_principal) || limparTexto(lanche_padrao) || '';
      if (!padraoFinal) {
        return res.status(400).json({ erro: 'Lanche Principal é obrigatório.' });
      }
      pratoPrincipalFinal = padraoFinal;
      dietaFinal = limparTexto(lanche_dieta) || limparTexto(prato_principal_dieta) || null;
      pratoPrincipalDietaFinal = dietaFinal;
      bebidaFinal = limparTexto(bebida);
      arrozFinal = null;
      feijaoFinal = null;
      opcaoVegetalFinal = null;
      guarnicaoFinal = null;
      molhoSaladaFinal = null;
      sobremesaFinal = null;
    }

    const todasReceitas = await db.select().from(receitas);
    const verificarFuzzy = (nomeLanche) => {
      if (!nomeLanche) return null;
      const digitado = nomeLanche.trim();
      const exato = todasReceitas.find(r => r.nome.toLowerCase() === digitado.toLowerCase());
      if (exato) return { acao: 'usar_existente', nome: exato.nome };
      
      if (!ignorarSimilaridade) {
        for (const rec of todasReceitas) {
          if (calcularSimilaridade(rec.nome, digitado) >= 0.70) {
            return { acao: 'alerta_fuzzy', sugestao: rec.nome, digitado };
          }
        }
      }
      return { acao: 'novo', nome: digitado };
    };

    const checkPadrao = verificarFuzzy(padraoFinal);
    const checkDieta = verificarFuzzy(dietaFinal);

    if (checkPadrao?.acao === 'alerta_fuzzy') return res.status(409).json({ fuzzy: true, sugestao: checkPadrao.sugestao, digitado: checkPadrao.digitado });
    if (checkDieta?.acao === 'alerta_fuzzy') return res.status(409).json({ fuzzy: true, sugestao: checkDieta.sugestao, digitado: checkDieta.digitado });

    if (checkPadrao) padraoFinal = checkPadrao.nome;
    if (checkDieta) dietaFinal = checkDieta.nome;
    pratoPrincipalFinal = padraoFinal;
    pratoPrincipalDietaFinal = dietaFinal;

    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    await db.transaction(async (tx) => {
      if (checkPadrao?.acao === 'novo') await tx.insert(receitas).values({ nome: padraoFinal }).onConflictDoNothing();
      if (checkDieta?.acao === 'novo') await tx.insert(receitas).values({ nome: dietaFinal }).onConflictDoNothing();

      // Auto-cadastro dos componentes em catalogo_alimentos
      const itensCatalogoParaInserir = [
        tipo_refeicao === 'A' ? { nome: pratoPrincipalFinal, categoria: 'prato_principal' } : { nome: padraoFinal, categoria: 'lanche' },
        bebidaFinal ? { nome: bebidaFinal, categoria: 'bebida' } : null,
        frutaFinal ? { nome: frutaFinal, categoria: 'fruta' } : null,
        arrozFinal ? { nome: arrozFinal, categoria: 'arroz' } : null,
        feijaoFinal ? { nome: feijaoFinal, categoria: 'feijao' } : null,
        opcaoVegetalFinal ? { nome: opcaoVegetalFinal, categoria: 'opcao_vegetal' } : null,
        guarnicaoFinal ? { nome: guarnicaoFinal, categoria: 'guarnicao' } : null,
        molhoSaladaFinal ? { nome: molhoSaladaFinal, categoria: 'molho_salada' } : null,
        sobremesaFinal ? { nome: sobremesaFinal, categoria: 'sobremesa' } : null
      ].filter(Boolean);

      for (const item of itensCatalogoParaInserir) {
        if (item.nome) {
          await tx.insert(catalogo_alimentos).values({
            nome: item.nome,
            categoria: item.categoria,
            ativo: 1,
            criado_em: agora
          }).onConflictDoNothing();
        }
      }

      const valoresCalendario = {
        lanche_padrao: padraoFinal,
        lanche_dieta: dietaFinal,
        prato_principal: pratoPrincipalFinal,
        prato_principal_dieta: pratoPrincipalDietaFinal,
        bebida: bebidaFinal,
        fruta: frutaFinal,
        arroz: arrozFinal,
        feijao: feijaoFinal,
        opcao_vegetal: opcaoVegetalFinal,
        guarnicao: guarnicaoFinal,
        molho_salada: molhoSaladaFinal,
        sobremesa: sobremesaFinal
      };

      for (const tid of turmas_ids) {
        const existente = await tx.select().from(calendario).where(and(eq(calendario.data, data), eq(calendario.turma_id, tid), eq(calendario.tipo_refeicao, tipo_refeicao)));
        if (existente.length > 0) {
          await tx.update(calendario).set(valoresCalendario).where(eq(calendario.id, existente[0].id));
        } else {
          await tx.insert(calendario).values({ data, turma_id: tid, tipo_refeicao, ...valoresCalendario });
        }
      }
    });

    try {
      const { broadcastEvento } = require('../websocket');
      broadcastEvento('cardapio_atualizado', { data, turmas_ids, tipo_refeicao });
    } catch (wsErr) {}

    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

router.get('/parametros', autorizar(['cozinha', 'coordenacao']), async (req, res, next) => {
  try {
    const dados = await db.select().from(parametros_sistema);
    res.json({ sucesso: true, dados });
  } catch (erro) { next(erro); }
});

router.post('/parametros', apenasCozinha, async (req, res, next) => {
  try {
    const schema = z.object({
      chave: z.string().min(1),
      valor: z.number(),
      descricao: z.string()
    });
    
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Estrutura do parâmetro corrompida.' });
    
    const { chave, valor, descricao } = parse.data;
    const existe = await db.select().from(parametros_sistema).where(eq(parametros_sistema.chave, chave));
    
    if (existe.length > 0) {
      await db.update(parametros_sistema).set({ valor }).where(eq(parametros_sistema.chave, chave));
    } else {
      await db.insert(parametros_sistema).values({ chave, valor, descricao });
    }
    
    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

router.put('/parametros', apenasCozinha, async (req, res, next) => {
  try {
    // Expect body: { parametros: { chave1: valor1, chave2: valor2, ... } }
    const payload = req.body && req.body.parametros ? req.body.parametros : req.body;
    if (!payload || typeof payload !== 'object') return res.status(400).json({ erro: 'Payload inválido.' });

    await db.transaction(async (tx) => {
      for (const [chave, valor] of Object.entries(payload)) {
        const existe = await tx.select().from(parametros_sistema).where(eq(parametros_sistema.chave, chave));
        if (existe.length > 0) {
          await tx.update(parametros_sistema).set({ valor }).where(eq(parametros_sistema.chave, chave));
        } else {
          await tx.insert(parametros_sistema).values({ chave, valor, descricao: null });
        }
      }
    });

    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

router.post('/painel-cozinha/exportar-csv', apenasCozinha, async (req, res, next) => {
  try {
    const schema = z.object({
       dados: z.array(z.object({
        data: z.string(),
        turno: z.string(),
        lanche_padrao: z.string(),
        lixo_limpo: z.number(),
        lixo_sujo: z.number(),
        taxaAprovacao: z.number()
      })).max(5000, "Limite de exportação excedido.")
    });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Carga de dados inválida ou excessiva.' });

    const sanitizarCelula = (texto) => {
        if (typeof texto !== 'string') return texto;
        const str = texto.replace(/"/g, '""');
        if (/^[=+\-@\t\r\n]/.test(str)) return `'"${str}"`;
        return `"${str}"`;
    };

    let csv = 'Data,Turno,Prato_Principal,Sobra_Kg,Resto_Kg,Aprovacao_Porcentagem\n';
    parse.data.dados.forEach(d => {
        csv += `${sanitizarCelula(d.data)},${sanitizarCelula(d.turno)},${sanitizarCelula(d.lanche_padrao)},${d.lixo_limpo},${d.lixo_sujo},${d.taxaAprovacao}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="SESI_Export.csv"');
    res.send(csv);

  } catch (erro) { next(erro); }
});

module.exports = router;