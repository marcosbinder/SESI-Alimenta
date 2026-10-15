const { db } = require('../db');
const { turmas, alunos_especiais, calendario, avaliacoes_comida, presenca_geral, presenca_restricoes, aluno_restricoes, aluno_turmas, solicitacoes_almoco } = require('../db/schema');

async function main() {
  console.log('[Info] Iniciando o mapeamento estrutural das turmas...');

  console.log('[Info] Limpando dependências para liberar as Foreign Keys...');
  
  await db.delete(solicitacoes_almoco);
  await db.delete(presenca_geral);
  await db.delete(presenca_restricoes);
  await db.delete(avaliacoes_comida);
  await db.delete(calendario);
  await db.delete(aluno_turmas);
  await db.delete(aluno_restricoes);
  await db.delete(alunos_especiais);

  await db.delete(turmas);

  const anosFund1 = [1, 2, 3, 4, 5];
  for (const ano of anosFund1) {
    for (const letra of ['A', 'B']) {
      await db.insert(turmas).values({ nivel: 'Fundamental 1', ano: ano, identificador: letra });
    }
  }

  const anosFund2 = [6, 7, 8];
  for (const ano of anosFund2) {
    for (const letra of ['A', 'B']) {
      await db.insert(turmas).values({ nivel: 'Fundamental 2', ano: ano, identificador: letra });
    }
  }
  
  for (const letra of ['A', 'B', 'C']) {
    await db.insert(turmas).values({ nivel: 'Fundamental 2', ano: 9, identificador: letra });
  }

  const anosMedio = [1, 2, 3];
  for (const ano of anosMedio) {
    for (const letra of ['A', 'B', 'C']) {
      await db.insert(turmas).values({ nivel: 'Ensino Médio', ano: ano, identificador: letra });
    }
  }

  const anosSenai = [2, 3];
  const oficinasSenai = ['DS - A', 'DS - B', 'Multimídia'];
  
  for (const ano of anosSenai) {
    for (const oficina of oficinasSenai) {
      await db.insert(turmas).values({ nivel: 'Ensino Técnico (SENAI)', ano: ano, identificador: oficina });
    }
  }

  const turmasPersonaliza = [
    { ano: 7, letra: 'A' }, { ano: 7, letra: 'B' },
    { ano: 8, letra: 'Geral' }, 
    { ano: 9, letra: 'A' }, { ano: 9, letra: 'B' }, { ano: 9, letra: 'C' }
  ];
  
  for (const turma of turmasPersonaliza) {
     await db.insert(turmas).values({
       nivel: 'Personaliza',
       ano: turma.ano,
       identificador: turma.letra
     });
  }

  console.log('[Info] Operação concluída. O banco de dados está sincronizado com a Fase 3.');
}

main().catch((erro) => {
  console.error('[Erro] Ocorreu uma falha crítica:', erro);
  process.exit(1);
});