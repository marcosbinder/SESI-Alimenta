const URL_BASE = 'http://localhost:3000';

async function rodarDiagnostico() {
  console.log("==========================================");
  console.log(" INICIANDO DIAGNÓSTICO DE ESTRESSE E API  ");
  console.log("==========================================\n");

  let falhas = 0;

  console.log("[1] Testando Rota Pública (/teste-tempo)...");
  try {
    const resTempo = await fetch(`${URL_BASE}/teste-tempo`);
    const dadosTempo = await resTempo.json();
    if (resTempo.ok && dadosTempo.data_hora_brasilia) {
      console.log(" ✅ Servidor respondeu corretamente.\n");
    } else {
      console.log(" ❌ Servidor retornou erro ou formato inválido.\n");
      falhas++;
    }
  } catch (e) {
    console.log(" ❌ Servidor OFF-LINE ou porta 3000 fechada no Node.\n");
    falhas++;
    console.log("Abortando testes restantes porque o servidor não está rodando.");
    return;
  }

  console.log("[2] Testando Defesa Rate Limit (15 tentativas simultâneas)...");
  const promessasLogin = [];
  for (let i = 0; i < 15; i++) {
    promessasLogin.push(fetch(`${URL_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'hacker_teste', senha: '123' })
    }));
  }

  const respostasLogin = await Promise.all(promessasLogin);
  const statusCodesLogin = respostasLogin.map(r => r.status);
  const bloqueados = statusCodesLogin.filter(s => s === 429).length; // 429 Too Many Requests

  if (bloqueados > 0) {
    console.log(` ✅ Defesa Ativa: ${bloqueados} requisições foram bloqueadas pelo Rate Limiter.\n`);
  } else {
    console.log(` ❌ Rate Limiter FALHOU. Nenhuma requisição retornou status 429.\n`);
    falhas++;
  }

  console.log("[3] Testando Concorrência e Isolamento (50 requisições simultâneas)...");
  const promessasConcorrencia = [];
  for (let i = 0; i < 50; i++) {
    promessasConcorrencia.push(fetch(`${URL_BASE}/api/painel-cozinha/dashboard`, {
      headers: { 'Authorization': 'Bearer token_falso_para_estresse' }
    }));
  }

  const tempoInicio = Date.now();
  const respostasConcorrentes = await Promise.all(promessasConcorrencia);
  const tempoFim = Date.now();

  const falhasCriticas = respostasConcorrentes.filter(r => r.status === 500).length;
  const recusadasCorretamente = respostasConcorrentes.filter(r => r.status === 401).length;

  console.log(` -> Processou 50 requisições em ${tempoFim - tempoInicio}ms`);
  if (falhasCriticas === 0 && recusadasCorretamente === 50) {
     console.log(" ✅ Servidor lidou com a carga sem engasgar ou retornar erro 500.\n");
  } else {
     console.log(` ❌ Falha de estabilidade: ${falhasCriticas} erros internos gerados ao lidar com concorrência.\n`);
     falhas++;
  }

  console.log("==========================================");
  if (falhas === 0) {
     console.log(" RESULTADO: 🟢 TODOS OS TESTES PASSARAM. Motor de API estável.");
  } else {
     console.log(` RESULTADO: 🔴 DIAGNÓSTICO REPROVADO COM ${falhas} FALHA(S).`);
  }
  console.log("==========================================");
}

rodarDiagnostico();