const path = require('path');
const fs = require('fs');
const { sql } = require('drizzle-orm');
const { db } = require('../src/db');
const {
  presenca_geral, presenca_restricoes, avaliacoes_comida,
  auditoria_lixo, calendario, aluno_restricoes, alunos_especiais,
  reportes_erro, solicitacoes_almoco, notificacoes, notificacoes_lidas, logs_sistema, feedbacks_lidos, receitas
} = require('../src/db/schema');

async function executarGoLive() {
  const args = process.argv.slice(2);
  const senha = args[0];

  if (senha !== 'CONFIRMO_INICIO_DE_PRODUCAO') {
    console.error('\n[ERRO CRITICO] Operacao abortada.');
    console.error('Este script realizara um hard reset do banco de dados, destruindo toda a operacao atual.');
    console.error('Uso: node scripts/go_live.js CONFIRMO_INICIO_DE_PRODUCAO\n');
    process.exit(1);
  }

  console.log('\n=============================================');
  console.log(' INICIANDO HARD RESET PARA GO-LIVE DE PRODUCAO ');
  console.log('=============================================\n');

  try {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const safeBackupPath = path.join(backupDir, `backup-pre-golive-${Date.now()}.db`).replace(/\\/g, '/');
    
    console.log(`[1/3] Gerando backup preventivo em: ${safeBackupPath}`);
    await db.run(sql.raw(`VACUUM INTO '${safeBackupPath}'`));
    console.log('      Backup gerado com sucesso!');

    console.log('[2/3] Apagando dados operacionais, receitas de teste e notificacoes...');
    await db.transaction(async (tx) => {
      // Exclui tabelas obsoletas se existirem
      await tx.run(sql.raw('DROP TABLE IF EXISTS receita_ingredientes'));
      await tx.run(sql.raw('DROP TABLE IF EXISTS ingredientes'));

      // Camada Operacional (Diarios, Almocos, Receitas)
      await tx.delete(presenca_geral);
      await tx.delete(presenca_restricoes); // Apaga apenas o histórico de frequencia (presença de teste diária)
      await tx.delete(feedbacks_lidos);
      await tx.delete(avaliacoes_comida);
      await tx.delete(auditoria_lixo);
      await tx.delete(calendario);
      await tx.delete(receitas);
      await tx.delete(reportes_erro);
      await tx.delete(solicitacoes_almoco);
      
      // Camada de Notificacoes
      await tx.delete(notificacoes_lidas);
      await tx.delete(notificacoes);

      // Marco Zero Forense: Apagar todos os logs de teste e inserir o log No 1
      await tx.delete(logs_sistema);
      // Reseta os contadores de ID de todas as tabelas limpas para garantir o Verdadeiro Marco Zero
      const tabelasLimpas = [
        'presenca_geral', 'presenca_restricoes', 'avaliacoes_comida',
        'auditoria_lixo', 'calendario', 'receitas', 'reportes_erro', 'solicitacoes_almoco',
        'notificacoes_lidas', 'notificacoes', 'logs_sistema', 'feedbacks_lidos'
      ];
      
      for (const tabela of tabelasLimpas) {
        await tx.run(sql.raw(`DELETE FROM sqlite_sequence WHERE name='${tabela}'`));
      }
      
      const agora = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      const strAgora = agora.toISOString();
      
      await tx.insert(logs_sistema).values({
        nivel: 'CRITICO',
        rota: 'CLI/go_live',
        mensagem: 'AMBIENTE DE PRODUCAO INICIALIZADO (Go-Live)',
        detalhes: 'Base de dados resetada. Estruturas e usuarios mantidos.',
        usuario: 'SYSTEM_CLI',
        criado_em: strAgora
      });
    });

    console.log('[3/3] Marco Zero gravado na tabela logs_sistema.');
    console.log('\n[SUCESSO] O ambiente de producao esta pronto para uso!');
    console.log('=============================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n[FALHA] Ocorreu um erro durante o reset:', error);
    process.exit(1);
  }
}

executarGoLive();
