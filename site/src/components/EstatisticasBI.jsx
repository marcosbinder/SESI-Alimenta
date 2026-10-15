import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  BarChart3, Search, Calendar, Download, Scale, Sparkles, CheckCircle2, Check, Clock, Inbox, Utensils, 
  Trophy, ArrowUpRight, ArrowDownRight, Layers, SlidersHorizontal, TrendingUp, ThumbsUp, Trash2, Award, UtensilsCrossed,
  PieChart, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { getServerTime } from '../utils/time';
import { processarAnalyticsBI, LISTA_CATEGORIAS_COMPARATIVO, CATEGORIAS_ALIMENTOS_MAP } from '../utils/analytics';

const InfoTooltip = ({ texto }) => (
  <div className="relative flex items-center group cursor-pointer ml-2 inline-block" tabIndex="0">
    <div className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-500 flex items-center justify-center text-[10px] font-black group-hover:bg-primaria group-hover:text-white transition-colors">
      i
    </div>
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-56 bg-zinc-800 text-white text-[11px] p-3 rounded-xl shadow-2xl text-center z-50 pointer-events-none font-medium leading-relaxed">
      {texto}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800"></div>
    </div>
  </div>
);

const mapNomesTurnos = { 'LM': 'Lanche da Manhã', 'A': 'Almoço', 'LT': 'Lanche da Tarde' };

const formatarDataISO = (d) => {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const formatarDataSimples = (dataString) => {
  if (!dataString || typeof dataString !== 'string') return '';
  const partes = dataString.split('-');
  if (partes.length < 3) return dataString;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}`;
};

export default function EstatisticasBI({ readOnly = false }) {
  const [historicoBI, setHistoricoBI] = useState([]);
  const [parametros, setParametros] = useState({
    resto_per_capita_atencao_g: 25,
    resto_per_capita_critico_g: 45,
    sobra_limpa_atencao_kg: 5,
    sobra_limpa_critico_kg: 10,
    taxa_rejeicao_alerta_percentual: 30
  });
  const [lanchesCadastrados, setLanchesCadastrados] = useState([]);

  // Visão Padrão: 'Geral' (Consolidado Diário) para resolver o problema de períodos longos e barras finas
  const [filtroTurnoBI, setFiltroTurnoBI] = useState('Geral'); 
  const [atalhoAtivo, setAtalhoAtivo] = useState('15d');

  const [biDataInicio, setBiDataInicio] = useState(() => {
    const d = getServerTime();
    d.setDate(d.getDate() - 15);
    return formatarDataISO(d);
  });
  const [biDataFim, setBiDataFim] = useState(() => {
    return formatarDataISO(getServerTime());
  });

  const [lancheA, setLancheA] = useState('');
  const [lancheB, setLancheB] = useState('');
  const [categoriaA, setCategoriaA] = useState('todas');
  const [categoriaB, setCategoriaB] = useState('todas');
  const [catalogoCompleto, setCatalogoCompleto] = useState([]);
  const [buscaFeedback, setBuscaFeedback] = useState('');
  const [abaFeedback, setAbaFeedback] = useState('todos'); // 'todos' | 'novos' | 'lidos'
  const [abaComparativo, setAbaComparativo] = useState('confronto'); // 'confronto' | 'matriz' | 'macro'
  const [buscaMatriz, setBuscaMatriz] = useState('');
  const [categoriaMatriz, setCategoriaMatriz] = useState('todas');
  const [escalaPesoRadar, setEscalaPesoRadar] = useState(5); // 3 | 5 | 10 | 'auto'

  // Persistência de feedbacks lidos por usuário logado
  const usuarioAtual = typeof window !== 'undefined' ? (localStorage.getItem('usuario') || 'usuario_padrao') : 'usuario_padrao';

  const [feedbacksLidos, setFeedbacksLidos] = useState(() => {
    try {
      const u = localStorage.getItem('usuario') || 'usuario_padrao';
      const salvos = localStorage.getItem(`sesi_feedbacks_lidos_${u}`);
      return salvos ? JSON.parse(salvos) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    api('/api/painel-cozinha/bi').then(r => { 
      if (r.sucesso) {
        const dados = r.dados || [];
        setHistoricoBI(dados);
        const pratosReais = [...new Set(
          dados
            .map(d => (d.prato_principal || d.lanche_padrao)?.trim())
            .filter(nome => Boolean(nome) && nome !== 'Não Informado' && nome !== 'N/A')
        )].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        setLanchesCadastrados(pratosReais);
      }
    });
    api('/api/catalogo-alimentos').then(r => {
      if (r.sucesso && Array.isArray(r.dados)) {
        setCatalogoCompleto(r.dados);
      }
    }).catch(() => {});
    api('/api/parametros').then(r => {
      if (r.sucesso && r.dados?.length > 0) {
        const mapParametros = {};
        r.dados.forEach(p => mapParametros[p.chave] = p.valor);
        setParametros(prev => ({ ...prev, ...mapParametros }));
      }
    });
    api('/api/painel-cozinha/feedbacks-lidos').then(r => {
      if (r.sucesso && Array.isArray(r.lidos)) {
        setFeedbacksLidos(r.lidos);
        try {
          localStorage.setItem(`sesi_feedbacks_lidos_${usuarioAtual}`, JSON.stringify(r.lidos));
        } catch {}
      }
    }).catch(() => {});
  }, [usuarioAtual]);

  // Alternar status de lido/novo para um feedback específico (com persistência no banco e cache local)
  const alternarLido = (id) => {
    setFeedbacksLidos(prev => {
      const novoArray = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem(`sesi_feedbacks_lidos_${usuarioAtual}`, JSON.stringify(novoArray));
      } catch {}
      return novoArray;
    });

    api('/api/painel-cozinha/feedbacks-lidos/alternar', {
      method: 'POST',
      body: JSON.stringify({ feedbackId: id })
    }).catch(() => {});
  };

  // Marcar todos os feedbacks visíveis como lidos (com persistência no banco e cache local)
  const marcarTodosComoLidos = (listaIds) => {
    setFeedbacksLidos(prev => {
      const unificados = Array.from(new Set([...prev, ...listaIds]));
      try {
        localStorage.setItem(`sesi_feedbacks_lidos_${usuarioAtual}`, JSON.stringify(unificados));
      } catch {}
      return unificados;
    });

    api('/api/painel-cozinha/feedbacks-lidos/marcar-todos', {
      method: 'POST',
      body: JSON.stringify({ listaIds })
    }).catch(() => {});
  };

  // Atalhos Rápidos de Seleção de Período (com formatação segura de data)
  const aplicarAtalhoPeriodo = (tipo) => {
    setAtalhoAtivo(tipo);
    const hoje = getServerTime();
    const dataFimStr = formatarDataISO(hoje);

    if (tipo === '7d') {
      const d = new Date(hoje);
      d.setDate(d.getDate() - 7);
      setBiDataInicio(formatarDataISO(d));
      setBiDataFim(dataFimStr);
    } else if (tipo === '15d') {
      const d = new Date(hoje);
      d.setDate(d.getDate() - 15);
      setBiDataInicio(formatarDataISO(d));
      setBiDataFim(dataFimStr);
    } else if (tipo === 'mes_atual') {
      const dInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const dFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      setBiDataInicio(formatarDataISO(dInicio));
      setBiDataFim(formatarDataISO(dFim));
    } else if (tipo === 'mes_anterior') {
      const dInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const dFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      setBiDataInicio(formatarDataISO(dInicio));
      setBiDataFim(formatarDataISO(dFim));
    } else if (tipo === 'tudo') {
      setBiDataInicio('2025-01-01');
      setBiDataFim(dataFimStr);
    }
  };

  const analyticsResult = useMemo(() => {
    return processarAnalyticsBI(
      historicoBI, 
      { filtroTurnoBI, biDataInicio, biDataFim }, 
      { lancheA, lancheB, catalogoAlimentos: catalogoCompleto, formatarDataSimples, mapNomesTurnos }
    );
  }, [historicoBI, filtroTurnoBI, biDataInicio, biDataFim, lancheA, lancheB, catalogoCompleto]);

  const {
    dadosBIFiltrados = [],
    dadosBIDiarios = [],
    topAceitacao = [],
    topSujo = [],
    topLimpo = [],
    radarData = [],
    statsA = {},
    statsB = {},
    listaItensComparativo = [],
    resumoCategoriasBI = [],
    metricas = {},
    muralFeedbacks = []
  } = analyticsResult || {};

  // Auto-selecionar itens padrão no comparativo caso ainda estejam vazios
  useEffect(() => {
    if (listaItensComparativo.length >= 2 && !lancheA && !lancheB) {
      setLancheA(listaItensComparativo[0]?.nome || '');
      setLancheB(listaItensComparativo[1]?.nome || '');
    }
  }, [listaItensComparativo, lancheA, lancheB]);

  const itensFiltradosA = useMemo(() => {
    if (categoriaA === 'todas') return listaItensComparativo;
    return listaItensComparativo.filter(i => i.categoria === categoriaA);
  }, [listaItensComparativo, categoriaA]);

  const itensFiltradosB = useMemo(() => {
    if (categoriaB === 'todas') return listaItensComparativo;
    return listaItensComparativo.filter(i => i.categoria === categoriaB);
  }, [listaItensComparativo, categoriaB]);

  // Sincronização segura entre categorias e itens selecionados
  const handleCategoriaAChange = (novaCat) => {
    setCategoriaA(novaCat);
    const lista = novaCat === 'todas' 
      ? listaItensComparativo 
      : listaItensComparativo.filter(i => i.categoria === novaCat);
    if (!lista.some(i => i.nome === lancheA)) {
      setLancheA(lista[0]?.nome || '');
    }
  };

  const handleCategoriaBChange = (novaCat) => {
    setCategoriaB(novaCat);
    const lista = novaCat === 'todas' 
      ? listaItensComparativo 
      : listaItensComparativo.filter(i => i.categoria === novaCat);
    if (!lista.some(i => i.nome === lancheB)) {
      const outroItem = lista.find(i => i.nome !== lancheA);
      setLancheB(outroItem ? outroItem.nome : (lista[0]?.nome || ''));
    }
  };

  const handleIgualarCategorias = () => {
    setCategoriaB(categoriaA);
    const lista = categoriaA === 'todas'
      ? listaItensComparativo
      : listaItensComparativo.filter(i => i.categoria === categoriaA);
    if (!lista.some(i => i.nome === lancheB) || lancheB === lancheA) {
      const outroItem = lista.find(i => i.nome !== lancheA);
      setLancheB(outroItem ? outroItem.nome : (lista[0]?.nome || ''));
    }
  };

  const selecionarParaConfronto = (nomeItem, categoriaItem, slot = 'A') => {
    const catValida = LISTA_CATEGORIAS_COMPARATIVO.some(c => c.id === categoriaItem) ? categoriaItem : 'todas';
    if (slot === 'A') {
      setCategoriaA(catValida);
      setLancheA(nomeItem);
    } else {
      setCategoriaB(catValida);
      setLancheB(nomeItem);
    }
  };

  const itensMatrizFiltrados = useMemo(() => {
    let lista = listaItensComparativo;
    if (categoriaMatriz !== 'todas') {
      lista = lista.filter(i => i.categoria === categoriaMatriz);
    }
    if (buscaMatriz.trim()) {
      const q = buscaMatriz.toLowerCase();
      lista = lista.filter(i => i.nome.toLowerCase().includes(q) || (i.categoriaLabel || '').toLowerCase().includes(q));
    }
    return lista;
  }, [listaItensComparativo, categoriaMatriz, buscaMatriz]);

  const { categoriasAtivas, categoriasSemHistorico } = useMemo(() => {
    const ativas = (resumoCategoriasBI || []).filter(c => c.totalItens > 0 || c.totalServido > 0);
    const semDados = (resumoCategoriasBI || []).filter(c => c.totalItens === 0 && c.totalServido === 0);
    return { categoriasAtivas: ativas, categoriasSemHistorico: semDados };
  }, [resumoCategoriasBI]);

  const maxRefKg = useMemo(() => {
    if (escalaPesoRadar === 'auto') {
      const maiorValor = Math.max(
        Number(statsA?.mediaSujo || 0),
        Number(statsB?.mediaSujo || 0),
        Number(statsA?.mediaLimpo || 0),
        Number(statsB?.mediaLimpo || 0)
      );
      return Math.max(2, Math.ceil(maiorValor));
    }
    return Number(escalaPesoRadar) || 5;
  }, [escalaPesoRadar, statsA, statsB]);

  const dadosRadarGrafico = useMemo(() => {
    const normKg = (val) => {
      const n = Number(val) || 0;
      if (maxRefKg <= 0) return 0;
      return Math.min(100, Math.max(0, Math.round((n / maxRefKg) * 100)));
    };

    return [
      {
        subject: 'Aprovação (%)',
        eixo: 'Aprovação dos Alunos',
        escalaRotulo: '0 a 100%',
        A: Math.min(100, Math.max(0, Number(statsA?.mediaAprovacao) || 0)),
        B: Math.min(100, Math.max(0, Number(statsB?.mediaAprovacao) || 0)),
        valorRealA: statsA?.totalAvaliacoes > 0 ? `${Number(statsA?.mediaAprovacao) || 0}%` : 'Sem votos',
        valorRealB: statsB?.totalAvaliacoes > 0 ? `${Number(statsB?.mediaAprovacao) || 0}%` : 'Sem votos',
        unidade: '%'
      },
      {
        subject: `Resto no Prato (0-${maxRefKg} kg)`,
        eixo: 'Resto no Prato',
        escalaRotulo: `0 a ${maxRefKg} kg`,
        A: normKg(statsA?.mediaSujo),
        B: normKg(statsB?.mediaSujo),
        valorRealA: statsA?.ocorrencias > 0 ? `${Number(statsA?.mediaSujo || 0).toFixed(1)} kg` : '--',
        valorRealB: statsB?.ocorrencias > 0 ? `${Number(statsB?.mediaSujo || 0).toFixed(1)} kg` : '--',
        unidade: 'kg'
      },
      {
        subject: `Sobra na Cozinha (0-${maxRefKg} kg)`,
        eixo: 'Sobra na Cozinha',
        escalaRotulo: `0 a ${maxRefKg} kg`,
        A: normKg(statsA?.mediaLimpo),
        B: normKg(statsB?.mediaLimpo),
        valorRealA: statsA?.ocorrencias > 0 ? `${Number(statsA?.mediaLimpo || 0).toFixed(1)} kg` : '--',
        valorRealB: statsB?.ocorrencias > 0 ? `${Number(statsB?.mediaLimpo || 0).toFixed(1)} kg` : '--',
        unidade: 'kg'
      }
    ];
  }, [statsA, statsB, maxRefKg]);

  // Se estiver em 'Geral', usa o consolidado diário; caso contrário, usa os dados filtrados
  const dadosGrafico = useMemo(() => {
    if (filtroTurnoBI === 'Geral') {
      return dadosBIDiarios;
    }
    return dadosBIFiltrados;
  }, [filtroTurnoBI, dadosBIDiarios, dadosBIFiltrados]);

  // Linha de aprovação contínua (conecta perfeitamente todos os dias/turnos com avaliações)
  const dadosLinhaAprovacao = useMemo(() => {
    return dadosGrafico.filter(d => d.taxaAprovacao !== null && d.taxaAprovacao !== undefined);
  }, [dadosGrafico]);

  // Chave estável para forçar remontagem limpa do SVG no Recharts quando a série temporal mudar
  const chaveLinhaAprovacao = useMemo(() => {
    return dadosLinhaAprovacao.map(d => `${d.dataGrafico}_${d.taxaAprovacao}`).join('|');
  }, [dadosLinhaAprovacao]);

  const { 
    dpcValor = 0, 
    ialValor = 0, 
    troValor = 0,
    sumSobra = 0,
    sumResto = 0,
    sumPresenca = 0
  } = metricas || {};

  // Contagem de feedbacks lidos e novos
  const totalNovos = useMemo(() => {
    return muralFeedbacks.filter(fb => !feedbacksLidos.includes(fb.id)).length;
  }, [muralFeedbacks, feedbacksLidos]);

  const totalLidos = useMemo(() => {
    return muralFeedbacks.filter(fb => feedbacksLidos.includes(fb.id)).length;
  }, [muralFeedbacks, feedbacksLidos]);

  const feedbacksFiltrados = useMemo(() => {
    let lista = muralFeedbacks;
    if (abaFeedback === 'novos') {
      lista = lista.filter(fb => !feedbacksLidos.includes(fb.id));
    } else if (abaFeedback === 'lidos') {
      lista = lista.filter(fb => feedbacksLidos.includes(fb.id));
    }

    if (!buscaFeedback.trim()) return lista;
    const t = buscaFeedback.toLowerCase();
    return lista.filter(fb => 
      fb.texto.toLowerCase().includes(t) || 
      fb.prato.toLowerCase().includes(t) || 
      fb.turno.toLowerCase().includes(t)
    );
  }, [muralFeedbacks, buscaFeedback, abaFeedback, feedbacksLidos]);

  // Exportar dados filtrados do B.I. para CSV (incluindo decomposição completa do cardápio)
  const exportarCSV_BI = () => {
    if (!dadosGrafico || dadosGrafico.length === 0) return;
    const cabecalho = "Data,Turno_ou_Visao,Prato_Principal,Arroz,Feijao,Guarnicao,Salada_Vegetal,Molho,Fruta,Sobremesa,Bebida,Dieta,Presenca_Total,Sobra_Cuba_Kg,Resto_Prato_Kg,Aprovacao_Qtd,Rejeicao_Qtd,Taxa_Aprovacao_Pct\n";
    const escapeCsv = (str) => `"${(str || '').replace(/"/g, '""')}"`;
    const linhas = dadosGrafico.map(d => 
      `${escapeCsv(d.data)},${escapeCsv(d.turno || 'Dia Completo')},${escapeCsv(d.prato_principal || d.lanche_padrao)},${escapeCsv(d.arroz)},${escapeCsv(d.feijao)},${escapeCsv(d.guarnicao)},${escapeCsv(d.opcao_vegetal)},${escapeCsv(d.molho_salada)},${escapeCsv(d.fruta)},${escapeCsv(d.sobremesa)},${escapeCsv(d.bebida)},${escapeCsv(d.prato_principal_dieta || d.lanche_dieta)},${d.presenca_total || 0},${d.lixo_limpo || 0},${d.lixo_sujo || 0},${d.aprovacao || 0},${d.rejeicao || 0},${d.taxaAprovacao || 0}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SESI_BI_Cardapio_Export_${biDataInicio}_a_${biDataFim}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  const totalDesperdicioKg = (Number(sumSobra) || 0) + (Number(sumResto) || 0);
  const pctSobraCuba = totalDesperdicioKg > 0 ? ((sumSobra / totalDesperdicioKg) * 100).toFixed(0) : 0;
  const pctRestoPrato = totalDesperdicioKg > 0 ? ((sumResto / totalDesperdicioKg) * 100).toFixed(0) : 0;

  const getTituloVisao = () => {
    if (filtroTurnoBI === 'Geral') return 'Consolidado Diário (Dia Completo)';
    if (filtroTurnoBI === 'TodosDetalhados') return 'Detalhamento por Turno (Todos)';
    return `Turno: ${mapNomesTurnos[filtroTurnoBI] || filtroTurnoBI}`;
  };

  // Tooltip customizado rico para o gráfico de desperdício
  const CustomTooltipDesperdicio = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataObj = payload[0]?.payload || {};
      const sobraKg = Number(dataObj.lixo_limpo || 0).toFixed(1);
      const restoKg = Number(dataObj.lixo_sujo || 0).toFixed(1);
      const totalKg = (Number(sobraKg) + Number(restoKg)).toFixed(1);
      
      return (
        <div className="bg-zinc-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-zinc-800 text-xs min-w-[210px]">
          <div className="flex items-center justify-between border-b border-zinc-700/60 pb-2 mb-2">
            <span className="font-black text-amber-400 text-sm">{label}</span>
            <span className="text-[9px] font-bold text-zinc-300 uppercase bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
              {dataObj.turno ? (mapNomesTurnos[dataObj.turno] || dataObj.turno) : 'Dia Completo'}
            </span>
          </div>
          {dataObj.lanche_padrao && (
            <p className="text-[11px] font-bold text-zinc-300 mb-2 truncate max-w-[220px]" title={dataObj.lanche_padrao}>
              Prato: {dataObj.lanche_padrao}
            </p>
          )}
          <div className="space-y-1.5 text-zinc-200">
            <div className="flex justify-between items-center text-orange-400 font-bold">
              <span>Sobra (Cuba / Panela):</span>
              <span>{sobraKg} kg</span>
            </div>
            <div className="flex justify-between items-center text-red-400 font-bold">
              <span>Resto (Prato do Aluno):</span>
              <span>{restoKg} kg</span>
            </div>
            <div className="pt-1.5 border-t border-zinc-700/60 flex justify-between items-center font-black text-white">
              <span>Desperdício Total:</span>
              <span>{totalKg} kg</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Tooltip customizado rico para o gráfico de aprovação
  const CustomTooltipAprovacao = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataObj = payload[0]?.payload || {};
      const taxa = dataObj.taxaAprovacao;
      return (
        <div className="bg-zinc-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-zinc-800 text-xs min-w-[210px]">
          <div className="flex items-center justify-between border-b border-zinc-700/60 pb-2 mb-2">
            <span className="font-black text-emerald-400 text-sm">{label}</span>
            <span className="text-[9px] font-bold text-zinc-300 uppercase bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
              {dataObj.turno ? (mapNomesTurnos[dataObj.turno] || dataObj.turno) : 'Dia Completo'}
            </span>
          </div>
          {dataObj.lanche_padrao && (
            <p className="text-[11px] font-bold text-zinc-300 mb-2 truncate max-w-[220px]" title={dataObj.lanche_padrao}>
              Prato: {dataObj.lanche_padrao}
            </p>
          )}
          {taxa !== null && taxa !== undefined ? (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-emerald-400 font-black text-sm">
                <span>Taxa de Aprovação:</span>
                <span>{taxa}%</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
                <span>Gostaram: {dataObj.aprovacao || 0}</span>
                <span>Rejeitaram: {dataObj.rejeicao || 0}</span>
              </div>
            </div>
          ) : (
            <p className="text-zinc-400 italic text-[11px]">Sem avaliações registradas</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm flex flex-col" id="area-graficos-bi">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 border-b border-zinc-100 pb-6 gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-2xl font-black uppercase tracking-wider text-zinc-800 shrink-0">
                Painel de Analytics (B.I.)
              </h3>
              <span className="bg-orange-100 text-primaria font-black text-[10px] uppercase px-2.5 py-1 rounded-full border border-orange-200 shrink-0 whitespace-nowrap shadow-2xs">
                Inteligência Operacional
              </span>
            </div>
            <p className="text-zinc-500 font-medium text-xs mt-1">
              Auditoria de desperdício, aceitação do cardápio escolar e tendências de consumo.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2.5 w-full xl:w-auto">
            {/* Atalhos Rápidos de Período */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: '7d', label: '7 Dias' },
                { id: '15d', label: '15 Dias' },
                { id: 'mes_atual', label: 'Este Mês' },
                { id: 'mes_anterior', label: 'Mês Anterior' },
                { id: 'tudo', label: 'Tudo' }
              ].map(at => {
                const ativo = atalhoAtivo === at.id;
                return (
                  <button 
                    key={at.id}
                    onClick={() => aplicarAtalhoPeriodo(at.id)} 
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                      ativo 
                        ? 'bg-primaria text-white shadow-xs font-black' 
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {at.label}
                  </button>
                );
              })}
            </div>

            {/* Barra de Filtros com Seleção Unificada de Visão/Turno */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto bg-zinc-50 p-2.5 rounded-2xl border border-zinc-200 shadow-inner">
              
              {/* Seletor Unificado de Visão / Turno com Explicação */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <select 
                  value={filtroTurnoBI} 
                  onChange={e => setFiltroTurnoBI(e.target.value)} 
                  className="bg-white border border-zinc-200 text-zinc-800 text-xs font-black rounded-xl px-3.5 py-2 outline-none shadow-sm focus:border-primaria w-full sm:w-auto cursor-pointer"
                >
                  <option value="Geral">Dia Completo (Consolidado)</option>
                  <option value="LM">Lanche da Manhã (LM)</option>
                  <option value="A">Almoço (A)</option>
                  <option value="LT">Lanche da Tarde (LT)</option>
                  <option value="TodosDetalhados">Detalhe por Turno (Todos)</option>
                </select>

                <InfoTooltip texto="Escolha 'Dia Completo' para somar todas as refeições de cada dia em uma única barra sólida (ideal para períodos longos). Ou selecione um turno específico (Manhã, Almoço, Tarde) para auditar um cardápio isoladamente." />
              </div>

              {/* Date Pickers */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input 
                  type="date" 
                  value={biDataInicio} 
                  onChange={e => { setBiDataInicio(e.target.value); setAtalhoAtivo('custom'); }} 
                  className="bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 outline-none px-3 py-2 w-full shadow-sm focus:border-primaria" 
                />
                <span className="text-zinc-400 font-black">-</span>
                <input 
                  type="date" 
                  value={biDataFim} 
                  onChange={e => { setBiDataFim(e.target.value); setAtalhoAtivo('custom'); }} 
                  className="bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 outline-none px-3 py-2 w-full shadow-sm focus:border-primaria" 
                />
              </div>

              {dadosGrafico.length > 0 && (
                <button onClick={exportarCSV_BI} title="Exportar dados filtrados em CSV" className="p-2 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-600 transition-colors shrink-0 shadow-sm cursor-pointer">
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {(!dadosGrafico || dadosGrafico.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-400 font-bold text-sm min-h-[300px]">
            <BarChart3 className="w-12 h-12 text-zinc-300 mb-3" />
            Dados insuficientes no período para gerar o gráfico.
          </div>
        ) : (
          <div className="space-y-8 flex-1 overflow-y-auto pr-2">
            {/* Gráfico 1: Desperdício Físico */}
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 shadow-inner">
              <h4 className="text-[11px] font-black text-zinc-600 uppercase mb-3 text-center tracking-wider flex items-center justify-center gap-2">
                <span>Desperdício Físico (KG)</span>
                <span className="text-zinc-400 font-normal">| {getTituloVisao()}</span>
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={dadosGrafico} margin={{ top: 10, right: 20, left: -20, bottom: 5 }} barGap={3} maxBarSize={36}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis 
                      dataKey="dataGrafico" 
                      padding={{ left: 25, right: 25 }} 
                      tick={{fontSize: 9, fill: '#71717a', fontWeight: 'bold'}} 
                      axisLine={false} 
                      tickLine={false} 
                      interval="preserveStartEnd" 
                      minTickGap={14} 
                    />
                    <YAxis tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                    <RechartsTooltip content={<CustomTooltipDesperdicio />} cursor={{fill: '#f4f4f5'}} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '6px', color: '#52525b' }} />
                    <Bar dataKey="lixo_limpo" name="Sobra (Cuba / Panela)" fill="#f97316" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="lixo_sujo" name="Resto (Prato do Aluno)" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Taxa de Aprovação */}
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 shadow-inner">
              <h4 className="text-[11px] font-black text-zinc-600 uppercase mb-3 text-center tracking-wider flex items-center justify-center gap-1.5">
                <span>Taxa de Aprovação do Cardápio (%)</span>
                <InfoTooltip texto="Percentual de aceitação calculado a partir das votações dos alunos e docentes. A linha conecta continuamente todos os dias avaliados no período filtrado." />
              </h4>
              {dadosLinhaAprovacao.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-zinc-400 font-bold text-xs">
                  Sem avaliações registradas no período selecionado.
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart key={chaveLinhaAprovacao} data={dadosLinhaAprovacao} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis 
                        dataKey="dataGrafico" 
                        padding={{ left: 25, right: 25 }} 
                        tick={{fontSize: 9, fill: '#71717a', fontWeight: 'bold'}} 
                        axisLine={false} 
                        tickLine={false} 
                        interval="preserveStartEnd" 
                        minTickGap={14} 
                      />
                      <YAxis 
                        domain={[-5, 105]} 
                        ticks={[0, 25, 50, 75, 100]} 
                        tick={{fontSize: 10, fill: '#71717a', fontWeight: 'bold'}} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <RechartsTooltip content={<CustomTooltipAprovacao />} />
                      <Line 
                        id="taxa-aprovacao-bi"
                        type="linear" 
                        dataKey="taxaAprovacao" 
                        name="Aprovação (%)" 
                        stroke="#22c55e" 
                        strokeWidth={3.5} 
                        connectNulls={true}
                        isAnimationActive={false}
                        dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUADRO DE INDICADORES EXECUTIVOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DPC */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm relative group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black uppercase text-zinc-500 flex items-center">
                DPC - Desperdício Per Capita <InfoTooltip texto="DPC = (Sobra(g) + Resto(g)) / Alunos Presentes. Exibe a gramatura real descartada por aluno alimentado." />
              </h4>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${Number(dpcValor || 0) > (parametros?.resto_per_capita_critico_g ?? 45) ? 'bg-red-100 text-red-700' : Number(dpcValor || 0) > (parametros?.resto_per_capita_atencao_g ?? 25) ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
                {Number(dpcValor || 0) > (parametros?.resto_per_capita_critico_g ?? 45) ? 'Crítico' : Number(dpcValor || 0) > (parametros?.resto_per_capita_atencao_g ?? 25) ? 'Atenção' : 'Excelente'}
              </span>
            </div>
            <span className={`text-4xl font-black ${Number(dpcValor || 0) > (parametros?.resto_per_capita_critico_g ?? 45) ? 'text-red-600' : Number(dpcValor || 0) > (parametros?.resto_per_capita_atencao_g ?? 25) ? 'text-amber-600' : 'text-green-600'}`}>
              {Number(dpcValor || 0).toFixed(1)}g
            </span>
          </div>
          <p className="text-[9px] text-zinc-400 font-bold mt-3 uppercase">Meta máxima: {parametros?.resto_per_capita_critico_g ?? 45}g / aluno</p>
        </div>

        {/* IAL */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm relative group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black uppercase text-zinc-500 flex items-center">
                IAL - Acerto Logístico <InfoTooltip texto="IAL = (1 - |Produzido - Consumido| / Produzido) * 100. Mede a precisão de preparo da cozinha contra a demanda real." />
              </h4>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${Number(ialValor || 0) >= 90 ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-600'}`}>
                {Number(ialValor || 0) >= 90 ? 'Alta Precisão' : 'Em Calibração'}
              </span>
            </div>
            <span className="text-4xl font-black text-blue-600">{Number(ialValor || 0).toFixed(1)}%</span>
          </div>
          <p className="text-[9px] text-zinc-400 font-bold mt-3 uppercase">Acurácia contra superprodução</p>
        </div>

        {/* TRO */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm relative group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black uppercase text-zinc-500 flex items-center">
                TRO - Rejeição Oculta <InfoTooltip texto="TRO = ((Presentes - Satisfeitos) / Presentes) * 100. Revela rejeição em sala antes do prato voltar ao lixo." />
              </h4>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${Number(troValor || 0) > (parametros?.taxa_rejeicao_alerta_percentual ?? 30) ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                {Number(troValor || 0) > (parametros?.taxa_rejeicao_alerta_percentual ?? 30) ? 'Alerta' : 'Controlada'}
              </span>
            </div>
            <span className={`text-4xl font-black ${Number(troValor || 0) > (parametros?.taxa_rejeicao_alerta_percentual ?? 30) ? 'text-orange-600' : 'text-purple-600'}`}>
              {Number(troValor || 0).toFixed(1)}%
            </span>
          </div>
          <p className="text-[9px] text-zinc-400 font-bold mt-3 uppercase">Insatisfação relatada em sala</p>
        </div>

        {/* BALANÇO DE MASSA */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm relative group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black uppercase text-zinc-500 flex items-center">
                Balanço de Sobras <InfoTooltip texto="Divisão percentual entre o que sobrou na panela (Sobra Limpa) vs o que voltou no prato do aluno (Resto Sujo)." />
              </h4>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                {totalDesperdicioKg.toFixed(1)} kg total
              </span>
            </div>
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between text-xs font-bold text-zinc-700">
                <span>Cuba: {sumSobra.toFixed(1)}kg ({pctSobraCuba}%)</span>
                <span>Prato: {sumResto.toFixed(1)}kg ({pctRestoPrato}%)</span>
              </div>
              <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${pctSobraCuba}%` }} className="bg-orange-500 h-full transition-all duration-500" title={`Sobra Cuba: ${pctSobraCuba}%`}></div>
                <div style={{ width: `${pctRestoPrato}%` }} className="bg-red-500 h-full transition-all duration-500" title={`Resto Prato: ${pctRestoPrato}%`}></div>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-zinc-400 font-bold mt-3 uppercase">{sumPresenca.toLocaleString('pt-BR')} refeições registradas</p>
        </div>
      </div>

      {/* MURAL DE FEEDBACKS COM MARCAÇÃO DE NOVO/LIDO POR USUÁRIO */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm flex flex-col">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-zinc-100 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-zinc-800 flex items-center gap-2">
                Mural de Feedbacks dos Professores
                <InfoTooltip texto="Comentários e sugestões de melhoria enviados pelos professores durante o registro de chamada em sala. Cada usuário pode marcar individualmente os itens como lidos." />
              </h3>
              {totalNovos > 0 && (
                <span className="bg-orange-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-xs whitespace-nowrap shrink-0 inline-flex items-center justify-center leading-none">
                  {totalNovos} Novo{totalNovos > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-zinc-500 font-medium text-xs mt-1">
              Opiniões diretas da sala de aula sobre a aceitação e qualidade das refeições.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Abas Todos / Novos / Lidos */}
            <div className="flex bg-zinc-100 p-1 rounded-xl w-full sm:w-auto">
              <button 
                onClick={() => setAbaFeedback('todos')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  abaFeedback === 'todos' ? 'bg-white text-zinc-800 shadow-xs' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Todos ({muralFeedbacks.length})
              </button>
              <button 
                onClick={() => setAbaFeedback('novos')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  abaFeedback === 'novos' ? 'bg-orange-500 text-white shadow-xs font-black' : 'text-orange-600 hover:text-orange-800'
                }`}
              >
                Novos ({totalNovos})
              </button>
              <button 
                onClick={() => setAbaFeedback('lidos')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  abaFeedback === 'lidos' ? 'bg-white text-zinc-800 shadow-xs' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Lidos ({totalLidos})
              </button>
            </div>

            {/* Campo de Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={buscaFeedback} 
                onChange={e => setBuscaFeedback(e.target.value)} 
                placeholder="Buscar por prato ou texto..." 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-zinc-700 outline-none focus:border-primaria transition-colors shadow-inner"
              />
            </div>

            {/* Ação em Massa: Marcar Todos Visíveis como Lidos */}
            {feedbacksFiltrados.some(fb => !feedbacksLidos.includes(fb.id)) && (
              <button 
                onClick={() => marcarTodosComoLidos(feedbacksFiltrados.map(f => f.id))}
                className="text-[10px] font-black uppercase tracking-wider bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-2 rounded-xl transition-all border border-zinc-200 shrink-0 cursor-pointer flex items-center gap-1"
                title="Marcar todos os comentários listados como lidos"
              >
                <Check className="w-3 h-3 text-emerald-600" /> Marcar Visíveis como Lidos
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[420px] overflow-y-auto pr-2">
          {(!feedbacksFiltrados || feedbacksFiltrados.length === 0) ? (
            <div className="col-span-full text-center py-12 text-zinc-400 font-bold text-sm flex flex-col items-center justify-center">
              <Inbox className="w-12 h-12 text-zinc-300 mb-3" />
              {buscaFeedback 
                ? 'Nenhum comentário corresponde aos termos pesquisados.' 
                : abaFeedback === 'novos' 
                  ? 'Nenhum feedback novo pendente de leitura! Todos estão em dia.' 
                  : abaFeedback === 'lidos' 
                    ? 'Nenhum feedback marcado como lido ainda.' 
                    : 'Nenhum comentário registrado no período filtrado.'}
            </div>
          ) : (
            feedbacksFiltrados.map((fb) => {
              const isLido = feedbacksLidos.includes(fb.id);
              return (
                <div 
                  key={fb.id} 
                  className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isLido 
                      ? 'bg-zinc-50/60 border-zinc-200/80 opacity-80 hover:opacity-100' 
                      : 'bg-white border-orange-200 shadow-sm hover:shadow-md ring-1 ring-orange-500/20'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {fb?.data} • {fb?.turno}
                      </span>
                      {!isLido ? (
                        <span className="inline-flex items-center gap-1 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                          <Sparkles className="w-2.5 h-2.5" /> Novo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-400">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Lido
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-primaria mb-1 truncate" title={fb?.prato}>{fb?.prato}</p>
                    {Array.isArray(fb?.detalhes) && fb.detalhes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {fb.detalhes.map((det, dIdx) => (
                          <span key={dIdx} className="text-[10px] bg-zinc-100 text-zinc-700 font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-zinc-200/60">
                            <span className="w-1 h-1 rounded-full bg-primaria/70"></span>
                            {det}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className={`text-sm font-medium italic leading-relaxed ${isLido ? 'text-zinc-600' : 'text-zinc-800'}`}>
                      "{fb?.texto}"
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100/80 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-bold">Feedback Docente</span>
                    <button 
                      onClick={() => alternarLido(fb.id)} 
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        isLido 
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' 
                          : 'bg-primaria hover:bg-orange-600 text-white shadow-xs'
                      }`}
                    >
                      {isLido ? 'Marcar como Novo' : <><Check className="w-3 h-3"/> Marcar como Lido</>}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>



      {/* RANKINGS DE CARDÁPIO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col">
          <h4 className="text-xs font-black text-green-600 uppercase mb-4 flex items-center tracking-widest border-b pb-3">Top 5 Aceitação <InfoTooltip texto="Pratos com as maiores médias percentuais de aprovação na linha do tempo filtrada." /></h4>
          <div className="flex-1 space-y-2">
            {(!topAceitacao || topAceitacao.length === 0) ? <p className="text-xs text-zinc-400 italic">Sem dados suficientes.</p> : (Array.isArray(topAceitacao) ? topAceitacao : []).map((p, i) => (
              <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="font-bold text-zinc-700">{i+1}. {p?.nome}</span>
                <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-lg font-black">{Number(p?.mediaAprovacao || 0).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col">
          <h4 className="text-xs font-black text-red-600 uppercase mb-4 flex items-center tracking-widest border-b pb-3">Maiores Índices de Resto (Prato) <InfoTooltip texto="Pratos que geram o maior volume médio de lixo sujo (rejeição no prato do aluno)." /></h4>
          <div className="flex-1 space-y-2">
            {(!topSujo || topSujo.length === 0) ? <p className="text-xs text-zinc-400 italic">Sem dados suficientes.</p> : (Array.isArray(topSujo) ? topSujo : []).map((p, i) => (
              <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-red-50 rounded-xl border border-red-100">
                <span className="font-bold text-red-900">{i+1}. {p?.nome}</span>
                <span className="bg-red-200 text-red-800 px-2.5 py-0.5 rounded-lg font-black">{Number(p?.mediaSujo || 0).toFixed(1)}kg</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col">
          <h4 className="text-xs font-black text-orange-600 uppercase mb-4 flex items-center tracking-widest border-b pb-3">Maiores Índices de Sobra (Panela) <InfoTooltip texto="Pratos com maior sobra limpa média na panela. Considere ajustar a quantidade na ficha técnica." /></h4>
          <div className="flex-1 space-y-2">
            {(!topLimpo || topLimpo.length === 0) ? <p className="text-xs text-zinc-400 italic">Sem dados suficientes.</p> : (Array.isArray(topLimpo) ? topLimpo : []).map((p, i) => (
              <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-orange-50 rounded-xl border border-orange-100">
                <span className="font-bold text-orange-900">{i+1}. {p?.nome}</span>
                <span className="bg-orange-200 text-orange-800 px-2.5 py-0.5 rounded-lg font-black">{Number(p?.mediaLimpo || 0).toFixed(1)}kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COMPARATIVO DE DESEMPENHO EXPANDIDO & B.I. MULTIDIMENSIONAL */}
      {!readOnly && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm flex flex-col gap-8 relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-20px] p-6 opacity-[0.03] select-none pointer-events-none text-zinc-900">
            <BarChart3 className="w-64 h-64" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-2xl font-black text-zinc-800 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-primaria" />
                    Comparativo de Alimentos & Desempenho
                    <InfoTooltip texto="Cruze a aceitação dos alunos, sobras na cozinha e desperdício de prato entre quaisquer itens do cardápio." />
                  </h3>
                </div>
                <p className="text-zinc-500 font-medium text-xs mt-1">
                  Compare a aceitação dos alunos, sobras e desperdício entre pratos, lanches e acompanhamentos do cardápio.
                </p>
              </div>

              {/* Sub-abas do Comparativo */}
              <div className="flex bg-zinc-100 p-1.5 rounded-2xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setAbaComparativo('confronto')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    abaComparativo === 'confronto' ? 'bg-white text-zinc-800 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-primaria" />
                  Comparar 2 Alimentos
                </button>
                <button
                  type="button"
                  onClick={() => setAbaComparativo('matriz')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    abaComparativo === 'matriz' ? 'bg-white text-zinc-800 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Tabela de Alimentos
                </button>
                <button
                  type="button"
                  onClick={() => setAbaComparativo('macro')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    abaComparativo === 'macro' ? 'bg-white text-zinc-800 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5 text-emerald-600" />
                  Resumo por Categoria
                </button>
              </div>
            </div>

            {/* ABA 1: COMPARAR 2 ALIMENTOS */}
            {abaComparativo === 'confronto' && (
              <div className="space-y-6 mt-6">
                {/* Barra integrada de instrução e ação rápida */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 border border-zinc-200/80 px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                    <Sparkles className="w-4 h-4 text-primaria shrink-0" />
                    <span>Selecione dois alimentos abaixo para analisar a aceitação e o desperdício lado a lado.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleIgualarCategorias}
                    disabled={categoriaA === categoriaB && categoriaA !== 'todas'}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                    title="Filtrar ambos os lados na mesma categoria para benchmark direto"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Comparar mesma categoria</span>
                  </button>
                </div>

                {/* SELETORES COM FILTROS DE CATEGORIA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Painel do Item A (Laranja) */}
                  <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-200/80 shadow-xs flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-orange-900 tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span>
                        Primeiro Alimento (Item A)
                      </span>
                      {statsA?.categoriaLabel && (
                        <span className="bg-orange-200/70 text-orange-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {statsA.categoriaLabel}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                          Filtrar Categoria
                        </label>
                        <select
                          value={categoriaA}
                          onChange={e => handleCategoriaAChange(e.target.value)}
                          className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-orange-500 shadow-inner cursor-pointer"
                        >
                          {LISTA_CATEGORIAS_COMPARATIVO.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                          Alimento Selecionado
                        </label>
                        <select
                          value={lancheA}
                          onChange={e => setLancheA(e.target.value)}
                          className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-orange-500 shadow-inner cursor-pointer"
                        >
                          <option value="">Selecione o Item A...</option>
                          {itensFiltradosA.map(item => (
                            <option key={item.nome} value={item.nome}>
                              {item.nome} {categoriaA === 'todas' ? `(${item.categoriaLabel})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Painel do Item B (Azul) */}
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200/80 shadow-xs flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-blue-900 tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                        Segundo Alimento (Item B)
                      </span>
                      {statsB?.categoriaLabel && (
                        <span className="bg-blue-200/70 text-blue-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {statsB.categoriaLabel}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                          Filtrar Categoria
                        </label>
                        <select
                          value={categoriaB}
                          onChange={e => handleCategoriaBChange(e.target.value)}
                          className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 shadow-inner cursor-pointer"
                        >
                          {LISTA_CATEGORIAS_COMPARATIVO.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                          Alimento Selecionado
                        </label>
                        <select
                          value={lancheB}
                          onChange={e => setLancheB(e.target.value)}
                          className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 shadow-inner cursor-pointer"
                        >
                          <option value="">Selecione o Item B...</option>
                          {itensFiltradosB.map(item => (
                            <option key={item.nome} value={item.nome}>
                              {item.nome} {categoriaB === 'todas' ? `(${item.categoriaLabel})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RESULTADOS: CARDS HEAD-TO-HEAD + RADAR */}
                {(!lancheA || !lancheB) ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-zinc-50 rounded-3xl border border-dashed border-zinc-300 text-center relative z-10">
                    <UtensilsCrossed className="w-12 h-12 text-zinc-300 mb-3" />
                    <p className="text-zinc-600 font-bold text-sm">Selecione dois itens nos campos acima para ativar o comparativo.</p>
                    <p className="text-zinc-400 font-medium text-xs mt-1">Você pode comparar opções da mesma categoria (ex: Salada vs Salada) ou cruzar preparações de grupos diferentes.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 relative z-10">
                    {/* CARDS DE CONFRONTO DIRETO (HEAD-TO-HEAD) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* 1. Taxa de Aprovação */}
                      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                              <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                              Aprovação dos Alunos
                            </span>
                            {statsA.totalAvaliacoes > 0 && statsB.totalAvaliacoes > 0 && Number(statsA.mediaAprovacao) !== Number(statsB.mediaAprovacao) && (
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                Number(statsA.mediaAprovacao) > Number(statsB.mediaAprovacao)
                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                              }`}>
                                {Number(statsA.mediaAprovacao) > Number(statsB.mediaAprovacao) ? 'Item A Líder' : 'Item B Líder'}
                              </span>
                            )}
                          </div>

                          <div className="space-y-3 mt-3">
                            <div>
                              <div className="flex justify-between items-center text-xs font-bold text-orange-950 mb-1 gap-2" title={lancheA}>
                                <span className="truncate">{lancheA}</span>
                                <span className={`font-black shrink-0 ${statsA.totalAvaliacoes > 0 ? 'text-orange-600' : 'text-zinc-400'}`}>
                                  {statsA.totalAvaliacoes > 0 ? `${statsA.mediaAprovacao}%` : 'Sem avaliações'}
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-orange-100 rounded-full overflow-hidden">
                                <div style={{ width: `${statsA.totalAvaliacoes > 0 ? Math.min(100, Math.max(0, statsA.mediaAprovacao)) : 0}%` }} className="bg-orange-500 h-full rounded-full transition-all duration-500"></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center text-xs font-bold text-blue-950 mb-1 gap-2" title={lancheB}>
                                <span className="truncate">{lancheB}</span>
                                <span className={`font-black shrink-0 ${statsB.totalAvaliacoes > 0 ? 'text-blue-600' : 'text-zinc-400'}`}>
                                  {statsB.totalAvaliacoes > 0 ? `${statsB.mediaAprovacao}%` : 'Sem avaliações'}
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
                                <div style={{ width: `${statsB.totalAvaliacoes > 0 ? Math.min(100, Math.max(0, statsB.mediaAprovacao)) : 0}%` }} className="bg-blue-500 h-full rounded-full transition-all duration-500"></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-400 font-medium mt-3 pt-2.5 border-t border-zinc-100">
                          {statsA.totalAvaliacoes > 0 && statsB.totalAvaliacoes > 0
                            ? `Diferença de ${Math.abs(statsA.mediaAprovacao - statsB.mediaAprovacao)}% pontos percentuais`
                            : statsA.totalAvaliacoes > 0 || statsB.totalAvaliacoes > 0
                              ? `Dados disponíveis apenas para ${statsA.totalAvaliacoes > 0 ? lancheA : lancheB}`
                              : 'Aguardando primeiras avaliações em sala'}
                        </p>
                      </div>

                      {/* 2. Resto no Prato (Desperdício Sujo) */}
                      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              Resto no Prato (Desperdício)
                            </span>
                            {statsA.ocorrencias > 0 && statsB.ocorrencias > 0 && Number(statsA.mediaSujo) !== Number(statsB.mediaSujo) && (
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                Number(statsA.mediaSujo) < Number(statsB.mediaSujo)
                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                              }`}>
                                {Number(statsA.mediaSujo) < Number(statsB.mediaSujo) ? 'Item A Menor Lixo' : 'Item B Menor Lixo'}
                              </span>
                            )}
                          </div>

                          <div className="space-y-3 mt-3">
                            <div>
                              <div className="flex justify-between items-center text-xs font-bold text-zinc-800 mb-1 gap-2" title={lancheA}>
                                <span className="truncate">{lancheA}</span>
                                <span className="font-black text-orange-700 shrink-0">
                                  {statsA.ocorrencias > 0 ? `${Number(statsA.mediaSujo || 0).toFixed(1)} kg` : '--'}
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div style={{ width: `${statsA.ocorrencias > 0 ? Math.min(100, (Number(statsA.mediaSujo || 0) / 20) * 100) : 0}%` }} className="bg-orange-500 h-full rounded-full transition-all duration-500"></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center text-xs font-bold text-zinc-800 mb-1 gap-2" title={lancheB}>
                                <span className="truncate">{lancheB}</span>
                                <span className="font-black text-blue-700 shrink-0">
                                  {statsB.ocorrencias > 0 ? `${Number(statsB.mediaSujo || 0).toFixed(1)} kg` : '--'}
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div style={{ width: `${statsB.ocorrencias > 0 ? Math.min(100, (Number(statsB.mediaSujo || 0) / 20) * 100) : 0}%` }} className="bg-blue-500 h-full rounded-full transition-all duration-500"></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-400 font-medium mt-3 pt-2.5 border-t border-zinc-100">
                          {statsA.ocorrencias > 0 && statsB.ocorrencias > 0
                            ? `Menor valor indica menor desperdício (dif: ${Math.abs(Number(statsA.mediaSujo || 0) - Number(statsB.mediaSujo || 0)).toFixed(1)} kg)`
                            : 'Média de descarte deixado nas bandejas'}
                        </p>
                      </div>

                      {/* 3. Sobra na Cuba (Panela) */}
                      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                              <Scale className="w-3.5 h-3.5 text-amber-600" />
                              Sobra na Cozinha (Panelas)
                            </span>
                            {statsA.ocorrencias > 0 && statsB.ocorrencias > 0 && Number(statsA.mediaLimpo) !== Number(statsB.mediaLimpo) && (
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                Number(statsA.mediaLimpo) < Number(statsB.mediaLimpo)
                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                              }`}>
                                {Number(statsA.mediaLimpo) < Number(statsB.mediaLimpo) ? 'Item A Menor Sobra' : 'Item B Menor Sobra'}
                              </span>
                            )}
                          </div>

                          <div className="space-y-3 mt-3">
                            <div>
                              <div className="flex justify-between items-center text-xs font-bold text-zinc-800 mb-1 gap-2" title={lancheA}>
                                <span className="truncate">{lancheA}</span>
                                <span className="font-black text-orange-700 shrink-0">
                                  {statsA.ocorrencias > 0 ? `${Number(statsA.mediaLimpo || 0).toFixed(1)} kg` : '--'}
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div style={{ width: `${statsA.ocorrencias > 0 ? Math.min(100, (Number(statsA.mediaLimpo || 0) / 20) * 100) : 0}%` }} className="bg-orange-500 h-full rounded-full transition-all duration-500"></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center text-xs font-bold text-zinc-800 mb-1 gap-2" title={lancheB}>
                                <span className="truncate">{lancheB}</span>
                                <span className="font-black text-blue-700 shrink-0">
                                  {statsB.ocorrencias > 0 ? `${Number(statsB.mediaLimpo || 0).toFixed(1)} kg` : '--'}
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div style={{ width: `${statsB.ocorrencias > 0 ? Math.min(100, (Number(statsB.mediaLimpo || 0) / 20) * 100) : 0}%` }} className="bg-blue-500 h-full rounded-full transition-all duration-500"></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-400 font-medium mt-3 pt-2.5 border-t border-zinc-100">
                          {statsA.ocorrencias > 0 && statsB.ocorrencias > 0
                            ? `Diferença de calibragem: ${Math.abs(Number(statsA.mediaLimpo || 0) - Number(statsB.mediaLimpo || 0)).toFixed(1)} kg`
                            : 'Média de sobra limpa não servida nas cubas'}
                        </p>
                      </div>

                      {/* 4. Total de Vezes Servido e Amostragem */}
                      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                              Frequência & Amostragem
                            </span>
                          </div>

                          <div className="space-y-2 mt-3">
                            <div className="bg-orange-50/40 p-2.5 rounded-xl border border-orange-100">
                              <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-orange-950 truncate" title={lancheA}>{lancheA}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                                  statsA.ocorrencias > 0 ? 'bg-orange-100 text-orange-800' : 'bg-zinc-100 text-zinc-600'
                                }`}>
                                  {statsA.ocorrencias > 0 ? `${statsA.ocorrencias}x servido` : 'Programado'}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                {statsA.totalAvaliacoes > 0 ? `${statsA.totalAvaliacoes} votos registrados` : 'Sem votos coletados'}
                              </p>
                            </div>

                            <div className="bg-blue-50/40 p-2.5 rounded-xl border border-blue-100">
                              <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-blue-950 truncate" title={lancheB}>{lancheB}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                                  statsB.ocorrencias > 0 ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-600'
                                }`}>
                                  {statsB.ocorrencias > 0 ? `${statsB.ocorrencias}x servido` : 'Programado'}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                {statsB.totalAvaliacoes > 0 ? `${statsB.totalAvaliacoes} votos registrados` : 'Sem votos coletados'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-400 font-medium mt-3 pt-2.5 border-t border-zinc-100">
                          Volume acumulado no período filtrado
                        </p>
                      </div>
                    </div>

                    {/* GRÁFICO DE RADAR INTEGRADO */}
                    <div className="bg-white rounded-3xl border border-zinc-200 p-6 flex flex-col gap-6 shadow-xs">
                      {/* Topo do Radar: Título + Seletor Interativo da Escala de Peso */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                        <div>
                          <h4 className="text-sm font-black uppercase text-zinc-800 tracking-wider flex items-center gap-2">
                            <Award className="w-4 h-4 text-primaria" />
                            Gráfico Comparativo de Desempenho (Radar)
                          </h4>
                          <p className="text-xs text-zinc-500 font-medium mt-0.5">
                            Comparação proporcional balanceada: Aprovação dos alunos (0 a 100%) versus sobras e desperdício.
                          </p>
                        </div>

                        {/* Seletor da Escala Máxima de Peso */}
                        <div className="flex items-center gap-2 self-start md:self-auto">
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Escala de Peso:</span>
                          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/80">
                            {[
                              { valor: 3, label: '0 a 3 kg' },
                              { valor: 5, label: '0 a 5 kg' },
                              { valor: 10, label: '0 a 10 kg' },
                              { valor: 'auto', label: 'Auto' }
                            ].map(opt => (
                              <button
                                key={opt.valor}
                                type="button"
                                onClick={() => setEscalaPesoRadar(opt.valor)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  escalaPesoRadar === opt.valor
                                    ? 'bg-white text-zinc-900 shadow-xs font-black'
                                    : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                                title={opt.valor === 'auto' ? 'Calibra automaticamente pelo maior valor observado' : `Escala máxima de ${opt.valor} kg nos eixos de peso`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Painel Central: Legenda com Valores Reais + Gráfico Radar */}
                      <div className="flex flex-col lg:flex-row items-center gap-6">
                        <div className="w-full lg:w-1/3 space-y-3.5">
                          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/70 space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-zinc-500 block tracking-wider">
                              Calibração dos Eixos
                            </span>
                            <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                              O eixo de <strong>Aprovação</strong> varia de 0 a 100%, enquanto os eixos de <strong>Resto no Prato</strong> e <strong>Sobra na Cozinha</strong> foram calibrados para a escala de <strong>0 a {maxRefKg} kg</strong>, permitindo comparar todas as grandezas sem distorções visuais.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-zinc-800 bg-orange-50/70 p-3 rounded-2xl border border-orange-200/70">
                              <span className="flex items-center gap-2 truncate">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.6)]"></span>
                                <span className="truncate">{lancheA}</span>
                              </span>
                              <div className="text-right shrink-0 ml-2">
                                <span className="text-xs font-black text-orange-950 block">
                                  {statsA.totalAvaliacoes > 0 ? `${statsA.mediaAprovacao}%` : 'Sem votos'}
                                </span>
                                <span className="text-[10px] font-bold text-orange-700 block">
                                  {statsA.ocorrencias > 0 ? `${Number(statsA.mediaSujo || 0).toFixed(1)} kg resto` : 'Programado'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs font-bold text-zinc-800 bg-blue-50/70 p-3 rounded-2xl border border-blue-200/70">
                              <span className="flex items-center gap-2 truncate">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>
                                <span className="truncate">{lancheB}</span>
                              </span>
                              <div className="text-right shrink-0 ml-2">
                                <span className="text-xs font-black text-blue-950 block">
                                  {statsB.totalAvaliacoes > 0 ? `${statsB.mediaAprovacao}%` : 'Sem votos'}
                                </span>
                                <span className="text-[10px] font-bold text-blue-700 block">
                                  {statsB.ocorrencias > 0 ? `${Number(statsB.mediaSujo || 0).toFixed(1)} kg resto` : 'Programado'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="w-full lg:w-2/3 h-80 min-h-[300px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dadosRadarGrafico}>
                              <PolarGrid stroke="#e4e4e7" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#3f3f46', fontSize: 11, fontWeight: '800' }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <RechartsTooltip
                                content={({ active, payload }) => {
                                  if (!active || !payload || !payload.length) return null;
                                  const dataItem = payload[0]?.payload;
                                  if (!dataItem) return null;

                                  return (
                                    <div className="bg-white/95 backdrop-blur-sm border border-zinc-200 p-3 rounded-2xl shadow-xl text-xs space-y-2 min-w-[210px]">
                                      <div className="border-b border-zinc-100 pb-1.5 flex items-center justify-between">
                                        <span className="font-black text-zinc-800 text-[11px] uppercase tracking-wide">
                                          {dataItem.eixo}
                                        </span>
                                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                                          Escala: {dataItem.escalaRotulo}
                                        </span>
                                      </div>

                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-3 text-xs">
                                          <span className="flex items-center gap-1.5 font-bold text-orange-950 truncate max-w-[130px]" title={lancheA}>
                                            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
                                            <span className="truncate">{lancheA || 'Item 1'}:</span>
                                          </span>
                                          <span className="font-black text-orange-600 shrink-0">
                                            {dataItem.valorRealA}
                                          </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 text-xs">
                                          <span className="flex items-center gap-1.5 font-bold text-blue-950 truncate max-w-[130px]" title={lancheB}>
                                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                                            <span className="truncate">{lancheB || 'Item 2'}:</span>
                                          </span>
                                          <span className="font-black text-blue-600 shrink-0">
                                            {dataItem.valorRealB}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                              <Radar name={lancheA} dataKey="A" stroke="#f97316" strokeWidth={3} fill="#f97316" fillOpacity={0.3} />
                              <Radar name={lancheB} dataKey="B" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.3} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: TABELA DE ALIMENTOS & SELEÇÃO DE CONFRONTO */}
            {abaComparativo === 'matriz' && (
              <div className="space-y-5 mt-6">
                {/* Barra de Status e Seleção Ativa para o Comparativo */}
                <div className="bg-gradient-to-r from-orange-50/80 via-zinc-50 to-blue-50/80 border border-zinc-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 text-xs font-black text-zinc-600 uppercase tracking-wider shrink-0">
                      <Sparkles className="w-4 h-4 text-primaria" />
                      <span>Itens Selecionados:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Item 1 (Laranja) */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        lancheA 
                          ? 'bg-white border-orange-300 text-orange-950 shadow-xs' 
                          : 'bg-zinc-100 border-dashed border-zinc-300 text-zinc-400'
                      }`}>
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.6)]"></span>
                        <span className="text-[10px] font-black uppercase text-orange-600">Item 1:</span>
                        <span className="max-w-[150px] truncate">{lancheA || 'Nenhum'}</span>
                        {statsA?.categoriaLabel && (
                          <span className="text-[9px] font-bold bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">
                            {statsA.categoriaLabel}
                          </span>
                        )}
                      </div>

                      <span className="text-zinc-400 font-black text-xs">vs</span>

                      {/* Item 2 (Azul) */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        lancheB 
                          ? 'bg-white border-blue-300 text-blue-950 shadow-xs' 
                          : 'bg-zinc-100 border-dashed border-zinc-300 text-zinc-400'
                      }`}>
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>
                        <span className="text-[10px] font-black uppercase text-blue-600">Item 2:</span>
                        <span className="max-w-[150px] truncate">{lancheB || 'Nenhum'}</span>
                        {statsB?.categoriaLabel && (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            {statsB.categoriaLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAbaComparativo('confronto')}
                    disabled={!lancheA || !lancheB}
                    className="w-full sm:w-auto px-4 py-2 bg-primaria hover:bg-orange-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Abrir Comparativo Direto</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Filtros da Tabela */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Filtrar Categoria:</span>
                    <select
                      value={categoriaMatriz}
                      onChange={e => setCategoriaMatriz(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-inner cursor-pointer"
                    >
                      {LISTA_CATEGORIAS_COMPARATIVO.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                    <span className="text-[11px] font-bold text-zinc-400 ml-1">
                      ({itensMatrizFiltrados.length} {itensMatrizFiltrados.length === 1 ? 'item' : 'itens'})
                    </span>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={buscaMatriz}
                      onChange={e => setBuscaMatriz(e.target.value)}
                      placeholder="Buscar preparação ou ingrediente..."
                      className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-inner"
                    />
                  </div>
                </div>

                {/* Tabela de Preparações */}
                <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                        <tr>
                          <th className="px-4 py-3.5">Alimento / Preparação</th>
                          <th className="px-3 py-3.5">Categoria</th>
                          <th className="px-3 py-3.5 text-center">Vezes Servido</th>
                          <th className="px-3 py-3.5">Aprovação dos Alunos</th>
                          <th className="px-3 py-3.5 text-right">Resto no Prato</th>
                          <th className="px-3 py-3.5 text-right">Sobra na Cozinha</th>
                          <th className="px-4 py-3.5 text-center">Selecionar p/ Comparar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {itensMatrizFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-12 text-zinc-400 font-medium">
                              Nenhum alimento encontrado com os filtros selecionados.
                            </td>
                          </tr>
                        ) : (
                          itensMatrizFiltrados.map((item) => {
                            const isSelectedA = lancheA === item.nome;
                            const isSelectedB = lancheB === item.nome;
                            return (
                              <tr key={item.nome} className={`transition-colors ${isSelectedA ? 'bg-orange-50/40' : isSelectedB ? 'bg-blue-50/40' : 'hover:bg-zinc-50/80'}`}>
                                <td className="px-4 py-3 font-bold text-zinc-800">
                                  <div className="flex items-center gap-2">
                                    {isSelectedA && (
                                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.8)]" title="Item 1 no comparativo"></span>
                                    )}
                                    {isSelectedB && (
                                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.8)]" title="Item 2 no comparativo"></span>
                                    )}
                                    <span>{item.nome}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="bg-zinc-100 text-zinc-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                                    {item.categoriaLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center font-bold text-zinc-600">
                                  {item.ocorrencias > 0 ? `${item.ocorrencias}x` : <span className="text-zinc-400 text-[10px]">Programado</span>}
                                </td>
                                <td className="px-3 py-3">
                                  {item.totalAvaliacoes > 0 ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div 
                                          style={{ width: `${Math.min(100, Math.max(0, item.mediaAprovacao))}%` }} 
                                          className={`h-full rounded-full ${item.mediaAprovacao >= 75 ? 'bg-emerald-500' : item.mediaAprovacao >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        ></div>
                                      </div>
                                      <span className="font-black text-zinc-800 text-xs">{item.mediaAprovacao}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400 text-[10px] font-medium">Sem avaliações</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-right font-bold text-zinc-700">
                                  {item.ocorrencias > 0 ? `${item.mediaSujo.toFixed(1)} kg` : <span className="text-zinc-400">--</span>}
                                </td>
                                <td className="px-3 py-3 text-right font-bold text-zinc-700">
                                  {item.ocorrencias > 0 ? `${item.mediaLimpo.toFixed(1)} kg` : <span className="text-zinc-400">--</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => selecionarParaConfronto(item.nome, item.categoria, 'A')}
                                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                        isSelectedA 
                                          ? 'bg-orange-500 text-white shadow-xs font-black' 
                                          : 'bg-white text-orange-700 hover:bg-orange-100 border border-orange-200 shadow-2xs'
                                      }`}
                                      title="Definir como Item 1 para o comparativo"
                                    >
                                      {isSelectedA && <Check className="w-3 h-3 stroke-[3]" />}
                                      <span>{isSelectedA ? 'Item 1 Ativo' : '+ Item 1'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => selecionarParaConfronto(item.nome, item.categoria, 'B')}
                                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                        isSelectedB 
                                          ? 'bg-blue-600 text-white shadow-xs font-black' 
                                          : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-2xs'
                                      }`}
                                      title="Definir como Item 2 para o comparativo"
                                    >
                                      {isSelectedB && <Check className="w-3 h-3 stroke-[3]" />}
                                      <span>{isSelectedB ? 'Item 2 Ativo' : '+ Item 2'}</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: RESUMO POR CATEGORIA (PANORAMA MACRO) */}
            {abaComparativo === 'macro' && (
              <div className="space-y-6 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 border border-zinc-200/80 px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                    <PieChart className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Visão consolidada por grupo alimentar. Compare os índices de aceitação e sobras de cada categoria servida.</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-500 shrink-0">
                    {categoriasAtivas.length} {categoriasAtivas.length === 1 ? 'categoria ativa' : 'categorias ativas'} no período
                  </span>
                </div>

                {/* Grid das Categorias Ativas (com dados reais) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {categoriasAtivas.map(cat => (
                    <div 
                      key={cat.id} 
                      className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Cabeçalho da Categoria */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-primaria">
                              <Utensils className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-zinc-800 tracking-tight">
                                {cat.label}
                              </h4>
                              <span className="text-[11px] font-semibold text-zinc-400">
                                {cat.totalItens} {cat.totalItens === 1 ? 'alimento cadastrado' : 'alimentos cadastrados'}
                              </span>
                            </div>
                          </div>
                          <span className="bg-zinc-100 text-zinc-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                            {cat.totalServido}x servido
                          </span>
                        </div>

                        {/* Bloco de Aprovação */}
                        <div className="mt-4 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/70">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                              Aprovação Média dos Alunos
                            </span>
                            {cat.mediaAprovacao !== null && (
                              <span className="text-[10px] font-bold text-zinc-400">
                                {cat.totalAvaliacoes} votos
                              </span>
                            )}
                          </div>

                          {cat.mediaAprovacao !== null ? (
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-zinc-900">{cat.mediaAprovacao}%</span>
                                <span className="text-xs font-bold text-zinc-500">de aceitação</span>
                              </div>
                              <div className="w-full h-2 bg-zinc-200/80 rounded-full overflow-hidden mt-2">
                                <div
                                  style={{ width: `${Math.min(100, Math.max(0, cat.mediaAprovacao))}%` }}
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    cat.mediaAprovacao >= 75 ? 'bg-emerald-500' : cat.mediaAprovacao >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-zinc-400 italic">
                              Sem avaliações registradas no período
                            </span>
                          )}
                        </div>

                        {/* Indicadores de Sobras e Desperdício */}
                        <div className="grid grid-cols-2 gap-2.5 mt-3">
                          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70">
                            <span className="text-[10px] font-black uppercase text-zinc-400 block mb-0.5">
                              Resto no Prato
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-black text-zinc-800">
                                {cat.totalServido > 0 ? `${cat.mediaSujo} kg` : '--'}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-zinc-400 block mt-0.5">
                              Média por refeição
                            </span>
                          </div>

                          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70">
                            <span className="text-[10px] font-black uppercase text-zinc-400 block mb-0.5">
                              Sobra na Cozinha
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-black text-zinc-800">
                                {cat.totalServido > 0 ? `${cat.mediaLimpo} kg` : '--'}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-zinc-400 block mt-0.5">
                              Média não servida
                            </span>
                          </div>
                        </div>

                        {/* Destaque / Mais Aprovado */}
                        {cat.destaque && (
                          <div className="mt-3 p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                              <Award className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-black uppercase text-emerald-700 block tracking-wider">
                                Item Mais Aprovado
                              </span>
                              <p className="text-xs font-bold text-emerald-950 truncate">
                                {cat.destaque.nome} <span className="text-emerald-700 font-black">({cat.destaque.mediaAprovacao}%)</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ação: Ver Alimentos na Tabela */}
                      <button
                        type="button"
                        onClick={() => {
                          setCategoriaMatriz(cat.id);
                          setAbaComparativo('matriz');
                        }}
                        className="mt-4 pt-3 border-t border-zinc-100 text-xs font-bold text-primaria hover:text-orange-700 transition-colors flex items-center justify-between cursor-pointer w-full group"
                      >
                        <span>Ver preparações de {cat.label}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Categorias sem dados no período (resumo sutil, sem poluir a tela) */}
                {categoriasSemHistorico.length > 0 && (
                  <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-3xl p-5 mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-200/70 flex items-center justify-center text-zinc-500 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black uppercase text-zinc-600 tracking-wider">
                            Outras Categorias Monitoradas
                          </h5>
                          <p className="text-xs font-medium text-zinc-400 mt-0.5">
                            Grupos alimentares sem refeições cadastradas no período selecionado:
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {categoriasSemHistorico.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setCategoriaMatriz(cat.id);
                              setAbaComparativo('matriz');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                            title={`Ver categoria ${cat.label} na tabela`}
                          >
                            <span>{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
