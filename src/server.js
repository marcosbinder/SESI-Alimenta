require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
  console.error('[CRÍTICO] A variável de ambiente JWT_SECRET é obrigatória e deve possuir no mínimo 32 caracteres. Verifique seu arquivo .env.');
  process.exit(1);
}

// Override global para garantir que todos os logs do PM2 / Windows Service tenham Data e Hora
const origLog = console.log;
const origError = console.error;
console.log = function () {
  const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  origLog.apply(console, [`[${ts}]`, ...arguments]);
};
console.error = function () {
  const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  origError.apply(console, [`[${ts}][ERRO]`, ...arguments]);
};
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { rateLimit } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const helmet = require('helmet');
const compression = require('compression');
const { sql } = require('drizzle-orm');

const origensPermitidas = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost'];

const { db, initDB } = require('./db');
const { logs_sistema } = require('./db/schema');
const rotasAdmin = require('./routes/admin');
const rotasAuth = require('./routes/auth');
const rotasDocente = require('./routes/docente');
const rotasNutricao = require('./routes/nutricao');
const rotasCoordenacao = require('./routes/coordenacao');
const rotasPublicas = require('./routes/publico');
const rotasNotificacoes = require('./routes/notificacoes');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  hsts: false
}));
app.use(compression());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || origensPermitidas.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Bloqueado pela política de CORS do servidor: Origem não autorizada.'));
      }
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);

app.use(express.static(path.join(__dirname, '../site/dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '100kb' }));

const extrairChaveMaquina = (req) => {
  // Identifica a máquina através do IP real da conexão (atrás do Gateway ou direto)
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

  // Se houver cookie de dispositivo ou machine_id, usa como fingerprint complementar da máquina
  let machineCookie = null;
  if (req.headers.cookie) {
    const match = req.headers.cookie.split('; ').find(row => row.startsWith('device_trust=') || row.startsWith('machine_id='));
    if (match) machineCookie = match.split('=')[1];
  }

  const ua = req.headers['user-agent'] || 'cliente_padrao';
  const fingerprint = machineCookie ? machineCookie.substring(0, 16) : crypto.createHash('md5').update(ua).digest('hex').substring(0, 8);

  return `maquina_${ip}_${fingerprint}`;
};

const limitadorPorMaquina = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Cota por máquina individual a cada 15 minutos (não afeta outras máquinas da escola)
  keyGenerator: extrairChaveMaquina,
  skip: (req) => {
    if (req.method === 'OPTIONS') return true;
    const url = req.originalUrl || req.url || '';
    // Pula rotas de sincronização periódica e assets estáticos para não consumir a cota da máquina
    if (
      url.includes('/teste-tempo') ||
      url.startsWith('/assets/') ||
      url.startsWith('/api/notificacoes') ||
      url.startsWith('/api/manutencao/status') ||
      url.includes('favicon.ico')
    ) {
      return true;
    }
    return false;
  },
  message: { erro: 'Muitas requisições originadas desta máquina. Limite temporariamente excedido. Aguarde alguns minutos.' },
  validate: { trustProxy: false } 
});
app.use(limitadorPorMaquina);

app.get('/teste-tempo', (req, res) => {
  try {
    res.json({ timestamp: Date.now() });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha interna' });
  }
});

let filaLogs = [];
let gravandoLogs = false;

async function descarregarFilaLogs() {
  if (filaLogs.length === 0 || gravandoLogs) return;
  gravandoLogs = true;
  const lote = [...filaLogs];
  filaLogs = [];

  try {
    for (const logItem of lote) {
      await db.insert(logs_sistema).values(logItem);
    }
  } catch (e) {
    console.error('[CRÍTICO] Falha ao descarregar lote de auditoria passiva no banco:', e);
  } finally {
    gravandoLogs = false;
  }
}

setInterval(descarregarFilaLogs, 2000);

app.use((req, res, next) => {
  res.on('finish', () => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        
        let msg = `Operação ${req.method} concluída.`;
        if (req.originalUrl.includes('/lancamento-completo')) msg = 'Chamada diária e avaliações lançadas no sistema.';
        else if (req.originalUrl.includes('/solicitacoes')) msg = 'Manipulação de solicitação de almoço de contraturno.';
        else if (req.originalUrl.includes('/calendario/salvar')) msg = 'Cardápio nutricional atualizado/injetado.';
        else if (req.originalUrl.includes('/auditoria-lixo')) msg = 'Pesagem de lixo (Sobra/Resto) auditada na matriz.';
        else if (req.originalUrl.includes('/alunos-especiais')) msg = 'Ficha clínica de paciente com restrição modificada.';
        else if (req.originalUrl.includes('/admin/usuarios')) msg = 'Privilégios ou credenciais de operador modificadas.';
        
        let payloadSeguro = 'Sem Payload';
        if (req.body) {
            const bodyClone = { ...req.body };
            const camposSensiveis = ['senha', 'novaSenha', 'token', 'preAuthToken', 'device_trust', 'two_factor_secret', 'recovery_codes', 'confirmacao_seguranca'];
            camposSensiveis.forEach(campo => {
                if (bodyClone[campo]) bodyClone[campo] = '[MASCARADO]';
            });

            payloadSeguro = JSON.stringify(bodyClone).substring(0, 500);
        }
        
        const ipReal = req.headers['x-forwarded-for'] || req.ip;
        
        filaLogs.push({
           nivel: 'INFO',
           rota: req.originalUrl,
           mensagem: msg,
           detalhes: `Método: ${req.method} | IP: ${ipReal} | Payload: ${payloadSeguro}`,
           usuario: req.usuarioLogado ? req.usuarioLogado.usuario : 'Sistema',
           criado_em: agora,
        });

        if (filaLogs.length >= 20) {
          descarregarFilaLogs();
        }
      } catch (e) {}
    }
  });
  next();
});

const { middlewareManutencao, getManutencaoConfig, obterIpCliente } = require('./middlewares/manutencao');
app.use(middlewareManutencao);

app.get('/api/status-manutencao', async (req, res) => {
  try {
    const config = await getManutencaoConfig();
    const meuIp = obterIpCliente(req);
    const ipsPermitidos = (config.ips_autorizados || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const meuIpNorm = (meuIp || '').toLowerCase();
    
    const ipAutorizado = 
      ipsPermitidos.includes(meuIpNorm) ||
      (meuIpNorm === '127.0.0.1' && ipsPermitidos.some(ip => ip === '127.0.0.1' || ip === 'localhost' || ip === '::1')) ||
      ipsPermitidos.includes('0.0.0.0');

    res.json({
      sucesso: true,
      backendOnline: true,
      modoManutencao: config.ativo === 1,
      emManutencao: config.ativo === 1,
      mensagem: config.mensagem,
      previsao: config.previsao || '',
      ips_autorizados: config.ips_autorizados,
      meuIp,
      isIpAutorizado: ipAutorizado
    });
  } catch (e) {
    res.json({ sucesso: true, backendOnline: true, modoManutencao: false, emManutencao: false, isIpAutorizado: true });
  }
});

app.use('/api', rotasPublicas);
app.use('/api', rotasAuth);
app.use('/api', rotasDocente);
app.use('/api', rotasAdmin);
app.use('/api', rotasNutricao);
app.use('/api', rotasCoordenacao);
app.use('/api/notificacoes', rotasNotificacoes);

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ erro: 'Endpoint não encontrado.' });
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, '../site/dist/index.html'));
});

app.use(async (erro, req, res, next) => {
  console.error(`[LOG INTERNO] ${new Date().toISOString()} - ${erro.message}`);
  console.error(erro.stack);
  try {
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    await db.insert(logs_sistema).values({
       nivel: 'CRITICO',
       rota: req.originalUrl,
       mensagem: erro.message || 'Erro Interno',
       detalhes: erro.stack || '',
       usuario: req.usuarioLogado ? req.usuarioLogado.usuario : 'Sistema',
       criado_em: agora
    });
  } catch (e) {
     console.error('[CRÍTICO] Falha ao gravar log no banco:', e);
  }

  if (erro.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || erro.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(400).json({ erro: 'Operação recusada: Conflito de integridade nos dados.' });
  }
  
  res.status(500).json({ erro: 'Falha interna no servidor.' });
});

const { DIR_BACKUPS, limparBackupsAntigos } = require('./utils/backup');

cron.schedule('0 3 * * *', async () => {
  const hoje = new Date().toISOString().split('T')[0];
  const arquivoBackup = path.join(DIR_BACKUPS, `backup-${hoje}.db`);
  const safeBackupPath = arquivoBackup.replace(/\\/g, '/');
  try {
    if (fs.existsSync(arquivoBackup)) {
      fs.unlinkSync(arquivoBackup);
    }
    await db.run(sql.raw(`VACUUM INTO '${safeBackupPath}'`));
    console.log(`[Backup Sucesso] Snapshot diário criado com segurança em: ${arquivoBackup}`);

    // Política de retenção mensal: limpa backups com mais de 30 dias (1 mês)
    const resLimpeza = await limparBackupsAntigos(30);
    if (resLimpeza.totalRemovidos > 0) {
      console.log(`[Backup Retenção] Limpeza periódica: ${resLimpeza.totalRemovidos} backup(s) antigo(s) removido(s).`);
    }
  } catch (err) {
    console.error(`[Backup Erro] Falha ao processar o dump:`, err);
  }
});

const http = require('http');
const { setupWebSocket } = require('./websocket');

// Se for processo filho ou modo standalone direto, inicializa o servidor Express e WebSocket
if (process.env.IS_CHILD_PROCESS === 'true' || process.env.STANDALONE === 'true') {
  const port = parseInt(process.env.BACKEND_PORT || process.env.PORT || '3001', 10);
  const server = http.createServer(app);
  setupWebSocket(server);

  initDB().then(() => {
    // Executa expurgo de backups com mais de 30 dias (1 mês) na inicialização
    limparBackupsAntigos(30).catch(err => {
      console.error('[Backup Retenção] Falha na limpeza de inicialização:', err.message);
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`[ERP SESI] Motor Principal HTTP e WebSocket operando na porta ${port}`);
    });
  }).catch(err => {
    console.error('[CRÍTICO] Falha ao inicializar motor do banco:', err);
    process.exit(1);
  });
} else {
  // Processo Master: Carrega o Gateway Sentinela (que escuta na porta 3000 e supervisiona o motor na 3001)
  console.log('[MASTER] Inicializando Gateway Sentinela e supervisor de processos...');
  require('./gateway');
}
