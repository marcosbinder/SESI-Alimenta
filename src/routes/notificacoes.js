const express = require('express');
const { db } = require('../db');
const { notificacoes, notificacoes_lidas, usuarios } = require('../db/schema');
const { eq, and, desc, or, isNull, sql } = require('drizzle-orm');
const sanitizeHtml = require('sanitize-html');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken);

// GET /api/notificacoes (Todos os usuários logados)
router.get('/', async (req, res, next) => {
  try {
    const usuarioId = req.usuarioLogado.id;
    
    const queryBase = db.select({
      id: notificacoes.id,
      titulo: notificacoes.titulo,
      mensagem: notificacoes.mensagem,
      autor: notificacoes.autor,
      criado_em: notificacoes.criado_em,
      alvo_tipo: notificacoes.alvo_tipo,
      alvo_usuario_id: notificacoes.alvo_usuario_id,
      alvo_usuario_nome: usuarios.usuario,
      lida_em: notificacoes_lidas.lida_em
    })
    .from(notificacoes)
    .leftJoin(
      notificacoes_lidas, 
      and(
        eq(notificacoes.id, notificacoes_lidas.notificacao_id), 
        eq(notificacoes_lidas.usuario_id, usuarioId)
      )
    )
    .leftJoin(
      usuarios,
      eq(notificacoes.alvo_usuario_id, usuarios.id)
    );

    if (req.query.todas !== 'true' || req.usuarioLogado.tipo !== 'admin') {
      queryBase.where(
        or(
          eq(notificacoes.alvo_tipo, 'GLOBAL'), 
          eq(notificacoes.alvo_usuario_id, usuarioId)
        )
      );
    }
    
    const formatadas = await queryBase.orderBy(desc(notificacoes.id));
    
    // Converter para booleano a leitura
    const dados = formatadas.map(n => ({
      ...n,
      lida: n.lida_em ? true : false
    }));
    
    res.json({ sucesso: true, dados });
  } catch (error) {
    next(error);
  }
});

// POST /api/notificacoes (Apenas Admin)
router.post('/', async (req, res, next) => {
  try {
    const { titulo, mensagem, alvo_tipo, alvo_usuario_id } = req.body;
    
    if (req.usuarioLogado.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
    }
    
    if (!titulo || !mensagem) {
      return res.status(400).json({ erro: 'Título e mensagem são obrigatórios.' });
    }
    
    const tituloLimpo = sanitizeHtml(String(titulo).trim(), {
      allowedTags: [],
      allowedAttributes: {}
    });

    const mensagemLimpa = sanitizeHtml(String(mensagem).trim(), {
      allowedTags: [], // Remove TODAS as tags HTML cruas, permitindo apenas a sintaxe Markdown pura textualmente
      allowedAttributes: {} 
    });

    const novaNotificacao = {
      titulo: tituloLimpo,
      mensagem: mensagemLimpa,
      autor: req.usuarioLogado.usuario,
      criado_em: new Date().toISOString(),
      alvo_tipo: alvo_tipo || 'GLOBAL'
    };
    
    if (alvo_tipo === 'INDIVIDUAL' && Array.isArray(alvo_usuario_id)) {
      await db.transaction(async (tx) => {
        for (const id of alvo_usuario_id) {
          await tx.insert(notificacoes).values({ ...novaNotificacao, alvo_usuario_id: parseInt(id, 10) });
        }
      });
    } else {
      await db.insert(notificacoes).values({ ...novaNotificacao, alvo_usuario_id: null });
    }
    
    res.json({ sucesso: true, mensagem: 'Notificação criada com sucesso.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/notificacoes/:id/ler (Marcar como lida)
router.post('/:id/ler', async (req, res, next) => {
  try {
    const usuarioId = req.usuarioLogado.id;
    const notificacaoId = parseInt(req.params.id, 10);
    
    if (!notificacaoId) return res.status(400).json({ erro: 'ID inválido.' });
    
    // Tentar inserir, se já existir (UNIQUE constraint), ignoramos
    try {
      await db.insert(notificacoes_lidas).values({
        usuario_id: usuarioId,
        notificacao_id: notificacaoId,
        lida_em: new Date().toISOString()
      });
    } catch (e) {
      // Ignorar erro de UNIQUE constraint (já lido)
    }
    
    res.json({ sucesso: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notificacoes/:id (Apenas Admin)
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.usuarioLogado.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
    }
    
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ erro: 'ID inválido.' });

    // Remove leituras atreladas primeiro (Foreign Key Constraint protection)
    await db.delete(notificacoes_lidas).where(eq(notificacoes_lidas.notificacao_id, id));
    // Apaga a notificação raíz
    const result = await db.delete(notificacoes).where(eq(notificacoes.id, id)).returning({ id: notificacoes.id });
    
    if (result.length === 0) {
      return res.status(404).json({ erro: 'Notificação não encontrada.' });
    }
    
    res.json({ sucesso: true, mensagem: 'Aviso deletado permanentemente.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
