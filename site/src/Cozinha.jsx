import { useDebouncedLoader } from './hooks/useAntiFlicker';
import { useRealtime } from './hooks/useRealtime';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import EstatisticasBI from './components/EstatisticasBI';
import { Check, Info, FileText, Download, ShieldAlert, Zap, BookOpen, GraduationCap, Clock, AlertTriangle, ChefHat, Search, Calendar, Menu, ArrowRight, Ban, TrendingUp, BarChart3, UtensilsCrossed, ClipboardList, Hourglass, Brain, Salad, Columns2, Settings, LineChart as IconLineChart, BarChart as IconBarChart, CalendarDays, CheckCircle2, ChevronRight, Apple, PieChart, Users, X, Eye, Coffee, Sun, Moon, Filter, HelpCircle, ChevronDown, CheckSquare, Droplets, AlertOctagon, Trash2, Utensils, Lock, Printer, Bot } from 'lucide-react';
import { api } from './services/api';
import { getServerTime } from './utils/time';
import { processarAnalyticsBI } from './utils/analytics';
import HistoricoDiaPassado from './components/cozinha/HistoricoDiaPassado';
import { RingLoader, ToastAlert } from './components/UI';
import { MultiTagInput } from './components/cozinha/SharedUI';

const alertBeeper = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');

function CustomDropdown({ valor, aoMudar, placeholder, opcoes }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fechar = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) setAberto(false); 
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  const opcoesUnicas = [...new Set(opcoes || [])];
  const filtrados = opcoesUnicas.filter(o => String(o || '').toLowerCase().includes(String(valor || '').toLowerCase()));

  return (
    <div className="relative w-full" ref={ref}>
      <input 
        type="text" 
        value={valor || ''} 
        onFocus={() => setAberto(true)} 
        onChange={e => { aoMudar(e.target.value); setAberto(true); }} 
        onKeyDown={e => { if (e.key === 'Enter') setAberto(false); }}
        placeholder={placeholder} 
        className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-primaria shadow-sm" 
      />
      {aberto && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {filtrados.length > 0 ? filtrados.map((op, i) => (
            <li 
              key={i} 
              onClick={() => { aoMudar(op); setAberto(false); }} 
              className="px-4 py-3 hover:bg-zinc-50 cursor-pointer text-sm font-bold text-zinc-700 border-b border-zinc-100 last:border-0"
            >
              {op}
            </li>
          )) : (
            <li className="px-4 py-3 text-sm italic text-zinc-400">
              Pressione Enter para salvar: "{valor}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

const LoadingIcon = () => <RingLoader tamanho="w-5 h-5" />;

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
const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const diasDaSemanaLetras = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const restricoesComuns = ["APLV (Sem Leite)", "Intolerante à Lactose", "Doença Celíaca (Sem Glúten)", "Diabetes (Sem Açúcar)", "Vegetariano", "Vegano"];
const agrupamentoTurmas = ['Fund I', 'Fund II', 'EM', 'Técnico', 'Personaliza'];

export default function Cozinha() {
  const [visaoAtiva, setVisaoAtiva] = useState('producao'); 
  
  const [dadosDashboard, setDadosDashboard] = useState(null);
  const dashboardAnteriorRef = useRef(null); 
  
  const [turmas, setTurmas] = useState([]);
  const [lanchesCadastrados, setLanchesCadastrados] = useState([]);
  
  const [historicoDietas, setHistoricoDietas] = useState([]);
  const [historicoBI, setHistoricoBI] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [dadosMensais, setDadosMensais] = useState(null);
  
  const [parametros, setParametros] = useState({
    resto_per_capita_atencao_g: 25,
    resto_per_capita_critico_g: 45,
    sobra_limpa_atencao_kg: 5,
    sobra_limpa_critico_kg: 10,
    taxa_rejeicao_alerta_percentual: 30
  });
  
  const [notificacao, setNotificacao] = useState({ visivel: false, texto: '', tipo: 'sucesso' });
  const [modalFuzzy, setModalFuzzy] = useState({ visivel: false, sugestao: '', digitado: '' });
  const [modalPreditivo, setModalPreditivo] = useState({ visivel: false, prato: '', rejeicao: 0 });
  
  const [pendencias, setPendencias] = useState({ turnos_sem_lixo: [], data_lixo_pendente: '', cardapios_retroativos: [], cardapios_hoje_faltantes: [] });
  const [formPendencia, setFormPendencia] = useState({ lanchePadrao: '', lancheDieta: '' });
  const [pesosLixo, setPesosLixo] = useState({
    LM: { limpo: '', sujo: '' },
    A:  { limpo: '', sujo: '' },
    LT: { limpo: '', sujo: '' }
  });
  const [modalRetroativo, setModalRetroativo] = useState(null);
  const [modalExclusao, setModalExclusao] = useState({ visivel: false, id: null });
  const [modalSobrescrita, setModalSobrescrita] = useState(false);

  // Trava de rolagem no background para evitar bug de tela ao abrir modais
  const isAnyModalOpen = Boolean(
    modalRetroativo ||
    modalFuzzy?.visivel ||
    modalExclusao?.visivel ||
    modalSobrescrita ||
    modalPreditivo?.visivel
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  const [abaTurno, setAbaTurno] = useState('LM');

  const [lixoLimpo, setLixoLimpo] = useState('');
  const [lixoSujo, setLixoSujo] = useState('');

  const [diaSelecionado, setDiaSelecionado] = useState(getServerTime().getDate());
  const [mesAtual, setMesAtual] = useState(getServerTime().getMonth());
  const [anoAtual, setAnoAtual] = useState(getServerTime().getFullYear());
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]); 
  const [refeicaoCardapio, setRefeicaoCardapio] = useState('LM');
  const [inputLanchePadrao, setLanchePadrao] = useState('');
  const [inputLancheDieta, setLancheDieta] = useState('');
  
  // Componentes estruturados da refeição (Lanches e Almoço)
  const [inputBebida, setBebida] = useState('');
  const [inputFruta, setFruta] = useState('');
  const [inputArroz, setArroz] = useState('');
  const [inputFeijao, setFeijao] = useState('');
  const [inputPratoPrincipal, setPratoPrincipal] = useState('');
  const [inputOpcaoVegetal, setOpcaoVegetal] = useState('');
  const [inputGuarnicao, setGuarnicao] = useState('');
  const [inputMolhoSalada, setMolhoSalada] = useState('');
  const [inputSobremesa, setSobremesa] = useState('');
  const [catalogoAlimentos, setCatalogoAlimentos] = useState([]);

  const [dadosDiaPassado, setDadosDiaPassado] = useState(null);
  const [cardapioDoDiaSelecionado, setCardapioDoDiaSelecionado] = useState([]);

  const [nomeAluno, setNomeAluno] = useState('');
  const [salaRegularId, setSalaRegularId] = useState('');
  const [salaTecnicaId, setSalaTecnicaId] = useState('');
  const [salaPersonalizaId, setSalaPersonalizaId] = useState('');
  const [restricaoMedica, setRestricaoMedica] = useState('');
  const [alunoEmEdicaoId, setAlunoEmEdicaoId] = useState(null);
  const [restricoesSelecionadas, setRestricoesSelecionadas] = useState([]);
  const [todasRestricoes, setTodasRestricoes] = useState([]);
  const [mostrarRaioX, setMostrarRaioX] = useState(false);
  const [alertasCorrecao, setAlertasCorrecao] = useState([]);

  const [filtroTurnoBI, setFiltroTurnoBI] = useState('Todos');
  const [biDataInicio, setBiDataInicio] = useState(() => {
    const d = getServerTime(); 
    d.setDate(d.getDate() - 15); 
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });
  
  const [biDataFim, setBiDataFim] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });
  const [lancheA, setLancheA] = useState('');
  const [lancheB, setLancheB] = useState('');

  const [isProcessandoUI, setIsProcessando, isProcessando] = useDebouncedLoader(200);

  const mostrarToast = (texto, tipo = 'sucesso') => {
    setNotificacao({ visivel: true, texto, tipo });
    setTimeout(() => setNotificacao({ visivel: false }), 4000);
  };

  const checarPendencias = useCallback(async () => {
    const res = await api('/api/painel-cozinha/pendencias');
    if (res?.sucesso) {
      setPendencias({ 
        turnos_sem_lixo: res.turnos_sem_lixo || [], 
        data_lixo_pendente: res.data_lixo_pendente || '', 
        cardapios_retroativos: res.cardapios_retroativos || [],
        cardapios_hoje_faltantes: res.cardapios_hoje_faltantes || []
      });
    }
  }, []);

  const carregarHistoricos = useCallback(() => {
    api('/api/alunos-especiais/todos').then(r => { if (r?.sucesso) setHistoricoDietas(r.dados || []); });
    api('/api/restricoes/todas').then(r => { if (r?.sucesso) setTodasRestricoes(r.dados || []); });
    api('/api/painel-cozinha/bi').then(r => { if (r?.sucesso) setHistoricoBI(r.dados || []); });
    api('/api/feriados').then(r => { if (r?.sucesso) setFeriados((r.dados || []).map(f => f?.data).filter(Boolean)); });
    api('/api/parametros')
      .then(r => {
        if (r?.sucesso && Array.isArray(r.dados) && r.dados.length > 0) {
          const mapParametros = {};
          r.dados.forEach(p => { if (p?.chave) mapParametros[p.chave] = p.valor; });
          setParametros(prev => ({ ...prev, ...mapParametros }));
        }
      });
  }, []);

  useEffect(() => {
    api(`/api/painel-cozinha/relatorio-mensal/${anoAtual}/${mesAtual + 1}`)
      .then(r => { if (r?.sucesso) setDadosMensais(r.dados || null); });
  }, [anoAtual, mesAtual]);

  const processarLotesAlertaCorrecao = useCallback((dashboardNovo) => {
    if (!dashboardAnteriorRef.current || !dashboardNovo) return;
    const anterior = dashboardAnteriorRef.current;
    const turnos = ['LM', 'A', 'LT'];
    const novosAlertas = [];
    turnos.forEach(turno => {
       const tAntigo = anterior?.[turno] || { salas_confirmadas: [], lista_extras: [] };
       const tNovo = dashboardNovo?.[turno] || { salas_confirmadas: [], lista_extras: [] };
       
       const salasAntigas = tAntigo.salas_confirmadas || [];
       const salasNovas = tNovo.salas_confirmadas || [];
       const extrasAntigas = tAntigo.lista_extras || [];
       const extrasNovas = tNovo.lista_extras || [];

       salasNovas.forEach(salaNova => {
          const salaVelha = salasAntigas.find(s => s?.sala === salaNova?.sala);
          if (salaVelha && salaVelha.quantidade !== salaNova?.quantidade) {
             const diferenca = (Number(salaNova?.quantidade) || 0) - (Number(salaVelha?.quantidade) || 0);
             const sinal = diferenca > 0 ? '+' : '';
             novosAlertas.push({
               id: Date.now() + Math.random(),
               sala: salaNova?.sala,
               turno: mapNomesTurnos?.[turno] || turno,
               mudanca: `${sinal}${diferenca}`,
               tipo: diferenca > 0 ? 'aumento' : 'queda',
               aluno: null
             });
          }
       });

       extrasAntigas.forEach(extraAntigo => {
          const extraNovo = extrasNovas.find(e => e?.id === extraAntigo?.id);
          if (!extraNovo) {
             novosAlertas.push({
               id: Date.now() + Math.random(),
               sala: "Contraturno Cancelado",
               turno: mapNomesTurnos?.[turno] || turno,
               mudanca: `-1`,
               tipo: 'queda_extra',
               aluno: extraAntigo?.aluno
             });
          }
       });
    });

    if (novosAlertas.length > 0) {
       alertBeeper.play().catch(e => {}); 

       setAlertasCorrecao(prev => [...(prev || []), ...novosAlertas]);
    }
  }, []);

  const dispensarAlerta = (id) => {
    setAlertasCorrecao(prev => (prev || []).filter(a => a?.id !== id));
  };

  const sincronizarSistema = useCallback(() => { 
    checarPendencias();
    api(`/api/painel-cozinha/dashboard`)
      .then(res => { 
        if (res?.sucesso) {
          if (res.isFeriado) {
             setDadosDashboard({ isFeriado: true });
          } else {
             processarLotesAlertaCorrecao(res.dashboard); 
             dashboardAnteriorRef.current = res.dashboard; 
             setDadosDashboard(res.dashboard || null); 
          }
        }
      })
      .catch(e => console.log("Aguardando rede...")); 
  }, [checarPendencias, processarLotesAlertaCorrecao]);

  const carregarCatalogoAlimentos = useCallback(() => {
    api('/api/catalogo-alimentos').then(r => {
      if (r?.sucesso) setCatalogoAlimentos(r.dados || []);
    });
  }, []);

  const obterOpcoesCatalogo = useCallback((cat) => {
    return (catalogoAlimentos || [])
      .filter(item => item?.categoria === cat && item?.ativo === 1)
      .map(item => item?.nome)
      .filter(Boolean);
  }, [catalogoAlimentos]);

  useEffect(() => {
    sincronizarSistema(); 
    carregarHistoricos();
    carregarCatalogoAlimentos();
    api('/api/turmas').then(r => { if (r?.sucesso) setTurmas(r.dados || []); });
    api('/api/receitas/todas').then(r => { if (r?.sucesso) setLanchesCadastrados((r.dados || []).map(r => r?.nome).filter(Boolean)); });
    const liveUpdate = setInterval(sincronizarSistema, 5000);
    return () => clearInterval(liveUpdate);
  }, [sincronizarSistema, carregarHistoricos, carregarCatalogoAlimentos]); 

  // Sincronização imediata em tempo real via WebSocket (0 delay, sem necessidade de recarregar a página)
  useRealtime(['presenca_atualizada', 'cozinha_atualizada', 'cardapio_atualizado'], () => {
    sincronizarSistema();
    carregarHistoricos();
    carregarCatalogoAlimentos();
  }); 

  useEffect(() => {
    const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`;
    

    api(`/api/painel-cozinha/resumo-dia/${dataFormatada}`)
      .then(r => { 
         if (r?.sucesso) {
           setCardapioDoDiaSelecionado(r.dados?.cardapio || []);
           setDadosDiaPassado(r.dados || null);
         }
      });
  }, [diaSelecionado, mesAtual, anoAtual]);

  const formatarDataSimples = (dataString) => {
    if (!dataString || typeof dataString !== 'string') return '';
    const cleanDate = dataString.split('T')[0].split(' ')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 3) return dataString;
    const [ano, mes, dia] = parts;
    return `${dia}/${mes}`;
  };

  const atualizarInputLixo = (turno, tipo, valor) => {
    setPesosLixo(prev => ({
      ...prev,
      [turno]: { ...prev?.[turno], [tipo]: valor }
    }));
  };

  const salvarLixo = async (forcar = false, turnoOverride = null) => {
    const turnoAlvo = turnoOverride || abaTurno;

    const pesoLimpo = pesosLixo?.[turnoAlvo]?.limpo ?? '';
    const pesoSujo = pesosLixo?.[turnoAlvo]?.sujo ?? '';

    if (pesoLimpo === '' || pesoSujo === '') return mostrarToast('Preencha os valores de sobra e resto.', 'erro');
    setIsProcessando(true);
    try {
      const payload = { 
         tipo_refeicao: turnoAlvo, 
         lixo_limpo_kg: pesoLimpo, 
         lixo_sujo_kg: pesoSujo,
         forcar_sobrescrita: forcar
      };
      
      if ((pendencias?.turnos_sem_lixo || []).includes(turnoAlvo) && pendencias?.data_lixo_pendente) {
          payload.data_ref = pendencias.data_lixo_pendente;
      }
      const [res] = await Promise.all([
        api('/api/auditoria-lixo', { 
          method: 'POST', 
          body: JSON.stringify(payload) 
        })
      ]);
      if (res?.status === 409 && res?.precisa_confirmacao) {
          setIsProcessando(false);
          setModalSobrescrita(true);
          return;
      }
      if (!res?.sucesso) return mostrarToast(res?.erro || 'Erro', 'erro');
      
      mostrarToast('Auditoria de desperdício salva na matriz!'); 
      setPesosLixo(prev => ({ ...prev, [turnoAlvo]: { limpo: '', sujo: '' } }));
      setModalSobrescrita(false);
      checarPendencias();
      carregarHistoricos();
      sincronizarSistema();
    } catch { 
      mostrarToast('Erro de rede ao salvar lixo.', 'erro'); 
    } finally { 
      setIsProcessando(false); 
    }
  };

  const resolverCardapioPendente = async () => {
    if (!formPendencia.lanchePadrao) return mostrarToast('Insira o Prato/Lanche que foi servido.', 'erro');
    setIsProcessando(true);
    try {
      const [res] = await Promise.all([
        api('/api/calendario/salvar', {
          method: 'POST',
          body: JSON.stringify({ 
             data: modalRetroativo.data, 
             turmas_ids: [modalRetroativo.turma_id], 
             tipo_refeicao: modalRetroativo.turno,
             lanche_padrao: formPendencia.lanchePadrao, 
             prato_principal: formPendencia.lanchePadrao,
             lanche_dieta: formPendencia.lancheDieta, 
             prato_principal_dieta: formPendencia.lancheDieta,
             ignorarSimilaridade: true 
          })
        })
      ]);

      if (res.sucesso) {
        mostrarToast('Cardápio retroativo vinculado para esta sala!', 'sucesso');
        setFormPendencia({ ...formPendencia, lanchePadrao: '', lancheDieta: '' });
        setModalRetroativo(null);
        checarPendencias();
        sincronizarSistema();
      } else { mostrarToast(res.erro, 'erro'); }
    } catch {
      mostrarToast('Erro ao vincular prato.', 'erro');
    } finally {
      setIsProcessando(false);
    }
  };

  const confirmarExclusaoDieta = async () => {
    setIsProcessando(true);
    try {
      await Promise.all([
        api(`/api/alunos-especiais/${modalExclusao.id}`, { method: 'DELETE' })
      ]);
      mostrarToast('Ficha apagada com segurança.'); 
      setModalExclusao({ visivel: false, id: null });
      carregarHistoricos(); 
      sincronizarSistema();
    } catch {
      mostrarToast('Erro ao apagar ficha.', 'erro');
    } finally {
      setIsProcessando(false);
    }
  };

  const iniciarEdicaoAluno = (aluno) => {
    setAlunoEmEdicaoId(aluno?.id || null);
    setNomeAluno(aluno?.nome || '');
    const tags = Array.isArray(aluno?.restricoes) && aluno.restricoes.length > 0 
      ? aluno.restricoes 
      : (aluno?.restricao ? aluno.restricao.split(' • ') : []);
    setRestricoesSelecionadas(tags);
    setSalaRegularId(aluno?.sala_regular_id ? String(aluno.sala_regular_id) : '');
    setSalaTecnicaId(aluno?.sala_tecnica_id ? String(aluno.sala_tecnica_id) : '');
    setSalaPersonalizaId(aluno?.sala_personaliza_id ? String(aluno.sala_personaliza_id) : '');
  };

  const cancelarEdicaoAluno = () => {
    setAlunoEmEdicaoId(null);
    setNomeAluno('');
    setRestricoesSelecionadas([]);
    setSalaRegularId('');
    setSalaTecnicaId('');
    setSalaPersonalizaId('');
  };

  const salvarAlunoDieta = async () => {
    if (!nomeAluno || !salaRegularId || (restricoesSelecionadas || []).length === 0) {
      return mostrarToast('Preencha o nome do paciente, selecione a sala base e adicione ao menos uma restrição.', 'erro');
    }
    setIsProcessando(true);
    try {
      const resposta = await api('/api/alunos-especiais/salvar', { 
        method: 'POST', 
        body: JSON.stringify({ 
          id: alunoEmEdicaoId || null,
          nome: nomeAluno, 
          restricoes: restricoesSelecionadas, 
          turma_id: Number(salaRegularId), 
          turma_senai_id: salaTecnicaId ? Number(salaTecnicaId) : null,
          turma_personaliza_id: salaPersonalizaId ? Number(salaPersonalizaId) : null
        }) 
      });
      if (resposta.sucesso) {
        mostrarToast(alunoEmEdicaoId ? 'Ficha clínica atualizada com sucesso!' : 'Ficha clínica registrada no sistema!'); 
        cancelarEdicaoAluno();
        carregarHistoricos();
        sincronizarSistema();
      } else { 
        mostrarToast(resposta.erro, 'erro'); 
      }
    } catch {
      mostrarToast('Erro ao salvar ficha clínica.', 'erro');
    } finally {
      setIsProcessando(false);
    }
  };

  const alternarFeriado = async () => {
    const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`;
    setIsProcessando(true);
    const ehFeriado = (feriados || []).includes(dataFormatada);
    const res = await api(`/api/feriados${ehFeriado ? `/${dataFormatada}` : ''}`, { 
      method: ehFeriado ? 'DELETE' : 'POST', 
      body: ehFeriado ? null : JSON.stringify({ data: dataFormatada, descricao: 'Feriado Escolar' }) 
    });
    mostrarToast(res?.status === 'adicionado' ? 'Feriado ativado (Operação suspensa)' : 'Feriado desmarcado'); 
    carregarHistoricos();
    sincronizarSistema();
    checarPendencias();
    setIsProcessando(false);
  };

  const alternarIgnorarTurma = async (turmasIds) => {
    const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`;
    
    setIsProcessando(true);
    let sucessoCount = 0;

    for (const turmaId of (turmasIds || [])) {
      const ignorada = (dadosDiaPassado?.turmas_ignoradas || []).includes(turmaId);
      const res = await api('/api/ignorar-turma', { 
        method: ignorada ? 'DELETE' : 'POST', 
        body: JSON.stringify({ data: dataFormatada, turma_id: turmaId }) 
      });
      if (res?.sucesso) sucessoCount++;
    }
    
    if (sucessoCount > 0) {
      mostrarToast(`Operação concluída em ${sucessoCount} turma(s).`);
      api(`/api/painel-cozinha/resumo-dia/${dataFormatada}`).then(r => { 
          if (r?.sucesso) setDadosDiaPassado(r.dados || null); 
      });
      carregarHistoricos();
      sincronizarSistema();
      checarPendencias();
      setTurmasSelecionadas([]);
    } else {
      mostrarToast('Nenhuma alteração realizada.', 'erro');
    }
    setIsProcessando(false);
  };

  const salvarItemCalendario = async (ignorarSimilaridade = false, ignorarPreditivo = false) => {
    const pratoOuLanchePrincipal = refeicaoCardapio === 'A' 
      ? (inputPratoPrincipal || inputLanchePadrao) 
      : (inputLanchePadrao || inputPratoPrincipal);

    if ((turmasSelecionadas || []).length === 0 || !pratoOuLanchePrincipal) {
      return mostrarToast(
        refeicaoCardapio === 'A' 
          ? 'Selecione ao menos uma turma e o Prato Principal (Mistura).' 
          : 'Selecione ao menos uma turma e o Lanche Principal.', 
        'erro'
      );
    }
    const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`;
    if ((feriados || []).includes(dataFormatada)) return mostrarToast('Ação Bloqueada: Não é possível agendar em feriado.', 'erro');

    if (!ignorarSimilaridade && !ignorarPreditivo && (listaPratosGlobal || []).length > 0) {
       const historicoPadrao = (listaPratosGlobal || []).find(p => String(p?.nome || '').toLowerCase() === String(pratoOuLanchePrincipal || '').trim().toLowerCase());
       if (historicoPadrao) {
          const rejeicaoHistorica = 100 - (Number(historicoPadrao?.mediaAprovacao) || 0);
          if (rejeicaoHistorica > Number(parametros?.taxa_rejeicao_alerta_percentual || 30)) {
             setModalPreditivo({ visivel: true, prato: historicoPadrao?.nome || pratoOuLanchePrincipal, rejeicao: rejeicaoHistorica });
             return; 
          }
        }
    }
    

    setIsProcessando(true);
    try {
      const [res] = await Promise.all([
        api('/api/calendario/salvar', {
          method: 'POST',
          body: JSON.stringify({ 
             data: dataFormatada, 
             turmas_ids: turmasSelecionadas, 
             tipo_refeicao: refeicaoCardapio,
             lanche_padrao: pratoOuLanchePrincipal, 
             lanche_dieta: inputLancheDieta, 
             prato_principal: pratoOuLanchePrincipal,
             prato_principal_dieta: inputLancheDieta,
             bebida: refeicaoCardapio === 'A' ? null : inputBebida,
             fruta: inputFruta,
             arroz: refeicaoCardapio === 'A' ? inputArroz : null,
             feijao: refeicaoCardapio === 'A' ? inputFeijao : null,
             opcao_vegetal: refeicaoCardapio === 'A' ? inputOpcaoVegetal : null,
             guarnicao: refeicaoCardapio === 'A' ? inputGuarnicao : null,
             molho_salada: refeicaoCardapio === 'A' ? inputMolhoSalada : null,
             sobremesa: refeicaoCardapio === 'A' ? inputSobremesa : null,
             ignorarSimilaridade 
          })
        })
      ]);

      if (res?.status === 409) {
         setModalFuzzy({ visivel: true, sugestao: res.sugestao, digitado: res.digitado });
         return;
      }

      if (res?.sucesso) {
        mostrarToast('Cardápio injetado com sucesso!');
        if (!(lanchesCadastrados || []).includes(pratoOuLanchePrincipal.trim())) {
          setLanchesCadastrados(prev => [...(prev || []), pratoOuLanchePrincipal.trim()]);
        }
        setTurmasSelecionadas([]); 
        setLanchePadrao(''); 
        setLancheDieta(''); 
        setPratoPrincipal('');
        setBebida('');
        setFruta('');
        setArroz('');
        setFeijao('');
        setOpcaoVegetal('');
        setGuarnicao('');
        setMolhoSalada('');
        setSobremesa('');
        setModalFuzzy({ visivel: false, sugestao: '', digitado: '' });
        
        const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`;
        api(`/api/painel-cozinha/resumo-dia/${dataFormatada}`)
          .then(r => { if(r?.sucesso) setCardapioDoDiaSelecionado(r.dados?.cardapio || []) });
        carregarHistoricos();
        carregarCatalogoAlimentos();
        sincronizarSistema();
        checarPendencias();
          
      } else { mostrarToast(res?.erro || 'Erro no processamento', 'erro'); }
    } catch {
      mostrarToast('Erro de rede ao salvar cardápio.', 'erro');
    } finally {
      setIsProcessando(false);
    }
  };

  const exportarCSV = async () => {
    setIsProcessando(true);
    try {
      const res = await fetch('/api/painel-cozinha/exportar-csv', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dados: dadosBIFiltrados || [] })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SESI_BI_Export_${getServerTime().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      mostrarToast('Matriz CSV Exportada!', 'sucesso');
    } catch (e) {
      mostrarToast('Erro ao exportar base de dados', 'erro');
    } finally { setIsProcessando(false); }
  };

  const carregarLogoSesiBase64 = async () => {
    try {
      const res = await fetch('/logo_deitada.png');
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const exportarPDF = async () => {
    if (!dadosMensais) return mostrarToast('Dados contábeis insuficientes.', 'erro');
    setIsProcessando(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('p', 'mm', 'a4');
      const logoBase64 = await carregarLogoSesiBase64();

      // 1. Cabeçalho Oficial Institucional SESI (Proporcional)
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 14, 8, 34, 18.9);
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(192, 82, 29); // Laranja SESI
      doc.text(`RELATÓRIO MENSAL DE DESEMPENHO INSTITUCIONAL`, 52, 15);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(`SESI Alimenta • Gestão de Nutrição Escolar, Produção e Sustentabilidade`, 52, 20);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`MÊS DE REFERÊNCIA: ${nomesMeses?.[mesAtual]?.toUpperCase() ?? ''} / ${anoAtual} | Emissão: ${getServerTime().toLocaleString('pt-BR')}`, 52, 25);

      // Linha separadora institucional
      doc.setDrawColor(210, 210, 215);
      doc.setLineWidth(0.4);
      doc.line(14, 29, 196, 29);

      // 2. Cálculos Globais do Mês
      const totalRef = Number(dadosMensais?.totalRefeicoes) || 0;
      const totalDietas = Number(dadosMensais?.totalDietas) || 0;
      const lixoSobraTotal = Number(dadosMensais?.lixoSobra) || 0;
      const lixoRestoTotal = Number(dadosMensais?.lixoResto) || 0;
      const desperdicioTotalKg = lixoSobraTotal + lixoRestoTotal;
      const dpcGeralG = totalRef > 0 ? ((desperdicioTotalKg * 1000) / totalRef).toFixed(1) : '0.0';
      const metaCriticaG = Number(parametros?.resto_per_capita_critico_g) || 45;
      const isCritico = Number(dpcGeralG) > metaCriticaG;

      // 3. Quadro Executivo de KPIs (4 Cards em Grid Compacto)
      const kpis = [
        { label: 'REFEIÇÕES SERVIDAS', valor: totalRef.toLocaleString('pt-BR'), sub: 'Volume total do mês', cor: [248, 248, 250], borda: [220, 220, 225] },
        { label: 'DIETAS CLÍNICAS', valor: totalDietas.toLocaleString('pt-BR'), sub: 'Atendimentos especiais', cor: [248, 248, 250], borda: [220, 220, 225] },
        { label: 'SOBRA LIMPA (CUBA)', valor: `${lixoSobraTotal.toFixed(1)} kg`, sub: 'Intacta na cozinha', cor: [255, 251, 235], borda: [253, 230, 138] },
        { 
          label: 'RESTO / DPC MÉDIO', 
          valor: `${lixoRestoTotal.toFixed(1)} kg • ${dpcGeralG}g`, 
          sub: isCritico ? 'ACIMA DA META' : 'DENTRO DA META', 
          cor: isCritico ? [254, 242, 242] : [240, 253, 244], 
          borda: isCritico ? [252, 165, 165] : [187, 247, 208],
          textColor: isCritico ? [185, 28, 28] : [22, 101, 52]
        }
      ];

      const cardW = 43.5;
      const cardH = 15;
      const startX = 14;
      const cardY = 32;

      kpis.forEach((kpi, idx) => {
        const x = startX + idx * (cardW + 2.7);
        doc.setFillColor(kpi.cor[0], kpi.cor[1], kpi.cor[2]);
        doc.setDrawColor(kpi.borda[0], kpi.borda[1], kpi.borda[2]);
        doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD');

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(110, 110, 110);
        doc.text(kpi.label, x + 2.5, cardY + 4);

        doc.setFontSize(9.5);
        doc.setFont("helvetica", "black");
        if (kpi.textColor) {
          doc.setTextColor(kpi.textColor[0], kpi.textColor[1], kpi.textColor[2]);
        } else {
          doc.setTextColor(24, 24, 27);
        }
        doc.text(kpi.valor, x + 2.5, cardY + 9.5);

        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        if (kpi.textColor) {
          doc.setTextColor(kpi.textColor[0], kpi.textColor[1], kpi.textColor[2]);
        } else {
          doc.setTextColor(140, 140, 140);
        }
        doc.text(kpi.sub, x + 2.5, cardY + 13.2);
      });

      // 4. Detalhamento Operacional Diário do Mês (Tabela Consolidada Compacta)
      const diasAuditados = (dadosMensais?.dias || []);
      const detalheData = diasAuditados.map(d => {
        const dataBR = d?.data ? String(d.data).split('-').reverse().join('/') : '';
        const refeicoesDia = Number(d?.refeicoes) || 0;
        const limpoDia = Number(d?.lixoLimpo) || 0;
        const sujoDia = Number(d?.lixoSujo) || 0;
        const totalLixoDia = limpoDia + sujoDia;
        const dpcDia = refeicoesDia > 0 ? ((totalLixoDia * 1000) / refeicoesDia).toFixed(1) : '0.0';
        return [
          dataBR,
          refeicoesDia.toLocaleString('pt-BR'),
          `${limpoDia.toFixed(1)} kg`,
          `${sujoDia.toFixed(1)} kg`,
          `${totalLixoDia.toFixed(1)} kg`,
          `${dpcDia} g/aluno`
        ];
      });

      autoTable(doc, {
        startY: 50,
        head: [['Data', 'Refeições', 'Sobra (Cuba)', 'Resto (Prato)', 'Desperdício Total', 'DPC Diário']],
        body: detalheData.length > 0 ? detalheData : [['-', 'Sem lançamentos no período', '-', '-', '-', '-']],
        foot: [[
          'TOTAIS / MÉDIAS',
          totalRef.toLocaleString('pt-BR'),
          `${lixoSobraTotal.toFixed(1)} kg`,
          `${lixoRestoTotal.toFixed(1)} kg`,
          `${desperdicioTotalKg.toFixed(1)} kg`,
          `${dpcGeralG} g/aluno`
        ]],
        theme: 'grid',
        headStyles: {
          fillColor: [192, 82, 29],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: 1.2
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [30, 30, 30],
          cellPadding: 1.05
        },
        footStyles: {
          fillColor: [24, 24, 27],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: 1.2
        },
        alternateRowStyles: {
          fillColor: [250, 250, 252]
        },
        margin: { left: 14, right: 14 }
      });

      // 5. Bloco de Homologação & Assinaturas
      const signY = 260;
      doc.setDrawColor(180, 180, 185);
      doc.setLineWidth(0.4);
      
      // Assinatura 1: Nutricionista
      doc.line(20, signY, 90, signY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("Nutricionista Responsável Técnica", 55, signY + 4, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text("CRN / Registro Profissional", 55, signY + 7.5, { align: 'center' });

      // Assinatura 2: Direção Escolar
      doc.line(120, signY, 190, signY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("Direção / Gestão da Unidade Escolar", 155, signY + 4, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text("SESI São Paulo", 155, signY + 7.5, { align: 'center' });

      // 6. Rodapé Oficial da Folha Única
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(130, 130, 130);
      doc.text(`SESI Alimenta • Documento gerado por: ${localStorage.getItem('usuario') || 'SESI'} • ${getServerTime().toLocaleString('pt-BR')}`, 14, 288);
      doc.text(`Folha Única (Página 1 de 1)`, 196, 288, { align: 'right' });

      doc.save(`SESI_Relatorio_Mensal_${nomesMeses?.[mesAtual] ?? ''}_${anoAtual}.pdf`);
      mostrarToast('Relatório Mensal emitido com sucesso em folha única!');
    } catch (e) {
      console.error(e);
      mostrarToast('Erro ao compilar PDF.', 'erro');
    } finally {
      setIsProcessando(false);
    }
  };

  const exportarDossieIA = async () => {
    setIsProcessando(true);
    try {
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF('p', 'mm', 'a4');
        const logoBase64 = await carregarLogoSesiBase64();

        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 14, 10, 38, 21.2);
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(147, 51, 234); // Roxo IA
        doc.text(`DOSSIÊ ANALÍTICO PARA INTELIGÊNCIA ARTIFICIAL`, 56, 18);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(`SESI Alimenta • Histórico Consolidado de Aceitação e Desperdício (12 Meses)`, 56, 24);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(70, 70, 70);
        doc.text(`Data da Extração: ${getServerTime().toLocaleString('pt-BR')} | Operador: ${localStorage.getItem('usuario') || 'SESI'}`, 56, 30);

        doc.setDrawColor(220, 220, 225);
        doc.setLineWidth(0.5);
        doc.line(14, 34, 196, 34);

        const promptIA = "Instrução para IA (LLM): Aja como um Nutricionista Chefe e Engenheiro de Dados Especialista em Alimentação Escolar. A tabela abaixo contém a apuração histórica dos últimos 12 meses da nossa operação de refeitório. Analise as tendências de aceitação dos alunos, correlacione o índice de rejeição (resto de prato) com a sobra limpa (superprodução) e forneça um plano de ação listando: (1) Pratos com alto desperdício a serem reformulados ou substituídos; (2) Pratos com alta aprovação; (3) Recomendações de ajuste de gramatura por turno.";

        doc.setFillColor(245, 243, 255);
        doc.setDrawColor(221, 214, 254);
        doc.roundedRect(14, 38, 182, 24, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(88, 28, 135);
        doc.setFont("helvetica", "normal");
        doc.text(promptIA, 18, 43, { maxWidth: 174, lineHeightFactor: 1.3 });

        const tableData = (historicoBI || []).map(d => {
            const total = (Number(d?.aprovacao) || 0) + (Number(d?.rejeicao) || 0);
            const taxa = total > 0 ? Math.round(((Number(d?.aprovacao) || 0) / total) * 100) : 0;
            
            return [
                d?.data || '',
                d?.turno || '',
                d?.lanche_padrao || 'N/I',
                (Number(d?.lixo_limpo) || 0).toFixed(2) + ' kg',
                (Number(d?.lixo_sujo) || 0).toFixed(2) + ' kg',
                `${taxa}%`
            ];
        });

        autoTable(doc, {
            startY: 66,
            head: [['Data', 'Turno', 'Preparação / Prato', 'Sobra Cuba (Kg)', 'Resto Prato (Kg)', 'Taxa Aprovação']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [88, 28, 135], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 7.5 },
            alternateRowStyles: { fillColor: [250, 248, 255] }
        });

        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(7.5);
          doc.setTextColor(130);
          doc.text(`SESI Alimenta • Dossiê de Inteligência Artificial • ${getServerTime().toLocaleDateString('pt-BR')}`, 14, 290);
          doc.text(`Página ${i} de ${totalPages}`, 196, 290, { align: 'right' });
        }

        doc.save('SESI_Dossie_Analitico_IA.pdf');
        mostrarToast('Dossiê para IA gerado com sucesso!');
    } catch (e) {
        mostrarToast('Erro ao gerar dossiê para IA.', 'erro');
    } finally {
        setIsProcessando(false);
    }
  };

  const exportarGuiaDietas = async () => {
    if (!dadosDashboard) return mostrarToast('Aguarde o carregamento dos dados do painel.', 'erro');
    setIsProcessando(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const logoBase64 = await carregarLogoSesiBase64();

      // 1. Cabeçalho Institucional Proporcional
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 14, 10, 38, 21.2);
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(192, 82, 29); // Laranja SESI
      doc.text(`FOLHA DE PRODUÇÃO & DISTRIBUIÇÃO DIÁRIA`, 56, 17);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(`SESI Alimenta • Operação de Refeitório & Nutrição Escolar`, 56, 23);

      const dataHojeFormatada = getServerTime().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 70);
      doc.text(`Data: ${dataHojeFormatada.toUpperCase()} | Operador: ${localStorage.getItem('usuario') || 'SESI'}`, 56, 29);

      doc.setDrawColor(220, 220, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 33, 196, 33);

      // 2. Quadro Resumo do Cardápio e Totais por Turno
      const confLM = Number(dadosDashboard?.LM?.confirmados) || 0;
      const dietasLM = Number(dadosDashboard?.LM?.dietas_total) || 0;
      const confA = Number(dadosDashboard?.A?.confirmados) || 0;
      const dietasA = Number(dadosDashboard?.A?.dietas_total) || 0;
      const confLT = Number(dadosDashboard?.LT?.confirmados) || 0;
      const dietasLT = Number(dadosDashboard?.LT?.dietas_total) || 0;

      const totalAlunosGeral = confLM + confA + confLT;
      const totalDietasGeral = dietasLM + dietasA + dietasLT;

      const resumoCardapio = [
        [
          'Lanche da Manhã (LM)',
          cardapioDoDiaSelecionado.find(c => c.tipo_refeicao === 'LM')?.lanche_padrao || 'Cardápio Padrão do Dia',
          cardapioDoDiaSelecionado.find(c => c.tipo_refeicao === 'LM')?.lanche_dieta || 'Dieta Especial',
          confLM.toString(),
          dietasLM.toString(),
          (confLM + dietasLM).toString()
        ],
        [
          'Almoço Geral (A)',
          cardapioDoDiaSelecionado.find(c => c.tipo_refeicao === 'A')?.lanche_padrao || 'Almoço Padrão do Dia',
          cardapioDoDiaSelecionado.find(c => c.tipo_refeicao === 'A')?.lanche_dieta || 'Almoço Dieta',
          confA.toString(),
          dietasA.toString(),
          (confA + dietasA).toString()
        ],
        [
          'Lanche da Tarde (LT)',
          cardapioDoDiaSelecionado.find(c => c.tipo_refeicao === 'LT')?.lanche_padrao || 'Lanche Tarde Padrão',
          cardapioDoDiaSelecionado.find(c => c.tipo_refeicao === 'LT')?.lanche_dieta || 'Dieta Especial',
          confLT.toString(),
          dietasLT.toString(),
          (confLT + dietasLT).toString()
        ],
        [
          'TOTAL PLANEJADO DO DIA',
          '-',
          '-',
          totalAlunosGeral.toString(),
          totalDietasGeral.toString(),
          (totalAlunosGeral + totalDietasGeral).toString()
        ]
      ];

      autoTable(doc, {
        startY: 36,
        head: [['Turno', 'Preparação Padrão', 'Dieta Especial', 'Alunos', 'Dietas', 'Total Produção']],
        body: resumoCardapio,
        theme: 'grid',
        headStyles: { fillColor: [192, 82, 29], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [253, 248, 246] }
      });

      // 3. Mapa Detalhado de Produção por Sala / Turma
      const turmasOrdenadas = [...(turmas || [])].sort((a, b) => {
        const nivelOrder = { 'Fundamental 1': 1, 'Fundamental 2': 2, 'Ensino Medio': 3, 'Ensino Tecnico (SENAI)': 4, 'Personaliza': 5 };
        const ordemA = nivelOrder[a.nivel] || 99;
        const ordemB = nivelOrder[b.nivel] || 99;
        if (ordemA !== ordemB) return ordemA - ordemB;
        if (Number(a.ano) !== Number(b.ano)) return Number(a.ano) - Number(b.ano);
        return String(a.identificador || '').localeCompare(String(b.identificador || ''));
      });

      const linhasPorSala = turmasOrdenadas.map(t => {
        const nomeSala = `${t.ano === 0 ? '' : t.ano + 'º '}${t.identificador || ''}`;
        const nivelFormatado = converterNivelVisual(t.nivel);

        // Busca dados nos turnos
        const confObjLM = dadosDashboard?.LM?.salas_confirmadas?.find(s => Number(s.id) === Number(t.id));
        const pendObjLM = dadosDashboard?.LM?.salas_pendentes?.find(s => Number(s.id) === Number(t.id));
        const confObjA = dadosDashboard?.A?.salas_confirmadas?.find(s => Number(s.id) === Number(t.id));
        const pendObjA = dadosDashboard?.A?.salas_pendentes?.find(s => Number(s.id) === Number(t.id));
        const confObjLT = dadosDashboard?.LT?.salas_confirmadas?.find(s => Number(s.id) === Number(t.id));
        const pendObjLT = dadosDashboard?.LT?.salas_pendentes?.find(s => Number(s.id) === Number(t.id));

        const strLM = confObjLM ? `${confObjLM.quantidade}` : pendObjLM ? 'Pendente' : '-';
        const strA = confObjA ? `${confObjA.quantidade}` : pendObjA ? 'Pendente' : '-';
        const strLT = confObjLT ? `${confObjLT.quantidade}` : pendObjLT ? 'Pendente' : '-';

        const totalAlunos = (confObjLM?.quantidade || 0) + (confObjA?.quantidade || 0) + (confObjLT?.quantidade || 0);
        const totalDietas = (confObjLM?.dietas || 0) + (confObjA?.dietas || 0) + (confObjLT?.dietas || 0);

        const statusGeral = (confObjLM || confObjA || confObjLT) ? 'Lançado' : (pendObjLM || pendObjA || pendObjLT) ? 'Aguardando' : 'N/A';

        return [
          nomeSala,
          nivelFormatado,
          strLM,
          strA,
          strLT,
          totalAlunos > 0 ? totalAlunos.toString() : '-',
          totalDietas > 0 ? totalDietas.toString() : '-',
          statusGeral,
          '[   ]'
        ];
      });

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      const startYSalas = doc.lastAutoTable.finalY + 7;
      doc.text("Detalhamento de Carga por Sala / Turma (Controle de Entrega)", 14, startYSalas);

      autoTable(doc, {
        startY: startYSalas + 3,
        head: [['Turma / Sala', 'Nível', 'Lanche Manhã', 'Almoço', 'Lanche Tarde', 'Total Presentes', 'Dietas', 'Status', 'Visto Cozinha']],
        body: linhasPorSala,
        theme: 'grid',
        headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [250, 250, 252] }
      });

      // 4. Detalhamento de Dietas Clínicas Especiais
      const todasDietasHoje = [];
      ['LM', 'A', 'LT'].forEach(turno => {
        const lista = dadosDashboard?.[turno]?.lista_dietas || [];
        lista.forEach(d => {
          todasDietasHoje.push([
            d?.nome || 'Aluno(a)',
            d?.sala || '-',
            mapNomesTurnos[turno] || turno,
            d?.restricao || 'Dieta Especial',
            'Porção Individual Identificada',
            '[   ]'
          ]);
        });
      });

      let startYDietas = doc.lastAutoTable.finalY + 7;
      
      // Se estourar a página, cria nova página
      if (startYDietas > 240) {
        doc.addPage();
        startYDietas = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(147, 51, 234);
      doc.text(`Relação Nominal de Dietas Clínicas Especiais (${todasDietasHoje.length} atendimentos)`, 14, startYDietas);

      if (todasDietasHoje.length > 0) {
        autoTable(doc, {
          startY: startYDietas + 3,
          head: [['Paciente Clínico / Aluno(a)', 'Turma / Sala', 'Turno', 'Prescrição Dietética', 'Procedimento Cozinha', 'Visto Entrega']],
          body: todasDietasHoje,
          theme: 'grid',
          headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7, textColor: [30, 30, 30] },
          alternateRowStyles: { fillColor: [253, 250, 255] }
        });
      } else {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120);
        doc.text("Nenhuma dieta clínica especial cadastrada para os presentes de hoje.", 14, startYDietas + 6);
      }

      // 5. Quadro de Fechamento Operacional e Assinaturas
      let startYFechamento = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : startYDietas + 15;
      if (startYFechamento > 245) {
        doc.addPage();
        startYFechamento = 20;
      }

      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(210, 215, 220);
      doc.roundedRect(14, startYFechamento, 182, 28, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
      doc.text("REGISTRO OPERACIONAL DE DISTRIBUIÇÃO & AUDITORIA DE PESAGEM", 18, startYFechamento + 6);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text("Horário Início Distribuição: [  ____ : ____  ]      Horário Término: [  ____ : ____  ]", 18, startYFechamento + 12);
      doc.text("Pesagem Sobra Limpa (Cuba): [  ________ kg  ]      Pesagem Resto Sujo (Prato): [  ________ kg  ]", 18, startYFechamento + 18);

      doc.text("Assinatura Cozinheiro(a): ___________________________      Nutricionista Resp.: ___________________________", 18, startYFechamento + 24);

      // Rodapés com numeração
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(130);
        doc.text(`SESI Alimenta • Folha de Produção Diária • Emitido em: ${getServerTime().toLocaleString('pt-BR')}`, 14, 290);
        doc.text(`Página ${i} de ${totalPages}`, 196, 290, { align: 'right' });
      }
      
      doc.save(`SESI_Folha_Producao_${getServerTime().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
      mostrarToast('Folha de Produção gerada com sucesso!');
    } catch (e) {
      console.error(e);
      mostrarToast('Erro ao gerar Folha de Produção.', 'erro');
    } finally {
      setIsProcessando(false);
    }
  };

  const alternarTurmaSelecionada = (id) => { setTurmasSelecionadas(prev => (prev || []).includes(id) ? prev.filter(t => t !== id) : [...(prev || []), id]); };

  const converterNivelVisual = (nivel) => { 
      if (!nivel) return '';
      const n = String(nivel).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (n === 'Fundamental 1') return 'Fund I'; 
      if (n === 'Fundamental 2') return 'Fund II'; 
      if (n === 'Ensino Tecnico (SENAI)') return 'Técnico'; 
      if (n === 'Ensino Medio') return 'EM'; 
      return n; 
  };
  
  const renderAno = (ano) => (ano && ano !== 0) ? ano + 'º ' : '';

  const dateCardapio = new Date(anoAtual, mesAtual, diaSelecionado);
  const diaSemanaCardapio = dateCardapio.getDay();
  
  const turmasValidasParaCardapio = useMemo(() => {
    return (turmas || []).filter(t => {
     if (!t?.nivel) return false;
     const n = String(t.nivel).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
     if (n === 'Fundamental 1') {
         if (diaSemanaCardapio === 3) return ['LM'].includes(refeicaoCardapio);
         return ['LM', 'A', 'LT'].includes(refeicaoCardapio);
     }
    if (n === 'Fundamental 2') return (Number(t?.ano) === 9 ? ['LM'] : ['LT']).includes(refeicaoCardapio);
     if (n === 'Ensino Tecnico (SENAI)') {
        const isDia2Ano = t?.ano === 2 && (diaSemanaCardapio === 2 || diaSemanaCardapio === 4);
        const isDia3Ano = t?.ano === 3 && (diaSemanaCardapio === 1 || diaSemanaCardapio === 5);
        return (isDia2Ano || isDia3Ano) && ['LM', 'A', 'LT'].includes(refeicaoCardapio);
     }
     if (n === 'Ensino Medio') {
        const is2AnoFora = t?.ano === 2 && (diaSemanaCardapio === 2 || diaSemanaCardapio === 4);
        const is3AnoFora = t?.ano === 3 && (diaSemanaCardapio === 1 || diaSemanaCardapio === 5);
        if (is2AnoFora || is3AnoFora) return false;
        return ['LM'].includes(refeicaoCardapio);
     }
     if (n === 'Personaliza') {
        // REGRA FASE 3: Flexibilidade do Personaliza. A cozinha pode agendar para qualquer dia.
        return ['A'].includes(refeicaoCardapio);
     }
     return false;
  });
  }, [turmas, refeicaoCardapio, diaSemanaCardapio]);

  const analyticsResult = useMemo(() => {
    return processarAnalyticsBI(historicoBI, { filtroTurnoBI, biDataInicio, biDataFim }, { lancheA, lancheB, formatarDataSimples, mapNomesTurnos });
  }, [historicoBI, filtroTurnoBI, biDataInicio, biDataFim, lancheA, lancheB]);

  const {
    dadosBIFiltrados = [],
    listaPratosGlobal = [],
    topAceitacao = [],
    topSujo = [],
    topLimpo = [],
    radarData = [],
    metricas = {},
    muralFeedbacks = []
  } = analyticsResult || {};

  const { 
    sumSobra = 0, 
    sumResto = 0, 
    sumPresenca = 0, 
    sumGostaram = 0, 
    producaoEstimada = 0, 
    dpcValor = 0, 
    ialValor = 0, 
    troValor = 0 
  } = metricas || {};

  const avisosOperacionaisDoDia = useMemo(() => {
    const hoje = getServerTime();
    const diaSemana = hoje.getDay();
    const avisos = [];

    // Quarta-feira: Fundamental 1 tem saída antecipada (não almoça nem lancha à tarde)
    if (diaSemana === 3 && (abaTurno === 'A' || abaTurno === 'LT')) {
      avisos.push({
        id: 'fund1_quarta',
        texto: 'Quarta-feira: Turmas do Fundamental 1 têm saída antecipada e não entram no Almoço / Lanche da Tarde.'
      });
    }

    return avisos;
  }, [abaTurno]);
  
  if (!dadosDashboard) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm font-bold text-zinc-400 uppercase tracking-widest animate-pulse flex items-center gap-2">
        <LoadingIcon /> Conectando ao Servidor Institucional...
      </div>
    </div>
  );
  
  const turnoAtual = dadosDashboard?.[abaTurno] || { confirmados: 0, projecao_extra: 0, salas_pendentes: [], salas_confirmadas: [], dietas_total: 0, lista_dietas: [], extras_total: 0, lista_extras: [] };

  const getNomeTurmaVisual = (id) => {
    const t = (turmas || []).find(turma => turma?.id === id);
    return t ? `${t.ano !== 0 ? (t.ano ? t.ano + 'º ' : '') : ''}${t?.identificador || ''} (${converterNivelVisual(t?.nivel)})` : `Sala ${id}`;
  };

  const turmaBaseSelecionada = (turmas || []).find(t => t?.id === Number(salaRegularId));
  const anoBase = turmaBaseSelecionada ? turmaBaseSelecionada.ano : null;

  return (
    <div className="min-h-screen font-sans selection:bg-primaria selection:text-white pb-20 relative">
      <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in relative z-10 bg-white rounded-[2rem] shadow-xl my-6 border border-zinc-100">
        <div className="fixed top-4 right-4 z-[70] flex flex-col gap-3">
          {(alertasCorrecao || []).map(alerta => (
             <div key={alerta.id} className={`p-4 rounded-2xl shadow-2xl border-2 flex items-center gap-4 animate-slide-in-right bg-white ${alerta.tipo === 'aumento' ? 'border-orange-500' : 'border-blue-500'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black shrink-0 ${alerta.tipo === 'aumento' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                   {alerta.mudanca}
                </div>
                <div>
                   <h4 className="font-black text-zinc-900 text-sm">{alerta.tipo === 'queda_extra' ? 'Cancelamento Extra' : `Mudança na Chamada (${alerta.turno})`}</h4>
                   <p className="text-xs font-bold text-zinc-500 mt-1">
                     {alerta.tipo === 'queda_extra' ? 
                       <>O pedido de contraturno de <strong className="text-blue-600">{alerta.aluno}</strong> foi cancelado pelo docente.</> 
                       : 
                       <>A sala <strong className="text-primaria">{alerta.sala}</strong> atualizou o envio.</>
                     }
                   </p>
                </div>
               <button onClick={() => dispensarAlerta(alerta.id)} className="ml-4 text-zinc-400 hover:text-zinc-600 font-bold p-2 flex items-center"><X className="w-4 h-4" /></button>
            </div>
         ))}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <>
          {modalFuzzy.visivel && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModalFuzzy({ visivel: false, sugestao: '', digitado: '' })}>
               <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in text-center border border-zinc-200 my-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                     <HelpCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-zinc-800 mb-2">Prato Similar Encontrado</h3>
                  <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
                    Você digitou "<strong className="text-red-500">{modalFuzzy.digitado}</strong>", mas já existe "<strong className="text-green-600">{modalFuzzy.sugestao}</strong>" no banco. Deseja unificar os nomes para manter a limpeza dos gráficos de B.I.?
                  </p>
                  <div className="flex flex-col gap-3">
                     <button onClick={() => {
                        if (inputLanchePadrao?.toLowerCase().trim() === modalFuzzy.digitado.toLowerCase()) setLanchePadrao(modalFuzzy.sugestao);
                        if (inputPratoPrincipal?.toLowerCase().trim() === modalFuzzy.digitado.toLowerCase()) setPratoPrincipal(modalFuzzy.sugestao);
                        if (inputLancheDieta?.toLowerCase().trim() === modalFuzzy.digitado.toLowerCase()) setLancheDieta(modalFuzzy.sugestao);
                        setModalFuzzy({ visivel: false, sugestao: '', digitado: '' });
                        mostrarToast("Nomes unificados! Clique em Aplicar Novamente.", "sucesso");
                     }} className="bg-primaria text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-colors shadow-md uppercase tracking-wider text-xs">
                        Sim, Unificar com "{modalFuzzy.sugestao}"
                     </button>
                     <button onClick={() => {
                        setModalFuzzy({ visivel: false, sugestao: '', digitado: '' });
                        salvarItemCalendario(true); 
                     }} className="bg-zinc-100 text-zinc-600 font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider text-xs">
                        Não, Cadastrar Novo
                     </button>
                  </div>
               </div>
            </div>
          )}

          {/* MODAL DE RESOLUÇÃO N/A (FASE 4.2) */}
          {modalRetroativo && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModalRetroativo(null)}>
               <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-fade-in border border-red-200 my-auto" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-xl font-black text-red-700 mb-2">Ajuste Retroativo</h3>
                  <p className="text-zinc-500 text-sm mb-6 font-bold">Vincule os lanches que foram servidos nesta sala específica.</p>
                  
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-6 flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-red-400">Turma Selecionada</span>
                    <strong className="text-red-900 text-sm">{(() => {
                      const turma = (turmas || []).find(t => t?.id === modalRetroativo.turma_id);
                      return turma ? `${turma.ano ? turma.ano + 'º ' : ''}${turma.identificador || ''} (${converterNivelVisual(turma.nivel)})` : `ID ${modalRetroativo.turma_id}`;
                    })()}</strong>
                    <span className="text-xs font-bold text-red-700 mt-1">{formatarDataSimples(modalRetroativo.data)} - {mapNomesTurnos?.[modalRetroativo.turno] || modalRetroativo.turno}</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                        {modalRetroativo.turno === 'A' ? 'Prato Principal (Mistura) Servido' : 'Lanche Principal Servido'}
                      </label>
                      <CustomDropdown 
                        valor={formPendencia.lanchePadrao} 
                        aoMudar={(val) => setFormPendencia({...formPendencia, lanchePadrao: val})} 
                        placeholder={modalRetroativo.turno === 'A' ? "Mistura / Proteína servida..." : "Busque a receita correta..."} 
                        opcoes={modalRetroativo.turno === 'A' ? (obterOpcoesCatalogo('prato_principal').length > 0 ? obterOpcoesCatalogo('prato_principal') : lanchesCadastrados) : (obterOpcoesCatalogo('lanche').length > 0 ? obterOpcoesCatalogo('lanche') : lanchesCadastrados)} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-blue-500 mb-1">
                        {modalRetroativo.turno === 'A' ? 'Mistura Adaptada / Dieta (Se Houve)' : 'Lanche Adaptado / Dieta (Se Houve)'}
                      </label>
                      <CustomDropdown 
                        valor={formPendencia.lancheDieta} 
                        aoMudar={(val) => setFormPendencia({...formPendencia, lancheDieta: val})} 
                        placeholder="Deixe em branco se N/A..." 
                        opcoes={modalRetroativo.turno === 'A' ? (obterOpcoesCatalogo('prato_principal').length > 0 ? obterOpcoesCatalogo('prato_principal') : lanchesCadastrados) : (obterOpcoesCatalogo('lanche').length > 0 ? obterOpcoesCatalogo('lanche') : lanchesCadastrados)} 
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                    <button onClick={() => setModalRetroativo(null)} className="flex-1 bg-zinc-100 text-zinc-600 font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider text-xs">Cancelar</button>
                    <button onClick={resolverCardapioPendente} disabled={isProcessando} className="flex-1 bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 transition-colors uppercase tracking-wider text-xs flex justify-center items-center gap-2">
                       {isProcessandoUI ? <LoadingIcon /> : 'Vincular Prato'}
                    </button>
                  </div>
               </div>
            </div>
          )}

          {modalExclusao.visivel && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModalExclusao({ visivel: false, id: null })}>
               <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-zinc-200 animate-slide-in-right my-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><AlertTriangle style={{ width: '1em', height: '1em' }} className="inline-block" /></div>
                  <h3 className="text-xl font-black text-zinc-800 mb-2 text-center">Confirmar Exclusão</h3>
                  <p className="text-zinc-500 text-sm mb-6 text-center">Tem certeza que deseja apagar esta ficha clínica? A ação não pode ser desfeita.</p>
                  
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setModalExclusao({ visivel: false, id: null })} className="flex-1 bg-zinc-100 text-zinc-600 font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider text-xs">Cancelar</button>
                    <button type="button" onClick={confirmarExclusaoDieta} disabled={isProcessando} className="flex-1 bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 transition-colors uppercase tracking-wider text-xs disabled:opacity-50">
                      {isProcessandoUI ? <LoadingIcon /> : 'Confirmar Exclusão'}
                    </button>
                  </div>
               </div>
            </div>
          )}

          {modalSobrescrita && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModalSobrescrita(false)}>
               <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-yellow-200 animate-slide-in-right my-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><AlertTriangle style={{ width: '1em', height: '1em' }} className="inline-block" /></div>
                  <h3 className="text-xl font-black text-zinc-800 mb-2 text-center">Substituir Auditoria?</h3>
                  <p className="text-zinc-500 text-sm mb-6 text-center leading-relaxed">
                    A pesagem deste turno já foi realizada hoje. Deseja sobrepor os valores antigos com a nova medição?
                  </p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setModalSobrescrita(false)} disabled={isProcessando} className="flex-1 bg-zinc-100 text-zinc-600 font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider text-xs">
                      Cancelar
                    </button>
                    <button type="button" onClick={() => salvarLixo(true)} disabled={isProcessando} className="flex-1 bg-yellow-500 text-white font-bold py-3.5 rounded-xl hover:bg-yellow-600 transition-colors uppercase tracking-wider text-xs shadow-md flex justify-center items-center gap-2">
                      {isProcessandoUI ? <LoadingIcon /> : 'Sim, Sobrescrever'}
                    </button>
                  </div>
               </div>
            </div>
          )}

          {modalPreditivo.visivel && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setModalPreditivo({ visivel: false, prato: '', rejeicao: 0 })}>
               <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-orange-200 animate-slide-in-right my-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><AlertTriangle style={{ width: '1em', height: '1em' }} className="inline-block" /></div>
                  <h3 className="text-xl font-black text-zinc-800 mb-2 text-center">Alerta Preditivo</h3>
                  <p className="text-zinc-500 text-sm mb-6 text-center leading-relaxed">
                     O prato "<strong className="text-orange-600">{modalPreditivo.prato}</strong>" tem uma rejeição histórica de <strong>{modalPreditivo.rejeicao}%</strong> (acima da margem limite de {parametros.taxa_rejeicao_alerta_percentual}%).
                    <br/><br/>Deseja manter o agendamento? Recomendamos reduzir o volume físico de produção.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={() => { setModalPreditivo({ visivel: false, prato: '', rejeicao: 0 }); salvarItemCalendario(false, true); }} disabled={isProcessando} className="bg-orange-600 text-white font-bold py-3.5 rounded-xl hover:bg-orange-700 transition-colors uppercase tracking-wider text-xs shadow-md">
                      Sim, Manter Agendamento
                    </button>
                    <button type="button" onClick={() => setModalPreditivo({ visivel: false, prato: '', rejeicao: 0 })} disabled={isProcessando} className="bg-zinc-100 text-zinc-600 font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider text-xs">
                      Não, Cancelar e Ajustar
                    </button>
                  </div>
               </div>
            </div>
          )}
        </>,
        document.body
      )}


      
      <ToastAlert visivel={notificacao.visivel} tipo={notificacao.tipo} texto={notificacao.texto} />

      {/* 1. ALERTA: CARDÁPIO DE HOJE FALTANTE */}
      {(pendencias?.cardapios_hoje_faltantes || []).length > 0 && (
        <div className="bg-orange-50 border border-orange-400 rounded-3xl p-6 shadow-md mb-6 relative overflow-hidden animate-slide-in-right">
          <div className="absolute top-[-20px] right-[-20px] p-6 opacity-5 text-[100px] select-none pointer-events-none text-orange-900"><AlertTriangle style={{ width: '1em', height: '1em' }} className="inline-block" /></div>
          <div className="relative z-10">
            <h3 className="text-lg font-black uppercase tracking-widest text-orange-800 mb-2 flex justify-between items-center">
              <span className="flex items-center gap-2"><span className="text-2xl"><AlertOctagon style={{ width: '1em', height: '1em' }} className="inline-block" /></span> Alerta de Cardápio Pendente (Hoje)</span>
              <span className="bg-orange-200 text-orange-900 px-3 py-1 rounded-lg text-xs">
                Falta em {new Set((pendencias?.cardapios_hoje_faltantes || []).map(p => p?.turma_id)).size} Salas
              </span>
            </h3>
            <p className="text-sm text-orange-700 font-medium mb-4">
              A cozinha ainda não enviou o cardápio programado para hoje. Os professores não saberão o que será servido na hora da chamada.
            </p>
            <button onClick={() => setVisaoAtiva('planejamento')} className="w-full bg-orange-600 text-white hover:bg-orange-700 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm">
              Ir para o Calendário e Lançar Agora
            </button>
          </div>
        </div>
      )}

      {/* 2. ALERTA: LIXO NÃO AUDITADO (ONTEM) */}
      {(pendencias?.turnos_sem_lixo || []).length > 0 && (
        <div className="bg-red-50 border border-red-400 rounded-3xl p-6 shadow-md mb-6 relative overflow-hidden animate-slide-in-right">
          <div className="absolute top-[-20px] right-[-20px] p-6 opacity-5 select-none pointer-events-none text-red-900"><Trash2 className="w-28 h-28" /></div>
          <div className="relative z-10">
            <h3 className="text-lg font-black uppercase tracking-widest text-red-800 mb-2 flex items-center gap-2">
              <span className="text-2xl"><AlertOctagon style={{ width: '1em', height: '1em' }} className="inline-block" /></span> Lixo Não Auditado ({formatarDataSimples(pendencias?.data_lixo_pendente)})
            </h3>
            <p className="text-sm text-red-700 font-medium mb-4">A equipe encerrou o dia sem lançar as sobras e restos. Resolva as pendências abaixo:</p>
            <div className="space-y-4">
              {(pendencias?.turnos_sem_lixo || []).map(turno => (
                <div key={turno} className="bg-white p-4 border border-red-200 rounded-2xl shadow-sm">
                  <h4 className="font-black text-red-800 mb-3 uppercase tracking-wider text-sm">Pesagem Obrigatória: {mapNomesTurnos?.[turno] || turno}</h4>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Sobra Intacta (Kg)</label>
                      <input type="number" min="0" step="0.1" value={pesosLixo?.[turno]?.limpo ?? ''} onChange={(e) => atualizarInputLixo(turno, 'limpo', e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-red-500" placeholder="0.0" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Resto de Prato (Kg)</label>
                      <input type="number" min="0" step="0.1" value={pesosLixo?.[turno]?.sujo ?? ''} onChange={(e) => atualizarInputLixo(turno, 'sujo', e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-red-500" placeholder="0.0" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={() => salvarLixo(false, turno)} disabled={isProcessando || pesosLixo?.[turno]?.limpo === '' || pesosLixo?.[turno]?.sujo === ''} className="w-full md:w-auto bg-red-600 text-white font-black px-8 py-3 rounded-xl uppercase tracking-widest text-xs hover:bg-red-700 disabled:opacity-50 h-[46px] flex items-center justify-center">
                         {isProcessandoUI ? <LoadingIcon /> : 'Gravar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. ALERTA: LANÇAMENTOS N/A RETROATIVOS */}
      {(pendencias?.cardapios_retroativos || []).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-400 rounded-3xl p-6 shadow-md mb-8 relative overflow-hidden animate-slide-in-right">
          <div className="absolute top-[-20px] right-[-20px] p-6 opacity-5 text-[100px] select-none pointer-events-none text-yellow-900"><AlertTriangle style={{ width: '1em', height: '1em' }} className="inline-block" /></div>
          <div className="relative z-10">
            <h3 className="text-lg font-black uppercase tracking-widest text-yellow-800 mb-2 flex items-center gap-2">
              <span className="text-2xl"><AlertOctagon style={{ width: '1em', height: '1em' }} className="inline-block" /></span> Lançamentos "N/A" (Ajuste Retroativo)
            </h3>
            <p className="text-sm text-yellow-700 font-medium mb-4">Professores enviaram chamadas, mas a cozinha não havia cadastrado a refeição no sistema. Resolva para cada sala:</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
              {Object.values((pendencias?.cardapios_retroativos || []).reduce((acc, pend) => {
                 const key = `${pend?.data}_${pend?.turma_id}`;
                 if (!acc[key]) acc[key] = { ...pend, turnos_pendentes: [] };
                 acc[key].turnos_pendentes.push(pend);
                 return acc;
              }, {})).map(grupo => {
                const turmaObj = (turmas || []).find(t => t?.id === grupo?.turma_id);
                const nomeTurma = turmaObj ? `${turmaObj.ano ? turmaObj.ano + 'º ' : ''}${turmaObj.identificador || ''} (${converterNivelVisual(turmaObj.nivel)})` : `ID ${grupo?.turma_id}`;
                
                return (
                  <div key={`${grupo?.data}_${grupo?.turma_id}`} className="flex justify-between items-center bg-white border border-yellow-200 p-4 rounded-xl shadow-sm hover:border-yellow-400 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                         {(grupo?.turnos_pendentes || []).map(p => (
                           <span key={p?.id_pendencia} className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-black text-[9px] uppercase border border-yellow-200">{mapNomesTurnos?.[p?.turno] || p?.turno}</span>
                         ))}
                         <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{formatarDataSimples(grupo?.data)}</span>
                      </div>
                      <span className="text-sm font-bold text-zinc-800">{nomeTurma}</span>
                    </div>
                    <button onClick={() => setModalRetroativo(grupo?.turnos_pendentes?.[0])} className="bg-yellow-500 text-white hover:bg-yellow-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm">
                      Resolver ({(grupo?.turnos_pendentes || []).length})
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mb-10 flex flex-col xl:flex-row bg-white rounded-[2rem] shadow-sm border border-zinc-100 overflow-hidden border-l-[6px] border-l-primaria ">
        
        <div className="flex items-center gap-4 p-5 xl:pr-10 xl:border-r border-zinc-100 shrink-0 w-full xl:w-auto pl-6 bg-white z-10 relative">
          <div className="w-14 h-14 bg-primaria text-white rounded-full flex items-center justify-center shadow-inner shrink-0">
            <Salad className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-zinc-900 font-black text-xl tracking-tight mb-0.5">Centro de Nutrição</h2>
            <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> 
              Sistema ERP Sincronizado
              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-[9px] capitalize tracking-normal border border-green-100 font-bold ml-1">Online</span>
            </div>
          </div>
        </div>

        <div className="flex w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { id: 'producao', label: 'Produção', icon: <IconBarChart className="w-6 h-6" /> },
            { id: 'planejamento', label: 'Calendário', icon: <CalendarDays className="w-6 h-6" /> },
            { id: 'dietas', label: 'Dietas', icon: <Columns2 className="w-6 h-6" /> },
            { id: 'desperdicio', label: 'B.I. & Feedbacks', icon: <IconLineChart className="w-6 h-6" /> },
            { id: 'relatorios', label: 'Relatórios', icon: <FileText className="w-6 h-6" /> },
            { id: 'parametros', label: 'Parâmetros', icon: <Settings className="w-6 h-6" /> }
          ].map((tab, idx) => {
            const ativo = visaoAtiva === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setVisaoAtiva(tab.id)} 
                className={`flex-1 min-w-[130px] flex flex-col items-center justify-center py-5 px-2 transition-all duration-300 border-r border-zinc-100 last:border-r-0 relative group ${
                  ativo ? 'bg-orange-50/40' : 'bg-white hover:bg-zinc-50'
                }`}
              >
                {ativo && <div className="absolute bottom-0 left-6 right-6 h-[4px] bg-primaria rounded-t-full"></div>}
                <span className={`mb-1.5 transition-all duration-300 ${ativo ? 'scale-110 text-primaria' : 'text-zinc-400 group-hover:text-zinc-600'}`}>{tab.icon}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${ativo ? 'text-primaria' : 'text-zinc-500 group-hover:text-zinc-700'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {visaoAtiva === 'producao' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex bg-zinc-200 p-1 rounded-xl max-w-md shadow-inner">
              {['LM', 'A', 'LT'].map(t => (
                <button key={t} onClick={() => setAbaTurno(t)} className={`flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${abaTurno === t ? 'bg-white text-primaria shadow-sm border border-zinc-100' : 'text-zinc-500 hover:text-zinc-700'}`}>{mapNomesTurnos?.[t] || t}</button>
              ))}
            </div>
          </div>

          {/* AVISO INSTITUCIONAL ELEGANTE DE QUARTA-FEIRA */}
          {avisosOperacionaisDoDia.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300/60 rounded-2xl p-3.5 flex items-center justify-between gap-4 animate-fade-in shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300/40">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                      Regra de Quarta-feira
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  </div>
                  <p className="text-xs font-medium text-amber-800/90 leading-tight mt-0.5">
                    Turmas do <strong>Fundamental 1</strong> possuem horário reduzido hoje e não participam deste turno.
                  </p>
                </div>
              </div>
              <span className="bg-amber-100/90 text-amber-900 border border-amber-300/50 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg shrink-0 hidden md:inline-block">
                Fund I Sem Almoço / LT
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-green-50 border border-green-300 rounded-2xl p-6 flex flex-col justify-center relative shadow-sm ">
              <div className="flex justify-between items-start">
                 <span className="text-xs font-black text-green-700 uppercase tracking-widest mb-1">{mapNomesTurnos?.[abaTurno] || abaTurno}</span>
                 <button onClick={() => setMostrarRaioX(!mostrarRaioX)} className="bg-white border border-green-200 text-green-700 px-3 py-1 text-xs font-black rounded-lg shadow-sm hover:bg-green-100 transition-colors uppercase tracking-wider">
                   {mostrarRaioX ? 'Ocultar Detalhes' : 'Ver Raio-X por Sala'}
                 </button>
              </div>
              
              <div className="text-7xl font-black text-green-600 tracking-tight flex items-end">
                {turnoAtual?.confirmados || 0}
              </div>
              
              <div className="text-sm font-bold text-green-800 mt-1 flex items-center">
                Refeições Padrão <InfoTooltip texto="Fórmula: (Total de Alunos Presentes no Turno) subtraído do (Total de Pacientes com Dieta do Turno). Essa é a contagem real para a panela principal." />
              </div>
              <p className="text-[10px] font-bold text-green-600/80 uppercase tracking-widest mt-1">
                Presença Física Geral: {(Number(turnoAtual?.confirmados) || 0) + (Number(turnoAtual?.dietas_total) || 0)} | Dietas Retiradas: {turnoAtual?.dietas_total || 0}
              </p>

              {mostrarRaioX && (
                 <div className="mt-6 pt-4 border-t border-green-200 grid grid-cols-2 sm:grid-cols-3 gap-4 animate-fade-in">
                    {agrupamentoTurmas.map(nivel => {
                       const salas = (turnoAtual?.salas_confirmadas || []).filter(s => s?.nivel === nivel);
                       if (salas.length === 0) return null;
                       return (
                          <div key={nivel} className="bg-white p-3 rounded-xl shadow-sm border border-green-100">
                             <h4 className="text-[10px] font-black uppercase text-zinc-400 border-b border-zinc-100 pb-1 mb-2">{nivel}</h4>
                                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                {salas.map((s, i) => (
                                  <div key={i} className="flex justify-between items-center text-[11px] font-bold text-zinc-700 mb-1 border-b border-zinc-50 pb-1 last:border-0">
                                    <span className="truncate pr-2">{s?.sala}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {(Number(s?.quantidade_extra) || 0) > 0 && (
                                        <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 text-[9px] uppercase tracking-widest" title="Alunos de Contraturno">
                                          +{s?.quantidade_extra} extra
                                        </span>
                                      )}
                                      <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{s?.quantidade || 0}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                          </div>
                       )
                    })}
                 </div>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col justify-center shadow-sm ">
              <span className="text-xs font-black text-blue-700 uppercase tracking-widest mb-1">Refeições Especiais</span>
              <div className="text-6xl font-black text-blue-600 tracking-tight">{turnoAtual?.dietas_total || 0}</div>
              <div className="text-sm font-bold text-blue-800 mt-1 flex items-center">
                Preparos Especiais. <InfoTooltip texto="Pacientes que exigem preparo individualizado. Verifique a lista nominal abaixo para os diagnósticos e salas." />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`p-6 rounded-2xl border shadow-sm ${(turnoAtual?.salas_pendentes || []).length > 0 ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-200'}`}>
              <h3 className="text-xs font-black uppercase tracking-widest mb-3 text-zinc-700 flex items-center gap-2"><Hourglass className="w-4 h-4 text-orange-500"/> Salas com Atraso</h3>
              {(turnoAtual?.salas_pendentes || []).length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-red-700 flex items-center gap-1">
                     Professores pendentes de lançamento. <InfoTooltip texto="Copie os nomes das salas e cobre no grupo do WhatsApp." />
                  </div>
                <div className="flex flex-col gap-2 pt-2 h-56 overflow-y-auto pr-2">
                {(turnoAtual?.salas_pendentes || []).map((s, i) => (
                      <div key={i} className="bg-white border border-red-200 px-3 py-2 rounded-lg text-xs font-black text-red-700 flex justify-between">
                        {s} <span className="text-red-400">Pendente</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500">
                   <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-3"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>
                   <p className="font-bold text-xs uppercase tracking-wider">100% Sincronizado</p>
                </div>
              )}
            </div>
            
            <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col h-full max-h-[400px] ">
              <h3 className="text-xs font-black uppercase tracking-widest mb-4 text-zinc-600 border-b border-zinc-100 pb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4"/> Lista de Preparo Especial (Nominal)</h3>
              <div className="overflow-y-auto flex-1 pr-2">
                {(turnoAtual?.lista_dietas || []).length === 0 ? (
                  <div className="text-zinc-400 font-bold text-xs italic text-center py-20 flex flex-col items-center">
                    <Utensils className="w-10 h-10 mb-2 text-zinc-300" /> Nenhum paciente alocado neste turno.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(turnoAtual?.lista_dietas || []).map((d, i) => (
                      <div key={i} className="flex justify-between items-center bg-zinc-50 hover:bg-zinc-100 transition-colors p-3 rounded-xl border border-zinc-200 text-xs gap-2">
                        <div className="flex-1 pr-2">
                          <strong className="text-zinc-800 text-sm block md:inline">{d?.nome}</strong>
                          <span className="md:ml-2 text-zinc-500 font-bold text-[10px] uppercase bg-white px-2 py-0.5 rounded border border-zinc-200 inline-block mt-1 md:mt-0">Sala {d?.sala}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end max-w-[55%]">
                          {(Array.isArray(d?.restricoes) && d.restricoes.length > 0 
                            ? d.restricoes 
                            : (d?.restricao ? d.restricao.split(' • ') : ['Especial'])
                          ).map((tag, tagIdx) => (
                            <span key={tagIdx} className="bg-blue-100 border border-blue-200 text-blue-800 font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider text-[10px] shadow-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BLOCO ALMOÇO EXTRA */}
          {(turnoAtual?.extras_total || 0) > 0 && (
            <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6 shadow-sm mt-6 animate-slide-in-right ">
              <div className="flex justify-between items-center mb-4 border-b border-orange-200 pb-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-orange-800 flex items-center gap-2">
                  <span className="flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-orange-600"/> Contraturno Aprovado (Almoço Extra)</span>
                </h3>
                <span className="bg-orange-600 text-white font-black px-3 py-1 rounded-lg text-xs">
                  +{turnoAtual?.extras_total || 0} na Panela
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(turnoAtual?.lista_extras || []).map((extra, i) => (
                  <div key={i} className="bg-white border border-orange-200 p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <strong className="text-zinc-800 text-sm block">{extra?.nome}</strong>
                        {extra?.is_dieta === 1 && (
                          <span className="inline-block mt-1 bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">
                            <AlertTriangle style={{ width: '1em', height: '1em' }} className="inline-block" /> Dieta Especial
                          </span>
                        )}
                      </div>
                      <span className="bg-zinc-100 text-zinc-600 font-black px-2 py-0.5 rounded text-[10px] uppercase border border-zinc-200 ml-2">
                        Nº {extra?.chamada} | {extra?.sala}
                      </span>
                    </div>
                    <p className="text-xs text-orange-700 font-bold mb-1 truncate" title={extra?.motivo}>Motivo: {extra?.motivo}</p>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-100 px-2 py-1 rounded inline-block">
                      Data(s): {extra?.datas}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          )}

          <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm mt-8 border-t-[6px] border-t-zinc-800 ">

            <h2 className="text-2xl font-black text-zinc-800 mb-2 flex items-center gap-3">

              Auditoria de Sobras ({mapNomesTurnos?.[abaTurno] || abaTurno})

            </h2>

            <p className="text-zinc-500 font-medium text-sm mb-6 border-b border-zinc-100 pb-4">Insira o peso balança de encerramento do turno atual.</p>

            

            {(() => {

              const dHoje = new Date(getServerTime().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
              const horaH = dHoje.getHours();

              const bloqueioAuditoria = 

                (abaTurno === 'LM' && horaH < 8) ? 'Pesagem bloqueada. Aguarde a metade do Lanche da Manhã (08h00).' :

                (abaTurno === 'A' && horaH < 11) ? 'Pesagem bloqueada. Aguarde a metade do Almoço (11h00).' :

                (abaTurno === 'LT' && horaH < 14) ? 'Pesagem bloqueada. Aguarde a metade do Lanche da Tarde (14h00).' : null;

              const dataHojeIso = `${dHoje.getFullYear()}-${String(dHoje.getMonth() + 1).padStart(2, '0')}-${String(dHoje.getDate()).padStart(2, '0')}`;


                const auditoriaJaFeita = (historicoBI || []).find(h => 
                  h?.data?.startsWith(dataHojeIso) && 
                  h?.turno === abaTurno && 
                  (parseFloat(h?.lixo_limpo || 0) > 0 || parseFloat(h?.lixo_sujo || 0) > 0)
                );

              if (bloqueioAuditoria) {

                return (

                  <div className="bg-zinc-100 border border-zinc-300 rounded-2xl p-6 text-center shadow-inner">

                    <Lock className="w-8 h-8 mx-auto mb-2 text-zinc-400 opacity-60" />

                    <p className="text-sm font-black uppercase tracking-widest text-zinc-500">{bloqueioAuditoria}</p>

                  </div>

                );

              }

              return (

                <div className="space-y-6 animate-fade-in">

                  {auditoriaJaFeita && (

                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-4 text-sm font-bold flex flex-col gap-1 shadow-sm">

                      <span className="flex items-center gap-2"><span className="text-xl"><AlertTriangle style={{ width: '1em', height: '1em' }} className="inline-block" /></span> Turno já auditado hoje!</span>

                      <span className="text-yellow-700 text-xs mt-1">Valores atuais no banco: <strong>{auditoriaJaFeita?.lixo_limpo || 0}kg (Sobra)</strong> e <strong>{auditoriaJaFeita?.lixo_sujo || 0}kg (Resto)</strong>. Enviar novamente irá sobrescrever o registro.</span>

                    </div>

                  )}

                  <div className="grid grid-cols-2 gap-5">

                    <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 shadow-sm">

                      <label className="block text-[10px] font-black uppercase tracking-widest text-orange-700 mb-3 flex items-center">

                        Sobra Intacta <InfoTooltip texto="Alimentos não servidos que sobraram na panela ou cuba da cozinha. Considerado Erro de Superprodução." />

                      </label>

                      <div className="flex items-center gap-3">

                        <input type="number" min="0" step="0.1" className="w-full bg-white border border-orange-300 rounded-xl px-4 py-4 text-2xl text-center font-black text-orange-900 outline-none focus:border-orange-500 shadow-inner" placeholder="0.0" value={pesosLixo?.[abaTurno]?.limpo ?? ''} onChange={e => atualizarInputLixo(abaTurno, 'limpo', e.target.value)} />

                        <span className="font-bold text-orange-700">KG</span>

                      </div>

                    </div>

                    <div className="bg-red-50 p-5 rounded-2xl border border-red-200 shadow-sm">

                      <label className="block text-[10px] font-black uppercase tracking-widest text-red-700 mb-3 flex items-center">

                        Resto Sujo <InfoTooltip texto="Comida rejeitada pelos alunos, descartada após o prato ser montada." />

                      </label>

                      <div className="flex items-center gap-3">

                        <input type="number" min="0" step="0.1" className="w-full bg-white border border-red-300 rounded-xl px-4 py-4 text-2xl text-center font-black text-red-900 outline-none focus:border-red-500 shadow-inner" placeholder="0.0" value={pesosLixo?.[abaTurno]?.sujo ?? ''} onChange={e => atualizarInputLixo(abaTurno, 'sujo', e.target.value)} />

                        <span className="font-bold text-red-700">KG</span>

                      </div>

                    </div>

                  </div>

                  <button onClick={() => salvarLixo(false, abaTurno)} disabled={isProcessando} className="w-full bg-zinc-900 text-white py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-zinc-800 disabled:opacity-70 flex justify-center items-center gap-2 transition-all">

                    {isProcessandoUI ? <LoadingIcon /> : 'Gravar Auditoria na Matriz'}

                  </button>

                </div>

              );

            })()}

          </div>

        </div>
      )}

      {visaoAtiva === 'planejamento' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm h-fit ">
            <div className="flex justify-between items-center mb-6">
              <strong className="text-zinc-800 font-black text-lg uppercase tracking-wider">{nomesMeses?.[mesAtual] ?? ''} {anoAtual}</strong>
              <div className="flex gap-2">
                <button onClick={() => setMesAtual(p => p === 0 ? 11 : p - 1)} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center font-bold text-sm transition-colors">&lt;</button>
                <button onClick={() => setMesAtual(p => p === 11 ? 0 : p + 1)} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center font-bold text-sm transition-colors">&gt;</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-black text-[10px] text-zinc-400 mb-3 border-b border-zinc-100 pb-2">
              {diasDaSemanaLetras.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: new Date(anoAtual, mesAtual, 1).getDay() }).map((_, i) => <div key={`empty-${i}`}></div>)}
              {Array.from({ length: new Date(anoAtual, mesAtual + 1, 0).getDate() }).map((_, i) => {
                const dia = i + 1;
                const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const ehFeriado = (feriados || []).includes(dataFormatada);
                const diaSemana = new Date(anoAtual, mesAtual, dia).getDay();
                const ehFimDeSemana = (diaSemana === 0 || diaSemana === 6);
                const dataHojeReal = getServerTime();
                const isHoje = dia === dataHojeReal.getDate() && mesAtual === dataHojeReal.getMonth() && anoAtual === dataHojeReal.getFullYear();
                
                if (ehFimDeSemana) return <div key={dia} className="py-3 text-center text-xs font-black text-zinc-200 bg-zinc-50/50 rounded-lg">X</div>;
                
                return (
                  <button 
                    key={dia} onClick={() => setDiaSelecionado(dia)}
                    className={`py-3 rounded-lg text-xs font-black transition-all relative ${isHoje ? 'ring-2 ring-purple-500 ring-offset-2 scale-105 z-10' : ''} ${ehFeriado ? 'bg-red-100 text-red-600 border border-red-200' : diaSelecionado === dia ? 'bg-primaria text-white shadow-md' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200/50'}`}
                  >
                    {isHoje && <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-[8px] px-1.5 py-0.5 rounded-full shadow-sm tracking-wider">HOJE</span>}
                    {dia}
                  </button>
                );
              })}
            </div>
            <div className="mt-8 pt-6 border-t border-zinc-100">
               <button onClick={alternarFeriado} disabled={isProcessando} className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${(feriados || []).includes(`${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`) ? 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'}`}>
                 <span className="flex items-center justify-center gap-2">{(feriados || []).includes(`${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`) ? <><Ban className="w-4 h-4"/> Remover Restrição Letiva</> : 'Marcar Dia Selecionado como Feriado'}</span>
               </button>
            </div>
          </div>

          <div className="lg:col-span-2">
             {(() => {
                const hjRef = getServerTime();
                const isPassado = new Date(anoAtual, mesAtual, diaSelecionado) < new Date(hjRef.getFullYear(), hjRef.getMonth(), hjRef.getDate());
                return (isPassado && dadosDiaPassado) ? (
                <HistoricoDiaPassado 
                  dadosDiaPassado={dadosDiaPassado}
                  diaSelecionado={diaSelecionado}
                  mesAtual={mesAtual}
                  nomesMeses={nomesMeses}
                  mapNomesTurnos={mapNomesTurnos}
                  turmas={turmas}
                  historicoDietas={historicoDietas}
                />
             ) : (
                <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm flex flex-col h-full ">
                  <div className="border-b border-zinc-100 pb-4 mb-6">
                    <h3 className="text-xl font-black text-zinc-800">Criação de Cardápio</h3>
                    <p className="text-zinc-500 text-sm font-medium mt-1">Configuração para o dia <strong className="text-primaria">{diaSelecionado} de {nomesMeses?.[mesAtual] ?? ''}</strong></p>
                  </div>
                  
                  <div className="mb-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest">1. Turno da Refeição</label>
                        <select 
                          value={refeicaoCardapio} 
                          onChange={e => {
                            setRefeicaoCardapio(e.target.value); 
                            setTurmasSelecionadas([]);
                          }} 
                          className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm"
                        >
                          <option value="LM">Lanche da Manhã (LM)</option>
                          <option value="A">Almoço (A)</option>
                          <option value="LT">Lanche da Tarde (LT)</option>
                        </select>
                      </div>

                      {refeicaoCardapio === 'A' ? (
                        <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-orange-900 font-bold">
                          <InfoTooltip texto="O cardápio do almoço é composto pela bandeja completa. Norma SESI: almoço não possui bebida." />
                          <span>Estrutura completa de almoço escolar (sem bebida).</span>
                        </div>
                      ) : (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-zinc-600 font-bold">
                          <InfoTooltip texto="Defina o lanche principal e os complementos deste turno." />
                          <span>Lanche escolar com opção de bebida e fruta.</span>
                        </div>
                      )}
                    </div>

                    {refeicaoCardapio === 'A' ? (
                      /* FORMULÁRIO DO ALMOÇO */
                      <div className="space-y-4 bg-zinc-50/70 p-5 rounded-3xl border border-zinc-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-700 mb-1.5 tracking-widest flex items-center">
                              Prato Principal (Mistura) * <InfoTooltip texto="Proteína ou prato principal da refeição (ex: Frango grelhado, Carne de panela)." />
                            </label>
                            <CustomDropdown 
                              valor={inputPratoPrincipal} 
                              aoMudar={setPratoPrincipal} 
                              placeholder="Mistura principal..." 
                              opcoes={obterOpcoesCatalogo('prato_principal')} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase text-blue-600 mb-1.5 tracking-widest flex items-center">
                              Mistura Adaptada (Dieta) <InfoTooltip texto="Adaptação para alunos com restrição alimentar." />
                            </label>
                            <CustomDropdown 
                              valor={inputLancheDieta} 
                              aoMudar={setLancheDieta} 
                              placeholder="Mistura adaptada (se houver)..." 
                              opcoes={obterOpcoesCatalogo('prato_principal')} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Tipo do Arroz</label>
                            <CustomDropdown 
                              valor={inputArroz} 
                              aoMudar={setArroz} 
                              placeholder="Ex: Arroz branco, Arroz integral..." 
                              opcoes={obterOpcoesCatalogo('arroz')} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Tipo do Feijão</label>
                            <CustomDropdown 
                              valor={inputFeijao} 
                              aoMudar={setFeijao} 
                              placeholder="Ex: Feijão carioca, Feijão preto..." 
                              opcoes={obterOpcoesCatalogo('feijao')} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Opção Vegetal (Salada)</label>
                            <CustomDropdown 
                              valor={inputOpcaoVegetal} 
                              aoMudar={setOpcaoVegetal} 
                              placeholder="Ex: Salada de alface e tomate, Beterraba..." 
                              opcoes={obterOpcoesCatalogo('opcao_vegetal')} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Molho da Salada</label>
                            <CustomDropdown 
                              valor={inputMolhoSalada} 
                              aoMudar={setMolhoSalada} 
                              placeholder="Ex: Vinagre e azeite, Molho de mostarda..." 
                              opcoes={obterOpcoesCatalogo('molho_salada')} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Guarnição</label>
                            <CustomDropdown 
                              valor={inputGuarnicao} 
                              aoMudar={setGuarnicao} 
                              placeholder="Ex: Purê de batata, Farofa rica..." 
                              opcoes={obterOpcoesCatalogo('guarnicao')} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Sobremesa</label>
                            <CustomDropdown 
                              valor={inputSobremesa} 
                              aoMudar={setSobremesa} 
                              placeholder="Ex: Pudim de leite, Gelatina..." 
                              opcoes={obterOpcoesCatalogo('sobremesa')} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Fruta</label>
                            <CustomDropdown 
                              valor={inputFruta} 
                              aoMudar={setFruta} 
                              placeholder="Ex: Maçã, Banana, Melancia..." 
                              opcoes={obterOpcoesCatalogo('fruta')} 
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* FORMULÁRIO DOS LANCHES (LM / LT) */
                      <div className="space-y-4 bg-zinc-50/70 p-5 rounded-3xl border border-zinc-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-700 mb-1.5 tracking-widest flex items-center">
                              Lanche Principal * <InfoTooltip texto="Alimento principal do lanche (ex: Pão com queijo, Bolo de cenoura, Torta)." />
                            </label>
                            <CustomDropdown 
                              valor={inputLanchePadrao} 
                              aoMudar={setLanchePadrao} 
                              placeholder="Pesquise o lanche..." 
                              opcoes={obterOpcoesCatalogo('lanche').length > 0 ? obterOpcoesCatalogo('lanche') : lanchesCadastrados} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase text-blue-600 mb-1.5 tracking-widest flex items-center">
                              Lanche Adaptado (Dieta) <InfoTooltip texto="O que os alunos com laudo receberão no lugar do lanche principal." />
                            </label>
                            <CustomDropdown 
                              valor={inputLancheDieta} 
                              aoMudar={setLancheDieta} 
                              placeholder="Prescrição Especial..." 
                              opcoes={obterOpcoesCatalogo('lanche').length > 0 ? obterOpcoesCatalogo('lanche') : lanchesCadastrados} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Bebida do Lanche</label>
                            <CustomDropdown 
                              valor={inputBebida} 
                              aoMudar={setBebida} 
                              placeholder="Ex: Suco de laranja natural, Leite com cacau..." 
                              opcoes={obterOpcoesCatalogo('bebida')} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Fruta do Lanche</label>
                            <CustomDropdown 
                              valor={inputFruta} 
                              aoMudar={setFruta} 
                              placeholder="Ex: Banana prata, Maçã fuji..." 
                              opcoes={obterOpcoesCatalogo('fruta')} 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <label className="block text-xs font-black uppercase text-zinc-500 mb-3 tracking-widest mt-6 border-t pt-4 flex items-center justify-between">
                    <span>2. Mapeamento de Turmas Disponíveis (Lote)</span>
                    <div className="flex gap-2">
                       <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Pendentes</span>
                       <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Já Lançados</span>
                    </div>
                  </label>
                  
                  <div className="space-y-4 mb-8 p-5 border border-zinc-200 rounded-2xl bg-zinc-50 max-h-[400px] overflow-y-auto shadow-inner">
                    {(turmasValidasParaCardapio || []).length === 0 ? (
                       <p className="text-sm font-bold text-zinc-400 italic text-center py-6">Nenhuma turma consome <strong>{mapNomesTurnos?.[refeicaoCardapio] || refeicaoCardapio}</strong> neste dia letivo.</p>
                    ) : (
                      agrupamentoTurmas.map(nivel => {
                         const turmasDoNivel = (turmasValidasParaCardapio || []).filter(t => converterNivelVisual(t?.nivel) === nivel);
                         if(turmasDoNivel.length === 0) return null;
                         

                         const turmasPendentes = turmasDoNivel.filter(t => {
                             const ignorada = (dadosDiaPassado?.turmas_ignoradas || []).includes(t?.id);
                             if (ignorada) return false;
                             return !(cardapioDoDiaSelecionado || []).find(c => c?.turma_id === t?.id && c?.tipo_refeicao === refeicaoCardapio);
                         });

                         return (
                            <div key={nivel} className="mb-4">
                               <div className="flex justify-between items-center mb-3">
                                  <span className="text-xs font-black uppercase text-zinc-600 tracking-widest">{nivel}</span>
                                  <div className="flex gap-2">
                                     {nivel === 'Personaliza' && (
                                       <button 
                                         disabled={!(turmasSelecionadas || []).some(id => turmasDoNivel.some(t => t?.id == id))}
                                         onClick={() => {
                                           const ids = (turmasSelecionadas || []).filter(id => turmasDoNivel.some(t => t?.id == id));
                                           if (ids.length > 0) alternarIgnorarTurma(ids);
                                       }} className="text-[10px] font-bold text-orange-700 hover:text-orange-900 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm border border-orange-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                         Suspender / Reativar
                                       </button>
                                     )}
                                    <button onClick={() => {
                                        const ids = turmasPendentes.map(t => t?.id).filter(Boolean);
                                        setTurmasSelecionadas(prev => [...new Set([...(prev || []), ...ids])]);
                                    }} className="text-[10px] font-bold text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                      Selecionar {turmasPendentes.length} Pendentes
                                    </button>
                                    <button onClick={() => {
                                        const ids = turmasDoNivel.map(t => t?.id).filter(Boolean);
                                        setTurmasSelecionadas(prev => [...new Set([...(prev || []), ...ids])]);
                                    }} className="text-[10px] font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-200 hover:bg-zinc-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                      Selecionar Todas
                                    </button>
                                  </div>
                               </div>
                               
                               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {turmasDoNivel.map(t => {

                                     const cardapioTurma = (cardapioDoDiaSelecionado || []).find(c => c?.turma_id === t?.id && c?.tipo_refeicao === refeicaoCardapio);
                                     const jaLancado = !!cardapioTurma;
                                     const selecionado = (turmasSelecionadas || []).includes(t?.id);
                                     const ignorada = (dadosDiaPassado?.turmas_ignoradas || []).includes(t?.id);

                                     return (
                                        <button key={t?.id} onClick={() => alternarTurmaSelecionada(t?.id)} className={`p-3 text-left font-bold rounded-xl border-2 transition-all flex flex-col gap-1 ${
                                           selecionado 
                                           ? 'bg-primaria border-primaria text-white shadow-md scale-105 z-10' 
                                           : ignorada
                                             ? 'bg-zinc-100 border-zinc-300 text-zinc-400 opacity-60'
                                             : jaLancado 
                                               ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100 opacity-80' 
                                               : 'bg-white border-red-300 text-zinc-800 hover:border-red-500 shadow-sm'
                                        }`}>
                                           <div className="flex justify-between w-full items-center">
                                             <span className="text-sm">{t?.ano === 0 ? '' : (t?.ano ? t.ano + 'º ' : '')}{t?.identificador || ''} {ignorada && <span className="text-[9px] bg-zinc-300 text-zinc-600 px-1.5 rounded ml-1">SUSPENSA</span>}</span>
                                             {jaLancado && !selecionado && !ignorada && <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                             {ignorada && !selecionado && <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>}
                                           </div>
                                           
                                           {jaLancado && !selecionado && !ignorada ? (
                                              <span className="text-[9px] font-black uppercase tracking-widest text-green-700 truncate w-full" title={cardapioTurma?.lanche_padrao}>
                                                 {cardapioTurma?.lanche_padrao}
                                              </span>
                                           ) : ignorada && !selecionado ? (
                                              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                 Não terá aula
                                              </span>
                                           ) : !selecionado ? (
                                              <span className="text-[9px] font-black uppercase tracking-widest text-red-500">
                                                 Sem Lançamento
                                              </span>
                                           ) : (
                                              <span className="text-[9px] font-black uppercase tracking-widest text-white/80">
                                                 Selecionada
                                              </span>
                                           )}
                                        </button>
                                     )
                                  })}
                               </div>
                            </div>
                         );
                      })
                    )}
                  </div>
                  
                  <button onClick={() => salvarItemCalendario(false)} disabled={isProcessando} className="w-full bg-zinc-900 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-zinc-800 transition-all disabled:opacity-70 flex justify-center items-center gap-2 mt-auto">
                    {isProcessandoUI ? <RingLoader tamanho="w-5 h-5" /> : `Aplicar Cardápio em ${(turmasSelecionadas || []).length} Turmas`}
                  </button>
                 </div>
             );
             })()}
          </div>
        </div>
      )}

      {visaoAtiva === 'dietas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          <div className={`bg-white rounded-3xl border ${alunoEmEdicaoId ? 'border-blue-300 ring-2 ring-blue-100 shadow-md' : 'border-zinc-200 shadow-sm'} p-8 h-fit transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black text-zinc-800">
                {alunoEmEdicaoId ? 'Editar Ficha Clínica' : 'Ficha de Restrição Clínica'}
              </h2>
              {alunoEmEdicaoId && (
                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1.5 animate-fade-in">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  Editando Paciente
                </span>
              )}
            </div>

            <div className="text-zinc-500 font-medium text-sm mb-6 border-b pb-4 flex items-center justify-between">
              <span>Gestão privativa da Nutricionista. <InfoTooltip texto="Alunos cadastrados aqui serão abatidos da contagem da panela principal e inseridos na lista de Linha de Montagem de Dietas." /></span>
              {alunoEmEdicaoId && (
                <button 
                  type="button" 
                  onClick={cancelarEdicaoAluno} 
                  className="text-xs text-zinc-400 hover:text-zinc-700 font-bold underline ml-2"
                >
                  Cancelar Edição
                </button>
              )}
            </div>
            
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest">Nome Completo do Paciente</label>
                <input 
                  type="text" 
                  value={nomeAluno} 
                  onChange={e => setNomeAluno(e.target.value)} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-primaria shadow-sm transition-all" 
                  placeholder="Ex: João da Silva" 
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest flex items-center justify-between">
                  <span>Condições Clínicas / Restrições (Multi-Tags)</span>
                  <span className="text-[10px] text-zinc-400 font-bold normal-case tracking-normal">Dê Enter para adicionar</span>
                </label>
                <MultiTagInput 
                  tags={restricoesSelecionadas || []} 
                  aoMudar={setRestricoesSelecionadas} 
                  opcoes={todasRestricoes || []} 
                  placeholder="Digite (ex: Diabetes, Sem Lactose) e dê Enter..." 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Sala Base (Obrigatório)</label>
                  <select 
                    value={salaRegularId} 
                    onChange={e => setSalaRegularId(e.target.value)} 
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm"
                  >
                    <option value="">Selecione a base...</option>
                    {(turmas || []).filter(t => t?.nivel !== 'Ensino Técnico (SENAI)' && t?.nivel !== 'Personaliza').map(t => (
                      <option key={t?.id} value={t?.id}>{converterNivelVisual(t?.nivel)} {renderAno(t?.ano)}{t?.identificador || ''}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Oficina SENAI (Opcional)</label>
                  <select 
                    value={salaTecnicaId} 
                    onChange={e => setSalaTecnicaId(e.target.value)} 
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm"
                  >
                    <option value="">Sem vínculo...</option>
                    {(turmas || [])
                      .filter(t => t?.nivel === 'Ensino Técnico (SENAI)' && (!anoBase || t?.ano === anoBase))
                      .map(t => (
                        <option key={t?.id} value={t?.id}>{converterNivelVisual(t?.nivel)} {t?.identificador || ''}</option>
                      ))}
                  </select>
                </div>

                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Personaliza (Opcional)</label>
                  <select 
                    value={salaPersonalizaId} 
                    onChange={e => setSalaPersonalizaId(e.target.value)} 
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm"
                  >
                    <option value="">Sem vínculo...</option>
                    {(turmas || [])
                      .filter(t => t?.nivel === 'Personaliza' && (!anoBase || t?.ano === anoBase))
                      .map(t => (
                        <option key={t?.id} value={t?.id}>Pers. {t?.ano ? t.ano + 'º ' : ''}{t?.identificador || ''}</option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {alunoEmEdicaoId && (
                <button 
                  type="button" 
                  onClick={cancelarEdicaoAluno} 
                  disabled={isProcessando} 
                  className="w-1/3 bg-zinc-100 text-zinc-700 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-zinc-300 hover:bg-zinc-200 transition-all"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={salvarAlunoDieta} 
                disabled={isProcessando} 
                className={`flex-1 ${alunoEmEdicaoId ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-white'} py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl disabled:opacity-70 flex justify-center items-center gap-2 transition-all`}
              >
                {isProcessandoUI ? <RingLoader tamanho="w-5 h-5" /> : alunoEmEdicaoId ? 'Atualizar Ficha Clínica' : 'Salvar Ficha Clínica'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm flex flex-col max-h-[720px]">
             <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-600">Pacientes Cadastrados</h3>
                <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
                  {(historicoDietas || []).length} cadastrados
                </span>
             </div>

             <div className="overflow-y-auto pr-2 flex-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-zinc-400">
                      <th className="pb-4 font-black uppercase tracking-widest">Aluno / Condições</th>
                      <th className="pb-4 font-black uppercase tracking-widest">Vínculos de Sala</th>
                      <th className="pb-4 font-black uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium text-zinc-700">
                    {(historicoDietas || []).length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-12 text-center text-zinc-400 italic">
                          Nenhuma restrição alimentar ativa no sistema.
                        </td>
                      </tr>
                    ) : null}
                    {(historicoDietas || []).map(d => {
                      const estaSendoEditado = alunoEmEdicaoId === d?.id;
                      const tagsCondicoes = Array.isArray(d?.restricoes) && d.restricoes.length > 0 
                        ? d.restricoes 
                        : (d?.restricao ? d.restricao.split(' • ') : ['Sem restrição']);

                      return (
                        <tr 
                          key={d?.id} 
                          className={`border-b border-zinc-100 transition-colors ${estaSendoEditado ? 'bg-blue-50/50' : 'hover:bg-zinc-50'}`}
                        >
                          <td className="py-4 pr-2">
                            <div className="font-bold text-zinc-800 text-sm mb-1.5 flex items-center gap-2">
                              {d?.nome || 'N/A'}
                              {estaSendoEditado && (
                                <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded">Em edição</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {tagsCondicoes.map((tag, idx) => (
                                <span 
                                  key={idx} 
                                  className="text-[10px] bg-blue-50 border border-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded-md shadow-sm"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 text-zinc-500 pr-2">
                            <div className="font-bold text-zinc-700">{d?.salaFormatada || 'N/A'}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {d?.senaiFormatado && (
                                <span className="text-[10px] bg-zinc-200 border border-zinc-300 text-zinc-700 font-bold px-2 py-0.5 rounded">
                                  SENAI: {d.senaiFormatado}
                                </span>
                              )}
                              {d?.personalizaFormatado && (
                                <span className="text-[10px] bg-purple-100 border border-purple-200 text-purple-700 font-bold px-2 py-0.5 rounded">
                                  {d.personalizaFormatado}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 text-right">
                             <div className="flex items-center justify-end gap-1.5">
                               <button 
                                 onClick={() => iniciarEdicaoAluno(d)} 
                                 disabled={isProcessando} 
                                 title="Editar ficha clínica"
                                 className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white p-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
                               >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                  </svg>
                               </button>
                               <button 
                                 onClick={() => setModalExclusao({ visivel: true, id: d?.id })} 
                                 disabled={isProcessando} 
                                 title="Excluir ficha clínica"
                                 className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white p-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
                               >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                               </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

{visaoAtiva === 'desperdicio' && (
        <div className="flex flex-col gap-6 animate-fade-in ">
          <EstatisticasBI />
        </div>
      )}
{visaoAtiva === 'parametros' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm h-fit animate-fade-in">
          <h2 className="text-2xl font-black text-zinc-800 mb-2">Parâmetros Operacionais</h2>
          <p className="text-zinc-500 font-medium text-sm mb-8 border-b border-zinc-100 pb-4">Ajuste as réguas de alerta para o sistema de Business Intelligence e PDF Contábil.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            
            {/** Resto Per Capita **/}
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between ">
                 <div>
                   <div className="mb-5">
                     <label className="block text-xs font-black uppercase text-zinc-600 tracking-widest flex items-center">
                      Resto Per Capita <InfoTooltip texto="Atenção / Crítico em gramas por aluno." />
                     </label>
                     <p className="text-[9px] font-bold text-zinc-400 mt-1.5 uppercase tracking-wider leading-relaxed">
                       Limite de comida descartada no prato por aluno alimentado.
                     </p>
                   </div>
                   <div className="grid grid-cols-2 gap-3 mb-6">
                     <div className="flex flex-col gap-1.5">
                       <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Atenção (g)</span>
                       <input type="number" min="0" value={parametros?.resto_per_capita_atencao_g ?? ''} onChange={e => { const v = e.target.value; setParametros(prev => ({...prev, resto_per_capita_atencao_g: v === '' ? '' : Number(v)})); }} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-800 outline-none focus:border-primaria shadow-inner" />
                     </div>
                     <div className="flex flex-col gap-1.5">
                       <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Crítico (g)</span>
                       <input type="number" min="0" value={parametros?.resto_per_capita_critico_g ?? ''} onChange={e => { const v = e.target.value; setParametros(prev => ({...prev, resto_per_capita_critico_g: v === '' ? '' : Number(v)})); }} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-800 outline-none focus:border-primaria shadow-inner" />
                     </div>
                   </div>
                 </div>
                 <div className="w-full h-3 rounded-full bg-zinc-200 overflow-hidden shadow-inner">
                   {(() => {
                     const at = parametros?.resto_per_capita_atencao_g;
                     const cr = parametros?.resto_per_capita_critico_g;
                     
                     if (at === '' || at == null || cr === '' || cr == null || Number(at) >= Number(cr) || Number(at) <= 0) {
                        return <div className="h-full w-full bg-red-500 opacity-40 animate-pulse" title="Configuração Inválida" />;
                     }
                     
                     const green = (Number(at) / Number(cr)) * 75;
                     const yellow = 75 - green;
                     
                     return (
                       <div className="flex h-full w-full">
                         <div style={{ width: `${green}%` }} className="bg-green-500" />
                         <div style={{ width: `${yellow}%` }} className="bg-yellow-400" />
                         <div style={{ width: `25%` }} className="bg-red-500" />
                       </div>
                     );
                   })()}
                 </div>
            </div>

            {/** Sobra Limpa **/}
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between ">
                 <div>
                   <div className="mb-5">
                     <label className="block text-xs font-black uppercase text-zinc-600 tracking-widest flex items-center">
                      Sobra Limpa <InfoTooltip texto="Atenção / Crítico em kg para sobra limpa (cuba)." />
                     </label>
                     <p className="text-[9px] font-bold text-zinc-400 mt-1.5 uppercase tracking-wider leading-relaxed">
                       Tolerância de alimento não servido excedente nas panelas.
                     </p>
                   </div>
                   <div className="grid grid-cols-2 gap-3 mb-6">
                     <div className="flex flex-col gap-1.5">
                       <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Atenção (kg)</span>
                       <input type="number" min="0" value={parametros?.sobra_limpa_atencao_kg ?? ''} onChange={e => { const v = e.target.value; setParametros(prev => ({...prev, sobra_limpa_atencao_kg: v === '' ? '' : Number(v)})); }} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-800 outline-none focus:border-primaria shadow-inner" />
                     </div>
                     <div className="flex flex-col gap-1.5">
                       <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Crítico (kg)</span>
                       <input type="number" min="0" value={parametros?.sobra_limpa_critico_kg ?? ''} onChange={e => { const v = e.target.value; setParametros(prev => ({...prev, sobra_limpa_critico_kg: v === '' ? '' : Number(v)})); }} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-800 outline-none focus:border-primaria shadow-inner" />
                     </div>
                   </div>
                 </div>
                 <div className="w-full h-3 rounded-full bg-zinc-200 overflow-hidden shadow-inner">
                   {(() => {
                     const at = parametros?.sobra_limpa_atencao_kg;
                     const cr = parametros?.sobra_limpa_critico_kg;
                     
                     if (at === '' || at == null || cr === '' || cr == null || Number(at) >= Number(cr) || Number(at) <= 0) {
                        return <div className="h-full w-full bg-red-500 opacity-40 animate-pulse" title="Configuração Inválida" />;
                     }
                     
                     const green = (Number(at) / Number(cr)) * 75;
                     const yellow = 75 - green;
                     
                     return (
                       <div className="flex h-full w-full">
                         <div style={{ width: `${green}%` }} className="bg-green-500" />
                         <div style={{ width: `${yellow}%` }} className="bg-yellow-400" />
                         <div style={{ width: `25%` }} className="bg-red-500" />
                       </div>
                     );
                   })()}
                 </div>
            </div>

            {/** Taxa de Rejeição **/}
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between ">
                 <div>
                   <div className="mb-5">
                     <label className="block text-xs font-black uppercase text-zinc-600 tracking-widest flex items-center">
                      Taxa Máxima de Rejeição <InfoTooltip texto="Percentual de rejeição que aciona aviso na escalação." />
                     </label>
                     <p className="text-[9px] font-bold text-zinc-400 mt-1.5 uppercase tracking-wider leading-relaxed">
                       Teto aceitável de alunos insatisfeitos antes do sistema alertar.
                     </p>
                   </div>
                   <div className="mb-6">
                     <div className="flex flex-col gap-1.5">
                       <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Limite (%)</span>
                       <input type="number" min="0" max="100" value={parametros?.taxa_rejeicao_alerta_percentual ?? ''} onChange={e => { const v = e.target.value; setParametros(prev => ({...prev, taxa_rejeicao_alerta_percentual: v === '' ? '' : Number(v)})); }} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-800 outline-none focus:border-primaria shadow-inner" />
                     </div>
                   </div>
                 </div>
                 <div className="w-full h-3 rounded-full bg-zinc-200 overflow-hidden shadow-inner">
                   {(() => {
                     const p = parametros?.taxa_rejeicao_alerta_percentual;
                     
                     if (p === '' || p == null || Number(p) <= 0 || Number(p) > 100) {
                        return <div className="h-full w-full bg-red-500 opacity-40 animate-pulse" title="Configuração Inválida" />;
                     }
                     
                     const red = Number(p);
                     const green = 100 - red;
                     
                     return (
                       <div className="flex h-full w-full">
                         <div style={{ width: `${green}%` }} className="bg-green-500" />
                         <div style={{ width: `${red}%` }} className="bg-red-500" />
                       </div>
                     );
                   })()}
                 </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button onClick={async () => {
              const p = parametros || {};
              
              if (p.resto_per_capita_atencao_g === '' || p.resto_per_capita_critico_g === '' || p.sobra_limpa_atencao_kg === '' || p.sobra_limpa_critico_kg === '' || p.taxa_rejeicao_alerta_percentual === '') {
                 mostrarToast('Preencha todos os campos vazios antes de salvar.', 'erro');
                 return;
              }
              
              if (Number(p.resto_per_capita_atencao_g) >= Number(p.resto_per_capita_critico_g)) {
                 mostrarToast('O Resto Per Capita de Atenção deve ser menor que o Crítico.', 'erro');
                 return;
              }

              if (Number(p.sobra_limpa_atencao_kg) >= Number(p.sobra_limpa_critico_kg)) {
                 mostrarToast('A Sobra Limpa de Atenção deve ser menor que a Crítica.', 'erro');
                 return;
              }
              
              if (Number(p.taxa_rejeicao_alerta_percentual) <= 0 || Number(p.taxa_rejeicao_alerta_percentual) > 100) {
                 mostrarToast('A taxa de rejeição deve estar entre 1 e 100.', 'erro');
                 return;
              }

              setIsProcessando(true);
              try {
                const payload = {
                  resto_per_capita_atencao_g: Number(p.resto_per_capita_atencao_g),
                  resto_per_capita_critico_g: Number(p.resto_per_capita_critico_g),
                  sobra_limpa_atencao_kg: Number(p.sobra_limpa_atencao_kg),
                  sobra_limpa_critico_kg: Number(p.sobra_limpa_critico_kg),
                  taxa_rejeicao_alerta_percentual: Number(p.taxa_rejeicao_alerta_percentual)
                };
                const [res] = await Promise.all([
                  api('/api/parametros', { method: 'PUT', body: JSON.stringify(payload) })
                ]);
                if (res?.sucesso) mostrarToast('Parâmetros salvos.'); else mostrarToast(res?.erro || 'Erro ao salvar parâmetros', 'erro');
              } catch (e) { mostrarToast('Erro de rede ao salvar parâmetros', 'erro'); }
              setIsProcessando(false);
            }} disabled={isProcessando} className="bg-primaria text-white font-black px-6 py-3.5 rounded-xl shadow-md uppercase text-xs tracking-widest hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
              {isProcessandoUI ? <RingLoader tamanho="w-5 h-5" /> : 'Salvar Todos'}
            </button>
            <button onClick={() => carregarHistoricos()} className="bg-zinc-100 text-zinc-600 font-bold px-6 py-3.5 rounded-xl border border-zinc-200 uppercase text-xs tracking-widest hover:bg-zinc-200 transition-colors">
              Recarregar
            </button>
          </div>
        </div>
      )}
          {visaoAtiva === 'relatorios' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm animate-fade-in ">
          <div className="border-b border-zinc-100 pb-4 mb-8">
           <h2 className="text-2xl font-black text-zinc-800">Relatórios Institucionais (SESI)</h2>
           <p className="text-zinc-500 font-medium text-sm mt-1">Visão consolidada do período para prestação de contas com a Diretoria.</p>
          </div>
       
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-200 shadow-inner ">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 border-b border-zinc-200 pb-2">Acumulado do Mês ({nomesMeses?.[mesAtual] ?? ''})</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
                  <span className="text-xs font-black uppercase text-zinc-600 flex items-center">Total Produzido <InfoTooltip texto="Soma absoluta de todos os alunos registrados via chamada docente neste mês." /></span>
                  <span className="text-xl font-black text-zinc-900 bg-white px-3 py-1 rounded-lg border border-zinc-200 shadow-sm">{dadosMensais ? (dadosMensais.totalRefeicoes || 0) : 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
                  <span className="text-xs font-black uppercase text-zinc-600">Dietas Isoladas Servidas</span>
                  <span className="text-xl font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 shadow-sm">{dadosMensais ? (dadosMensais.totalDietas || 0) : 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
                  <span className="text-xs font-black uppercase text-zinc-600">Sobra Intacta Acumulada</span>
                  <span className="text-xl font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200 shadow-sm">{dadosMensais?.lixoSobra != null ? Number(dadosMensais.lixoSobra).toFixed(1) : 0} kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-zinc-600">Resto Sujo Acumulado</span>
                  <span className="text-xl font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200 shadow-sm">{dadosMensais?.lixoResto != null ? Number(dadosMensais.lixoResto).toFixed(1) : 0} kg</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-8 shadow-sm ">
                 <div className="flex items-center gap-4 mb-6">
                    <Printer className="w-10 h-10 text-blue-800" />
                    <div>
                      <h3 className="text-xl font-black text-blue-900 uppercase tracking-widest">Central de Relatórios</h3>
                      <p className="text-sm text-blue-700 font-bold leading-relaxed">Geração de arquivos para prestação de contas e planejamento logístico.</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                    <button onClick={exportarCSV} disabled={isProcessando} className="w-full bg-emerald-100 text-emerald-800 font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-emerald-200 border border-emerald-200 transition-colors flex items-center justify-center gap-2">
                      {isProcessandoUI ? <RingLoader tamanho="w-5 h-5" /> : <><Download className="w-4 h-4 inline-block mr-2"/> Exportar Base de Dados Completa (CSV)</>}
                    </button>
                    <button onClick={exportarGuiaDietas} disabled={isProcessando} className="w-full bg-indigo-100 text-indigo-700 font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-indigo-200 border border-indigo-200 transition-colors flex items-center justify-center gap-2">
                      {isProcessandoUI ? <RingLoader tamanho="w-5 h-5" /> : 'Folha de Produção'}
                    </button>
                    <button onClick={exportarPDF} disabled={isProcessando} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg hover:bg-blue-700 border border-blue-900/10 transition-colors flex items-center justify-center gap-2">
                      {isProcessandoUI ? <RingLoader tamanho="w-5 h-5" /> : 'Relatório Mensal de Desempenho Institucional (PDF)'}
                    </button>
                 </div>
              </div>
              <div className="bg-zinc-900 text-white rounded-3xl p-8 shadow-sm border-2 border-purple-500/30 relative overflow-hidden ">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.2),_transparent_40%)]"></div>
                 <div className="relative z-10">
                    <h3 className="text-lg font-black uppercase tracking-widest mb-2 flex items-center gap-2 text-purple-300"><Bot className="w-5 h-5" /> Inteligência Artificial (LLMs)</h3>
                    <p className="text-xs text-zinc-400 font-bold mb-4">Gere um dossiê completo de 12 meses para análise preditiva em plataformas de IA.</p>
                    <button onClick={exportarDossieIA} disabled={isProcessando} className="w-full bg-purple-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg hover:bg-purple-700 border border-purple-900/10 transition-colors flex items-center justify-center gap-2">
                      {isProcessandoUI ? <RingLoader tamanho="w-5 h-5" /> : 'Gerar Dossiê IA (PDF)'}
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

         </div>
        </div>
      );
    }