const fs = require('fs');
const path = require('path');

const DIR_BACKUPS = path.resolve(__dirname, '../../backups');

/**
 * Garante que a pasta de backups exista.
 */
function garantirDiretorioBackups() {
  if (!fs.existsSync(DIR_BACKUPS)) {
    fs.mkdirSync(DIR_BACKUPS, { recursive: true });
  }
  return DIR_BACKUPS;
}

/**
 * Extrai o timestamp (ms) de um arquivo de backup pelo padrão do nome ou mtime.
 * @param {string} nomeArquivo 
 * @param {fs.Stats} stats 
 * @returns {number} Timestamp em milissegundos
 */
function extrairTimestampBackup(nomeArquivo, stats) {
  // Padrão 1: backup-YYYY-MM-DD.db
  const matchData = nomeArquivo.match(/^backup-(\d{4})-(\d{2})-(\d{2})\.db$/);
  if (matchData) {
    const ano = parseInt(matchData[1], 10);
    const mes = parseInt(matchData[2], 10) - 1;
    const dia = parseInt(matchData[3], 10);
    return new Date(ano, mes, dia, 12, 0, 0).getTime();
  }

  // Padrão 2: backup-manual-<timestamp>.db ou backup-pre-*-<timestamp>.db
  const matchTs = nomeArquivo.match(/(\d{13,})\.db$/);
  if (matchTs) {
    const ts = parseInt(matchTs[1], 10);
    if (!isNaN(ts) && ts > 0) return ts;
  }

  // Padrão 3: sqlite_pre_cleanup_YYYYMMDD_HHMMSS.db
  const matchClean = nomeArquivo.match(/cleanup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.db$/);
  if (matchClean) {
    const ano = parseInt(matchClean[1], 10);
    const mes = parseInt(matchClean[2], 10) - 1;
    const dia = parseInt(matchClean[3], 10);
    const hora = parseInt(matchClean[4], 10);
    const min = parseInt(matchClean[5], 10);
    const seg = parseInt(matchClean[6], 10);
    return new Date(ano, mes, dia, hora, min, seg).getTime();
  }

  // Fallback: mtime do sistema de arquivos
  return stats?.mtimeMs || (stats?.mtime ? new Date(stats.mtime).getTime() : Date.now());
}

/**
 * Executa a limpeza / expurgo de backups antigos com base na política de retenção.
 * Por padrão, expurga backups com mais de 30 dias (1 mês).
 * Regra de segurança: Sempre preserva pelo menos os N backups mais recentes (default 3),
 * mesmo que tenham mais de 30 dias, para evitar exclusão total acidental.
 * 
 * @param {number} diasRetencao Número de dias máximos de retenção (padrão 30 dias / 1 mês)
 * @param {number} manterMinimo Quantidade mínima de backups que nunca devem ser excluídos (padrão 3)
 * @returns {Promise<{ sucesso: boolean, diasRetencao: number, totalAnalisados: number, totalRemovidos: number, totalMantidos: number, removidos: Array }>}
 */
async function limparBackupsAntigos(diasRetencao = 30, manterMinimo = 3) {
  try {
    const dir = garantirDiretorioBackups();
    const agora = Date.now();

    const todosArquivos = fs.readdirSync(dir);
    const arquivosDb = todosArquivos
      .filter(f => f.endsWith('.db') && !f.startsWith('.'))
      .map(nome => {
        const fullPath = path.join(dir, nome);
        try {
          const stats = fs.statSync(fullPath);
          const timestamp = extrairTimestampBackup(nome, stats);
          const idadeDias = Math.max(0, (agora - timestamp) / (1000 * 60 * 60 * 24));
          return {
            nome,
            fullPath,
            tamanhoBytes: stats.size,
            tamanhoMB: (stats.size / (1024 * 1024)).toFixed(2),
            timestamp,
            idadeDias: Math.round(idadeDias * 10) / 10
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Ordenar do mais novo para o mais antigo
    arquivosDb.sort((a, b) => b.timestamp - a.timestamp);

    const removidos = [];

    arquivosDb.forEach((item, index) => {
      // Regra de segurança: Sempre manter pelo menos os `manterMinimo` backups mais recentes
      if (index < manterMinimo) {
        return;
      }

      // Se a idade for superior à retenção (ex: > 30 dias)
      if (item.idadeDias > diasRetencao) {
        try {
          if (fs.existsSync(item.fullPath)) {
            fs.unlinkSync(item.fullPath);
          }

          // Remover também arquivos auxiliares WAL/SHM associados se existirem
          const walPath = `${item.fullPath}-wal`;
          if (fs.existsSync(walPath)) fs.unlinkSync(walPath);

          const shmPath = `${item.fullPath}-shm`;
          if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

          removidos.push({
            nome: item.nome,
            idadeDias: item.idadeDias,
            tamanhoMB: item.tamanhoMB
          });

          console.log(`[Backup Retenção] Snapshot antigo expurgado com sucesso: ${item.nome} (${item.idadeDias} dias de idade, limite: ${diasRetencao} dias)`);
        } catch (errExcluir) {
          console.error(`[Backup Retenção Erro] Não foi possível excluir backup antigo ${item.nome}:`, errExcluir.message);
        }
      }
    });

    const totalMantidos = arquivosDb.length - removidos.length;

    return {
      sucesso: true,
      diasRetencao,
      totalAnalisados: arquivosDb.length,
      totalRemovidos: removidos.length,
      totalMantidos,
      removidos
    };
  } catch (erroGeral) {
    console.error('[Backup Retenção Erro Geral] Falha ao processar rotina de limpeza:', erroGeral);
    return {
      sucesso: false,
      erro: erroGeral.message,
      totalRemovidos: 0
    };
  }
}

/**
 * Retorna a lista completa de backups locais ordenados por data.
 */
function obterListaBackups() {
  const dir = garantirDiretorioBackups();
  if (!fs.existsSync(dir)) return [];
  const agora = Date.now();

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.db') && !f.startsWith('.'))
    .map(f => {
      try {
        const stats = fs.statSync(path.join(dir, f));
        const timestamp = extrairTimestampBackup(f, stats);
        const idadeDias = Math.max(0, (agora - timestamp) / (1000 * 60 * 60 * 24));
        return {
          nome: f,
          tamanhoMB: (stats.size / (1024 * 1024)).toFixed(2),
          data: stats.mtime,
          timestamp,
          idadeDias: Math.round(idadeDias * 10) / 10
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp);
}

module.exports = {
  DIR_BACKUPS,
  garantirDiretorioBackups,
  extrairTimestampBackup,
  limparBackupsAntigos,
  obterListaBackups
};
