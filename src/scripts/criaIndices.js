const { createClient } = require('@libsql/client');

const client = createClient({ url: 'file:sqlite.db' });

async function aplicarIndices() {
  console.log("Iniciando gravação física dos índices no disco...");
  
  try {
    await client.execute('CREATE INDEX IF NOT EXISTS idx_aluno_turmas_turma_id ON aluno_turmas (turma_id);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_calendario_data ON calendario (data);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_presenca_geral_data ON presenca_geral (data);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_avaliacoes_data_turma ON avaliacoes_comida (data, turma_id);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_auditoria_lixo_data ON auditoria_lixo (data);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_presenca_restricoes_data ON presenca_restricoes (data);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_solicitacoes_almoco_status ON solicitacoes_almoco (status);');
    
    console.log("[SUCESSO] Índices gravados. O banco local agora fará buscas diretas (B-Tree).");
    process.exit(0);
  } catch (erro) {
    console.error("Falha ao criar índices:", erro);
    process.exit(1);
  }
}

aplicarIndices();