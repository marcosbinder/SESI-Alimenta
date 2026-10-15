/**
 * Gateway Sentinela & Supervisor de Processos
 * 
 * Funcionalidades:
 * 1. Ponto de entrada único na rede (Porta 3000): Encaminha tráfego HTTP e faz tunneling TCP de WebSocket para o backend (:3001).
 * 2. Supervisão de Processos: Monitora o processo filho do Express e o reinicia automaticamente caso caia ou recicle.
 * 3. Modo de Manutenção Inteligente: Intercepta requisições e serve a página 503 com reconexão automática,
 *    liberando bypass apenas para localhost e IPs autorizados pela TI.
 */
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || process.env.PORT || '3000', 10);
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '3001', 10);
const BACKEND_HOST = '127.0.0.1';

let backendOnline = false;
let backendProcess = null;
let lastHealthCheck = 0;

let configManutencao = {
  ativo: 0,
  mensagem: 'O sistema está passando por manutenção programada para melhorias técnicas. Retornaremos em breve.',
  previsao: 'Em instantes',
  ips_autorizados: '127.0.0.1,::1,::ffff:127.0.0.1'
};

const arquivoHtmlManutencao = path.join(__dirname, 'views', 'manutencao.html');
let templateHtmlManutencao = '';

try {
  templateHtmlManutencao = fs.readFileSync(arquivoHtmlManutencao, 'utf-8');
} catch (e) {
  templateHtmlManutencao = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Manutenção</title></head><body style="background:#111;color:#fff;font-family:sans-serif;text-align:center;padding:50px;"><h1>SESI Alimenta em Manutenção</h1><p>{{MENSAGEM}}</p></body></html>`;
}

function normalizarIp(ip) {
  if (!ip) return '127.0.0.1';
  if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
  return ip;
}

function obterIpCliente(req) {
  // O Gateway Sentinela é o ponto de entrada da rede. Lê estritamente o endereço de socket físico para evitar spoofing.
  const socketIp = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : '127.0.0.1';
  return normalizarIp(socketIp);
}

function isIpAutorizado(ipCliente) {
  const ipNorm = normalizarIp(ipCliente).toLowerCase();
  if (ipNorm === '127.0.0.1' || ipNorm === 'localhost' || ipNorm === '::1') return true;

  const permitidos = (configManutencao.ips_autorizados || '')
    .split(',')
    .map(s => normalizarIp(s.trim()).toLowerCase())
    .filter(Boolean);

  return permitidos.includes(ipNorm) || permitidos.includes('0.0.0.0');
}

function escaparHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderizarPaginaManutencao(res, ipCliente) {
  res.writeHead(503, {
    'Content-Type': 'text/html; charset=utf-8',
    'Retry-After': '5',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  const mensagemSegura = escaparHtml(configManutencao.mensagem || 'O sistema está em manutenção técnica. Retornaremos em instantes.');
  const previsaoSegura = escaparHtml(configManutencao.previsao || 'Em instantes');

  const html = templateHtmlManutencao
    .replace(/\{\{MENSAGEM\}\}/g, mensagemSegura)
    .replace(/\{\{PREVISAO\}\}/g, previsaoSegura);
  res.end(html);
}

let falhasConsecutivas = 0;

// Health Check do Backend Principal na porta 3001
function checarSaudeBackend() {
  const req = http.request({
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: '/api/status-manutencao',
    method: 'GET',
    timeout: 3000 // 3 segundos de tolerância contra spikes momentâneos de CPU ou SQLite
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      falhasConsecutivas = 0;
      backendOnline = true;
      lastHealthCheck = Date.now();
      try {
        const json = JSON.parse(body);
        if (json && typeof json.modoManutencao !== 'undefined') {
          configManutencao.ativo = json.modoManutencao ? 1 : 0;
          if (json.mensagem) configManutencao.mensagem = json.mensagem;
          if (json.previsao) configManutencao.previsao = json.previsao;
          if (json.ips_autorizados) configManutencao.ips_autorizados = json.ips_autorizados;
        }
      } catch (e) {}
    });
  });

  req.on('error', () => {
    falhasConsecutivas++;
    if (falhasConsecutivas >= 3) {
      backendOnline = false;
    }
  });

  req.on('timeout', () => {
    req.destroy();
    falhasConsecutivas++;
    if (falhasConsecutivas >= 3) {
      backendOnline = false;
    }
  });

  req.end();
}

setInterval(checarSaudeBackend, 1500);
checarSaudeBackend();

// Função para iniciar e gerenciar o processo do Backend
function iniciarProcessoBackend() {
  console.log(`[GATEWAY] Iniciando processo do Servidor Principal na porta ${BACKEND_PORT}...`);
  const env = { 
    ...process.env, 
    IS_CHILD_PROCESS: 'true',
    BACKEND_PORT: String(BACKEND_PORT),
    PORT: String(BACKEND_PORT), 
    NODE_ENV: process.env.NODE_ENV || 'production' 
  };
  
  backendProcess = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env,
    stdio: 'inherit'
  });

  backendProcess.on('exit', (code, signal) => {
    console.log(`[GATEWAY] Servidor Principal finalizado (Code: ${code}, Signal: ${signal}).`);
    backendOnline = false;
    // Reinicia o processo automaticamente após 1.5 segundos
    setTimeout(() => {
      iniciarProcessoBackend();
    }, 1500);
  });
}

// Inicia o supervisor do backend automaticamente
iniciarProcessoBackend();

// Servidor Gateway HTTP
const gatewayServer = http.createServer((req, res) => {
  const ipCliente = obterIpCliente(req);
  const caminho = req.url || '/';

  // Se o backend estiver offline/reiniciando, o Gateway responde o status de manutenção
  if (!backendOnline && caminho.startsWith('/api/status-manutencao')) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    return res.end(JSON.stringify({
      sucesso: true,
      backendOnline: false,
      modoManutencao: true,
      emManutencao: true,
      mensagem: 'Reiniciando motor do sistema... Retornaremos em instantes.',
      previsao: configManutencao.previsao || 'Em instantes',
      meuIp: ipCliente,
      isIpAutorizado: isIpAutorizado(ipCliente)
    }));
  }

  // Se o backend principal estiver desligado / reiniciando
  if (!backendOnline) {
    // Se for requisição de página HTML
    const aceitaHtml = (req.headers.accept || '').includes('text/html');
    if (aceitaHtml || caminho === '/' || caminho === '/login' || caminho === '/admin' || caminho === '/professor' || caminho === '/cozinha') {
      return renderizarPaginaManutencao(res, ipCliente);
    }
    // Se for chamada de API
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    return res.end(JSON.stringify({
      modoManutencao: true,
      erro: 'Servidor reiniciando ou em manutenção temporária.',
      mensagem: configManutencao.mensagem,
      previsao: configManutencao.previsao
    }));
  }

  // Se o backend está online, mas o modo de manutenção forçado está ATIVO e o IP físico não é autorizado
  if (configManutencao.ativo === 1 && !isIpAutorizado(ipCliente)) {
    // Permite apenas /admin, /api/admin, /api/login/* para a equipe de TI tentar logar
    const ehRotaTi = caminho.startsWith('/admin') || caminho.startsWith('/api/admin') || caminho.startsWith('/api/login') || caminho.startsWith('/assets');
    if (!ehRotaTi) {
      const aceitaHtml = (req.headers.accept || '').includes('text/html');
      if (aceitaHtml || !caminho.startsWith('/api/')) {
        return renderizarPaginaManutencao(res, ipCliente);
      }
      res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      return res.end(JSON.stringify({
        modoManutencao: true,
        erro: 'Sistema em manutenção técnica programada.',
        mensagem: configManutencao.mensagem,
        previsao: configManutencao.previsao
      }));
    }
  }

  // PROXY REVERSO: Encaminha a requisição HTTP diretamente para o Backend na porta 3001
  const proxyReq = http.request({
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      'x-forwarded-for': ipCliente,
      'x-forwarded-proto': 'http',
      'x-forwarded-host': req.headers.host || `localhost:${GATEWAY_PORT}`
    }
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    backendOnline = false;
    if (!res.headersSent) {
      renderizarPaginaManutencao(res, ipCliente);
    }
  });

  req.pipe(proxyReq);
});

// Suporte a WebSocket no Gateway (Tunneling nativo de UPGRADE)
gatewayServer.on('upgrade', (req, clientSocket, head) => {
  const ipCliente = obterIpCliente(req);

  if (!backendOnline) {
    clientSocket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
    clientSocket.destroy();
    return;
  }

  // Bloqueia upgrade de WebSocket se manutenção estiver ativa e IP não for autorizado
  if (configManutencao.ativo === 1 && !isIpAutorizado(ipCliente)) {
    clientSocket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
    clientSocket.destroy();
    return;
  }

  // Abre conexão TCP direta com o WebSocket do backend na porta 3001
  const backendSocket = net.connect(BACKEND_PORT, BACKEND_HOST, () => {
    // Constrói o cabeçalho original com o IP encaminhado
    let rawHeaders = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const key = req.rawHeaders[i];
      const val = req.rawHeaders[i + 1];
      if (key.toLowerCase() !== 'x-forwarded-for') {
        rawHeaders += `${key}: ${val}\r\n`;
      }
    }
    rawHeaders += `x-forwarded-for: ${ipCliente}\r\n\r\n`;

    backendSocket.write(rawHeaders);
    if (head && head.length > 0) backendSocket.write(head);

    // Conecta bidirecionalmente os dois sockets
    backendSocket.pipe(clientSocket);
    clientSocket.pipe(backendSocket);
  });

  backendSocket.on('error', () => {
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.destroy();
  });

  clientSocket.on('error', () => {
    backendSocket.destroy();
  });
});

gatewayServer.listen(GATEWAY_PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`[GATEWAY SENTINELA] Ativo na porta ${GATEWAY_PORT}`);
  console.log(`[GATEWAY SENTINELA] Encaminhando tráfego para porta ${BACKEND_PORT}`);
  console.log(`=======================================================`);
});

module.exports = { gatewayServer };
