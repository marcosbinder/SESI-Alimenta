/**
 * Sincronização de relógio cliente-servidor (estilo NTP simplificado).
 * 
 * Computadores da escola podem ter relógios desajustados em minutos.
 * Para garantir que chamadas e bloqueios de horário funcionem com precisão,
 * medimos o Round-Trip Time (RTT) da requisição, compensamos metade da latência
 * e projetamos o tempo real do servidor monotonicamente usando `performance.now()`.
 */
let serverBaseTime = 0;
let localBaseTime = 0;

export const sincronizarTempo = async () => {
  const t0 = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch('/teste-tempo', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.timestamp) {
        const ts = Number(data.timestamp);
        if (Number.isFinite(ts) && ts > 0 && ts <= 8.64e15) {
          const t1 = performance.now();
          const latenciaUnidirecional = (t1 - t0) / 2;
          
          // Grava a hora exata do servidor e o instante exato do hardware em que foi medida
          serverBaseTime = ts + latenciaUnidirecional;
          localBaseTime = t1;
          
          return true;
        }
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);
  }
  
  // Fallback confia no relógio local apenas no momento inicial da falha
  serverBaseTime = Date.now();
  localBaseTime = performance.now();
  return false;
};

export const getServerTime = () => {
  if (!serverBaseTime || !Number.isFinite(serverBaseTime)) {
    return new Date();
  }
  const msCalculado = serverBaseTime + (performance.now() - (localBaseTime || 0));
  return Number.isFinite(msCalculado) ? new Date(msCalculado) : new Date();
};
