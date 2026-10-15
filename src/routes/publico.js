const express = require('express');
const { eq, gte, and, sql } = require('drizzle-orm');
const { db } = require('../db');
const { calendario, avaliacoes_comida, reportes_erro, usuarios, turmas, auditoria_lixo, presenca_geral, parametros_sistema } = require('../db/schema');
const { verificarToken } = require('../middlewares/auth');
const sanitizeHtml = require('sanitize-html');
const router = express.Router();

router.get('/publico/dashboard', async (req, res, next) => {
  try {
    const d = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cardapiosRaw = await db.select({
       tipo_refeicao: calendario.tipo_refeicao,
       lanche_padrao: calendario.lanche_padrao,
       prato_principal: calendario.prato_principal,
       bebida: calendario.bebida,
       fruta: calendario.fruta,
       arroz: calendario.arroz,
       feijao: calendario.feijao,
       opcao_vegetal: calendario.opcao_vegetal,
       guarnicao: calendario.guarnicao,
       molho_salada: calendario.molho_salada,
       sobremesa: calendario.sobremesa,
       lanche_dieta: calendario.lanche_dieta,
       prato_principal_dieta: calendario.prato_principal_dieta,
       nivel: turmas.nivel
    }).from(calendario)
      .innerJoin(turmas, eq(calendario.turma_id, turmas.id))
      .where(eq(calendario.data, hoje));
      
    const menuAgrupado = { LM: [], A: [], LT: [] };
    
    cardapiosRaw.forEach(c => {
       const prato = c.prato_principal || c.lanche_padrao;
       if (!prato) return;
       const turno = c.tipo_refeicao;
       
       let nivel = c.nivel.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
       if (nivel === 'Ensino Tecnico (SENAI)') nivel = 'Técnico';
       if (nivel === 'Ensino Medio') nivel = 'E.M.';
       if (nivel === 'Fundamental 1') nivel = 'Fund I';
       if (nivel === 'Fundamental 2') nivel = 'Fund II';
       
       if (!menuAgrupado[turno]) return;
       const existente = menuAgrupado[turno].find(item => item.prato === prato);
       if (existente) {
         if (!existente.niveis.includes(nivel)) existente.niveis.push(nivel);
       } else {
         menuAgrupado[turno].push({ 
           prato, 
           lanche_padrao: c.lanche_padrao,
           prato_principal: c.prato_principal,
           bebida: c.bebida,
           fruta: c.fruta,
           arroz: c.arroz,
           feijao: c.feijao,
           opcao_vegetal: c.opcao_vegetal,
           guarnicao: c.guarnicao,
           molho_salada: c.molho_salada,
           sobremesa: c.sobremesa,
           lanche_dieta: c.lanche_dieta,
           prato_principal_dieta: c.prato_principal_dieta,
           niveis: [nivel] 
         });
       }
    });

    const dataLimite = new Date(); 
    dataLimite.setMonth(dataLimite.getMonth() - 6);
    const dataCorte = dataLimite.toISOString().split('T')[0];

      const rankingRaw = await db.all(sql`
      SELECT COALESCE(c.prato_principal, c.lanche_padrao) as nome,
             SUM(a.gostaram) as aprovacao,
             SUM(a.gostaram + a.nao_gostaram) as total_votos
      FROM avaliacoes_comida a
      INNER JOIN calendario c ON a.data = c.data AND a.turma_id = c.turma_id AND a.tipo_refeicao = c.tipo_refeicao
      WHERE a.data >= ${dataCorte}
      GROUP BY COALESCE(c.prato_principal, c.lanche_padrao)
      HAVING total_votos > 0
      ORDER BY (CAST(aprovacao AS REAL) / total_votos) DESC
      LIMIT 5
    `);
    
    const ranking = rankingRaw.map(r => ({
      nome: r.nome,
      aprovacao: Number(r.aprovacao || 0),
      total_votos: Number(r.total_votos || 0),
      porcentagem: Math.round((r.aprovacao / r.total_votos) * 100)
    }));

    const d7 = new Date(); d7.setDate(d7.getDate() - 7);
    const data7Dias = d7.toISOString().split('T')[0];
    
    const lixoRecente = await db.select().from(auditoria_lixo).where(gte(auditoria_lixo.data, data7Dias));
    const presencasRecentes = await db.select().from(presenca_geral).where(gte(presenca_geral.data, data7Dias));
    
    const statsPorDia = {};
    
    lixoRecente.forEach(l => {
      if (!statsPorDia[l.data]) statsPorDia[l.data] = { lixoSujo: 0, alunos: 0 };
      statsPorDia[l.data].lixoSujo += l.lixo_sujo_kg;
    });
    
    presencasRecentes.forEach(p => {
      if (!statsPorDia[p.data]) statsPorDia[p.data] = { lixoSujo: 0, alunos: 0 };
      statsPorDia[p.data].alunos += p.quantidade;
    });
    
    const sustentabilidade = Object.entries(statsPorDia)
      .filter(([_, stats]) => stats.lixoSujo > 0)
      .map(([dataISO, stats]) => {
          const [ano, mes, dia] = dataISO.split('-');
          return { dataISO, data: `${dia}/${mes}`, totalKg: Number(stats.lixoSujo.toFixed(1)), alunos: stats.alunos };
      })
      .sort((a, b) => new Date(a.dataISO) - new Date(b.dataISO))
      .map(({ dataISO, ...rest }) => rest);

    const dbParams = await db.select().from(parametros_sistema);

    let config_totem = { atencao: 25, critico: 45 };
    let taxaRejeicaoAlerta = 30;

    dbParams.forEach(p => {
      if (p.chave === 'resto_per_capita_atencao_g') config_totem.atencao = p.valor;
      if (p.chave === 'resto_per_capita_critico_g') config_totem.critico = p.valor;
      if (p.chave === 'taxa_rejeicao_alerta_percentual') taxaRejeicaoAlerta = p.valor;
    });


    const rankingFiltrado = ranking.filter(item => {
      const rejeicao = item.total_votos > 0 ? Math.round(((item.total_votos - item.aprovacao) / item.total_votos) * 100) : 0;
      return rejeicao <= taxaRejeicaoAlerta;
    }).slice(0, 5);

    const rankingFinal = rankingFiltrado.length > 0 ? rankingFiltrado : ranking.slice(0, 5);

    res.json({ sucesso: true, cardapio_hoje: menuAgrupado, ranking_top: rankingFinal, sustentabilidade, parametros_totem: config_totem });
  } catch (erro) {
    next(erro);
  }
});

router.post('/publico/reportar-erro', verificarToken, async (req, res, next) => {
  try {
    const { mensagem } = req.body;
    if (!mensagem || mensagem.trim() === '') return res.status(400).json({ erro: 'Descreva o problema encontrado.' });

    const mensagemSegura = sanitizeHtml(mensagem.trim(), {
        allowedTags: [],
        allowedAttributes: {}
    });

    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    await db.insert(reportes_erro).values({
      usuario: req.usuarioLogado.usuario,
      perfil: req.usuarioLogado.tipo,
      mensagem: mensagemSegura,
      criado_em: agora
    });

    res.json({ sucesso: true });
  } catch (erro) { next(erro); }
});

module.exports = router;