/**
 * Servidor WebSocket Nativo (/ws)
 * 
 * Sincronização em Tempo Real:
 * 1. Barramento de Eventos: Transmite atualizações de chamadas (professores -> cozinha),
 *    mudanças de cardápio, status de manutenção e contagem de clientes conectados.
 * 2. Heartbeat Anti-Zumbi: Dispara ping/pong a cada 15 segundos para detectar e encerrar conexões
 *    fantasmas causadas por tablets/laptops que entraram em suspensão ou trocaram de rede Wi-Fi.
 * 3. Sanitização de Broadcast: Todo payload de texto livre é limpo com sanitizeHtml antes de trafegar.
 */
const { WebSocketServer, WebSocket } = require('ws');
const sanitizeHtml = require('sanitize-html');

let wssInstance = null;

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wssInstance = wss;

  console.log('[WEBSOCKET] Servidor WebSocket inicializado na rota /ws');

  let clienteCounter = 0;

  function broadcast(tipo, payload, remetenteWs = null) {
    try {
      const mensagem = JSON.stringify({ tipo, payload, timestamp: Date.now() });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(mensagem, (err) => {
              if (err) {
                // Silencia erro de desconexão abrupta de cliente individual para não afetar os demais
              }
            });
          } catch (errSend) {}
        }
      });
    } catch (errGeral) {
      console.error('[WEBSOCKET] Erro ao serializar broadcast:', errGeral);
    }
  }

  function emitirStatusClientes() {
    const clientesInfo = [];
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        clientesInfo.push({
          id: client.clienteId,
          nome: client.clienteNome || `Máquina ${client.clienteId}`,
          ip: client.clienteIp,
          conectadoEm: client.conectadoEm
        });
      }
    });

    broadcast('status_clientes', {
      total: clientesInfo.length,
      clientes: clientesInfo
    });
  }

  wss.on('connection', (ws, req) => {
    clienteCounter++;
    ws.clienteId = clienteCounter;
    ws.clienteIp = req.socket.remoteAddress || 'Desconhecido';
    ws.conectadoEm = Date.now();
    ws.isAlive = true;

    console.log(`[WEBSOCKET] Novo cliente conectado: ID #${ws.clienteId} (${ws.clienteIp}) | Total ativos: ${wss.clients.size}`);

    // Mensagem de boas-vindas para o próprio cliente
    ws.send(JSON.stringify({
      tipo: 'boas_vindas',
      payload: {
        clienteId: ws.clienteId,
        ip: ws.clienteIp,
        totalClientes: wss.clients.size,
        servidorHora: new Date().toLocaleTimeString('pt-BR')
      },
      timestamp: Date.now()
    }));

    // Atualiza todos sobre o novo número de clientes
    emitirStatusClientes();

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (dadosBrutos) => {
      try {
        const parsed = JSON.parse(dadosBrutos);
        const { tipo, payload } = parsed;

        if (tipo === 'ping') {
          ws.send(JSON.stringify({ tipo: 'pong', payload: { clientTimestamp: payload?.clientTimestamp }, timestamp: Date.now() }));
        } 
        else if (tipo === 'identificar') {
          const nomeSanitizado = sanitizeHtml(String(payload?.nome || '').trim(), { allowedTags: [], allowedAttributes: {} });
          ws.clienteNome = nomeSanitizado || `Máquina ${ws.clienteId}`;
          emitirStatusClientes();
        } 
        else if (tipo === 'mensagem_teste') {
          const textoSanitizado = sanitizeHtml(String(payload?.texto || '').trim(), { allowedTags: [], allowedAttributes: {} });
          // Repassa a mensagem de teste para TODAS as máquinas conectadas
          broadcast('mensagem_teste', {
            remetenteId: ws.clienteId,
            remetenteNome: ws.clienteNome || `Máquina ${ws.clienteId}`,
            remetenteIp: ws.clienteIp,
            texto: textoSanitizado,
            enviadoEm: payload?.enviadoEm || Date.now()
          });
        }
      } catch (err) {
        console.error('[WEBSOCKET] Erro ao processar mensagem do cliente:', err);
      }
    });

    ws.on('close', () => {
      console.log(`[WEBSOCKET] Cliente desconectado: ID #${ws.clienteId} | Restantes: ${wss.clients.size}`);
      emitirStatusClientes();
    });

    ws.on('error', (err) => {
      console.error(`[WEBSOCKET] Erro no cliente ID #${ws.clienteId}:`, err);
    });
  });

  // Heartbeat a cada 15 segundos para detectar conexões mortas
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        console.log(`[WEBSOCKET] Encerrando conexão inativa: ID #${ws.clienteId}`);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 15000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return { wss, broadcast };
}

function broadcastEvento(tipo, payload) {
  if (!wssInstance) return;
  const mensagem = JSON.stringify({ tipo, payload, timestamp: Date.now() });
  wssInstance.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(mensagem);
      } catch (err) {}
    }
  });
}

function getWebSocketServer() {
  return wssInstance;
}

module.exports = { setupWebSocket, getWebSocketServer, broadcastEvento };
