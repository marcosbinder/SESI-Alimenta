const express = require('express');
const { eq, desc, sql, and } = require('drizzle-orm');
const { z } = require('zod');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const { db } = require('../db');
const { usuarios, presenca_geral, avaliacoes_comida, presenca_restricoes, auditoria_lixo, calendario, alunos_especiais, aluno_restricoes, reportes_erro, logs_sistema, solicitacoes_almoco, modo_manutencao } = require('../db/schema');
const { obterIpCliente } = require('../middlewares/manutencao');
const { verificarToken } = require('../middlewares/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[CRÍTICO] JWT_SECRET não configurado no .env. Servidor abortado.');
  process.exit(1);
}
const contasProtegidas = ['DesenvolvedorAdmin', 'admin', ...(process.env.PROTECTED_USERS ? process.env.PROTECTED_USERS.split(',').map(s => s.trim()) : [])];

const speakeasy = require('speakeasy');
const sanitizeHtml = require('sanitize-html');
const { DIR_BACKUPS, limparBackupsAntigos, obterListaBackups } = require('../utils/backup');

const isSenhaFraca = (senha, nomeUsuario) => {
  if (!senha || typeof senha !== 'string' || senha.length < 8) return true;
  if (/^(.)\1+$/.test(senha)) return true;
  if ('0123456789 9876543210'.includes(senha)) return true;
  
  const temLetra = /[a-zA-Z]/.test(senha);
  const temNumero = /[0-9]/.test(senha);
  if (!temLetra || !temNumero) return true;

  const trivial = [
    'abcdefgh', 'senha123', 'admin123', 'mudar123', 'sesi1234', 'qwertyui', 
    '12345678', 'password', 'welcome1', 'letmein1', '12341234', 'sesialimenta'
  ];
  if (trivial.includes(senha.toLowerCase())) return true;
  if (nomeUsuario && senha.toLowerCase().includes(nomeUsuario.toLowerCase())) return true;
  return false;
};

const apenasAdmin = (req, res, next) => {
  if (!req.usuarioLogado || req.usuarioLogado.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado: Nível de TI exigido.' });
  }
  next();
};

const exigirRevalidacao2FA = async (req, res, next) => {
  const { x_2fa_code } = req.headers;
  if (!x_2fa_code) return res.status(401).json({ erro: 'Ação crítica: Exige código 2FA no cabeçalho.' });
  try {
    const user = await db.select().from(usuarios).where(eq(usuarios.id, req.usuarioLogado.id));
    if (user.length === 0 || !user[0].two_factor_secret) {
      return res.status(401).json({ erro: '2FA não configurado na conta.' });
    }

    let isValid = speakeasy.totp.verify({
      secret: user[0].two_factor_secret,
      encoding: 'base32',
      token: String(x_2fa_code).trim(),
      window: 1
    });

    if (!isValid && user[0].recovery_codes) {
      try {
        const codigos = JSON.parse(user[0].recovery_codes);
        const index = codigos.indexOf(String(x_2fa_code).trim().toUpperCase());
        if (index !== -1) {
          isValid = true;
          codigos.splice(index, 1);
          await db.update(usuarios)
            .set({ recovery_codes: JSON.stringify(codigos) })
            .where(eq(usuarios.id, user[0].id));
        }
      } catch (e) {}
    }

    if (!isValid) return res.status(401).json({ erro: 'Código 2FA inválido para autorização da operação.' });
    next();
  } catch (erro) {
    next(erro);
  }
};

router.use('/admin', verificarToken, apenasAdmin);

router.get('/admin/usuarios', async (req, res, next) => {
  try {
    const dados = await db.select({ id: usuarios.id, usuario: usuarios.usuario, tipo: usuarios.tipo, ativo: usuarios.ativo }).from(usuarios);
    res.json({ sucesso: true, dados });
  } catch (erro) { next(erro); }
});

router.post('/admin/usuarios', async (req, res, next) => {
  try {
    const schema = z.object({ usuario: z.string().min(3), tipo: z.enum(['admin', 'professor', 'cozinha', 'coordenacao']) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Dados inválidos.' });
    
    const senhaAleatoria = crypto.randomBytes(6).toString('hex'); 
    const hashSeguro = await bcrypt.hash(senhaAleatoria, 10);
    
    await db.insert(usuarios).values({ usuario: parse.data.usuario, senha: hashSeguro, tipo: parse.data.tipo });
    res.json({ sucesso: true, senhaTemporaria: senhaAleatoria });
  } catch (erro) {
    if (erro.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ erro: 'Usuário já existe.' });
    next(erro);
  }
});

router.put('/admin/usuarios/:id/status', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ erro: 'ID de usuário inválido.' });
    
    const schema = z.object({ ativo: z.union([z.boolean(), z.number().int().min(0).max(1)]) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Parâmetro ativo inválido.' });
    const ativo = parse.data.ativo;

    const usuarioEncontrado = await db.select().from(usuarios).where(eq(usuarios.id, id));
    if (usuarioEncontrado.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const contaProtegida = contasProtegidas.includes(usuarioEncontrado[0].usuario);
    if (contaProtegida && !ativo) {
      return res.status(403).json({ erro: 'Esta conta é protegida e não pode ser desativada.' });
    }

    await db.update(usuarios).set({ ativo: ativo ? 1 : 0 }).where(eq(usuarios.id, id));
    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

router.patch('/admin/usuarios/:id/tipo', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ erro: 'ID de usuário inválido.' });

    const schema = z.object({
      novoTipo: z.enum(['admin', 'professor', 'cozinha', 'coordenacao']).optional(),
      tipo: z.enum(['admin', 'professor', 'cozinha', 'coordenacao']).optional()
    }).refine(data => data.novoTipo || data.tipo, {
      message: 'Perfil inválido. Escolha entre admin, professor, cozinha ou coordenacao.'
    });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: parse.error.errors[0]?.message || 'Dados inválidos.' });

    const novoTipo = parse.data.novoTipo || parse.data.tipo;

    const usuarioEncontrado = await db.select().from(usuarios).where(eq(usuarios.id, id));
    if (usuarioEncontrado.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const usuarioAlvo = usuarioEncontrado[0];
    const tipoAnterior = usuarioAlvo.tipo;

    if (tipoAnterior === novoTipo) {
      return res.json({ sucesso: true, mensagem: 'O usuário já possui este perfil.' });
    }

    // Trava de segurança: impede que a conta logada rebaixe a si mesma se for o único admin ativo
    if (usuarioAlvo.id === req.usuarioLogado.id && novoTipo !== 'admin') {
      const adminsAtivos = await db.select().from(usuarios).where(and(eq(usuarios.tipo, 'admin'), eq(usuarios.ativo, 1)));
      if (adminsAtivos.length <= 1) {
        return res.status(403).json({ erro: 'Ação bloqueada: Você é o único administrador ativo do sistema.' });
      }
    }

    await db.update(usuarios).set({ tipo: novoTipo }).where(eq(usuarios.id, id));

    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const usuarioNome = req.usuarioLogado ? req.usuarioLogado.usuario : 'Admin';

    await db.insert(logs_sistema).values({
      nivel: 'INFO',
      rota: '/api/admin/usuarios/tipo',
      mensagem: `Perfil do usuário '${usuarioAlvo.usuario}' alterado de '${tipoAnterior}' para '${novoTipo}'`,
      detalhes: `Executado por: ${usuarioNome} | ID Usuário: ${id}`,
      usuario: usuarioNome,
      criado_em: agora
    });

    try {
      const { broadcastEvento } = require('../websocket');
      broadcastEvento('usuario_atualizado', { id, usuario: usuarioAlvo.usuario, novoTipo });
    } catch (wsErr) {}

    res.json({ sucesso: true, mensagem: `Perfil alterado para ${novoTipo} com sucesso.` });
  } catch (erro) {
    next(erro);
  }
});

router.post('/admin/usuarios/:id/reset', exigirRevalidacao2FA, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ erro: 'ID de usuário inválido.' });

    const schema = z.object({ novaSenha: z.string().min(8) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Senha inválida ou muito curta (mínimo 8 caracteres).' });
    const { novaSenha } = parse.data;
    
    const user = await db.select().from(usuarios).where(eq(usuarios.id, id));
    if (user.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });

    if (isSenhaFraca(novaSenha, user[0].usuario)) {
         return res.status(400).json({ erro: 'Senha muito fraca. Use pelo menos 8 caracteres, evite sequências numéricas e não use o nome do usuário.' });
    }
    
    const hashSeguro = await bcrypt.hash(novaSenha, 10);
    const novaVersao = (user[0].token_version || 1) + 1;
    await db.update(usuarios).set({ 
      senha: hashSeguro, 
      two_factor_enabled: 0, 
      two_factor_secret: null, 
      recovery_codes: null,
      token_version: novaVersao
    }).where(eq(usuarios.id, id));
    res.json({ sucesso: true, mensagem: 'Senha redefinida, sessões anteriores encerradas e 2FA desativado para a conta.' });
  } catch (erro) { next(erro); }
});

router.get('/admin/backups', (req, res) => {
  const arquivos = obterListaBackups();
  res.json({ sucesso: true, arquivos });
});

router.get('/admin/backups/download/:nome', (req, res) => {
  const nomeSeguro = path.basename(req.params.nome);
  if (!/^[a-zA-Z0-9_.-]+\.db$/.test(nomeSeguro)) {
    return res.status(400).json({ erro: 'Arquivo bloqueado por políticas de segurança.' });
  }
  const arquivo = path.join(DIR_BACKUPS, nomeSeguro);
  if (fs.existsSync(arquivo)) res.download(arquivo);
  else res.status(404).json({ erro: 'Arquivo de backup não encontrado no disco.' });
});

router.post('/admin/backups/forcar', async (req, res, next) => {
  try {
    if (!fs.existsSync(DIR_BACKUPS)) fs.mkdirSync(DIR_BACKUPS, { recursive: true });
    const snapshotName = `backup-manual-${new Date().getTime()}.db`;
    const backupPath = path.join(DIR_BACKUPS, snapshotName);
    const safeBackupPath = backupPath.replace(/\\/g, '/');

    await db.run(sql.raw(`VACUUM INTO '${safeBackupPath}'`));
    
    // Executa retenção mensal: remove backups com mais de 30 dias (1 mês)
    await limparBackupsAntigos(30);

    res.json({ sucesso: true, arquivo: snapshotName });
  } catch (erro) {
    next(erro);
  }
});

router.post('/admin/backups/limpar', async (req, res, next) => {
  try {
    const resultado = await limparBackupsAntigos(30);
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
});

router.get('/admin/erros', async (req, res, next) => {
  try {
    const dados = await db.select().from(reportes_erro).where(eq(reportes_erro.resolvido, 0));
    res.json({ sucesso: true, dados });
  } catch (erro) {
    next(erro);
  }
});

router.put('/admin/erros/:id/resolver', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db.update(reportes_erro).set({ resolvido: 1 }).where(eq(reportes_erro.id, id));
    res.json({ sucesso: true });
  } catch (erro) {
    next(erro);
  }
});

router.post('/admin/purge', exigirRevalidacao2FA, async (req, res, next) => {
  try {
    const { confirmacao_seguranca } = req.body;
    
    if (confirmacao_seguranca !== 'CONFIRMO_EXCLUSAO_TOTAL_DO_ANO_LETIVO') {
      return res.status(403).json({ erro: 'Bloqueio de Segurança: Código de confirmação inválido ou ausente.' });
    }
    
    const safeBackupPath = path.join(__dirname, '../../backups', `backup-pre-purge-${Date.now()}.db`).replace(/\\/g, '/');
    await db.run(sql.raw(`VACUUM INTO '${safeBackupPath}'`));
    
    await db.transaction(async (tx) => {
      await tx.delete(presenca_geral);
      await tx.delete(presenca_restricoes);
      await tx.delete(avaliacoes_comida);
      await tx.delete(auditoria_lixo);
      await tx.delete(calendario);
      await tx.delete(aluno_restricoes);
      await tx.delete(alunos_especiais);
      await tx.delete(reportes_erro);
      await tx.delete(solicitacoes_almoco);
      const dataCorte = new Date();
      dataCorte.setDate(dataCorte.getDate() - 30);
      await tx.delete(logs_sistema).where(sql`substr(criado_em, 7, 4) || '-' || substr(criado_em, 4, 2) || '-' || substr(criado_em, 1, 2) < ${dataCorte.toISOString().split('T')[0]}`);
    });
    res.json({ sucesso: true, mensagem: 'Expurgo concluído com sucesso. Base pronta para o novo ano letivo.' });
  } catch (erro) {
    next(erro);
  }
});

router.get('/admin/logs', async (req, res, next) => {
  try {
    const dados = await db.select().from(logs_sistema).orderBy(desc(logs_sistema.id)).limit(200);
    res.json({ sucesso: true, dados });
  } catch (erro) {
    next(erro);
  }
});

router.get('/admin/manutencao', async (req, res, next) => {
  try {
    const config = await db.select().from(modo_manutencao).limit(1);
    const meuIp = obterIpCliente(req);
    const dados = config.length > 0 ? config[0] : {
      ativo: 0,
      mensagem: 'O sistema está passando por manutenção programada para melhorias técnicas. Retornaremos em breve.',
      previsao: '',
      ips_autorizados: '127.0.0.1,::1,::ffff:127.0.0.1'
    };
    res.json({ sucesso: true, dados: { ...dados, meuIp } });
  } catch (erro) {
    next(erro);
  }
});

router.post('/admin/manutencao', async (req, res, next) => {
  try {
    const schema = z.object({
      ativo: z.union([z.number(), z.boolean()]).transform(v => v ? 1 : 0),
      mensagem: z.string().min(1, 'A mensagem é obrigatória.').max(500),
      previsao: z.string().max(100).optional().default(''),
      ips_autorizados: z.string().default('127.0.0.1,::1')
    });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ erro: 'Dados inválidos.' });

    const { ativo, mensagem, previsao, ips_autorizados } = parse.data;
    const mensagemLimpa = sanitizeHtml(mensagem.trim(), { allowedTags: [], allowedAttributes: {} });
    const previsaoLimpa = sanitizeHtml((previsao || '').trim(), { allowedTags: [], allowedAttributes: {} });
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const usuarioNome = req.usuarioLogado ? req.usuarioLogado.usuario : 'Admin TI';

    const config = await db.select().from(modo_manutencao).limit(1);
    if (config.length > 0) {
      await db.update(modo_manutencao).set({
        ativo,
        mensagem: mensagemLimpa,
        previsao: previsaoLimpa,
        ips_autorizados,
        atualizado_em: agora,
        atualizado_por: usuarioNome
      }).where(eq(modo_manutencao.id, config[0].id));
    } else {
      await db.insert(modo_manutencao).values({
        ativo,
        mensagem: mensagemLimpa,
        previsao: previsaoLimpa,
        ips_autorizados,
        atualizado_em: agora,
        atualizado_por: usuarioNome
      });
    }

    await db.insert(logs_sistema).values({
      nivel: ativo ? 'AVISO' : 'INFO',
      rota: '/api/admin/manutencao',
      mensagem: `Modo de manutenção ${ativo ? 'ATIVADO' : 'DESATIVADO'} por ${usuarioNome}`,
      detalhes: `IPs: ${ips_autorizados} | Previsão: ${previsao || 'N/A'}`,
      usuario: usuarioNome,
      criado_em: agora
    });

    try {
      const wsServerModule = require('../websocket');
      if (wsServerModule.getWebSocketServer) {
        const wss = wsServerModule.getWebSocketServer();
        if (wss) {
          const payload = JSON.stringify({
            tipo: 'manutencao_status',
            payload: { ativo, mensagem, previsao: previsao || '' },
            timestamp: Date.now()
          });
          wss.clients.forEach(c => {
            if (c.readyState === 1) c.send(payload);
          });
        }
      }
    } catch (wsErr) {}

    res.json({ sucesso: true, mensagem: `Modo de manutenção ${ativo ? 'ativado' : 'desativado'} com sucesso.` });
  } catch (erro) {
    next(erro);
  }
});

router.post('/admin/reiniciar-servidor', async (req, res, next) => {
  try {
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const usuarioNome = req.usuarioLogado ? req.usuarioLogado.usuario : 'Admin TI';

    await db.insert(logs_sistema).values({
      nivel: 'AVISO',
      rota: '/api/admin/reiniciar-servidor',
      mensagem: `Comando de reinício do Servidor Principal disparado por ${usuarioNome}`,
      detalhes: 'O processo Node.js será reciclado e reiniciado automaticamente pelo supervisor.',
      usuario: usuarioNome,
      criado_em: agora
    });

    res.json({ sucesso: true, mensagem: 'Comando de reinício enviado. O servidor retornará em instantes.' });

    setTimeout(() => {
      console.log('[SISTEMA] Reiniciando processo por solicitação do Admin TI...');
      process.exit(0);
    }, 500);
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;