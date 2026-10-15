const { db, initDB } = require('../db');
const { restricoes, aluno_restricoes, alunos_especiais } = require('../db/schema');
const { eq, and, sql } = require('drizzle-orm');

async function migrarRestricoes() {
  console.log('[MIGRAÇÃO] Iniciando normalização de restrições alimentares com múltiplas condições...');
  await initDB();

  // 1. Buscar todas as restrições existentes
  const todasRestricoes = await db.select().from(restricoes);
  const mapNomeParaId = new Map();

  for (const r of todasRestricoes) {
    mapNomeParaId.set(r.nome.trim().toUpperCase(), r.id);
  }

  // Função auxiliar para obter ou criar uma restrição
  async function obterOuCriarRestricao(nomeBruto) {
    const nomeLimpo = nomeBruto.trim();
    if (!nomeLimpo) return null;

    const chave = nomeLimpo.toUpperCase();
    if (mapNomeParaId.has(chave)) {
      return mapNomeParaId.get(chave);
    }

    const inserido = await db.insert(restricoes).values({ nome: nomeLimpo }).returning({ id: restricoes.id });
    const novoId = inserido[0].id;
    mapNomeParaId.set(chave, novoId);
    return novoId;
  }

  // 2. Buscar todos os vínculos aluno_restricoes
  const vinculos = await db.select().from(aluno_restricoes);

  for (const v of vinculos) {
    const restAntiga = todasRestricoes.find(r => r.id === v.restricao_id);
    if (!restAntiga || !restAntiga.nome) continue;

    // Verificar se contém barra '/'
    if (restAntiga.nome.includes('/')) {
      const partes = restAntiga.nome.split('/').map(p => p.trim()).filter(Boolean);
      console.log(`[MIGRAÇÃO] Aluno #${v.aluno_id} - Dividindo "${restAntiga.nome}" em ${partes.length} condições:`, partes);

      for (const parte of partes) {
        const novoRestId = await obterOuCriarRestricao(parte);
        if (novoRestId) {
          // Inserir novo vínculo se não existir
          const jaExiste = await db.select().from(aluno_restricoes)
            .where(and(eq(aluno_restricoes.aluno_id, v.aluno_id), eq(aluno_restricoes.restricao_id, novoRestId)));
          
          if (jaExiste.length === 0) {
            await db.insert(aluno_restricoes).values({
              aluno_id: v.aluno_id,
              restricao_id: novoRestId
            });
          }
        }
      }

      // Remover o vínculo antigo composto
      await db.delete(aluno_restricoes).where(
        eq(aluno_restricoes.id, v.id)
      );
    }
  }

  // 3. Remover restrições com '/' que ficaram órfãs (sem nenhum aluno vinculado)
  const todasRestricoesAtualizadas = await db.select().from(restricoes);
  for (const r of todasRestricoesAtualizadas) {
    if (r.nome.includes('/')) {
      const alunosVinculados = await db.select().from(aluno_restricoes).where(eq(aluno_restricoes.restricao_id, r.id));
      if (alunosVinculados.length === 0) {
        console.log(`[MIGRAÇÃO] Removendo restrição composta órfã: "${r.nome}" (#${r.id})`);
        await db.delete(restricoes).where(eq(restricoes.id, r.id));
      }
    }
  }

  console.log('[MIGRAÇÃO] Normalização concluída com sucesso!');
}

if (require.main === module) {
  migrarRestricoes().then(() => process.exit(0)).catch(err => {
    console.error('[ERRO NA MIGRAÇÃO]', err);
    process.exit(1);
  });
}

module.exports = { migrarRestricoes };
