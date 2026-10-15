/**
 * Módulo Docente / Painel do Professor
 * 
 * Responsabilidades:
 * 1. Chamada Diária & Presenças: Lançamento do quantitativo de alunos por turma no início do turno para a cozinha.
 * 2. Confirmação Individual de Restrições: Identificação em sala dos alunos com dietas especiais presentes no dia.
 * 3. Avaliação da Alimentação: Registro de satisfação dos alunos (Gostaram / Não Gostaram) e observações sanitizadas.
 * 4. Solicitação de Almoço: Permite ao professor solicitar refeições para alunos que permanecerão em contraturno/projetos.
 */
const express = require('express');
const { eq, and, inArray, lt, sql } = require('drizzle-orm');
const { z } = require('zod');
const { db } = require('../db');
const { turmas, alunos_especiais, presenca_geral, avaliacoes_comida, presenca_restricoes, calendario, dias_nao_letivos, dias_ignorados_turma, auditoria_lixo, usuarios, aluno_turmas, restricoes, aluno_restricoes, solicitacoes_almoco } = require('../db/schema');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
const crypto = require('crypto');
const { calcularSimilaridade } = require('../utils/fuzzy');
const { verificarToken, autorizar } = require('../middlewares/auth');
const router = express.Router();

function getHoje() {
  const d = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

router.use(verificarToken);
const apenasProfessor = autorizar(['professor']);

async function getUltimoDiaLetivoDaTurma(turmaId, dataAtualStr) {
  const turmaInfo = await db.select().from(turmas).where(eq(turmas.id, turmaId));
  if (turmaInfo.length === 0) return null;

  const turma = turmaInfo[0];
  
  const nivelNorm = turma.nivel.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (nivelNorm === 'Personaliza') {
    const resultado = await db.select({ data: sql`MAX(${presenca_geral.data})` })
        .from(presenca_geral)
        .where(and(
            eq(presenca_geral.turma_id, turmaId),
            lt(presenca_geral.data, dataAtualStr)
        ));
    return resultado[0]?.data || null;
  }

  let data = new Date(dataAtualStr + 'T12:00:00-03:00');
  let dataStr = '';

  while (true) {
    data.setDate(data.getDate() - 1);
    dataStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    const diaSemana = data.getDay();

    if (diaSemana === 0) continue;
    
    const feriado = await db.select().from(dias_nao_letivos).where(eq(dias_nao_letivos.data, dataStr));
    if (feriado.length > 0) continue;

    const ano = Number(turma.ano);
    let temAula = false;

    if (nivelNorm === 'Fundamental 1' || nivelNorm === 'Fundamental 2') {
      temAula = true;
    } else if (nivelNorm === 'Ensino Tecnico (SENAI)') {
      if (ano === 2 && (diaSemana === 2 || diaSemana === 4)) temAula = true;
      if (ano === 3 && (diaSemana === 1)) temAula = true;
    } else if (nivelNorm === 'Ensino Medio') {
      temAula = true;
      if (ano === 2 && (diaSemana === 2 || diaSemana === 4)) temAula = false;
      if (ano === 3 && (diaSemana === 1)) temAula = false;
    }

    if (temAula) return dataStr;
  }
}

const acessoCompartilhado = autorizar(['professor', 'cozinha', 'coordenacao']);

router.get('/turmas', acessoCompartilhado, async (req, res, next) => {
  try {
    const dados = await db.select().from(turmas);
    res.json({ sucesso: true, dados });
  } catch (erro) { next(erro); }
});

router.get('/status-hoje', acessoCompartilhado, async (req, res, next) => {
  try {
    const hoje = getHoje();
    const feriado = await db.select().from(dias_nao_letivos).where(eq(dias_nao_letivos.data, hoje));
    res.json({ sucesso: true, isFeriado: feriado.length > 0 });
  } catch (erro) { next(erro); }
});

router.get('/cardapio-geral-hoje', acessoCompartilhado, async (req, res, next) => {
  try {
    const hoje = getHoje();
    const cardapios = await db.select().from(calendario).where(eq(calendario.data, hoje));
    const resumo = { LM: 'N/A', A: 'N/A', LT: 'N/A' };
    cardapios.forEach(c => {
      if (resumo[c.tipo_refeicao] === 'N/A') resumo[c.tipo_refeicao] = c.prato_principal || c.lanche_padrao;
    });
    res.json({ sucesso: true, dados: resumo });
  } catch (erro) { next(erro); }
});

router.get('/alunos-especiais/turma/:id', acessoCompartilhado, async (req, res, next) => {
  try {
    const turmaId = Number(req.params.id);
    if (isNaN(turmaId) || turmaId <= 0) return res.status(400).json({ erro: 'ID de turma inválido.' });
    const vinculos = await db.select().from(aluno_turmas).where(eq(aluno_turmas.turma_id, turmaId));
    
    if (vinculos.length === 0) return res.json({ sucesso: true, dados: [] });
    
    const idsAlunos = vinculos.map(v => v.aluno_id);
    const alunosDb = await db.select().from(alunos_especiais).where(inArray(alunos_especiais.id, idsAlunos));
    const mapRestricoes = await db.select().from(aluno_restricoes).where(inArray(aluno_restricoes.aluno_id, idsAlunos));
    const listaRestricoes = await db.select().from(restricoes);
    
    const dados = alunosDb.map(aluno => {
      const resVincs = mapRestricoes.filter(r => r.aluno_id === aluno.id);
      const nomes = resVincs.map(rv => {
        const r = listaRestricoes.find(x => x.id === rv.restricao_id);
        return r ? r.nome : null;
      }).filter(Boolean);

      return { 
        id: aluno.id, 
        nome: aluno.nome, 
        restricoes: nomes.length > 0 ? nomes : ['Especial'],
        restricao: nomes.length > 0 ? nomes.join(' • ') : 'Especial' 
      };
    });
    
    res.json({ sucesso: true, dados });
  } catch (erro) { next(erro); }
});

router.get('/info-lanches/turma/:id', acessoCompartilhado, async (req, res, next) => {
  try {
    const turma_id = Number(req.params.id);
    if (isNaN(turma_id) || turma_id <= 0) return res.status(400).json({ erro: 'ID de turma inválido.' });
    const turma = await db.select().from(turmas).where(eq(turmas.id, turma_id)).then(r => r[0]);
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });
    
    const hoje = getHoje();
    const ontem = await getUltimoDiaLetivoDaTurma(turma_id, hoje);
    
    const lanches_hoje = await db.select().from(calendario).where(and(eq(calendario.data, hoje), eq(calendario.turma_id, turma_id)));
    const lanches_ontem = ontem ? await db.select().from(calendario).where(and(eq(calendario.data, ontem), eq(calendario.turma_id, turma_id))) : [];
    
    res.json({ sucesso: true, lanches_hoje, lanches_ontem });
  } catch (erro) { next(erro); }
});

router.get('/status-lancamentos-hoje', acessoCompartilhado, async (req, res, next) => {
  try {
    const hoje = getHoje();
    const lancamentos = await db.select({ turma_id: presenca_geral.turma_id }).from(presenca_geral).where(eq(presenca_geral.data, hoje));
    res.json({ sucesso: true, turmas_concluidas: lancamentos.map(l => l.turma_id) });
  } catch (erro) { next(erro); }
});

router.get('/dados-preenchidos/turma/:id', acessoCompartilhado, async (req, res, next) => {
  try {
    const turma_id = Number(req.params.id);
    if (isNaN(turma_id) || turma_id <= 0) return res.status(400).json({ erro: 'ID de turma inválido.' });
    const turma = await db.select().from(turmas).where(eq(turmas.id, turma_id)).then(r => r[0]);
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada' });

    const hoje = getHoje();
    
    const diaIgnorado = await db.select().from(dias_ignorados_turma).where(and(eq(dias_ignorados_turma.data, hoje), eq(dias_ignorados_turma.turma_id, turma_id)));
    if (diaIgnorado.length > 0) {
        return res.json({ sucesso: true, bloqueado_pela_cozinha: true, mensagem: "A nutrição foi informada que esta turma não terá aula hoje." });
    }

    const ontem = await getUltimoDiaLetivoDaTurma(turma_id, hoje);
    
    const presenca_hoje = await db.select().from(presenca_geral).where(and(eq(presenca_geral.data, hoje), eq(presenca_geral.turma_id, turma_id)));
    const presenca_ontem_db = ontem ? await db.select().from(presenca_geral).where(and(eq(presenca_geral.data, ontem), eq(presenca_geral.turma_id, turma_id))) : [];
    const isSenaiParticionado = presenca_hoje.some(p => ['LM', 'A', 'LT'].includes(p.tipo_refeicao));
    let presencaGeral = 0;
    let presencaSenai = { LM: 0, A: 0, LT: 0 };
    
    if (isSenaiParticionado) {
       presenca_hoje.forEach(p => { if (presencaSenai[p.tipo_refeicao] !== undefined) presencaSenai[p.tipo_refeicao] = p.quantidade; });
    } else {
       presencaGeral = presenca_hoje.length > 0 ? presenca_hoje[0].quantidade : 0;
    }

    const vinculos = await db.select().from(aluno_turmas).where(eq(aluno_turmas.turma_id, turma_id));
    const dietas = {};
    const dietasSenai = {};
    
    if (vinculos.length > 0) {
      const idsAlunos = vinculos.map(v => v.aluno_id);
      const presencasLote = await db.select()
        .from(presenca_restricoes)
        .where(and(eq(presenca_restricoes.data, hoje), inArray(presenca_restricoes.aluno_id, idsAlunos)));
        
      idsAlunos.forEach(id => { dietas[id] = false; dietasSenai[id] = { LM: false, A: false, LT: false }; });
      presencasLote.forEach(p => {
        if (p.presente === 1) {
           if (isSenaiParticionado) {
              if (p.tipo_refeicao && dietasSenai[p.aluno_id]) dietasSenai[p.aluno_id][p.tipo_refeicao] = true;
           } else {
              dietas[p.aluno_id] = true;
           }
        }
      });
    }
    
    let presencaOntem = 0;
    if (presenca_ontem_db.length > 0) {
        if (isSenaiParticionado) {
           presencaOntem = presenca_ontem_db.find(p => p.tipo_refeicao === 'Geral')?.quantidade || presenca_ontem_db[0].quantidade;
        } else {
           presencaOntem = presenca_ontem_db[0].quantidade;
        }
    }
    
    if (presenca_hoje.length === 0) return res.json({ sucesso: true, ja_enviado: false, presencaOntem });
    
    res.json({ 
        sucesso: true, ja_enviado: true, criado_por: presenca_hoje[0].criado_por, alterado_por: presenca_hoje[0].alterado_por,
        dados: { presencaGeral, presencaSenai, presencaOntem, dietas, dietasSenai, isSenaiParticionado }
    });
  } catch (erro) { next(erro); }
});

router.post('/lancamento-completo', autorizar(['professor', 'coordenacao']), async (req, res, next) => {
  try {
    const schema = z.object({
      turma_id: z.number().int().positive(),
      quantidade_geral: z.union([z.number().int().min(0).max(32), z.object({ LM: z.number().int().min(0).max(32), A: z.number().int().min(0).max(32), LT: z.number().int().min(0).max(32) })]),
      avaliacoes: z.array(z.object({
        tipo_refeicao: z.enum(['LM', 'A', 'LT']), 
        gostaram: z.number().int().min(0).max(32),
        observacao: z.string().optional()
      })).max(3, "Máximo de 3 turnos avaliados simultaneamente."),
      dietas: z.array(z.object({
        aluno_id: z.number().int().positive(),
        presente: z.boolean().optional(),
        refeicoes: z.object({ LM: z.boolean(), A: z.boolean(), LT: z.boolean() }).optional()
      })).max(100, "Limite de dietas excedido por requisição.")
    });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Violação de regras: Estrutura de dados corrompida.' });

    const { turma_id, quantidade_geral, avaliacoes, dietas } = parse.data;
    const hoje = getHoje();
    const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const assinatura = `${req.usuarioLogado.usuario} às ${hora}`;
    
    const turma = await db.select().from(turmas).where(eq(turmas.id, turma_id)).then(r => r[0]);
    if (!turma) return res.status(404).json({ erro: 'Turma não encontrada.' });
    
    const diaIgnorado = await db.select().from(dias_ignorados_turma).where(and(eq(dias_ignorados_turma.data, hoje), eq(dias_ignorados_turma.turma_id, turma_id)));
    if (diaIgnorado.length > 0) return res.status(403).json({ erro: 'A nutrição foi informada que esta turma não terá aula hoje.' });
    
    const nivelNorm = turma.nivel.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const diaDaSemana = new Date(hoje + 'T12:00:00-03:00').getDay();
    
    if (diaDaSemana === 0) {
        return res.status(403).json({ erro: 'Não é possível lançar chamada em fins de semana.' });
    }
    const feriadoHoje = await db.select().from(dias_nao_letivos).where(eq(dias_nao_letivos.data, hoje));
    if (feriadoHoje.length > 0) {
        return res.status(403).json({ erro: 'Não é possível lançar chamada em feriados.' });
    }

    const horaAtualSp = parseInt(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()), 10);
    
    if (nivelNorm === 'Fundamental 2' && horaAtualSp < 13 && Number(turma.ano) !== 9) {
        return res.status(403).json({ erro: 'Violação de Horário: Turmas do 6º ao 8º ano só podem lançar chamadas após as 13h.' });
    }
    
    if (nivelNorm === 'Personaliza' && horaAtualSp < 9) {
        return res.status(403).json({ erro: 'Violação de Horário: Lançamento do Personaliza bloqueado até 9h.' });
    }

    if (dietas.length > 0) {
        const alunosNaTurma = await db.select().from(aluno_turmas).where(eq(aluno_turmas.turma_id, turma_id));
        const idsPermitidos = alunosNaTurma.map(v => v.aluno_id);
        const fraudeDetectada = dietas.some(d => !idsPermitidos.includes(d.aluno_id));
        if (fraudeDetectada) {
            return res.status(403).json({ erro: 'Violação: Tentativa de lançamento clínico em alunos que não pertencem a esta turma.' });
        }
    }

    if (nivelNorm === 'Ensino Tecnico (SENAI)') {
      const ano = Number(turma.ano);
      if (ano === 2 && diaDaSemana !== 2 && diaDaSemana !== 4) {
        return res.status(403).json({ erro: 'Violação de Grade: O 2º Ano do SENAI opera fisicamente apenas às Terças e Quintas.' });
      }
      if (ano === 3 && diaDaSemana !== 1 && diaDaSemana !== 5) {
        return res.status(403).json({ erro: 'Violação de Grade: O 3º Ano do SENAI opera fisicamente apenas às Segundas e Sextas.' });
      }
    }
    
    const data_ontem = await getUltimoDiaLetivoDaTurma(turma_id, hoje);
    
    await db.transaction(async (tx) => {
       if (nivelNorm === 'Ensino Tecnico (SENAI)') {
         const turnos = ['LM', 'A', 'LT'];
         for (const turno of turnos) {
           await tx.insert(presenca_geral)
             .values({
                data: hoje,
                turma_id,
                tipo_refeicao: turno,
                quantidade: quantidade_geral[turno],
                criado_por: assinatura,
                alterado_por: assinatura
             })
             .onConflictDoUpdate({
                target: [presenca_geral.data, presenca_geral.turma_id, presenca_geral.tipo_refeicao],
                set: { quantidade: sql`excluded.quantidade`, alterado_por: sql`excluded.alterado_por` }
             });
         }
       } else {
         await tx.insert(presenca_geral)
           .values({
              data: hoje,
              turma_id,
              tipo_refeicao: 'Geral',
              quantidade: quantidade_geral,
              criado_por: assinatura,
              alterado_por: assinatura
           })
           .onConflictDoUpdate({
              target: [presenca_geral.data, presenca_geral.turma_id, presenca_geral.tipo_refeicao],
              set: { quantidade: sql`excluded.quantidade`, alterado_por: sql`excluded.alterado_por` }
           });
       }
       if (data_ontem && avaliacoes.length > 0) {
          const registrosOntem = await tx.select()
            .from(presenca_geral)
            .where(
              and(
                eq(presenca_geral.data, data_ontem), 
                eq(presenca_geral.turma_id, turma_id)
              )
            );
          
          const avaliacoesBatch = avaliacoes.map(aval => {
            const regEspecifico = registrosOntem.find(r => r.tipo_refeicao === aval.tipo_refeicao);
            const regGeral = registrosOntem.find(r => r.tipo_refeicao === 'Geral');
            const presentes_ontem = regEspecifico ? regEspecifico.quantidade : (regGeral ? regGeral.quantidade : 0);

            const gostaramAjustado = Math.min(aval.gostaram, Math.max(presentes_ontem, aval.gostaram));
            const nao_gostaram_calculado = presentes_ontem > 0 ? Math.max(0, presentes_ontem - gostaramAjustado) : 0;
            
            const observacaoSegura = aval.observacao ? sanitizeHtml(aval.observacao.trim(), {
              allowedTags: [],
              allowedAttributes: {}
            }) : null;
            
            return {
              data: data_ontem,
              turma_id: turma_id,
              tipo_refeicao: aval.tipo_refeicao,
              gostaram: gostaramAjustado,
              nao_gostaram: nao_gostaram_calculado,
              observacao: observacaoSegura,
              criado_por: assinatura,
              alterado_por: assinatura
            };
          });

         await tx.insert(avaliacoes_comida)
           .values(avaliacoesBatch)
           .onConflictDoUpdate({
             target: [avaliacoes_comida.data, avaliacoes_comida.turma_id, avaliacoes_comida.tipo_refeicao],
             set: {
               gostaram: sql`excluded.gostaram`,
               nao_gostaram: sql`excluded.nao_gostaram`,
               observacao: sql`excluded.observacao`,
               alterado_por: sql`excluded.alterado_por`
             }
           });
       }
       
       if (dietas.length > 0) {
         if (nivelNorm === 'Ensino Tecnico (SENAI)') {
           const dietasBatch = [];
           for (const dieta of dietas) {
             if (dieta.refeicoes) {
               dietasBatch.push({ data: hoje, aluno_id: dieta.aluno_id, tipo_refeicao: 'LM', presente: dieta.refeicoes.LM ? 1 : 0 });
               dietasBatch.push({ data: hoje, aluno_id: dieta.aluno_id, tipo_refeicao: 'A', presente: dieta.refeicoes.A ? 1 : 0 });
               dietasBatch.push({ data: hoje, aluno_id: dieta.aluno_id, tipo_refeicao: 'LT', presente: dieta.refeicoes.LT ? 1 : 0 });
             }
           }
           if (dietasBatch.length > 0) {
             await tx.insert(presenca_restricoes)
               .values(dietasBatch)
               .onConflictDoUpdate({
                 target: [presenca_restricoes.data, presenca_restricoes.aluno_id, presenca_restricoes.tipo_refeicao],
                 set: { presente: sql`excluded.presente` }
               });
           }
         } else {
           const dietasBatch = dietas.map(dieta => ({
             data: hoje,
             aluno_id: dieta.aluno_id,
             tipo_refeicao: 'Geral',
             presente: dieta.presente ? 1 : 0
           }));

           await tx.insert(presenca_restricoes)
             .values(dietasBatch)
             .onConflictDoUpdate({
               target: [presenca_restricoes.data, presenca_restricoes.aluno_id, presenca_restricoes.tipo_refeicao],
               set: {
                 presente: sql`excluded.presente`
               }
             });
         }
       }
    });

    try {
      const { broadcastEvento } = require('../websocket');
      broadcastEvento('presenca_atualizada', {
        turma_id,
        turma_nome: turma.nome,
        nivel: turma.nivel,
        data: hoje,
        usuario: req.usuarioLogado.usuario,
        quantidade_geral
      });
    } catch (wsErr) {}
    
    res.json({ sucesso: true });
  } catch (erro) {
    next(erro);
  }
});

router.post('/solicitacoes/lote', autorizar(['professor', 'coordenacao']), async (req, res, next) => {
  try {
    const schema = z.object({
      data: z.string().min(1),
      motivo_lote: z.string().min(1),
      alunos: z.array(z.object({
        nome: z.string().min(1),
        sobrenome: z.string().min(1),
        chamada: z.union([z.string(), z.number()]).optional().transform(val => (val && String(val).trim() !== '') ? String(val).trim() : 'S/N'),
        turma_id: z.number().int().positive(),
        is_dieta: z.number().int().min(0).max(1)
      })).min(1)
    });
    
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Dados de lote inválidos.' });
    
    const { data: datas, motivo_lote, alunos } = parse.data;
    const motivoSeguro = sanitizeHtml(motivo_lote.trim(), { allowedTags: [], allowedAttributes: {} });
    const grupo_lote_id = crypto.randomUUID();
    
    const partes = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date());
    const mapDt = {}; partes.forEach(({ type, value }) => { mapDt[type] = value; });
    const agora = `${mapDt.year}-${mapDt.month}-${mapDt.day} ${mapDt.hour}:${mapDt.minute}:${mapDt.second}`;

    const alunosEspeciaisDb = await db.select().from(alunos_especiais);
    const restricoesMap = await db.select().from(aluno_restricoes);
    const listaRestricoes = await db.select().from(restricoes);

    const inserts = [];

    for (const aluno of alunos) {
      let dieta_sugerida = null;

      if (aluno.is_dieta === 1) {
        let matchAluno = null;
        let melhorSim = 0;
        const nomeCompleto = `${aluno.nome} ${aluno.sobrenome}`;

        for (const ae of alunosEspeciaisDb) {
          const sim = calcularSimilaridade(nomeCompleto, ae.nome);
          if (sim > melhorSim && sim >= 0.6) {
            melhorSim = sim;
            matchAluno = ae;
          }
        }

        if (matchAluno) {
          const resVincs = restricoesMap.filter(r => r.aluno_id === matchAluno.id);
          const nomesRestricoes = resVincs.map(rv => {
            const r = listaRestricoes.find(x => x.id === rv.restricao_id);
            return r ? r.nome : null;
          }).filter(Boolean);
          
          if (nomesRestricoes.length > 0) {
            dieta_sugerida = nomesRestricoes.join(', ');
          } else {
            dieta_sugerida = 'Restrição Desconhecida';
          }
        } else {
          dieta_sugerida = 'Restrição Desconhecida';
        }
      }

      inserts.push({
        professor_id: req.usuarioLogado.id,
        aluno_nome: aluno.nome,
        aluno_sobrenome: aluno.sobrenome,
        chamada: String(aluno.chamada),
        turma_id: aluno.turma_id,
        motivo: motivoSeguro,
        datas: datas,
        is_dieta: aluno.is_dieta,
        status: 'Pendente',
        criado_em: agora,
        grupo_lote_id: grupo_lote_id,
        motivo_lote: motivoSeguro,
        dieta_sugerida: dieta_sugerida
      });
    }

    if (inserts.length > 0) {
      await db.insert(solicitacoes_almoco).values(inserts);
    }
    
    res.json({ sucesso: true, grupo_lote_id });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;