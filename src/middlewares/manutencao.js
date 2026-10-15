const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { modo_manutencao } = require('../db/schema');

const JWT_SECRET = process.env.JWT_SECRET;

function normalizarIp(ip) {
  if (!ip) return '127.0.0.1';
  if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
  return ip;
}

function obterIpCliente(req) {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  return normalizarIp(ip);
}

function extrairUsuarioToken(req) {
  try {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1] !== 'undefined') {
      token = authHeader.split(' ')[1];
    } else if (req.headers.cookie) {
      const tokenCookie = req.headers.cookie.split('; ').find(row => row.startsWith('token='));
      if (tokenCookie) token = tokenCookie.split('=')[1];
    }
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (e) {
    return null;
  }
}

async function getManutencaoConfig() {
  try {
    const config = await db.select().from(modo_manutencao).limit(1);
    if (config.length > 0) return config[0];
  } catch (e) {}
  return {
    ativo: 0,
    mensagem: 'O sistema está passando por manutenção programada para melhorias técnicas. Retornaremos em breve.',
    previsao: '',
    ips_autorizados: '127.0.0.1,::1,::ffff:127.0.0.1'
  };
}

async function middlewareManutencao(req, res, next) {
  const caminho = req.path;

  // Rotas sempre permitidas para permitir login de admin, 2FA, verificação de status e assets estáticos
  if (
    caminho.startsWith('/api/status-manutencao') ||
    caminho.startsWith('/api/admin') ||
    caminho.startsWith('/api/login') ||
    caminho === '/api/minha-sessao' ||
    caminho === '/api/alterar-minha-senha' ||
    caminho.startsWith('/assets') ||
    caminho === '/ws'
  ) {
    return next();
  }

  // Apenas rotas de API precisam do bloqueio 503
  if (!caminho.startsWith('/api/')) {
    return next();
  }

  try {
    const config = await getManutencaoConfig();

    if (config.ativo === 1) {
      // 1. Se o usuário estiver autenticado como Administrador TI, permite acesso completo
      const usuarioLogado = extrairUsuarioToken(req);
      if (usuarioLogado && usuarioLogado.tipo === 'admin') {
        return next();
      }

      // 2. Se o IP do dispositivo for loopback ou estiver na lista de IPs autorizados, permite acesso
      const ipCliente = obterIpCliente(req);
      const ipClienteNorm = (ipCliente || '').toLowerCase();
      const isLoopback = ipClienteNorm === '127.0.0.1' || ipClienteNorm === '::1' || ipClienteNorm === 'localhost';

      const ipsPermitidos = (config.ips_autorizados || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

      const ipAutorizado = 
        isLoopback ||
        ipsPermitidos.includes(ipClienteNorm) ||
        ipsPermitidos.includes('0.0.0.0');

      if (ipAutorizado) {
        return next();
      }

      // 4. Se não for admin, não for localhost e o IP não for autorizado, bloqueia com 503
      return res.status(503).json({
        modoManutencao: true,
        erro: 'Sistema em manutenção técnica programada.',
        mensagem: config.mensagem,
        previsao: config.previsao || ''
      });
    }
  } catch (err) {
    console.error('[MANUTENÇÃO] Erro ao checar status:', err);
  }

  next();
}

module.exports = { middlewareManutencao, obterIpCliente, getManutencaoConfig, extrairUsuarioToken };
