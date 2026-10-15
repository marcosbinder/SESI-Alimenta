const { db, initDB } = require('../db');
const { alunos_especiais, turmas, aluno_turmas, restricoes, aluno_restricoes } = require('../db/schema');
const { eq, and } = require('drizzle-orm');

async function vincular() {
  await initDB();
  console.log('=== INICIANDO VINCULAÇÃO AUTOMÁTICA DE SENAI E PERSONALIZA ===\n');

  // Mapeamento SENAI (Aluno ID -> Turma ID) - Dados Anonimizados para Demonstração
  const vinculosSenai = [
    { alunoId: 60, nome: 'Aluno Demonstrativo SENAI 01', turmaId: 29, desc: '2º DS - A (SENAI)' },
    { alunoId: 61, nome: 'Aluno Demonstrativo SENAI 02', turmaId: 30, desc: '2º DS - B (SENAI)' },
    { alunoId: 59, nome: 'Aluno Demonstrativo SENAI 03', turmaId: 31, desc: '2º Multimídia (SENAI)' },
    { alunoId: 62, nome: 'Aluno Demonstrativo SENAI 04', turmaId: 32, desc: '3º DS - A (SENAI)' },
    { alunoId: 64, nome: 'Aluno Demonstrativo SENAI 05', turmaId: 32, desc: '3º DS - A (SENAI)' },
    { alunoId: 63, nome: 'Aluno Demonstrativo SENAI 06', turmaId: 33, desc: '3º DS - B (SENAI)' },
    { alunoId: 65, nome: 'Aluno Demonstrativo SENAI 07', turmaId: 33, desc: '3º DS - B (SENAI)' },
    { alunoId: 66, nome: 'Aluno Demonstrativo SENAI 08', turmaId: 34, desc: '3º Multimídia (SENAI)' },
    { alunoId: 67, nome: 'Aluno Demonstrativo SENAI 09', turmaId: 34, desc: '3º Multimídia (SENAI)' }
  ];

  // Mapeamento Personaliza (Aluno ID -> Turma ID) - Dados Anonimizados para Demonstração
  const vinculosPersonaliza = [
    // 7º ano A -> Personaliza 7º A (ID 35)
    { alunoId: 38, nome: 'Aluno Demonstrativo Personaliza 01', turmaId: 35, desc: 'Pers. 7º A' },
    { alunoId: 40, nome: 'Aluno Demonstrativo Personaliza 02', turmaId: 35, desc: 'Pers. 7º A' },
    // 7º ano B -> Personaliza 7º B (ID 36)
    { alunoId: 36, nome: 'Aluno Demonstrativo Personaliza 03', turmaId: 36, desc: 'Pers. 7º B' },
    { alunoId: 37, nome: 'Aluno Demonstrativo Personaliza 04', turmaId: 36, desc: 'Pers. 7º B' },
    { alunoId: 39, nome: 'Aluno Demonstrativo Personaliza 05', turmaId: 36, desc: 'Pers. 7º B' },
    { alunoId: 41, nome: 'Aluno Demonstrativo Personaliza 06', turmaId: 36, desc: 'Pers. 7º B' },
    // 8º ano A -> Personaliza 8º Geral (ID 37)
    { alunoId: 42, nome: 'Aluno Demonstrativo Personaliza 07', turmaId: 37, desc: 'Pers. 8º Geral' },
    { alunoId: 43, nome: 'Aluno Demonstrativo Personaliza 08', turmaId: 37, desc: 'Pers. 8º Geral' },
    { alunoId: 44, nome: 'Aluno Demonstrativo Personaliza 09', turmaId: 37, desc: 'Pers. 8º Geral' },
    // 9º ano A -> Personaliza 9º A (ID 38)
    { alunoId: 46, nome: 'Aluno Demonstrativo Personaliza 10', turmaId: 38, desc: 'Pers. 9º A' },
    { alunoId: 48, nome: 'Aluno Demonstrativo Personaliza 11', turmaId: 38, desc: 'Pers. 9º A' },
    { alunoId: 49, nome: 'Aluno Demonstrativo Personaliza 12', turmaId: 38, desc: 'Pers. 9º A' },
    { alunoId: 51, nome: 'Aluno Demonstrativo Personaliza 13', turmaId: 38, desc: 'Pers. 9º A' },
    // 9º ano B -> Personaliza 9º B (ID 39)
    { alunoId: 45, nome: 'Aluno Demonstrativo Personaliza 14', turmaId: 39, desc: 'Pers. 9º B' },
    // 9º ano C -> Personaliza 9º C (ID 40)
    { alunoId: 47, nome: 'Aluno Demonstrativo Personaliza 15', turmaId: 40, desc: 'Pers. 9º C' },
    { alunoId: 50, nome: 'Aluno Demonstrativo Personaliza 16', turmaId: 40, desc: 'Pers. 9º C' },
    { alunoId: 52, nome: 'Aluno Demonstrativo Personaliza 17', turmaId: 40, desc: 'Pers. 9º C' }
  ];

  console.log('--- APLICANDO VÍNCULOS SENAI ---');
  for (const item of vinculosSenai) {
    await db.delete(aluno_turmas).where(and(eq(aluno_turmas.aluno_id, item.alunoId), eq(aluno_turmas.tipo_vinculo, 'SENAI')));
    await db.insert(aluno_turmas).values({
      aluno_id: item.alunoId,
      turma_id: item.turmaId,
      tipo_vinculo: 'SENAI'
    });
    console.log(`✓ [SENAI] ${item.nome} -> ${item.desc}`);
  }

  console.log('\n--- APLICANDO VÍNCULOS PERSONALIZA ---');
  for (const item of vinculosPersonaliza) {
    await db.delete(aluno_turmas).where(and(eq(aluno_turmas.aluno_id, item.alunoId), eq(aluno_turmas.tipo_vinculo, 'Personaliza')));
    await db.insert(aluno_turmas).values({
      aluno_id: item.alunoId,
      turma_id: item.turmaId,
      tipo_vinculo: 'Personaliza'
    });
    console.log(`✓ [PERSONALIZA] ${item.nome} -> ${item.desc}`);
  }

  console.log('\n=== VINCULAÇÃO CONCLUÍDA COM SUCESSO! ===');
}

vincular().catch(console.error);
