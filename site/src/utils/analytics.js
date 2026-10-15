export const CATEGORIAS_ALIMENTOS_MAP = {
  prato_principal: 'Prato Principal',
  lanche: 'Lanche',
  arroz: 'Arroz',
  feijao: 'Feijão',
  guarnicao: 'Guarnição',
  opcao_vegetal: 'Salada / Vegetal',
  molho_salada: 'Molho',
  fruta: 'Fruta',
  sobremesa: 'Sobremesa',
  bebida: 'Bebida',
  outros: 'Outros'
};

export const LISTA_CATEGORIAS_COMPARATIVO = [
  { id: 'todas', label: 'Todas as Categorias' },
  { id: 'prato_principal', label: 'Prato Principal' },
  { id: 'lanche', label: 'Lanche' },
  { id: 'opcao_vegetal', label: 'Salada / Vegetal' },
  { id: 'guarnicao', label: 'Guarnição' },
  { id: 'molho_salada', label: 'Molho' },
  { id: 'arroz', label: 'Arroz' },
  { id: 'feijao', label: 'Feijão' },
  { id: 'fruta', label: 'Fruta' },
  { id: 'sobremesa', label: 'Sobremesa' },
  { id: 'bebida', label: 'Bebida' }
];

export function criarChaveSerieAprovacao(serie) {
  if (!Array.isArray(serie)) return '';

  return serie
    .map(({ data = '', dataGrafico = '', taxaAprovacao = '' }) => `${data}:${dataGrafico}:${taxaAprovacao}`)
    .join('|');
}

export function processarAnalyticsBI(historicoBI, filtros = {}, parametros = {}) {
  const { filtroTurnoBI = 'Todos', biDataInicio, biDataFim } = filtros || {};
  const { 
    lancheA = '', 
    lancheB = '', 
    catalogoAlimentos = [],
    formatarDataSimples = (d) => d || '', 
    mapNomesTurnos = {} 
  } = parametros || {};

  const listaHistorico = Array.isArray(historicoBI) ? historicoBI : [];

  const pesoTurno = { 'LM': 1, 'A': 2, 'LT': 3 };
  const ordemTurno = (t) => pesoTurno[t] || 99;

  const dadosBIFiltrados = listaHistorico
    .filter(item => {
      if (!item) return false;
      if (filtroTurnoBI === 'Geral' || filtroTurnoBI === 'TodosDetalhados' || filtroTurnoBI === 'Todos') return true;
      return item.turno === filtroTurnoBI;
    })
    .filter(item => { 
      if (!biDataInicio || !biDataFim) return true; 
      return item?.data >= biDataInicio && item?.data <= biDataFim; 
    })
    .sort((a, b) => {
      const cmp = String(a?.data || '').localeCompare(String(b?.data || ''));
      if (cmp !== 0) return cmp;
      return ordemTurno(a?.turno) - ordemTurno(b?.turno);
    })
    .map(item => {
       const aprovacao = Number(item?.aprovacao) || 0;
       const rejeicao = Number(item?.rejeicao) || 0;
       const total = aprovacao + rejeicao;
       const taxa = total > 0 ? Math.round((aprovacao / total) * 100) : null;
       const dataFormatada = typeof formatarDataSimples === 'function' ? formatarDataSimples(item?.data) : (item?.data || '');
       const labelGrafico = (filtroTurnoBI === 'TodosDetalhados')
         ? `${dataFormatada} (${item?.turno || ''})`
         : dataFormatada;
       return { 
         ...item, 
         lixo_limpo: Number((Number(item?.lixo_limpo) || 0).toFixed(1)),
         lixo_sujo: Number((Number(item?.lixo_sujo) || 0).toFixed(1)),
         dataGrafico: labelGrafico, 
         taxaAprovacao: taxa 
       };
    });

  // Agrupamento Consolidado por Dia (Resolve o problema de barras finas e eixos poluídos em períodos longos)
  const mapaDias = {};
  dadosBIFiltrados.forEach(item => {
    const d = item.data;
    if (!mapaDias[d]) {
      const dataFormatada = typeof formatarDataSimples === 'function' ? formatarDataSimples(d) : d;
      mapaDias[d] = {
        data: d,
        dataGrafico: dataFormatada,
        lixo_limpo: 0,
        lixo_sujo: 0,
        aprovacao: 0,
        rejeicao: 0,
        presenca_total: 0,
        pratos: []
      };
    }
    mapaDias[d].lixo_limpo += Number(item.lixo_limpo) || 0;
    mapaDias[d].lixo_sujo += Number(item.lixo_sujo) || 0;
    mapaDias[d].aprovacao += Number(item.aprovacao) || 0;
    mapaDias[d].rejeicao += Number(item.rejeicao) || 0;
    mapaDias[d].presenca_total += Number(item.presenca_total) || 0;
    const nomePrato = (item.prato_principal || item.lanche_padrao)?.trim();
    if (nomePrato && !mapaDias[d].pratos.includes(nomePrato)) {
      mapaDias[d].pratos.push(nomePrato);
    }
  });

  const dadosBIDiarios = Object.values(mapaDias)
    .sort((a, b) => String(a.data).localeCompare(String(b.data)))
    .map(dia => {
      const total = dia.aprovacao + dia.rejeicao;
      const taxa = total > 0 ? Math.round((dia.aprovacao / total) * 100) : null;
      return {
        ...dia,
        lixo_limpo: Number(dia.lixo_limpo.toFixed(1)),
        lixo_sujo: Number(dia.lixo_sujo.toFixed(1)),
        taxaAprovacao: taxa,
        lanche_padrao: dia.pratos.join(', ') || 'Não Informado'
      };
    });

  // Cálculo de estatísticas dos pratos principais (para os rankings Top 5)
  const pratosStatsGlobais = {};
  listaHistorico.forEach(d => {
      const pratoKey = (d?.prato_principal || d?.lanche_padrao)?.trim();
      if (!d || !pratoKey || pratoKey === 'Não Informado' || pratoKey === 'N/A' || pratoKey === 'Receita Não Servida') return;
      if (!pratosStatsGlobais[pratoKey]) {
          pratosStatsGlobais[pratoKey] = { nome: pratoKey, ocorrencias: 0, lixo_limpo: 0, lixo_sujo: 0, somaGostaram: 0, totalAvaliacoes: 0 };
      }
      
      const lixoLimpo = Number(d.lixo_limpo) || 0;
      const lixoSujo = Number(d.lixo_sujo) || 0;
      const aprov = Number(d.aprovacao) || 0;
      const rej = Number(d.rejeicao) || 0;

      pratosStatsGlobais[pratoKey].lixo_limpo += lixoLimpo;
      pratosStatsGlobais[pratoKey].lixo_sujo += lixoSujo;
      pratosStatsGlobais[pratoKey].somaGostaram += aprov;
      pratosStatsGlobais[pratoKey].totalAvaliacoes += (aprov + rej);
      
      if ((aprov + rej) > 0 || lixoLimpo > 0 || lixoSujo > 0) {
          pratosStatsGlobais[pratoKey].ocorrencias += 1;
      }
  });

  const listaPratosGlobal = Object.values(pratosStatsGlobais).map(p => ({
      nome: p.nome, 
      mediaAprovacao: p.totalAvaliacoes > 0 ? Math.round((p.somaGostaram / p.totalAvaliacoes) * 100) : 0, 
      mediaLimpo: p.ocorrencias > 0 ? Number((p.lixo_limpo / p.ocorrencias).toFixed(1)) || 0 : 0, 
      mediaSujo: p.ocorrencias > 0 ? Number((p.lixo_sujo / p.ocorrencias).toFixed(1)) || 0 : 0
  }));

  const topAceitacao = [...listaPratosGlobal].sort((a,b) => b.mediaAprovacao - a.mediaAprovacao).slice(0, 5);
  const topSujo = [...listaPratosGlobal].sort((a,b) => b.mediaSujo - a.mediaSujo).slice(0, 5);
  const topLimpo = [...listaPratosGlobal].sort((a,b) => b.mediaLimpo - a.mediaLimpo).slice(0, 5);

  // Mapeamento abrangente de todos os componentes do cardápio por categoria alimentar
  const itensStatsGlobais = {};

  // Pré-popular com o catálogo oficial caso disponível
  if (Array.isArray(catalogoAlimentos)) {
    catalogoAlimentos.forEach(catItem => {
      const nome = (catItem?.nome || '').trim();
      if (!nome || nome === 'Não Informado' || nome === 'N/A' || nome === 'Receita Não Servida') return;
      itensStatsGlobais[nome] = {
        nome,
        categoria: catItem.categoria || 'outros',
        ocorrencias: 0,
        lixo_limpo: 0,
        lixo_sujo: 0,
        somaGostaram: 0,
        somaRejeitaram: 0,
        totalAvaliacoes: 0,
        totalPresenca: 0
      };
    });
  }

  const registrarComponente = (nomeRaw, catSugerida, d) => {
    const nome = (nomeRaw || '').trim();
    if (!nome || nome === 'Não Informado' || nome === 'N/A' || nome === 'Receita Não Servida') return;

    if (!itensStatsGlobais[nome]) {
      itensStatsGlobais[nome] = {
        nome,
        categoria: catSugerida || 'outros',
        ocorrencias: 0,
        lixo_limpo: 0,
        lixo_sujo: 0,
        somaGostaram: 0,
        somaRejeitaram: 0,
        totalAvaliacoes: 0,
        totalPresenca: 0
      };
    } else if (catSugerida && (!itensStatsGlobais[nome].categoria || itensStatsGlobais[nome].categoria === 'outros')) {
      itensStatsGlobais[nome].categoria = catSugerida;
    }

    const lixoLimpo = Number(d?.lixo_limpo) || 0;
    const lixoSujo = Number(d?.lixo_sujo) || 0;
    const aprov = Number(d?.aprovacao) || 0;
    const rej = Number(d?.rejeicao) || 0;
    const presenca = Number(d?.presenca_total) || 0;

    itensStatsGlobais[nome].lixo_limpo += lixoLimpo;
    itensStatsGlobais[nome].lixo_sujo += lixoSujo;
    itensStatsGlobais[nome].somaGostaram += aprov;
    itensStatsGlobais[nome].somaRejeitaram += rej;
    itensStatsGlobais[nome].totalAvaliacoes += (aprov + rej);
    itensStatsGlobais[nome].totalPresenca += presenca;

    if ((aprov + rej) > 0 || lixoLimpo > 0 || lixoSujo > 0 || presenca > 0) {
      itensStatsGlobais[nome].ocorrencias += 1;
    }
  };

  listaHistorico.forEach(d => {
    if (!d) return;

    if (d.turno === 'A') {
      const prato = (d.prato_principal || d.lanche_padrao)?.trim();
      if (prato) registrarComponente(prato, 'prato_principal', d);
    } else {
      const lanche = (d.lanche_padrao || d.prato_principal)?.trim();
      if (lanche) registrarComponente(lanche, 'lanche', d);
    }

    if (d.arroz) registrarComponente(d.arroz, 'arroz', d);
    if (d.feijao) registrarComponente(d.feijao, 'feijao', d);
    if (d.guarnicao) registrarComponente(d.guarnicao, 'guarnicao', d);
    if (d.opcao_vegetal) registrarComponente(d.opcao_vegetal, 'opcao_vegetal', d);
    if (d.molho_salada) registrarComponente(d.molho_salada, 'molho_salada', d);
    if (d.fruta) registrarComponente(d.fruta, 'fruta', d);
    if (d.sobremesa) registrarComponente(d.sobremesa, 'sobremesa', d);
    if (d.bebida) registrarComponente(d.bebida, 'bebida', d);
  });

  const listaItensComparativo = Object.values(itensStatsGlobais).map(item => {
    const cat = item.categoria || 'outros';
    const ocorrencias = item.ocorrencias || 0;
    return {
      nome: item.nome,
      categoria: cat,
      categoriaLabel: CATEGORIAS_ALIMENTOS_MAP[cat] || cat,
      ocorrencias,
      mediaAprovacao: item.totalAvaliacoes > 0 ? Math.round((item.somaGostaram / item.totalAvaliacoes) * 100) : 0,
      mediaLimpo: ocorrencias > 0 ? Number((item.lixo_limpo / ocorrencias).toFixed(1)) || 0 : 0,
      mediaSujo: ocorrencias > 0 ? Number((item.lixo_sujo / ocorrencias).toFixed(1)) || 0 : 0,
      totalPresenca: item.totalPresenca || 0,
      totalAvaliacoes: item.totalAvaliacoes || 0,
      somaGostaram: item.somaGostaram || 0,
      somaRejeitaram: item.somaRejeitaram || 0
    };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const statsAFallback = listaItensComparativo.find(p => p.nome === lancheA) 
    || listaPratosGlobal.find(p => p.nome === lancheA);
  const statsA = {
    nome: statsAFallback?.nome || lancheA || '',
    categoria: statsAFallback?.categoria || 'outros',
    categoriaLabel: statsAFallback?.categoriaLabel || CATEGORIAS_ALIMENTOS_MAP[statsAFallback?.categoria || 'outros'] || 'Outros',
    mediaAprovacao: Number(statsAFallback?.mediaAprovacao) || 0,
    mediaLimpo: Number(statsAFallback?.mediaLimpo) || 0,
    mediaSujo: Number(statsAFallback?.mediaSujo) || 0,
    ocorrencias: Number(statsAFallback?.ocorrencias) || 0,
    totalPresenca: Number(statsAFallback?.totalPresenca) || 0,
    totalAvaliacoes: Number(statsAFallback?.totalAvaliacoes) || 0,
    somaGostaram: Number(statsAFallback?.somaGostaram) || 0,
    somaRejeitaram: Number(statsAFallback?.somaRejeitaram) || 0
  };

  const statsBFallback = listaItensComparativo.find(p => p.nome === lancheB) 
    || listaPratosGlobal.find(p => p.nome === lancheB);
  const statsB = {
    nome: statsBFallback?.nome || lancheB || '',
    categoria: statsBFallback?.categoria || 'outros',
    categoriaLabel: statsBFallback?.categoriaLabel || CATEGORIAS_ALIMENTOS_MAP[statsBFallback?.categoria || 'outros'] || 'Outros',
    mediaAprovacao: Number(statsBFallback?.mediaAprovacao) || 0,
    mediaLimpo: Number(statsBFallback?.mediaLimpo) || 0,
    mediaSujo: Number(statsBFallback?.mediaSujo) || 0,
    ocorrencias: Number(statsBFallback?.ocorrencias) || 0,
    totalPresenca: Number(statsBFallback?.totalPresenca) || 0,
    totalAvaliacoes: Number(statsBFallback?.totalAvaliacoes) || 0,
    somaGostaram: Number(statsBFallback?.somaGostaram) || 0,
    somaRejeitaram: Number(statsBFallback?.somaRejeitaram) || 0
  };

  const radarData = [
      { subject: 'Aceitação (%)', A: statsA.mediaAprovacao, B: statsB.mediaAprovacao, fullMark: 100 },
      { subject: 'Resto Prato (Kg)', A: statsA.mediaSujo, B: statsB.mediaSujo, fullMark: 50 },
      { subject: 'Sobra Cuba (Kg)', A: statsA.mediaLimpo, B: statsB.mediaLimpo, fullMark: 50 },
  ];

  // Panorama Macro por Categoria Alimentar (Cruzamento B.I. Avançado)
  const resumoCategoriasBI = LISTA_CATEGORIAS_COMPARATIVO
    .filter(c => c.id !== 'todas' && c.id !== 'outros')
    .map(c => {
      const itensDaCat = listaItensComparativo.filter(i => i.categoria === c.id);
      const totalItens = itensDaCat.length;
      const totalServido = itensDaCat.reduce((acc, i) => acc + (Number(i.ocorrencias) || 0), 0);
      const somaAvaliacoes = itensDaCat.reduce((acc, i) => acc + (Number(i.totalAvaliacoes) || 0), 0);
      const somaGostaram = itensDaCat.reduce((acc, i) => acc + (Number(i.somaGostaram) || 0), 0);
      const somaLixoSujo = itensDaCat.reduce((acc, i) => acc + ((Number(i.mediaSujo) || 0) * (Number(i.ocorrencias) || 1)), 0);
      const somaLixoLimpo = itensDaCat.reduce((acc, i) => acc + ((Number(i.mediaLimpo) || 0) * (Number(i.ocorrencias) || 1)), 0);

      const mediaAprovacao = somaAvaliacoes > 0 ? Math.round((somaGostaram / somaAvaliacoes) * 100) : null;
      const mediaSujo = totalServido > 0 ? Number((somaLixoSujo / totalServido).toFixed(1)) : 0;
      const mediaLimpo = totalServido > 0 ? Number((somaLixoLimpo / totalServido).toFixed(1)) : 0;

      const itensAvaliados = itensDaCat.filter(i => (Number(i.totalAvaliacoes) || 0) > 0);
      const destaque = itensAvaliados.length > 0 
        ? [...itensAvaliados].sort((a, b) => (b.mediaAprovacao || 0) - (a.mediaAprovacao || 0))[0]
        : null;

      return {
        id: c.id,
        label: c.label,
        totalItens,
        totalServido,
        totalAvaliacoes: somaAvaliacoes,
        mediaAprovacao,
        mediaSujo,
        mediaLimpo,
        destaque: destaque ? { nome: destaque.nome, mediaAprovacao: destaque.mediaAprovacao } : null
      };
    });


  let sumSobra = 0, sumResto = 0, sumPresenca = 0, sumGostaram = 0;
  (Array.isArray(dadosBIFiltrados) ? dadosBIFiltrados : []).forEach(d => {
     if (!d) return;
     const sobra = Number(d.lixo_limpo) || 0;
     const resto = Number(d.lixo_sujo) || 0;
     const aprov = Number(d.aprovacao) || 0;
     const rej = Number(d.rejeicao) || 0;
     const presenca = Number(d.presenca_total) || (aprov + rej);

     sumSobra += sobra;
     sumResto += resto;
     sumPresenca += presenca;
     sumGostaram += aprov;
  });
  
  const producaoEstimada = sumPresenca + Math.round(sumSobra * 2.5); 
  
  const dpcValor = sumPresenca > 0 ? ((sumSobra + sumResto) * 1000) / sumPresenca : 0;
  const ialValor = producaoEstimada > 0 ? (1 - Math.abs(producaoEstimada - sumPresenca) / producaoEstimada) * 100 : 0;
  const troValor = sumPresenca > 0 ? ((sumPresenca - sumGostaram) / sumPresenca) * 100 : 0;

  const muralFeedbacks = (Array.isArray(dadosBIFiltrados) ? dadosBIFiltrados : []).flatMap(d => {
    if (!d) return [];
    let obsList = [];
    if (Array.isArray(d.observacoes)) {
      obsList = d.observacoes;
    } else if (typeof d.observacoes === 'string' && d.observacoes.trim()) {
      obsList = d.observacoes.includes(' | ') ? d.observacoes.split(' | ') : [d.observacoes];
    }
      
    const dataRef = String(d.dataGrafico || '').split(' ')[0] || '';
    const nomeTurno = (mapNomesTurnos && mapNomesTurnos[d.turno]) || d.turno || '';
    const rawData = d.data || '';
    const rawTurno = d.turno || '';
    
    const detalhesArr = [
      d.arroz,
      d.feijao,
      d.guarnicao,
      d.opcao_vegetal,
      d.molho_salada,
      d.sobremesa,
      d.fruta,
      d.bebida
    ].filter(Boolean);

    return obsList
      .filter(obs => typeof obs === 'string' && obs.trim() !== '')
      .map((obs, idx) => {
        const textoLimpo = String(obs).trim();
        return {
          id: `${rawData}_${rawTurno}_${idx}_${textoLimpo.substring(0, 32)}`,
          data: dataRef, 
          dataCompleta: rawData,
          turno: nomeTurno,
          turnoCod: rawTurno,
          prato: d.prato_principal || d.lanche_padrao || 'Não informado',
          detalhes: detalhesArr,
          texto: textoLimpo
        };
      });
  });

  return {
    dadosBIFiltrados,
    dadosBIDiarios,
    listaPratosGlobal,
    listaItensComparativo,
    resumoCategoriasBI,
    topAceitacao,
    topSujo,
    topLimpo,
    radarData,
    statsA,
    statsB,
    metricas: {
      sumSobra,
      sumResto,
      sumPresenca,
      sumGostaram,
      producaoEstimada,
      dpcValor,
      ialValor,
      troValor
    },
    muralFeedbacks
  };
}
