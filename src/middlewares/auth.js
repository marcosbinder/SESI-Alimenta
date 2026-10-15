const jwt = require('jsonwebtoken');
const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { usuarios } = require('../db/schema');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('[CRÍTICO] JWT_SECRET não configurado no .env. Servidor abortado.');
  process.exit(1);
}

const extrairToken = (req) => {
  let token = null;
  const authHeader = req.headers['authorization'];

  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1] !== 'undefined') {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    const tokenCookie = req.headers.cookie.split('; ').find(row => row.startsWith('token='));
    if (tokenCookie) token = tokenCookie.split('=')[1];
  }
  return token;
};

const verificarToken = async (req, res, next) => {
  const token = extrairToken(req);

  if (!token) return res.status(401).json({ erro: 'Sessão revogada: Token ausente na requisição.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    if (!decoded || !decoded.id) {
      return res.status(401).json({ erro: 'Sessão desatualizada ou inválida.' });
    }

    const user = await db.select().from(usuarios).where(eq(usuarios.id, decoded.id));
    if (user.length === 0 || user[0].ativo === 0) {
      return res.status(401).json({ erro: 'Sessão revogada. Acesso bloqueado.' });
    }

    // Invalidação imediata por token_version (logout ou reset de senha)
    if (decoded.token_version && user[0].token_version && decoded.token_version !== user[0].token_version) {
      return res.status(401).json({ erro: 'Sessão invalidada por alteração de credenciais.' });
    }

    req.usuarioLogado = { ...decoded, token_version: user[0].token_version || 1 };
    next();
  } catch (error) {
    return res.status(401).json({ erro: 'Sessão forjada ou expirada.' });
  }
};

const autorizar = (perfis) => (req, res, next) => {
  if (!req.usuarioLogado || (!perfis.includes(req.usuarioLogado.tipo) && req.usuarioLogado.tipo !== 'admin')) {
    return res.status(403).json({ erro: 'Acesso negado: Perfil sem permissão para esta ação.' });
  }
  next();
};

module.exports = {
  extrairToken,
  verificarToken,
  autorizar
};
