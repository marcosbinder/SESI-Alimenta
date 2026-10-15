/**
 * Módulo da Coordenação Pedagógica
 * 
 * Fluxo Operacional:
 * 1. Triagem de Pedidos de Almoço: Visualização e decisão (Aprovar / Recusar com motivo) de solicitações de contraturno.
 * 2. Máquina de Estados: Pedidos aprovados entram na contagem da Cozinha; cancelamentos pelo docente só são permitidos
 *    enquanto o status for 'Pendente', evitando desperdício de alimento já produzido.
 * 3. Histórico e Auditoria: Registro das ações do coordenador responsável com timestamp oficial de Brasília.
 */
const express = require('express');
const { eq, desc, and } = require('drizzle-orm');
const { z } = require('zod');
const { db } = require('../db');
const { solicitacoes_almoco, usuarios, turmas } = require('../db/schema');
const sanitizeHtml = require('sanitize-html');
const { verificarToken, autorizar } = require('../middlewares/auth');
const router = express.Router();

const getAgoraIso = () => {
    const partes = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    }).formatToParts(new Date());
    
    const map = {};
    partes.forEach(({ type, value }) => { map[type] = value; });
    return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
};

router.use(verificarToken);

router.post('/solicitacoes', autorizar(['professor', 'coordenacao']), async (req, res, next) => {
  try {
    const schema = z.object({
      aluno_nome: z.string().min(1),
      aluno_sobrenome: z.string().min(1),
      chamada: z.string().min(1),
      turma_id: z.number().int().positive(),
      motivo: z.string().min(1),
      datas: z.string().min(1),
      is_dieta: z.boolean().optional()
    });
    
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Preencha todos os campos corretamente.' });
    
    const motivoSeguro = sanitizeHtml(parse.data.motivo.trim(), {
        allowedTags: [],
        allowedAttributes: {}
    });

    const agora = getAgoraIso();
    
    await db.insert(solicitacoes_almoco).values({
      ...parse.data,
      motivo: motivoSeguro,
      is_dieta: parse.data.is_dieta ? 1 : 0,
      professor_id: req.usuarioLogado.id,
      criado_em: agora
    });
    
    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

router.get('/minhas-solicitacoes', autorizar(['professor', 'coordenacao']), async (req, res, next) => {
  try {
    const dados = await db.select({
       id: solicitacoes_almoco.id,
       aluno_nome: solicitacoes_almoco.aluno_nome,
       aluno_sobrenome: solicitacoes_almoco.aluno_sobrenome,
       chamada: solicitacoes_almoco.chamada,
       motivo: solicitacoes_almoco.motivo,
       is_dieta: solicitacoes_almoco.is_dieta,
       status: solicitacoes_almoco.status,
       justificativa: solicitacoes_almoco.justificativa,
       avaliado_por: solicitacoes_almoco.avaliado_por, 
       avaliado_em: solicitacoes_almoco.avaliado_em,
       autor_cancelamento: solicitacoes_almoco.autor_cancelamento,
       motivo_cancelamento: solicitacoes_almoco.motivo_cancelamento,
       datas: solicitacoes_almoco.datas,
       grupo_lote_id: solicitacoes_almoco.grupo_lote_id,
       motivo_lote: solicitacoes_almoco.motivo_lote,
       dieta_sugerida: solicitacoes_almoco.dieta_sugerida,
       turma: turmas.identificador,
       ano: turmas.ano,
       nivel: turmas.nivel
    })
    .from(solicitacoes_almoco)
      .innerJoin(turmas, eq(solicitacoes_almoco.turma_id, turmas.id))
      .where(eq(solicitacoes_almoco.professor_id, req.usuarioLogado.id))
      .orderBy(desc(solicitacoes_almoco.id))
      .limit(100);
      
    res.json({ sucesso: true, dados });
  } catch(erro) { next(erro); }
});

router.get('/solicitacoes', autorizar(['coordenacao']), async (req, res, next) => {
  try {
    const dados = await db.select({
      id: solicitacoes_almoco.id,
      aluno_nome: solicitacoes_almoco.aluno_nome,
      aluno_sobrenome: solicitacoes_almoco.aluno_sobrenome,
      chamada: solicitacoes_almoco.chamada,
      motivo: solicitacoes_almoco.motivo,
      datas: solicitacoes_almoco.datas,
      status: solicitacoes_almoco.status,
      justificativa: solicitacoes_almoco.justificativa,
      is_dieta: solicitacoes_almoco.is_dieta,
      criado_em: solicitacoes_almoco.criado_em,
      avaliado_em: solicitacoes_almoco.avaliado_em,
      cancelado_em: solicitacoes_almoco.cancelado_em,
      autor_cancelamento: solicitacoes_almoco.autor_cancelamento,
      motivo_cancelamento: solicitacoes_almoco.motivo_cancelamento,
      grupo_lote_id: solicitacoes_almoco.grupo_lote_id,
      motivo_lote: solicitacoes_almoco.motivo_lote,
      dieta_sugerida: solicitacoes_almoco.dieta_sugerida,
      turma: turmas.identificador,
      ano: turmas.ano,
      nivel: turmas.nivel,
      professor: usuarios.usuario
    })
    .from(solicitacoes_almoco)
    .innerJoin(turmas, eq(solicitacoes_almoco.turma_id, turmas.id))
    .innerJoin(usuarios, eq(solicitacoes_almoco.professor_id, usuarios.id))
    .orderBy(desc(solicitacoes_almoco.id))
    .limit(100);
    
    res.json({ sucesso: true, dados });
  } catch (erro) { next(erro); }
});

router.put('/solicitacoes/:id/avaliar', autorizar(['coordenacao']), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ erro: 'ID inválido.' });
    const { status, justificativa } = req.body;
    
    if (!['Aprovado', 'Negado'].includes(status)) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }
    if (status === 'Negado' && (!justificativa || justificativa.trim() === '')) {
      return res.status(400).json({ erro: 'A justificativa é obrigatória ao negar um pedido.' });
    }
    
    const justificativaSegura = justificativa ? sanitizeHtml(justificativa.trim(), {
        allowedTags: [],
        allowedAttributes: {}
    }) : null;

    const agora = getAgoraIso();

    const resultado = await db.update(solicitacoes_almoco)
      .set({ 
         status, 
         justificativa: justificativaSegura,
         avaliado_por: req.usuarioLogado.usuario,
         avaliado_em: agora
       })
      .where(eq(solicitacoes_almoco.id, id))
      .returning({ id: solicitacoes_almoco.id });
      
    if (resultado.length === 0) {
        return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    }
    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

router.put('/solicitacoes/:id/desfazer', autorizar(['coordenacao']), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ erro: 'ID inválido.' });
    const resultado = await db.update(solicitacoes_almoco)
      .set({ 
         status: 'Pendente', 
         justificativa: null,
         avaliado_por: null,
         avaliado_em: null
       })
      .where(eq(solicitacoes_almoco.id, id))
      .returning({ id: solicitacoes_almoco.id });
      
    if (resultado.length === 0) return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

router.put('/solicitacoes/:id/cancelar', autorizar(['professor', 'coordenacao']), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ erro: 'ID inválido.' });
    const motivo = req.body.motivo;
    const agora = getAgoraIso();
    
    const solic = await db.select({ datas: solicitacoes_almoco.datas, status: solicitacoes_almoco.status })
      .from(solicitacoes_almoco)
      .where(eq(solicitacoes_almoco.id, id));
      
    if (solic.length === 0) return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    
    if (solic[0].status !== 'Pendente') {
      return res.status(400).json({ erro: 'Apenas solicitações com status Pendente podem ser canceladas.' });
    }
    
    const dataAtual = agora.split(' ')[0];
    
    const datasArr = solic[0].datas.split(',').map(d => {
      const parts = d.trim().split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return d.trim();
    });
    
    const podeCancelar = datasArr.some(d => d >= dataAtual);
    if (!podeCancelar) {
      return res.status(400).json({ erro: 'Não é possível cancelar uma solicitação cujos dias já passaram.' });
    }
    
    const query = db.update(solicitacoes_almoco)
      .set({ 
         status: 'Cancelado', 
         cancelado_em: agora,
         autor_cancelamento: req.usuarioLogado.usuario,
         motivo_cancelamento: motivo ? sanitizeHtml(motivo, { allowedTags: [], allowedAttributes: {} }) : null
       });
       
    let condicao = eq(solicitacoes_almoco.id, id);
    if (req.usuarioLogado.tipo === 'professor') {
       condicao = and(condicao, eq(solicitacoes_almoco.professor_id, req.usuarioLogado.id));
    }
    
    const resultado = await query.where(condicao).returning({ id: solicitacoes_almoco.id });
      
    if (resultado.length === 0) return res.status(403).json({ erro: 'Solicitação não encontrada, acesso negado ou status incompatível.' });
    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

router.put('/lote/:grupo_lote_id/aprovar', autorizar(['coordenacao']), async (req, res, next) => {
  try {
    const { grupo_lote_id } = req.params;
    const agora = getAgoraIso();
    
    const resultado = await db.update(solicitacoes_almoco)
      .set({ 
         status: 'Aprovado',
         avaliado_por: req.usuarioLogado.usuario,
         avaliado_em: agora
       })
      .where(and(
         eq(solicitacoes_almoco.grupo_lote_id, grupo_lote_id),
         eq(solicitacoes_almoco.status, 'Pendente')
      ))
      .returning({ id: solicitacoes_almoco.id });
      
    res.json({ sucesso: true, atualizados: resultado.length });
  } catch (erro) { next(erro); }
});

module.exports = router;