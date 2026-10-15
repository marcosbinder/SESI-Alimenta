const { drizzle } = require('drizzle-orm/libsql');
const { createClient } = require('@libsql/client');
const schema = require('./schema');

const client = createClient({ url: 'file:sqlite.db' });

/**
 * Inicialização e ajuste de performance do SQLite:
 * - WAL Mode (Write-Ahead Logging): Permite múltiplas leituras concorrentes enquanto uma escrita ocorre.
 * - busy_timeout (5s): Evita erros de "database locked" fazendo conexões concorrentes aguardarem a liberação do lock.
 * - synchronous = NORMAL: Excelente balanço entre integridade de dados e velocidade em disco (reduz fsyncs excessivos).
 * - foreign_keys = ON: Garante integridade referencial nativa em cascatas e deleções.
 */
async function initDB() {
  await client.execute('PRAGMA journal_mode = WAL');
  await client.execute('PRAGMA busy_timeout = 5000');
  await client.execute('PRAGMA synchronous = NORMAL');
  await client.execute('PRAGMA foreign_keys = ON');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS modo_manutencao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ativo INTEGER NOT NULL DEFAULT 0,
      mensagem TEXT NOT NULL DEFAULT 'O sistema está passando por manutenção programada para melhorias técnicas. Retornaremos em breve.',
      previsao TEXT DEFAULT '',
      ips_autorizados TEXT NOT NULL DEFAULT '127.0.0.1,::1,::ffff:127.0.0.1',
      atualizado_em TEXT,
      atualizado_por TEXT
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS feedbacks_lidos (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      feedback_id TEXT NOT NULL,
      lido_em TEXT NOT NULL,
      UNIQUE(usuario_id, feedback_id)
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS catalogo_alimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL,
      UNIQUE(nome, categoria)
    );
  `);

  await client.execute('CREATE INDEX IF NOT EXISTS idx_catalogo_categoria ON catalogo_alimentos (categoria, ativo);');

  try {
    await client.execute('ALTER TABLE usuarios ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1');
  } catch (e) {
    // Coluna já existe
  }

  const colunasNovasCalendario = [
    'bebida TEXT',
    'fruta TEXT',
    'arroz TEXT',
    'feijao TEXT',
    'prato_principal TEXT',
    'opcao_vegetal TEXT',
    'guarnicao TEXT',
    'molho_salada TEXT',
    'sobremesa TEXT',
    'prato_principal_dieta TEXT'
  ];

  for (const colDef of colunasNovasCalendario) {
    try {
      await client.execute(`ALTER TABLE calendario ADD COLUMN ${colDef}`);
    } catch (e) {
      // Coluna já existe
    }
  }

  try {
    await client.execute('UPDATE calendario SET prato_principal = lanche_padrao WHERE prato_principal IS NULL AND lanche_padrao IS NOT NULL');
  } catch (e) {
    // Ignora se não houver registros
  }

  // Migração das receitas legadas e sementes iniciais para catalogo_alimentos
  try {
    const totalCatalogo = await client.execute('SELECT COUNT(*) as total FROM catalogo_alimentos');
    const count = Number(totalCatalogo.rows[0]?.total || 0);
    if (count === 0) {
      const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      
      // Semear apenas a partir de receitas cadastradas reais do sistema
      const receitasRes = await client.execute('SELECT nome FROM receitas');
      const pratosPrincipaisConhecidos = new Set([
        'Coxinha da asa assada', 'Carne de panela', 'Bife de panela desenrolado',
        'Filé de frango', 'Feijoadinha', 'Quibe de assadeira', 'Frango grelhado',
        'Carne assada ao molho madeira', 'Goulash'
      ]);

      for (const row of receitasRes.rows) {
        const nome = String(row.nome).trim();
        const categoria = pratosPrincipaisConhecidos.has(nome) ? 'prato_principal' : 'lanche';
        await client.execute({
          sql: 'INSERT OR IGNORE INTO catalogo_alimentos (nome, categoria, ativo, criado_em) VALUES (?, ?, 1, ?)',
          args: [nome, categoria, agora]
        });
      }

      // Acompanhamentos básicos do cardápio escolar
      const acompanhamentosReais = [
        { nome: 'Arroz Branco', categoria: 'arroz' },
        { nome: 'Feijão Carioca', categoria: 'feijao' }
      ];

      for (const item of acompanhamentosReais) {
        await client.execute({
          sql: 'INSERT OR IGNORE INTO catalogo_alimentos (nome, categoria, ativo, criado_em) VALUES (?, ?, 1, ?)',
          args: [item.nome, item.categoria, agora]
        });
      }
    }
  } catch (e) {
    console.error('[MIGRAÇÃO] Falha ao semear catalogo_alimentos:', e);
  }

  try {
    await client.execute('CREATE INDEX IF NOT EXISTS idx_aluno_turmas_turma_id ON aluno_turmas (turma_id);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_calendario_data ON calendario (data);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_presenca_geral_data ON presenca_geral (data);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_avaliacoes_data_turma ON avaliacoes_comida (data, turma_id);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_auditoria_lixo_data ON auditoria_lixo (data);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_presenca_restricoes_data ON presenca_restricoes (data);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_solicitacoes_almoco_status ON solicitacoes_almoco (status);');
  } catch (e) {
    // Tabelas podem ainda não ter sido migradas via drizzle-kit
  }

  const existe = await client.execute('SELECT id FROM modo_manutencao LIMIT 1');
  if (existe.rows.length === 0) {
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    await client.execute({
      sql: `INSERT INTO modo_manutencao (ativo, mensagem, previsao, ips_autorizados, atualizado_em, atualizado_por) 
            VALUES (0, 'O sistema está passando por manutenção programada para melhorias técnicas. Retornaremos em breve.', '', '127.0.0.1,::1,::ffff:127.0.0.1', ?, 'Sistema')`,
      args: [agora]
    });
  }
}

const db = drizzle(client, { schema });

module.exports = { db, initDB };