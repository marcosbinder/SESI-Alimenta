/**
 * Módulo de Autenticação, Sessões e 2FA (TOTP)
 * 
 * Arquitetura de Segurança:
 * 1. Login em Duas Fases:
 *    - Usuários comuns recebem JWT de 12 horas diretamente via Cookie HttpOnly.
 *    - Administradores com 2FA ativo recebem um `pre_auth_token` de curta duração (5 min),
 *      que só é promovido a token de acesso após validação do TOTP ou código de recuperação.
 * 2. Prevenção de Ataques de Temporização (Timing Attack):
 *    - Usa `DUMMY_HASH` para que o bcrypt execute o mesmo custo computacional mesmo quando o usuário não existe.
 * 3. Invalidação Imediata de Sessão:
 *    - Cada usuário possui um `token_version`. Ao trocar a senha ou fazer logout, a versão é incrementada,
 *      revogando instantaneamente tokens antigos em circulação.
 */
const express = require('express');
const { eq, sql } = require('drizzle-orm');
const { db } = require('../db');
const { usuarios } = require('../db/schema');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { rateLimit } = require('express-rate-limit');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const usarCookieSeguro = process.env.COOKIE_SECURE === 'true';

if (!JWT_SECRET) {
  console.error("[CRÍTICO] JWT_SECRET não configurado no .env. Servidor abortado.");
  process.exit(1);
}

// Hash fictício constante para mitigação de enumeração de contas via Timing Attack
const DUMMY_HASH = '$2b$10$7EqJtq98hPqEX7fNZaFWoOZh9tZ7VqNq0tZ7VqNq0tZ7VqNq0tZ7V';

const limitadorLoginIP = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { erro: 'Bloqueio de segurança: Limite de tentativas da rede (IP) excedido. Aguarde 15 minutos.' }
});

const limitadorLoginUsuario = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
        if (req.body && typeof req.body.usuario === 'string') {
            return req.body.usuario.trim().toLowerCase();
        }
        if (req.body && req.body.usuarioId) {
            return `user_id_${req.body.usuarioId}`;
        }
        return req.ip;
    },
    message: { erro: 'Bloqueio de segurança: Muitas tentativas para este usuário. Aguarde 15 minutos.' }
});

const isSenhaFraca = (senha, nomeUsuario) => {
  if (!senha || typeof senha !== 'string' || senha.length < 8) return true;
  if (/^(.)\1+$/.test(senha)) return true; // Ex: 11111111, aaaaaaaa
  if ('0123456789 9876543210'.includes(senha)) return true; // Ex: 12345678
  
  // Exige ao menos uma letra e um número
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

const extrairPreAuthToken = (req) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1] !== 'undefined') {
    return authHeader.split(' ')[1];
  }
  if (req.body && req.body.preAuthToken) {
    return req.body.preAuthToken;
  }
  return null;
};

router.post('/login', limitadorLoginIP, limitadorLoginUsuario, async (req, res, next) => {
  try {
    const { usuario, senha } = req.body || {};
    if (!usuario || !senha) return res.status(400).json({ erro: 'Preencha o usuário e a senha.' });
    
    const user = await db.select().from(usuarios).where(eq(usuarios.usuario, String(usuario).trim()));
    
    // Equalização de tempo e mensagem única para prevenir enumeração de contas
    if (user.length === 0 || user[0].ativo === 0) {
        await bcrypt.compare(String(senha), DUMMY_HASH);
        return res.status(401).json({ erro: 'Senha ou usuário incorreto.' });
    }
    
    const senhaValida = await bcrypt.compare(String(senha), user[0].senha);
    if (!senhaValida) return res.status(401).json({ erro: 'Senha ou usuário incorreto.' });
    
    const tokenVersion = user[0].token_version || 1;

    if (user[0].tipo === 'admin') {
        if (!user[0].two_factor_enabled) {
             const secret = speakeasy.generateSecret({ name: `SESI Alimenta (${user[0].usuario})` });
             
             await db.update(usuarios)
                 .set({ two_factor_secret: secret.base32 })
                 .where(eq(usuarios.id, user[0].id));
               
             const qrCodeImage = await qrcode.toDataURL(secret.otpauth_url);
             const preAuthToken = jwt.sign(
               { id: user[0].id, usuario: user[0].usuario, scope: '2fa_pending' },
               JWT_SECRET,
               { expiresIn: '3m', algorithm: 'HS256' }
             );
             
             return res.json({
                 sucesso: true,
                 exigeSetup2FA: true,
                 qrCode: qrCodeImage,
                 usuarioId: user[0].id,
                 preAuthToken
             });
        } else {
            let deviceTrustPresent = false;
            if (req.headers.cookie) {
                const trustCookie = req.headers.cookie.split('; ').find(row => row.startsWith('device_trust='));
                if (trustCookie) {
                    const trustVal = trustCookie.split('=')[1];
                    try {
                        const decodedTrust = jwt.verify(trustVal, JWT_SECRET, { algorithms: ['HS256'] });
                        if (decodedTrust && decodedTrust.userId === user[0].id && decodedTrust.isDeviceTrust === true) {
                            deviceTrustPresent = true;
                        }
                    } catch (e) {}
                }
            }

            if (deviceTrustPresent) {
                const tokenGerado = jwt.sign(
                  { id: user[0].id, tipo: user[0].tipo, usuario: user[0].usuario, token_version: tokenVersion },
                  JWT_SECRET,
                  { expiresIn: '10m', algorithm: 'HS256' }
                );
                res.cookie('token', tokenGerado, {
                    httpOnly: true,
                    secure: usarCookieSeguro,
                    sameSite: 'Strict',
                    maxAge: 10 * 60 * 1000
                });
                const expiracao = Math.floor(Date.now() / 1000) + (10 * 60);
                return res.json({ sucesso: true, tipo: user[0].tipo, usuario: user[0].usuario, expiracao });
            }

            const preAuthToken = jwt.sign(
              { id: user[0].id, usuario: user[0].usuario, scope: '2fa_pending' },
              JWT_SECRET,
              { expiresIn: '3m', algorithm: 'HS256' }
            );

            return res.json({
                sucesso: true,
                exige2FA: true,
                usuarioId: user[0].id,
                preAuthToken
            });
        }
    }

    const tokenReal = jwt.sign(
      { id: user[0].id, tipo: user[0].tipo, usuario: user[0].usuario, token_version: tokenVersion },
      JWT_SECRET,
      { expiresIn: '12h', algorithm: 'HS256' }
    );
    res.cookie('token', tokenReal, {
        httpOnly: true,
        secure: usarCookieSeguro,
        sameSite: 'Strict',
        maxAge: 12 * 60 * 60 * 1000
    });
    const expiracao = Math.floor(Date.now() / 1000) + (12 * 60 * 60);
    res.json({ sucesso: true, tipo: user[0].tipo, usuario: user[0].usuario, expiracao });
  } catch (erro) {
    next(erro);
  }
});

router.post('/login/ativar-2fa', limitadorLoginIP, limitadorLoginUsuario, async (req, res, next) => {
    try {
        const { usuarioId, token } = req.body;
        if (!usuarioId || !token) return res.status(400).json({ erro: 'Dados incompletos.' });

        const preAuthToken = extrairPreAuthToken(req);
        if (!preAuthToken) {
            return res.status(401).json({ erro: 'Sessão de autenticação inválida ou expirada. Faça login novamente.' });
        }

        try {
            const decodedPre = jwt.verify(preAuthToken, JWT_SECRET, { algorithms: ['HS256'] });
            if (decodedPre.scope !== '2fa_pending' || decodedPre.id !== Number(usuarioId)) {
                return res.status(401).json({ erro: 'Token de autenticação prévia inválido.' });
            }
        } catch (e) {
            return res.status(401).json({ erro: 'Sessão de autenticação expirada. Faça login novamente.' });
        }

        const user = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId));
        if (user.length === 0 || user[0].ativo === 0) return res.status(401).json({ erro: 'Usuário inválido.' });
        
        const verificado = speakeasy.totp.verify({
            secret: user[0].two_factor_secret,
            encoding: 'base32',
            token: String(token).trim(),
            window: 1
        });
        if (!verificado) {
            return res.status(401).json({ erro: 'Código autenticador inválido.' });
        }
        
        const recoveryCodes = Array.from({ length: 5 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
        const tokenVersion = user[0].token_version || 1;

        await db.update(usuarios)
            .set({ 
                two_factor_enabled: 1,
                recovery_codes: JSON.stringify(recoveryCodes)
            })
            .where(eq(usuarios.id, usuarioId));

        const tokenReal = jwt.sign(
          { id: user[0].id, tipo: user[0].tipo, usuario: user[0].usuario, token_version: tokenVersion },
          JWT_SECRET,
          { expiresIn: '10m', algorithm: 'HS256' }
        );
        res.cookie('token', tokenReal, {
            httpOnly: true,
            secure: usarCookieSeguro,
            sameSite: 'Strict',
            maxAge: 10 * 60 * 1000
        });
        const expiracao = Math.floor(Date.now() / 1000) + (10 * 60);
        res.json({
            sucesso: true,
            tipo: user[0].tipo,
            usuario: user[0].usuario,
            recoveryCodes,
            expiracao
        });
    } catch (erro) {
        next(erro);
    }
});

router.post('/login/validar-2fa', limitadorLoginIP, limitadorLoginUsuario, async (req, res, next) => {
    try {
        const { usuarioId, token } = req.body;
        if (!usuarioId || !token) return res.status(400).json({ erro: 'Dados incompletos.' });

        const preAuthToken = extrairPreAuthToken(req);
        if (!preAuthToken) {
            return res.status(401).json({ erro: 'Sessão de autenticação inválida ou expirada. Faça login novamente.' });
        }

        try {
            const decodedPre = jwt.verify(preAuthToken, JWT_SECRET, { algorithms: ['HS256'] });
            if (decodedPre.scope !== '2fa_pending' || decodedPre.id !== Number(usuarioId)) {
                return res.status(401).json({ erro: 'Token de autenticação prévia inválido.' });
            }
        } catch (e) {
            return res.status(401).json({ erro: 'Sessão de autenticação expirada. Faça login novamente.' });
        }

        const user = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId));
        if (user.length === 0 || user[0].ativo === 0) return res.status(401).json({ erro: 'Usuário inválido.' });
        
        let validado = false;
        validado = speakeasy.totp.verify({
            secret: user[0].two_factor_secret,
            encoding: 'base32',
            token: String(token).trim(),
            window: 1
        });
        if (!validado && user[0].recovery_codes) {
            try {
                const codigos = JSON.parse(user[0].recovery_codes);
                const index = codigos.indexOf(String(token).trim().toUpperCase());
                
                if (index !== -1) {
                    validado = true;
                    codigos.splice(index, 1);
                    await db.update(usuarios)
                        .set({ recovery_codes: JSON.stringify(codigos) })
                        .where(eq(usuarios.id, usuarioId));
                }
            } catch (e) {}
        }
        if (!validado) {
            return res.status(401).json({ erro: 'Código inválido ou expirado.' });
        }

        const deviceTrustToken = jwt.sign({ userId: user[0].id, isDeviceTrust: true }, JWT_SECRET, { expiresIn: '5m', algorithm: 'HS256' });
        res.cookie('device_trust', deviceTrustToken, {
            httpOnly: true,
            secure: usarCookieSeguro,
            sameSite: 'Strict',
            maxAge: 5 * 60 * 1000
        });

        const tokenVersion = user[0].token_version || 1;
        const tempoExpiracao = user[0].tipo === 'admin' ? '10m' : '12h';
        const tokenGerado = jwt.sign(
          { id: user[0].id, tipo: user[0].tipo, usuario: user[0].usuario, token_version: tokenVersion },
          JWT_SECRET,
          { expiresIn: tempoExpiracao, algorithm: 'HS256' }
        );

        res.cookie('token', tokenGerado, {
            httpOnly: true,
            secure: usarCookieSeguro,
            sameSite: 'Strict',
            maxAge: user[0].tipo === 'admin' ? 10 * 60 * 1000 : 12 * 60 * 60 * 1000
        });

        const expiracao = Math.floor(Date.now() / 1000) + (user[0].tipo === 'admin' ? 10 * 60 : 12 * 60 * 60);
        res.json({ sucesso: true, tipo: user[0].tipo, usuario: user[0].usuario, expiracao });
        
    } catch (erro) {
        next(erro);
    }
});

router.post('/alterar-minha-senha', verificarToken, async (req, res, next) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    
    if (isSenhaFraca(novaSenha, req.usuarioLogado.usuario)) {
        return res.status(400).json({ erro: 'Senha fraca. Use pelo menos 8 caracteres contendo letras e números, evitando repetições ou palavras comuns.' });
    }
    
    const user = await db.select().from(usuarios).where(eq(usuarios.id, req.usuarioLogado.id));
    const senhaValida = await bcrypt.compare(senhaAtual, user[0].senha);
    
    if (!senhaValida) return res.status(401).json({ erro: 'Sua senha atual está incorreta.' });
    
    const hashSeguro = await bcrypt.hash(novaSenha, 10);
    const novaVersao = (user[0].token_version || 1) + 1;
    
    await db.update(usuarios)
      .set({ senha: hashSeguro, token_version: novaVersao })
      .where(eq(usuarios.id, req.usuarioLogado.id));
    
    // Emite novo token com a nova versão atualizada
    const tempoExpiracao = user[0].tipo === 'admin' ? '10m' : '12h';
    const novoToken = jwt.sign(
      { id: user[0].id, tipo: user[0].tipo, usuario: user[0].usuario, token_version: novaVersao },
      JWT_SECRET,
      { expiresIn: tempoExpiracao, algorithm: 'HS256' }
    );
    res.cookie('token', novoToken, {
      httpOnly: true,
      secure: usarCookieSeguro,
      sameSite: 'Strict',
      maxAge: user[0].tipo === 'admin' ? 10 * 60 * 1000 : 12 * 60 * 60 * 1000
    });

    res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso.' });
  } catch (erro) {
      next(erro);
  }
});

router.post('/logout', async (req, res) => {
  // Se houver token válido na requisição, incrementa o token_version para invalidar a sessão no servidor
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1] !== 'undefined') {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    const tokenCookie = req.headers.cookie.split('; ').find(row => row.startsWith('token='));
    if (tokenCookie) token = tokenCookie.split('=')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded && decoded.id) {
        await db.update(usuarios)
          .set({ token_version: sql`token_version + 1` })
          .where(eq(usuarios.id, decoded.id));
      }
    } catch (e) {}
  }

  res.clearCookie('token', {
      httpOnly: true,
      secure: usarCookieSeguro,
      sameSite: 'Strict'
  });
  res.clearCookie('device_trust', {
      httpOnly: true,
      secure: usarCookieSeguro,
      sameSite: 'Strict'
  });
  res.json({ sucesso: true, mensagem: 'Sessão encerrada com sucesso.' });
});

module.exports = router;
