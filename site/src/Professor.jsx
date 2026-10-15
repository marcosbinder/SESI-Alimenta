import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Save, Trash2, CalendarDays, ClipboardList, Info, AlertTriangle, X, Check, FileText, ChevronDown, Activity, User, LogOut, ArrowRight, ArrowLeft, XCircle, RotateCcw, BookOpen, Backpack, UtensilsCrossed, Search, Users, ChefHat, GraduationCap, Wrench, Star, Lock } from 'lucide-react';
import { api } from './services/api';
import { getServerTime } from './utils/time';
import { useLiveClock } from './hooks/useLiveClock';
import { useRealtime } from './hooks/useRealtime';
import { RingLoader, ToastAlert } from './components/UI';
const InfoTooltip = ({ texto }) => (
  <div className="relative flex items-center group cursor-pointer ml-2 inline-block" tabIndex="0">
    <div className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-500 flex items-center justify-center text-[10px] font-black group-hover:bg-primaria group-hover:text-white group-focus:bg-primaria group-focus:text-white transition-colors shadow-sm">
      i
    </div>
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block group-focus:block w-64 bg-zinc-800 text-white text-[11px] p-3 rounded-xl shadow-2xl text-center z-50 pointer-events-none font-medium leading-relaxed">
      {texto}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800"></div>
    </div>
  </div>
);

export default function Professor() {
  const navigate = useNavigate();
  const [abaPrincipal, setAbaPrincipal] = useState('chamada');
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [notificacao, setNotificacao] = useState({ visivel: false, texto: '', tipo: 'sucesso' });
  
  const [turmas, setTurmas] = useState([]);
  const [turmasConcluidas, setTurmasConcluidas] = useState([]);
  const [salaSelecionadaObj, setSalaSelecionadaObj] = useState(null);
  
  const [nivelSelecionado, setNivelSelecionado] = useState('');
  const [anoSelecionado, setAnoSelecionado] = useState('');
  const [letraSelecionada, setLetraSelecionada] = useState('');
  const [turmaIdFinal, setTurmaIdFinal] = useState('');
  const [bloqueioInteracao, setBloqueioInteracao] = useState('');
  
  const [statusCorrecao, setStatusCorrecao] = useState({ ativo: false, criado_por: '', alterado_por: '' });
  const [infoLanches, setInfoLanches] = useState({ hoje: [], ontem: [] });
  const [cardapioGeral, setCardapioGeral] = useState(null);
  
  const [avaliacoes, setAvaliacoes] = useState({});
  const [presencaGeral, setPresencaGeral] = useState('');
  const [presencaSenai, setPresencaSenai] = useState({ LM: '', A: '', LT: '' });
  const [presencaOntemDB, setPresencaOntemDB] = useState(0);
  const [alunosEspeciais, setAlunosEspeciais] = useState([]);
  const [presencaEspeciais, setPresencaEspeciais] = useState({});
  const [presencaEspeciaisSenai, setPresencaEspeciaisSenai] = useState({});

  const [listaLote, setListaLote] = useState([{ id_temp: Date.now(), nome: '', chamada: '', turma_id: '', is_dieta: false }]);
  const [motivoLote, setMotivoLote] = useState('');
  const [errosValidacao, setErrosValidacao] = useState({});
  const [dataInput, setDataInput] = useState('');
  const [datasSelecionadas, setDatasSelecionadas] = useState([]);
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState([]);
  const [modalCancelar, setModalCancelar] = useState({ visivel: false, id: null, motivo: '', erro: '' });
  const [paginaExtra, setPaginaExtra] = useState(1);
  const itensPorPagina = 10;

  const isSenai = nivelSelecionado === 'Ensino Técnico (SENAI)';
  const totalDietasMarcadas = isSenai ? 0 : Object.values(presencaEspeciais || {}).filter(Boolean).length;
  const totalCalculado = (presencaGeral === '' ? 0 : Number(presencaGeral)) + totalDietasMarcadas;

  const LIMITE_FISICO_SALA = 32; 
  const agora = useLiveClock();
  const dataLancamentoRaw = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dataLancamento = dataLancamentoRaw.charAt(0).toUpperCase() + dataLancamentoRaw.slice(1);
  const usuarioLogado = localStorage.getItem('usuario') || 'Professor(a)';
  const tipoUsuario = localStorage.getItem('tipo') || 'professor';

  const dataSp = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const diaDaSemana = dataSp.getDay();
  const horaAtual = dataSp.getHours();

  const cronogramaPersonaliza = { 1: [7, 8, 9], 2: [7, 9], 3: [8, 9], 4: [7, 8, 9], 5: [7, 8, 9] };

  const niveisVisuais = [
    { id: 'Fundamental 1', label: 'Fundamental I', icon: BookOpen },
    { id: 'Fundamental 2', label: 'Fundamental II', icon: Backpack },
    { id: 'Ensino Médio', label: 'Ensino Médio', icon: GraduationCap },
    { id: 'Ensino Técnico (SENAI)', label: 'Ensino Técnico', icon: Wrench },
    { id: 'Personaliza', label: 'Personaliza', icon: Star }
  ];

  const isTurmaBloqueadaHoje = (turma) => {
    const diaSemana = diaDaSemana;
    const nivel = turma?.nivel ? String(turma.nivel).normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

    if (nivel === 'Ensino Tecnico (SENAI)') {
      const ano = Number(turma.ano);
      if (ano === 2 && diaSemana !== 2 && diaSemana !== 4) return true;
      if (ano === 3 && diaSemana !== 1 && diaSemana !== 5) return true;
    }
    
    return false;
  };

  const avancar = () => setEtapaAtual(prev => prev + 1);
  const voltar = () => setEtapaAtual(prev => prev - 1);

  const mostrarToast = (texto, tipo = 'sucesso') => {
    setNotificacao({ visivel: true, texto, tipo });
    setTimeout(() => setNotificacao({ visivel: false }), 4000);
  };

  const gerarPassos = () => {
    return [
      { id: 1, chave: 'identificacao', titulo: 'Identificação' },
      { id: 2, chave: 'cardapio', titulo: 'Cardápio de Hoje' },
      { id: 3, chave: 'frequencia', titulo: 'Frequência & Dietas' },
      { id: 4, chave: 'avaliacao', titulo: 'Avaliação' }
    ];
  };
  const passosExibidos = gerarPassos();
  const passoAtualInfo = passosExibidos[etapaAtual - 1] || {};

  const carregarMinhasSolicitacoes = useCallback(async () => {
    const [res] = await Promise.all([
      api('/api/minhas-solicitacoes'),
      new Promise(r => setTimeout(r, 800))
    ]);
    if (res.sucesso) setMinhasSolicitacoes(res.dados || []);
    else setMinhasSolicitacoes([]);
  }, []);

  const confirmarCancelamento = async () => {
    if (!modalCancelar.motivo.trim()) {
      setModalCancelar(prev => ({ ...prev, erro: 'O motivo é obrigatório.' }));
      return;
    }
    const [res] = await Promise.all([
      api(`/api/solicitacoes/${modalCancelar.id}/cancelar`, { 
        method: 'PUT', 
        body: JSON.stringify({ motivo: modalCancelar.motivo })
      }),
      new Promise(r => setTimeout(r, 800))
    ]);
    if (res.sucesso) {
      setModalCancelar({ visivel: false, id: null, motivo: '', erro: '' });
      carregarMinhasSolicitacoes();
      mostrarToast('Solicitação cancelada com sucesso.', 'sucesso');
    } else {
      setModalCancelar(prev => ({ ...prev, erro: res.erro || 'Erro ao cancelar.' }));
    }
  };

  useEffect(() => {
    setNivelSelecionado('');
    setAnoSelecionado('');
    setLetraSelecionada('');
    
    api('/api/turmas').then(data => { 
      if (data && data.sucesso) {
        const tratadas = (data.dados || []).map(t => {
          if (t.nivel === 'Ensino Medio') return { ...t, nivel: 'Ensino Médio' };
          if (t.nivel === 'Ensino Tecnico (SENAI)') return { ...t, nivel: 'Ensino Técnico (SENAI)' };
          return t;
        });
        setTurmas(tratadas); 
      }
    });
    api('/api/status-lancamentos-hoje').then(data => { 
      if (data && data.sucesso) setTurmasConcluidas(data.turmas_concluidas || []); 
    });
    api('/api/cardapio-geral-hoje').then(data => {
      if (data && data.sucesso) setCardapioGeral(data.dados);
    });
  }, []);

  // Sincronização em tempo real via WebSocket para o Painel Docente
  useRealtime(['cardapio_atualizado', 'presenca_atualizada', 'cozinha_atualizada'], () => {
    api('/api/status-lancamentos-hoje').then(data => { 
      if (data && data.sucesso) setTurmasConcluidas(data.turmas_concluidas || []); 
    });
    api('/api/cardapio-geral-hoje').then(data => {
      if (data && data.sucesso) setCardapioGeral(data.dados);
    });
    if (turmaIdFinal) {
      api(`/api/info-lanches/turma/${turmaIdFinal}`).then(data => { 
        if (data && data.sucesso) setInfoLanches({ hoje: data.lanches_hoje || [], ontem: data.lanches_ontem || [] }); 
      });
      api(`/api/dados-preenchidos/turma/${turmaIdFinal}`).then(data => {
        if (data && data.bloqueado_pela_cozinha) {
          setBloqueioInteracao(data.mensagem);
        }
      });
    }
  });

  useEffect(() => {
    if (abaPrincipal === 'extra' && tipoUsuario !== 'coordenacao') {
      carregarMinhasSolicitacoes();
    }
  }, [abaPrincipal, carregarMinhasSolicitacoes, tipoUsuario]);

  useEffect(() => {
    if (nivelSelecionado && anoSelecionado !== '' && letraSelecionada && turmas.length > 0) {
      const sala = turmas.find(t => String(t.nivel) === nivelSelecionado && Number(t.ano) === Number(anoSelecionado) && String(t.identificador) === letraSelecionada);
      setTurmaIdFinal(sala ? sala.id : '');
      setSalaSelecionadaObj(sala || null);
    } else {
      setTurmaIdFinal(''); setSalaSelecionadaObj(null); setStatusCorrecao({ ativo: false, criado_por: '', alterado_por: '' });
    }
  }, [nivelSelecionado, anoSelecionado, letraSelecionada, turmas]);

  const obterRefeicoesDaTurma = (nivel, ano) => {
    if (nivel === 'Fundamental 1') return diaDaSemana === 3 ? ['LM'] : ['LM', 'A', 'LT'];
    if (nivel === 'Ensino Técnico (SENAI)') return ['LM', 'A', 'LT'];
    if (nivel === 'Fundamental 2') return Number(ano) === 9 ? ['LM'] : ['LT'];
    if (nivel === 'Ensino Médio') return ['LM'];
    if (nivel === 'Personaliza') return ['A'];
    return [];
  };

  const formatarNomeRefeicao = (ref) => {
    const mapa = { 'LM': 'Lanche da Manhã', 'A': 'Almoço', 'LT': 'Lanche da Tarde' };
    return mapa[ref] || ref;
  };

  useEffect(() => {
    if (!turmaIdFinal) return;

    const salaAtual = turmas.find(t => t.id === turmaIdFinal);
    if (!salaAtual) return;
    const refeicoes = obterRefeicoesDaTurma(salaAtual.nivel, salaAtual.ano);
    const avsBranco = {};
    refeicoes.forEach(ref => avsBranco[ref] = { gostaram: '', nao_gostaram: '', observacao: '' });

    api(`/api/info-lanches/turma/${turmaIdFinal}`).then(data => { 
      if (data && data.sucesso) setInfoLanches({ hoje: data.lanches_hoje || [], ontem: data.lanches_ontem || [] }); 
    });

    api(`/api/dados-preenchidos/turma/${turmaIdFinal}`).then(data => {
      if (data && data.bloqueado_pela_cozinha) {
        setBloqueioInteracao(data.mensagem);
        setTurmaIdFinal('');
        setLetraSelecionada('');
        return;
      }

      const presencaOntemCapturada = data.presencaOntem !== undefined ? data.presencaOntem : (data.dados?.presencaOntem || 0);
      setPresencaOntemDB(presencaOntemCapturada); 

      if (data && data.sucesso && data.ja_enviado) {
        setStatusCorrecao({ ativo: true, criado_por: data.criado_por || 'Sistema', alterado_por: data.alterado_por || '' });
        
        if (data.dados?.isSenaiParticionado) {
           setPresencaSenai(data.dados.presencaSenai || { LM: '', A: '', LT: '' });
           setPresencaEspeciaisSenai(data.dados.dietasSenai || {});
        } else {
           const dietasSalvas = data.dados.dietas || {};
           const qtdDietasSalvas = Object.values(dietasSalvas).filter(Boolean).length;
           const totalDB = data.dados.presencaGeral || 0;
           const padraoCalculado = Math.max(0, totalDB - qtdDietasSalvas);
           setPresencaGeral(padraoCalculado.toString());
           setPresencaEspeciais(dietasSalvas); 
        }
        
        setAvaliacoes(avsBranco); 
        api(`/api/alunos-especiais/turma/${turmaIdFinal}`).then(d => {
          if (d && d.sucesso) { 
             setAlunosEspeciais(d.dados || []); 

          }
        });
      } else {
        setStatusCorrecao({ ativo: false, criado_por: '', alterado_por: '' });
        setPresencaGeral(''); setAvaliacoes(avsBranco);
        api(`/api/alunos-especiais/turma/${turmaIdFinal}`).then(d => {
          if (d && d.sucesso) {
            setAlunosEspeciais(d.dados || []);
            const presencas = {};
            (d.dados || []).forEach(aluno => presencas[aluno.id] = false);
            setPresencaEspeciais(presencas);
          }
        });
      }
    });
  }, [turmaIdFinal, turmas]);

  const selecionarNivel = (idNivel) => {
    setBloqueioInteracao('');
    if (idNivel === 'Ensino Técnico (SENAI)') {
      if (diaDaSemana === 3) {
        setBloqueioInteracao('Quarta-feira é bloqueada para o Ensino Técnico.');
        setNivelSelecionado(''); setAnoSelecionado(''); setLetraSelecionada(''); return;
      }
    }
    if (idNivel === 'Ensino Técnico (SENAI)' && (diaDaSemana === 0 || diaDaSemana === 6)) {
      setBloqueioInteracao('Ensino Técnico não opera nos fins de semana.');
      setNivelSelecionado(''); setAnoSelecionado(''); setLetraSelecionada(''); return;
    }
    if (idNivel === 'Personaliza' && horaAtual < 10) {
      setBloqueioInteracao('Lançamento bloqueado até 10h.');
      setNivelSelecionado(''); setAnoSelecionado(''); setLetraSelecionada(''); return;
    }
    setNivelSelecionado(idNivel); setLetraSelecionada('');
    setAnoSelecionado('');
  };

  const tratarInputFrequencia = (valor) => {
    let num = parseInt(valor);
    if (isNaN(num) || num < 0) num = '';
    const maxPermitido = LIMITE_FISICO_SALA - Object.values(presencaEspeciais || {}).filter(Boolean).length;
    if (num > maxPermitido) num = maxPermitido;
    setPresencaGeral(num);
  };

  const tratarInputAvaliacao = (ref, campo, valor) => {
    if (valor === '') {
      setAvaliacoes(prev => ({
        ...prev,
        [ref]: { ...prev[ref], gostaram: '', nao_gostaram: '' }
      }));
      return;
    }

    let num = parseInt(valor, 10);
    if (isNaN(num) || num < 0) return;
    const basePresenca = Number(presencaOntemDB) || 0;
    if (num > basePresenca) num = basePresenca;

    setAvaliacoes(prev => {
      const gostaramCalculado = campo === 'gostaram' ? num : Math.max(0, basePresenca - num);
      const naoGostaramCalculado = campo === 'nao_gostaram' ? num : Math.max(0, basePresenca - num);

      return {
        ...prev,
        [ref]: { ...prev[ref], gostaram: gostaramCalculado, nao_gostaram: naoGostaramCalculado }
      };
    });
  };

  const alternarPresencaEspecial = (id) => {
    setPresencaEspeciais(prev => {
      const novasPresencas = { ...prev, [id]: !prev[id] };
      const novoTotalDietas = Object.values(novasPresencas).filter(Boolean).length;
      
      setPresencaGeral(atual => {
        const num = (atual === '' ? 0 : Number(atual));
        const maxPermitido = LIMITE_FISICO_SALA - novoTotalDietas;
        return num > maxPermitido ? (maxPermitido < 0 ? 0 : maxPermitido) : num;
      });
      
      return novasPresencas;
    });
  };

  const enviarDados = async () => {
    setCarregando(true);
    const loteAvaliacoes = Object.keys(avaliacoes).map(ref => ({
      tipo_refeicao: ref, gostaram: Number(avaliacoes[ref].gostaram) || 0, observacao: avaliacoes[ref].observacao || ''
    }));
    
    const loteDietas = isSenai 
      ? (alunosEspeciais || []).map(aluno => ({ aluno_id: Number(aluno.id), refeicoes: presencaEspeciaisSenai[aluno.id] || {LM: false, A: false, LT: false} }))
      : (alunosEspeciais || []).map(aluno => ({ aluno_id: Number(aluno.id), presente: Boolean(presencaEspeciais[aluno.id]) }));
      
    const payload = { 
      turma_id: Number(turmaIdFinal), 
      quantidade_geral: isSenai ? { LM: Number(presencaSenai.LM)||0, A: Number(presencaSenai.A)||0, LT: Number(presencaSenai.LT)||0 } : totalCalculado,
      avaliacoes: loteAvaliacoes, 
      dietas: loteDietas 
    };

    const [res] = await Promise.all([
      api('/api/lancamento-completo', { method: 'POST', body: JSON.stringify(payload) }),
      new Promise(r => setTimeout(r, 800))
    ]);
    if (res.sucesso) { setEtapaAtual(99); } else { mostrarToast(res.erro || "Falha ao gravar no banco.", "erro"); }
    setCarregando(false);
  };

  const adicionarData = (valor) => {
    if(!valor) return;
    const formatada = valor.split('-').reverse().join('/');
    if(!datasSelecionadas.includes(formatada)) {
      setDatasSelecionadas(prev => [...prev, formatada]);
    }
    setDataInput(''); 
  };
  
  const removerData = (dt) => setDatasSelecionadas(datasSelecionadas.filter(d => d !== dt));

  const handleInputPlanilha = (id_temp, campo, valor) => {
    setListaLote(prev => {
      const novaLista = prev.map(item => 
        item.id_temp === id_temp ? { ...item, [campo]: valor } : item
      );
      
      const index = novaLista.findIndex(item => item.id_temp === id_temp);
      if (campo === 'nome' && index === novaLista.length - 1 && typeof valor === 'string' && valor.trim() !== '') {
        novaLista.push({ id_temp: Date.now(), nome: '', chamada: '', turma_id: '', is_dieta: false });
      }
      
      return novaLista;
    });
  };

  const removerDoLote = (idTemp) => {
    setListaLote(prev => prev.filter(a => a.id_temp !== idTemp));
  };

  const enviarLote = async () => {
    const alunosValidos = listaLote.filter(a => a.nome.trim() !== '');
    if (alunosValidos.length === 0) {
      return mostrarToast('Adicione ao menos um aluno à lista.', 'erro');
    }
    if (!motivoLote.trim()) {
      setErrosValidacao(prev => ({ ...prev, motivo: true }));
      return mostrarToast('Preencha o motivo do lote.', 'erro');
    }
    if (datasSelecionadas.length === 0) {
      setErrosValidacao(prev => ({ ...prev, datas: true }));
      return mostrarToast('Adicione ao menos uma data.', 'erro');
    }

    const hasIncomplete = alunosValidos.some(a => !a.turma_id);
    if (hasIncomplete) {
      setErrosValidacao(prev => ({ ...prev, plan_turma: true }));
      return mostrarToast('Selecione a Turma (Sala Base) para todos os alunos preenchidos.', 'erro');
    }

    setCarregando(true);
    const [res] = await Promise.all([
      api('/api/solicitacoes/lote', {
        method: 'POST',
        body: JSON.stringify({ 
          data: datasSelecionadas.join(', '), 
          motivo_lote: motivoLote.trim(), 
          alunos: alunosValidos.map(a => {
            const partes = a.nome.trim().split(' ');
            const nome = partes[0] || '';
            const sobrenome = partes.slice(1).join(' ') || '.';
            return {
              nome: nome,
              sobrenome: sobrenome,
              chamada: a.chamada,
              turma_id: Number(a.turma_id),
              is_dieta: a.is_dieta ? 1 : 0
            };
          })
        })
      }),
      new Promise(r => setTimeout(r, 800))
    ]);

    if (res.sucesso) {
      mostrarToast('Lote de solicitações enviado com sucesso!', 'sucesso');
      setListaLote([{ id_temp: Date.now(), nome: '', chamada: '', turma_id: '', is_dieta: false }]);
      setMotivoLote('');
      setDatasSelecionadas([]);
      setErrosValidacao({});
      carregarMinhasSolicitacoes();
    } else { mostrarToast(res.erro || 'Falha ao registrar.', 'erro'); }
    setCarregando(false);
  };

  const resetarFluxo = () => {
    setEtapaAtual(1);
    setTurmaIdFinal('');
    setSalaSelecionadaObj(null);
    setLetraSelecionada('');
    setPresencaGeral('');
    setAvaliacoes({});
    setAlunosEspeciais([]);
    setPresencaEspeciais({});
    setStatusCorrecao({ ativo: false, criado_por: '', alterado_por: '' });
    
    api('/api/status-lancamentos-hoje')
      .then(data => { if (data && data.sucesso) setTurmasConcluidas(data.turmas_concluidas || []); });
  };

  let anosDoNivel = [...new Set((turmas || []).filter(t => t?.nivel === nivelSelecionado).map(t => t?.ano))].sort((a,b) => Number(a)-Number(b));
  
  if (nivelSelecionado === 'Ensino Técnico (SENAI)') {
    const is2AnoFora = diaDaSemana !== 2 && diaDaSemana !== 4;
    const is3AnoFora = diaDaSemana !== 1 && diaDaSemana !== 5;
    if (is2AnoFora) anosDoNivel = anosDoNivel.filter(a => a !== 2);
    if (is3AnoFora) anosDoNivel = anosDoNivel.filter(a => a !== 3);
  } else if (nivelSelecionado === 'Fundamental 2' && horaAtual < 13) {
    anosDoNivel = anosDoNivel.filter(a => Number(a) === 9);
  }

  if (nivelSelecionado === 'Ensino Médio') {
    const is2AnoFora = diaDaSemana === 2 || diaDaSemana === 4;
    const is3AnoFora = diaDaSemana === 1 || diaDaSemana === 5;
    if (is2AnoFora) anosDoNivel = anosDoNivel.filter(a => a !== 2);
    if (is3AnoFora) anosDoNivel = anosDoNivel.filter(a => a !== 3);
  }

  const turmasDoAnoBruto = (turmas || []).filter(t => t?.nivel === nivelSelecionado && t?.ano === anoSelecionado);
  const letrasUnicasDaTurma = [];
  const mapLetras = new Set();
  for (const t of turmasDoAnoBruto) {
    if (!mapLetras.has(t?.identificador)) { mapLetras.add(t?.identificador); letrasUnicasDaTurma.push(t); }
  }

  const turmasPermitidasExtra = (turmas || []).filter(t => t?.nivel?.includes('Fundamental 2') || t?.nivel?.includes('Ensino Médio'));

  return (
    <div className="min-h-screen font-sans selection:bg-primaria selection:text-white pb-20 relative">

      <main className="max-w-5xl mx-auto p-4 md:p-8 relative z-10 bg-white rounded-[2rem] shadow-xl my-6 border border-zinc-100">
        <ToastAlert visivel={notificacao.visivel} tipo={notificacao.tipo} texto={notificacao.texto} />

        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-sm gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--color-primaria)_0%,_transparent_40%)] opacity-5 pointer-events-none"></div>
          <div className="relative z-10">
             <h2 className="text-zinc-900 font-black text-2xl tracking-tight">Módulo Docente de Chamada</h2>
             <p className="text-zinc-500 text-sm font-bold flex items-center gap-2 mt-1">
               <span className="w-2 h-2 rounded-full bg-primaria animate-pulse"></span>
               {dataLancamento}
             </p>
          </div>
          <div className="flex gap-3 items-center w-full md:w-auto relative z-10">
            {tipoUsuario === 'coordenacao' && (
               <button onClick={() => navigate('/coordenacao')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:bg-zinc-800 transition-all">
                 <ArrowLeft className="w-4 h-4" /> Voltar à Coordenação
               </button>
            )}
            <div className="text-sm font-black text-primaria uppercase tracking-widest bg-white shadow-sm px-5 py-3 rounded-xl border border-orange-100 whitespace-nowrap flex items-center gap-2">
               <span className="bg-orange-100 text-orange-600 rounded-full w-6 h-6 flex items-center justify-center text-xs"><User className="w-3.5 h-3.5"/></span>
               {usuarioLogado}
            </div>
          </div>
        </div>

      {tipoUsuario !== 'coordenacao' && (
        <div className="mb-6 flex bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-sm w-fit relative z-10 mx-auto sm:mx-0">
          <button onClick={() => setAbaPrincipal('chamada')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${abaPrincipal === 'chamada' ? 'bg-white text-primaria shadow-md border border-zinc-100 scale-105' : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/50'}`}><ClipboardList className="w-4 h-4"/> Chamada Diária</button>
          <button onClick={() => setAbaPrincipal('extra')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${abaPrincipal === 'extra' ? 'bg-white text-primaria shadow-md border border-zinc-100 scale-105' : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/50'}`}><UtensilsCrossed className="w-4 h-4"/> Almoço Extra</button>
        </div>
      )}

      {abaPrincipal === 'extra' && tipoUsuario !== 'coordenacao' && (
        <div className="animate-fade-in transition-all bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-zinc-100">
           <div className="mb-6">
             <h2 className="text-3xl font-bold text-zinc-800 mb-1">Solicitar Almoço Extra (Lote)</h2>
             <p className="text-zinc-500 font-medium">Adicione os alunos à lista e envie de uma só vez para a Coordenação.</p>
           </div>

           <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-8 flex items-center gap-3.5 text-amber-900 text-xs font-medium shadow-sm">
             <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
             <span><strong>Atenção:</strong> O Almoço Extra destina-se exclusivamente a alunos regulares autorizados para permanência na escola. <u>Não realize pedidos aqui para turmas do programa Personaliza</u>.</span>
           </div>

           <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-2xl mb-8 overflow-x-auto shadow-sm">
             <h3 className="text-lg font-bold text-zinc-800 mb-4 flex items-center gap-2">
               <Users className="w-5 h-5 text-primaria"/> Planilha de Alunos
             </h3>
             <table className="w-full text-left border-collapse min-w-[700px]">
               <thead>
                 <tr className="border-b border-zinc-200">
                   <th className="p-3 text-xs font-black uppercase text-zinc-500 w-1/3">Nome Completo</th>
                   <th className="p-3 text-xs font-black uppercase text-zinc-500 w-32">Nº Chamada</th>
                   <th className="p-3 text-xs font-black uppercase text-zinc-500">Turma (Sala Base)</th>
                   <th className="p-3 text-xs font-black uppercase text-zinc-500 text-center w-24">Dieta</th>
                   <th className="p-3 text-xs font-black uppercase text-zinc-500 text-center w-20">Ação</th>
                 </tr>
               </thead>
               <tbody>
                 {listaLote.map((aluno) => (
                   <tr key={aluno.id_temp} className="border-b border-zinc-100 hover:bg-zinc-100/50 transition-colors">
                     <td className="p-2">
                       <input
                         type="text"
                         value={aluno.nome}
                         onChange={e => handleInputPlanilha(aluno.id_temp, 'nome', e.target.value)}
                         className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm font-bold text-zinc-800 outline-none focus:border-primaria shadow-sm"
                         placeholder="Ex: Lucas Ferreira"
                       />
                     </td>
                     <td className="p-2">
                       <input
                         type="number"
                         min="1"
                         max={LIMITE_FISICO_SALA}
                         value={aluno.chamada}
                         onChange={e => handleInputPlanilha(aluno.id_temp, 'chamada', e.target.value)}
                         className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm font-bold text-zinc-800 outline-none focus:border-primaria shadow-sm"
                         placeholder="Opc."
                       />
                     </td>
                     <td className="p-2">
                       <select
                         value={aluno.turma_id}
                         onChange={e => {
                           handleInputPlanilha(aluno.id_temp, 'turma_id', e.target.value);
                           setErrosValidacao(prev => ({ ...prev, plan_turma: false }));
                         }}
                         className={`w-full bg-white border ${errosValidacao.plan_turma && !aluno.turma_id && aluno.nome.trim() ? 'border-red-500 bg-red-50' : 'border-zinc-200'} rounded-lg px-3 py-2.5 text-sm font-bold text-zinc-800 outline-none focus:border-primaria shadow-sm`}
                       >
                         <option value="">Selecione...</option>
                         {turmasPermitidasExtra.map(t => (
                           <option key={t.id} value={t.id}>{t.ano}º {t.identificador}</option>
                         ))}
                       </select>
                     </td>
                     <td className="p-2 text-center">
                       <label className="inline-flex items-center cursor-pointer p-2 hover:bg-orange-50 rounded-lg transition-colors">
                         <input
                           type="checkbox"
                           checked={aluno.is_dieta}
                           onChange={e => handleInputPlanilha(aluno.id_temp, 'is_dieta', e.target.checked)}
                           className="w-5 h-5 text-primaria rounded focus:ring-primaria cursor-pointer"
                         />
                       </label>
                     </td>
                     <td className="p-2 text-center">
                       <button
                         type="button"
                         onClick={() => removerDoLote(aluno.id_temp)}
                         className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                         disabled={listaLote.length === 1 && !aluno.nome}
                       >
                         <Trash2 className="w-5 h-5" />
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest flex items-center">
                  Motivo do Evento / Lote <InfoTooltip texto="Descreva a razão pela qual este grupo de alunos precisa do almoço." />
                </label>
                <input 
                  type="text" 
                  value={motivoLote} 
                  onChange={e => {
                    setMotivoLote(e.target.value);
                    setErrosValidacao({...errosValidacao, motivo: false});
                  }} 
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-primaria transition-colors ${errosValidacao.motivo ? 'bg-red-50 border-2 border-red-500 placeholder-red-300' : 'bg-zinc-50 border border-zinc-200'}`} 
                  placeholder="Ex: Treino para Olimpíada, Reposição, etc." 
                />
                {errosValidacao.motivo && <p className="text-[10px] text-red-600 font-bold mt-1 uppercase">Obrigatório</p>}
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest flex items-center">
                  Dias Selecionados <InfoTooltip texto="Selecione um ou mais dias no calendário." />
                </label>
                <div className="mb-3">
                  <input 
                    type="date" 
                    min={new Date(getServerTime().getTime() - getServerTime().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                    value={dataInput} 
                    onChange={e => {
                      adicionarData(e.target.value);
                      setErrosValidacao(prev => ({...prev, datas: false}));
                    }} 
                    onKeyDown={e => e.preventDefault()} 
                    onClick={e => e.target.showPicker && e.target.showPicker()}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-primaria cursor-pointer select-none transition-colors ${errosValidacao.datas ? 'bg-red-50 border-2 border-red-500' : 'bg-zinc-50 border border-zinc-200'}`} 
                  />
                  {errosValidacao.datas && <p className="text-[10px] text-red-600 font-bold mt-1 uppercase">Adicione ao menos uma data</p>}
                </div>
                {datasSelecionadas.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                    {datasSelecionadas.map(d => (
                      <span key={d} className="bg-white border border-zinc-300 text-zinc-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                        {d} <button type="button" onClick={() => removerData(d)} className="text-red-500 hover:text-red-700 bg-red-50 rounded-full w-5 h-5 flex items-center justify-center"><X className="w-3 h-3"/></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
           </div>

           <button onClick={enviarLote} disabled={carregando} className="w-full bg-primaria text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-70 flex justify-center items-center gap-2 transition-all shadow-md mb-12">
              {carregando ? <span className="flex items-center gap-2"><RingLoader tamanho="w-5 h-5" /> Processando...</span> : 'Enviar Lote para Avaliação da Coordenação'}
           </button>

           <div className="border-t border-zinc-200 pt-8">
              <h3 className="text-xl font-black text-zinc-800 mb-4">Meus Pedidos de Almoço Extra</h3>
              {minhasSolicitacoes.length === 0 ? (
                <p className="text-zinc-500 text-sm font-bold">Você ainda não fez nenhuma solicitação.</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {minhasSolicitacoes.slice((paginaExtra - 1) * itensPorPagina, paginaExtra * itensPorPagina).map(solic => (
                      <div key={solic.id} className="bg-white border border-zinc-200 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 hover:shadow-md transition-all animate-fade-in">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-black text-zinc-800 uppercase flex items-center gap-2">
                              <span className="text-zinc-400 text-sm">#{String(solic?.id ?? '').padStart(4, '0')}</span> 
                              <span className={solic?.status === 'Cancelado' ? 'text-zinc-500 line-through' : ''}>{solic?.aluno_nome} {solic?.aluno_sobrenome}</span>
                            </h3>
                            {solic.is_dieta === 1 && (
                              <span className="flex items-center gap-1.5 mt-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-100">
                                <AlertTriangle className="w-3.5 h-3.5" /> Requer Dieta
                              </span>
                            )}
                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${solic.status === 'Cancelado' ? 'bg-zinc-200 text-zinc-600 border-zinc-300' : solic.status === 'Aprovado' ? 'bg-green-100 text-green-700 border-green-200' : solic.status === 'Negado' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                              {solic.status}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-600 mb-3">
                            <span className="bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">Chamada: <strong className="text-zinc-900">{solic.chamada}</strong></span>
                            <span className="bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">Turma: <strong className="text-zinc-900">{solic.ano}º {solic.turma} ({solic.nivel})</strong></span>
                          </div>

                          <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl space-y-2">
                            <p className="text-sm text-zinc-700 flex items-center gap-1"><strong><CalendarDays className="w-4 h-4"/> Datas Solicitadas:</strong> {solic.datas}</p>
                            <p className="text-sm text-zinc-700"><strong>Motivo:</strong> {solic.motivo}</p>
                            {solic.justificativa && (
                              <p className="text-sm text-red-600 mt-2 border-t pt-2 border-red-100"><strong>Justificativa da Recusa:</strong> {solic.justificativa}</p>
                            )}
                          </div>

                          {solic.status === 'Cancelado' && (
                            <div className="mt-3 bg-zinc-100 p-3 rounded-lg border border-zinc-200">
                              <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-zinc-500"/>
                                <span className="text-xs font-bold text-zinc-600">Cancelado por {solic?.autor_cancelamento === 'Você' ? 'você' : (solic?.autor_cancelamento || '')} {solic?.cancelado_em ? `às ${(String(solic.cancelado_em).includes(' ') ? String(solic.cancelado_em).split(' ')[1] : String(solic.cancelado_em)).slice(0, 5)}` : ''}</span>
                              </div>
                              {solic.motivo_cancelamento && (
                                <p className="text-xs text-zinc-500 mt-2 border-t border-zinc-200 pt-2"><strong>Motivo:</strong> {solic.motivo_cancelamento}</p>
                              )}
                            </div>
                          )}
                          {(solic.status === 'Aprovado' || solic.status === 'Negado') && solic.avaliado_em && (
                            <div className="mt-3 px-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                {solic?.status === 'Aprovado' ? 'Aprovado' : 'Negado'} por {solic?.avaliado_por || ''} às {(String(solic?.avaliado_em || '').includes(' ') ? String(solic.avaliado_em).split(' ')[1] : String(solic?.avaliado_em || '')).slice(0, 5)}
                              </span>
                            </div>
                          )}
                        </div>

                        {(solic.status !== 'Negado' && solic.status !== 'Cancelado') && (
                          <div className="flex flex-row xl:flex-col gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                            <button 
                              onClick={() => setModalCancelar({ visivel: true, id: solic.id, motivo: '', erro: '' })} 
                              disabled={carregando || (() => {
                                if (!solic?.datas || typeof solic.datas !== 'string') return true;
                                const hoje = new Date();
                                hoje.setHours(0, 0, 0, 0);
                                const dias = solic.datas.split(',').map(d => {
                                  const trimmed = (d || '').trim();
                                  if (trimmed.includes('-')) {
                                    const p = trimmed.split('-');
                                    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
                                  } else {
                                    const p = trimmed.split('/');
                                    return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
                                  }
                                });
                                return !dias.some(d => d >= hoje);
                              })()} 
                              className="flex-1 xl:w-48 bg-white border border-red-200 text-red-500 hover:text-red-700 font-black py-3.5 px-4 rounded-xl uppercase tracking-widest text-xs hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              title={(() => {
                                if (!solic?.datas || typeof solic.datas !== 'string') return '';
                                const hoje = new Date();
                                hoje.setHours(0, 0, 0, 0);
                                const dias = solic.datas.split(',').map(d => {
                                  const trimmed = (d || '').trim();
                                  if (trimmed.includes('-')) {
                                    const p = trimmed.split('-');
                                    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
                                  } else {
                                    const p = trimmed.split('/');
                                    return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
                                  }
                                });
                                return !dias.some(d => d >= hoje) ? 'Não é possível cancelar solicitações passadas.' : '';
                              })()}
                            >
                              <XCircle className="w-4 h-4 shrink-0"/> Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {minhasSolicitacoes.length > itensPorPagina && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <button onClick={() => setPaginaExtra(p => Math.max(1, p - 1))} disabled={paginaExtra === 1} className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-bold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">Anterior</button>
                      <span className="text-sm font-bold text-zinc-500">Pág. {paginaExtra} de {Math.ceil(minhasSolicitacoes.length / itensPorPagina)}</span>
                      <button onClick={() => setPaginaExtra(p => Math.min(Math.ceil(minhasSolicitacoes.length / itensPorPagina), p + 1))} disabled={paginaExtra === Math.ceil(minhasSolicitacoes.length / itensPorPagina)} className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-bold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">Próxima</button>
                    </div>
                  )}
                </>
              )}
           </div>
        </div>
      )}

      {modalCancelar.visivel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in transition-all">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-fade-in transition-all">
            <h3 className="text-xl font-black text-red-600 flex items-center gap-2 mb-4">
              <XCircle className="w-6 h-6" /> Justifique o Cancelamento
            </h3>
            <p className="text-sm text-zinc-600 font-medium mb-4">
              Por que você está cancelando este pedido? Isso ficará registrado na auditoria da coordenação.
            </p>
            <textarea
              className={`w-full bg-zinc-50 border-2 ${modalCancelar.erro ? 'border-red-500' : 'border-zinc-200'} rounded-xl p-4 text-sm font-bold text-zinc-800 focus:border-red-500 outline-none resize-none ${modalCancelar.erro ? 'mb-2' : 'mb-6'}`}
              rows="3"
              placeholder="Ex: Aluno faltou, selecionei a turma errada..."
              value={modalCancelar.motivo}
              onChange={(e) => setModalCancelar({ ...modalCancelar, motivo: e.target.value, erro: '' })}
            ></textarea>
            {modalCancelar.erro && (
              <span className="text-red-500 text-xs block mb-4">{modalCancelar.erro}</span>
            )}
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setModalCancelar({ visivel: false, id: null, motivo: '', erro: '' })} 
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={confirmarCancelamento} 
                disabled={!modalCancelar.motivo.trim()}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {abaPrincipal === 'chamada' && (
        <>
          {etapaAtual !== 99 && (
            <div className="mb-10 animate-fade-in relative z-10">
              <div className="flex justify-between mb-4 px-2">
                {passosExibidos.map((p, index) => (
                  <span key={p.id} className={`text-[10px] md:text-xs font-black uppercase tracking-widest flex flex-col items-center gap-2 transition-colors duration-500 ${etapaAtual > index ? 'text-primaria' : 'text-zinc-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${etapaAtual > index ? 'bg-orange-50 border-primaria shadow-[0_0_15px_rgba(192,82,29,0.2)] scale-110' : 'bg-transparent border-zinc-200'}`}>
                      {etapaAtual > index + 1 ? <Check className="w-4 h-4" /> : p.id}
                    </div>
                    <span className="hidden sm:inline text-center">{p.titulo}</span>
                  </span>
                ))}
              </div>
              <div className="w-full bg-zinc-200/50 rounded-full h-3 shadow-inner overflow-hidden">
                <div className="bg-gradient-to-r from-primaria to-orange-400 h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(192,82,29,0.5)] relative" style={{ width: `${(etapaAtual / passosExibidos.length) * 100}%` }}>
                  <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white min-h-[500px] flex flex-col relative z-10">
            <div className="p-8 md:p-12 flex-grow">
              
              {/* ETAPA 1: IDENTIFICAÇÃO */}
              {passoAtualInfo.chave === 'identificacao' && (
                <div className="animate-fade-in">
                  <h2 className="text-3xl font-bold text-zinc-800 mb-2">Localize a Turma</h2>
                  <p className="text-zinc-500 mb-8 font-medium">Turmas destacadas em vermelho indicam ausência de lançamento hoje.</p>
                  
                  {bloqueioInteracao && <div className="mb-6 p-4 bg-zinc-100 border-l-4 border-zinc-400 text-zinc-600 font-bold rounded-r-lg shadow-sm flex items-center gap-2"><Lock className="w-5 h-5"/> {bloqueioInteracao}</div>}

                  {!bloqueioInteracao && statusCorrecao.ativo && turmaIdFinal && (
                     <div className="mb-8 p-5 bg-green-50 border border-green-200 rounded-2xl shadow-sm flex flex-col gap-2 animate-fade-in">
                        <span className="font-black text-green-800 text-sm uppercase tracking-widest flex items-center gap-2 mb-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                          Lançamento Já Efetivado Hoje
                        </span>
                        <span className="text-xs font-bold text-zinc-600">Enviado originalmente por: <span className="text-green-700 bg-white px-2 py-0.5 rounded border border-green-100">{statusCorrecao.criado_por}</span></span>
                        {statusCorrecao.alterado_por && statusCorrecao.alterado_por !== statusCorrecao.criado_por && (
                          <span className="text-xs font-bold text-zinc-600">Última correção feita por: <span className="text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-100">{statusCorrecao.alterado_por}</span></span>
                        )}
                        <span className="text-[10px] mt-2 font-bold uppercase text-green-600/70">Avançar os passos permitirão editar e sobrescrever estes dados.</span>
                     </div>
                  )}

                  <div className="bg-white p-5 md:p-6 rounded-3xl border border-zinc-200 shadow-sm mb-6">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md">1</span> Nível Escolar
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {niveisVisuais.map(n => {
                        let isBloqueado = (n.id === 'Personaliza' && horaAtual < 9);
                        if (n.id === 'Ensino Técnico (SENAI)') {
                          const isDiaInvalido = ![1,2,4,5].includes(diaDaSemana); 
                          if (isDiaInvalido) isBloqueado = true;
                        }

                        const Icone = n.icon;

                        return (
                          <button key={n.id} onClick={() => selecionarNivel(n.id)} disabled={isBloqueado} 
                            className={`flex-1 min-w-[120px] p-3 rounded-xl border-2 font-bold transition-all flex flex-col items-center justify-center gap-2 ${nivelSelecionado === n.id ? 'border-primaria bg-orange-50 text-primaria shadow-md' : isBloqueado ? 'border-zinc-200 bg-zinc-100 text-zinc-400 opacity-60 cursor-not-allowed' : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 text-zinc-600'}`}>
                            <Icone className="w-5 h-5 mb-0.5" />
                            <span className="text-xs text-center">{n.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-6 mb-6">
                    <div className="flex-1 bg-white p-5 md:p-6 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md">2</span> Ano Base
                      </h3>
                      {!nivelSelecionado || bloqueioInteracao ? (
                        <div className="w-full flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-2xl p-6 bg-zinc-50 opacity-60 min-h-[140px]">
                          <span className="text-sm font-bold text-zinc-400 text-center flex flex-col items-center gap-2"><Search className="w-6 h-6" /> Aguardando Nível.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 animate-fade-in">
                          {anosDoNivel.map(a => (<button key={a} onClick={() => { setAnoSelecionado(a); setLetraSelecionada(''); }} className={`py-3 rounded-xl border-2 font-bold text-base transition-all ${anoSelecionado === a ? 'border-primaria bg-orange-50 text-primaria shadow-md' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'}`}>{`${a}º Ano`}</button>))}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-white p-5 md:p-6 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md">3</span> Turma
                      </h3>
                      {anoSelecionado === '' || bloqueioInteracao ? (
                        <div className="w-full flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-2xl p-6 bg-zinc-50 opacity-60 min-h-[140px]">
                          <span className="text-sm font-bold text-zinc-400 text-center flex flex-col items-center gap-2"><Users className="w-6 h-6" /> Aguardando Ano.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 animate-fade-in">
                          {letrasUnicasDaTurma.map(turma => {
                            const foiEnviada = turmasConcluidas.includes(turma.id);
                            const bloqueada = isTurmaBloqueadaHoje(turma);
                            
                            let estiloBotao;
                            if (bloqueada) {
                              estiloBotao = 'opacity-40 cursor-not-allowed bg-zinc-100 grayscale border-zinc-200 text-zinc-400';
                            } else {
                              estiloBotao = letraSelecionada === turma.identificador ? 'border-primaria bg-orange-50 text-primaria shadow-md scale-105' : foiEnviada ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700 hover:bg-red-100';
                            }
                            return (
                              <button key={turma.id}
                                onClick={() => setLetraSelecionada(turma.identificador)} 
                                disabled={bloqueada}
                                title={bloqueada ? "Sem grade presencial para o dia de hoje" : "Realizar lançamento"}
                                className={`relative py-3 rounded-xl border-2 font-bold text-base transition-all flex flex-col items-center justify-center gap-1 ${estiloBotao}`}>
                                <span>{nivelSelecionado === 'Ensino Técnico (SENAI)' ? turma.identificador : turma.identificador}</span>
                                
                                {foiEnviada && !bloqueada && (
                                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-md border-2 border-white">
                                    <Check className="w-3 h-3" />
                                  </div>
                                )}
                                
                                {bloqueada && <span className="block text-[9px] uppercase text-red-500 mt-1">Ausente</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 2: CARDÁPIO DIRECIONADO P/ SALA */}
              {passoAtualInfo.chave === 'cardapio' && (
                <div className="animate-fade-in">
                   <h2 className="text-3xl font-bold text-zinc-800 mb-2">Cardápio Programado</h2>
                   <p className="text-zinc-500 mb-8 font-medium">Estes são os pratos que a Cozinha preparou para a sua turma hoje.</p>

                   {infoLanches.hoje.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 p-8 rounded-2xl text-center shadow-inner mt-4">
                         <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-10 h-10"/></div>
                         <h3 className="text-xl font-black text-yellow-800 uppercase tracking-widest mb-2">Sem Cardápio Registrado</h3>
                         <p className="text-yellow-700 font-bold text-sm max-w-lg mx-auto">A Nutrição ainda não inseriu o cardápio no sistema para o dia de hoje. Você pode prosseguir com a chamada normalmente.</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {infoLanches.hoje
                            .filter(l => obterRefeicoesDaTurma(salaSelecionadaObj?.nivel, salaSelecionadaObj?.ano).includes(l.tipo_refeicao))
                            .sort((a, b) => {
                                const ordem = { 'LM': 1, 'A': 2, 'LT': 3 };
                                return (ordem[a.tipo_refeicao] || 4) - (ordem[b.tipo_refeicao] || 4);
                             })
                             .map(lanche => (
                             <div key={lanche.id} className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                               <div className="absolute top-0 left-0 w-2 h-full bg-primaria opacity-80 group-hover:opacity-100 transition-opacity"></div>
                               <div className="flex items-center gap-4 mb-5 border-b border-zinc-100 pb-4">
                                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center shadow-inner">
                                     <UtensilsCrossed className="w-6 h-6 text-primaria" strokeWidth={1.5} />
                                  </div>
                                  <h3 className="text-xl font-black text-zinc-800 uppercase tracking-tight">{formatarNomeRefeicao(lanche.tipo_refeicao)}</h3>
                               </div>
                               <div className="space-y-4 pl-2">
                                  <div>
                                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span> 
                                        {lanche.tipo_refeicao === 'A' ? 'Prato Principal (Mistura)' : 'Lanche Principal'}
                                     </p>
                                     <p className="text-lg font-bold text-zinc-800 leading-snug">
                                       {lanche.prato_principal || lanche.lanche_padrao}
                                     </p>
                                  </div>

                                  {(lanche.arroz || lanche.feijao || lanche.guarnicao || lanche.opcao_vegetal || lanche.molho_salada || lanche.sobremesa || lanche.fruta || lanche.bebida) && (
                                    <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 space-y-2">
                                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Composição da Refeição</p>
                                      <div className="flex flex-wrap gap-2">
                                         {lanche.arroz && (
                                           <span title={`Arroz: ${lanche.arroz}`} className="text-xs bg-amber-50/80 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                             <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                             {lanche.arroz}
                                           </span>
                                         )}
                                         {lanche.feijao && (
                                           <span title={`Feijão: ${lanche.feijao}`} className="text-xs bg-stone-100 text-stone-800 border border-stone-300 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                             <span className="w-1.5 h-1.5 rounded-full bg-stone-500 shrink-0"></span>
                                             {lanche.feijao}
                                           </span>
                                         )}
                                         {lanche.guarnicao && (
                                           <span title={`Guarnição: ${lanche.guarnicao}`} className="text-xs bg-orange-50/80 text-orange-900 border border-orange-200/80 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                             <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                                             {lanche.guarnicao}
                                           </span>
                                         )}
                                         {lanche.opcao_vegetal && (
                                           <span title={`Salada: ${lanche.opcao_vegetal}`} className="text-xs bg-emerald-50/80 text-emerald-900 border border-emerald-200/80 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                             {lanche.opcao_vegetal}
                                           </span>
                                         )}
                                         {lanche.molho_salada && (
                                           <span title={`Molho: ${lanche.molho_salada}`} className="text-xs bg-lime-50/80 text-lime-900 border border-lime-200/80 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                             <span className="w-1.5 h-1.5 rounded-full bg-lime-500 shrink-0"></span>
                                             {lanche.molho_salada}
                                           </span>
                                         )}
                                         {lanche.sobremesa && (
                                           <span title={`Sobremesa: ${lanche.sobremesa}`} className="text-xs bg-purple-50/80 text-purple-900 border border-purple-200/80 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                             <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                                             {lanche.sobremesa}
                                           </span>
                                         )}
                                         {lanche.fruta && (
                                           <span title={`Fruta: ${lanche.fruta}`} className="text-xs bg-yellow-50/80 text-yellow-900 border border-yellow-200/80 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                             <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0"></span>
                                             {lanche.fruta}
                                           </span>
                                         )}
                                         {lanche.bebida && (
                                           <span title={`Bebida: ${lanche.bebida}`} className="text-xs bg-sky-50/80 text-sky-900 border border-sky-200/80 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                             <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
                                             {lanche.bebida}
                                           </span>
                                         )}
                                       </div>
                                    </div>
                                  )}

                                  {(lanche.lanche_dieta || lanche.prato_principal_dieta) && (
                                     <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1.5 flex items-center gap-2">
                                           <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span> 
                                           {lanche.tipo_refeicao === 'A' ? 'Mistura Adaptada (Dieta)' : 'Lanche Adaptado (Dieta)'}
                                        </p>
                                        <p className="text-sm font-bold text-orange-950">{lanche.lanche_dieta || lanche.prato_principal_dieta}</p>
                                     </div>
                                  )}
                               </div>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
              )}

              {/* ETAPA 3: FREQUÊNCIA E DIETAS JUNTAS */}
              {passoAtualInfo.chave === 'frequencia' && (
                <div className="animate-fade-in flex flex-col justify-center items-center h-full w-full">
                  <div className="text-center mb-6">
                    <h2 className="text-4xl font-black text-zinc-800 mb-3 flex items-center justify-center">
                      Frequência Física da Sala 
                      <InfoTooltip texto="Quantidade de alunos que estão fisicamente presentes para comer." />
                    </h2>
                  </div>
                  
                  {/* INÍCIO DA NOVA UI DE SOMA */}
                  <div className={`w-full max-w-4xl flex ${isSenai && alunosEspeciais.length === 0 ? 'flex-col md:flex-row bg-zinc-50 p-6 md:p-10 rounded-[2rem] border border-zinc-200 shadow-inner items-center justify-center' : 'flex-col'} gap-6 mb-10`}>
                    {isSenai ? (
                      alunosEspeciais.length === 0 ? (
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-center w-full">
                          {['LM', 'A', 'LT'].map(turno => (
                            <div key={turno} className="flex flex-col items-center bg-white border-2 border-zinc-200 hover:border-primaria/50 transition-colors p-6 rounded-[2rem] w-36 md:w-44 shadow-md relative group">
                              <span className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3 group-hover:text-primaria transition-colors text-center">
                                 {turno === 'LM' ? 'Lanche Manhã' : turno === 'A' ? 'Almoço' : 'Lanche Tarde'}
                              </span>
                              <div className="relative w-full">
                                 <input 
                                   type="text" 
                                   inputMode="numeric" 
                                   maxLength={2}
                                   className="w-full text-center bg-zinc-50 border-2 border-zinc-200 px-4 py-6 rounded-3xl text-5xl font-black text-zinc-800 outline-none focus:border-primaria focus:bg-orange-50 focus:text-primaria transition-all shadow-inner" 
                                   value={presencaSenai[turno] || ''} 
                                   onChange={e => {
                                       let val = e.target.value.replace(/\D/g, '');
                                       if (val !== '' && parseInt(val, 10) > LIMITE_FISICO_SALA) val = String(LIMITE_FISICO_SALA);
                                       setPresencaSenai({...presencaSenai, [turno]: val});
                                   }} 
                                   placeholder="00"
                                 />
                                 <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md z-10">
                                   Máx: {LIMITE_FISICO_SALA}
                                 </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        ['LM', 'A', 'LT'].map(turno => {
                           const dietasTurno = Object.values(presencaEspeciaisSenai).filter(aluno => aluno && aluno[turno]).length;
                           const padraoTurno = presencaSenai[turno] === '' ? 0 : Number(presencaSenai[turno]);
                           const totalTurno = padraoTurno + dietasTurno;
                           
                           return (
                            <div key={turno} className="bg-zinc-50 p-6 md:p-8 rounded-[2rem] border border-zinc-200 shadow-inner w-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 relative">
                              <div className="absolute top-4 left-6 md:top-auto md:left-auto md:relative text-xs font-black uppercase text-primaria tracking-widest hidden md:block opacity-50 -rotate-90 -ml-16">
                                 {turno === 'LM' ? 'Manhã' : turno === 'A' ? 'Almoço' : 'Tarde'}
                              </div>
                              <div className="w-full text-center md:hidden mb-2 text-sm font-black uppercase text-primaria tracking-widest border-b pb-2">{turno === 'LM' ? 'Lanche da Manhã' : turno === 'A' ? 'Almoço' : 'Lanche da Tarde'}</div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-2">
                                  Padrão ({turno})
                                </span>
                                <input 
                                  type="number" 
                                  min="0" 
                                  max={LIMITE_FISICO_SALA - dietasTurno} 
                                  className="w-28 md:w-32 text-center bg-white border-4 border-orange-400 px-2 py-4 rounded-3xl text-4xl font-black text-orange-600 outline-none focus:border-orange-500 transition-all shadow-md focus:ring-4 focus:ring-orange-100" 
                                  value={presencaSenai[turno] || ''} 
                                  onChange={e => {
                                     let val = e.target.value.replace(/\D/g, '');
                                     let num = parseInt(val);
                                     if (isNaN(num) || num < 0) val = '';
                                     else {
                                        const maxPermitido = LIMITE_FISICO_SALA - dietasTurno;
                                        if (num > maxPermitido) val = String(maxPermitido);
                                     }
                                     setPresencaSenai({...presencaSenai, [turno]: val});
                                  }} 
                                  placeholder="0"
                                />
                              </div>
                              <div className="text-3xl font-black text-zinc-300">+</div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Dietas ({turno})</span>
                                <div className="w-28 md:w-32 h-[80px] md:h-[88px] flex items-center justify-center bg-zinc-100 border-4 border-zinc-200 rounded-3xl text-4xl font-black text-zinc-400 shadow-sm select-none">
                                  {dietasTurno}
                                </div>
                              </div>
                              <div className="text-3xl font-black text-zinc-300">=</div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primaria mb-2">Total ({turno})</span>
                                <div className="w-32 md:w-40 h-[80px] md:h-[88px] flex items-center justify-center bg-primaria border-4 border-orange-600 rounded-3xl text-4xl md:text-5xl font-black text-white shadow-md transition-all select-none">
                                  {totalTurno}
                                </div>
                              </div>
                            </div>
                           );
                        })
                      )
                    ) : (
                      alunosEspeciais.length === 0 ? (
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-center w-full">
                          <div className="flex flex-col items-center bg-white border-2 border-zinc-200 hover:border-primaria/50 transition-colors p-6 rounded-[2rem] w-48 shadow-md relative group">
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3 group-hover:text-primaria transition-colors text-center">
                               Total de Alunos
                            </span>
                            <div className="relative w-full">
                               <input 
                                 type="text" 
                                 inputMode="numeric" 
                                 maxLength={2}
                                 className="w-full text-center bg-zinc-50 border-2 border-zinc-200 px-4 py-6 rounded-3xl text-5xl font-black text-zinc-800 outline-none focus:border-primaria focus:bg-orange-50 focus:text-primaria transition-all shadow-inner" 
                                 value={presencaGeral} 
                                 onChange={e => tratarInputFrequencia(e.target.value)} 
                                 placeholder="00"
                               />
                               <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md z-10">
                                 Máx: {LIMITE_FISICO_SALA}
                               </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-zinc-50 p-6 md:p-8 rounded-[2rem] border border-zinc-200 shadow-inner w-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-2">
                              Lanche Padrão
                            </span>
                            <input 
                              type="number" 
                              min="0" 
                              max={LIMITE_FISICO_SALA - totalDietasMarcadas} 
                              className="w-28 md:w-32 text-center bg-white border-4 border-orange-400 px-2 py-4 rounded-3xl text-4xl font-black text-orange-600 outline-none focus:border-orange-500 transition-all shadow-md focus:ring-4 focus:ring-orange-100" 
                              value={presencaGeral} 
                              onChange={e => tratarInputFrequencia(e.target.value)} 
                              placeholder="0"
                            />
                          </div>

                          <div className="text-3xl font-black text-zinc-300">+</div>

                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Dietas Especiais</span>
                            <div className="w-28 md:w-32 h-[80px] md:h-[88px] flex items-center justify-center bg-zinc-100 border-4 border-zinc-200 rounded-3xl text-4xl font-black text-zinc-400 shadow-sm select-none">
                              {totalDietasMarcadas}
                            </div>
                          </div>

                          <div className="text-3xl font-black text-zinc-300">=</div>

                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primaria mb-2">Total de Alunos</span>
                            <div className="w-32 md:w-40 h-[80px] md:h-[88px] flex items-center justify-center bg-primaria border-4 border-orange-600 rounded-3xl text-4xl md:text-5xl font-black text-white shadow-md transition-all select-none">
                              {totalCalculado}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  {/* FIM DA NOVA UI DE SOMA */}

                  {alunosEspeciais.length > 0 && (
                    <div className="w-full max-w-2xl bg-orange-50/40 border-2 border-orange-200 rounded-3xl p-6 md:p-8 shadow-sm">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-xl font-black text-orange-950 flex items-center gap-2">
                          <ChefHat className="w-5 h-5 text-orange-600" /> Alunos com Restrição Alimentar
                        </h3>
                        <span className="text-xs font-black bg-orange-100 text-orange-800 border border-orange-200 px-3 py-1 rounded-full uppercase tracking-wider">
                          {alunosEspeciais.length} {alunosEspeciais.length === 1 ? 'aluno' : 'alunos'}
                        </span>
                      </div>
                      
                      <div className="bg-white border border-orange-200/80 rounded-2xl p-4 mb-6 flex items-start gap-3 text-xs text-orange-950 font-medium shadow-sm">
                        <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <span>Marque apenas os alunos que <strong>compareceram hoje</strong>. A presença soma automaticamente na contagem de dietas acima.</span>
                      </div>

                      <div className="space-y-3">
                        {(alunosEspeciais || []).map(aluno => {
                           const refeicoesSala = obterRefeicoesDaTurma(salaSelecionadaObj?.nivel, salaSelecionadaObj?.ano);
                           const dietaItem = infoLanches.hoje.find(l => refeicoesSala.includes(l?.tipo_refeicao) && (l?.lanche_dieta || l?.prato_principal_dieta));
                           const textoExibicao = dietaItem ? (dietaItem.lanche_dieta || dietaItem.prato_principal_dieta) : 'Nenhuma adaptação no cardápio.';

                           const alunoTemSenaiDieta = isSenai && presencaEspeciaisSenai[aluno.id] && (presencaEspeciaisSenai[aluno.id].LM || presencaEspeciaisSenai[aluno.id].A || presencaEspeciaisSenai[aluno.id].LT);
                           const estaPresente = isSenai ? alunoTemSenaiDieta : Boolean(presencaEspeciais[aluno.id]);

                           return (
                             <div 
                               key={aluno.id} 
                               className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-5 rounded-2xl border-2 transition-all duration-200 ${
                                 estaPresente 
                                   ? 'border-green-500 bg-white shadow-md shadow-green-500/10' 
                                   : 'border-red-200 bg-white hover:border-red-300'
                               }`}
                             >
                               <div className="flex-1 pr-4">
                                 <h4 className="font-black text-zinc-800 text-base md:text-lg tracking-tight mb-1.5">{aluno.nome}</h4>
                                 <div className="flex items-center gap-2 flex-wrap text-xs">
                                    {(Array.isArray(aluno.restricoes) && aluno.restricoes.length > 0 
                                      ? aluno.restricoes 
                                      : (aluno.restricao ? aluno.restricao.split(' • ') : ['Especial'])
                                    ).map((r, i) => (
                                      <span key={i} className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200/60 shadow-sm">
                                        {r}
                                      </span>
                                    ))}
                                    <span className="text-zinc-500 font-medium">Servir: <strong className="text-zinc-700 font-bold">{textoExibicao}</strong></span>
                                 </div>
                               </div>
                               
                               <div className="mt-4 md:mt-0 flex items-center gap-3 w-full md:w-auto shrink-0">
                                  {isSenai ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {['LM', 'A', 'LT'].map(turno => {
                                        const isChecked = presencaEspeciaisSenai[aluno.id]?.[turno];
                                        return (
                                          <button 
                                            key={turno} 
                                            type="button"
                                            onClick={() => { 
                                              setPresencaEspeciaisSenai(prev => {
                                                const newState = { ...prev, [aluno.id]: { ...(prev[aluno.id] || {}), [turno]: !(prev[aluno.id] || {})[turno] } };
                                                const novoTotalDietas = Object.values(newState).filter(a => a && a[turno]).length;
                                                
                                                setPresencaSenai(atual => {
                                                  const currentVal = atual[turno];
                                                  const num = (currentVal === '' || currentVal === undefined ? 0 : Number(currentVal));
                                                  const maxPermitido = LIMITE_FISICO_SALA - novoTotalDietas;
                                                  const novoNum = num > maxPermitido ? (maxPermitido < 0 ? 0 : maxPermitido) : num;
                                                  return { ...atual, [turno]: novoNum === 0 && (currentVal === '' || currentVal === undefined) ? '' : String(novoNum) };
                                                });
                                                return newState;
                                              });
                                            }} 
                                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                                              isChecked 
                                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                                : 'bg-red-500 text-white hover:bg-red-600'
                                            }`}
                                          >
                                            {isChecked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[2.5]" />}
                                            {turno}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <button 
                                      type="button" 
                                      onClick={() => alternarPresencaEspecial(aluno.id)} 
                                      className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                                        estaPresente 
                                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20' 
                                          : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                                      }`}
                                    >
                                      {estaPresente ? (
                                        <>
                                          <Check className="w-4 h-4 stroke-[3]" />
                                          <span>Presente</span>
                                        </>
                                      ) : (
                                        <>
                                          <X className="w-4 h-4 stroke-[2.5]" />
                                          <span>Faltou</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                               </div>
                             </div>
                           );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ETAPA 4: AVALIAÇÃO */}
              {passoAtualInfo.chave === 'avaliacao' && (
                <div className="animate-fade-in">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-zinc-800 mb-2">Monitoramento de Aceitação</h2>
                    <p className="text-zinc-500 font-medium">Informe apenas quantos alunos não gostaram do lanche. A quantidade de alunos que gostaram será calculada automaticamente com base nos presentes de ontem.</p>
                  </div>
                  
                  {presencaOntemDB === 0 ? (
                    <div className="bg-zinc-50 border border-zinc-200 p-8 rounded-2xl text-center shadow-inner mt-10">
                      <h3 className="text-lg font-black text-zinc-600 uppercase tracking-widest mb-2">Avaliação Indisponível</h3>
                      <p className="text-zinc-500 font-bold text-sm mx-auto">
                        Nenhuma presença foi registrada para esta turma no dia anterior, portanto não há métricas para avaliar.
                      </p>
                    </div>
                  ) : (
                    Object.keys(avaliacoes).length === 0 ? (
                      <p className="text-zinc-500 italic p-6 bg-zinc-50 rounded-xl text-center border">Sem métricas pendentes para esta turma.</p>
                    ) : (
                      Object.keys(avaliacoes).map(ref => {
                        const lancheOntemObj = infoLanches.ontem.find(l => l.tipo_refeicao === ref);
                        const isNaoInformado = !lancheOntemObj || (!lancheOntemObj.lanche_padrao && !lancheOntemObj.prato_principal);
                        const lancheOntem = isNaoInformado ? 'N/A - Não Informado' : (lancheOntemObj.prato_principal || lancheOntemObj.lanche_padrao);
                        const acompanhamentosOntem = [
                          lancheOntemObj?.arroz,
                          lancheOntemObj?.feijao,
                          lancheOntemObj?.guarnicao,
                          lancheOntemObj?.opcao_vegetal,
                          lancheOntemObj?.molho_salada,
                          lancheOntemObj?.sobremesa,
                          lancheOntemObj?.fruta,
                          lancheOntemObj?.bebida
                        ].filter(Boolean);
                        const formatoNome = formatarNomeRefeicao(ref);
                        const basePresenca = Number(presencaOntemDB) || 0;
                        const naoGostaram = Number(avaliacoes[ref]?.nao_gostaram) || 0;
                        const gostaram = Math.max(0, basePresenca - naoGostaram);

                        return (
                          <div key={ref} className="mb-6 p-6 sm:p-7 rounded-3xl bg-white border border-zinc-200/90 shadow-xs hover:shadow-md transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4 mb-5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-orange-100 text-primaria flex items-center justify-center font-black text-xs shrink-0">
                                  {ref}
                                </div>
                                <div>
                                  <h3 className="text-base font-black text-zinc-900 uppercase tracking-wide">
                                    {formatoNome}
                                  </h3>
                                  {acompanhamentosOntem.length > 0 && (
                                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                                      {acompanhamentosOntem.join(' • ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                                  isNaoInformado 
                                    ? 'bg-zinc-100/80 text-zinc-600 border-zinc-200' 
                                    : 'bg-orange-50 text-orange-800 border-orange-200/70'
                                }`}>
                                  <ChefHat className="w-3.5 h-3.5" />
                                  <span className="truncate max-w-[200px] sm:max-w-xs">{lancheOntem}</span>
                                </span>
                              </div>
                            </div>
                            
                            {isNaoInformado && (
                               <div className="bg-zinc-50 border border-zinc-200/80 text-zinc-600 p-3.5 mb-5 rounded-2xl text-xs font-medium flex items-center gap-2.5">
                                 <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                 <span>O cardápio deste turno não foi cadastrado ontem. Você pode registrar as avaliações normalmente e a Nutrição fará o vínculo retroativo.</span>
                               </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                              {/* Campo de Entrada: Não Gostaram */}
                              <div className="bg-zinc-50/70 p-5 rounded-2xl border border-zinc-200/80 flex flex-col justify-between focus-within:border-primaria focus-within:bg-orange-50/30 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                  <label className="text-xs font-black text-zinc-700 uppercase tracking-wider">
                                    Quantos Não Gostaram?
                                  </label>
                                  <span className="text-[11px] font-bold text-zinc-600">
                                    Presentes: <strong className="text-zinc-900 font-black">{basePresenca}</strong>
                                  </span>
                                </div>
                                <div className="relative flex items-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={basePresenca}
                                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-2xl font-black text-zinc-900 focus:outline-none focus:border-primaria focus:ring-4 focus:ring-primaria/10 text-center transition-all shadow-xs"
                                    value={avaliacoes[ref]?.nao_gostaram ?? ''}
                                    onChange={e => tratarInputAvaliacao(ref, 'nao_gostaram', e.target.value)}
                                    placeholder="0"
                                  />
                                </div>
                                <p className="text-[10px] text-zinc-600 font-bold mt-2 text-center uppercase tracking-wider">
                                  Digitado pelo professor
                                </p>
                              </div>

                              {/* Cálculo Automático: Gostaram */}
                              <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200/70 flex flex-col justify-between text-center">
                                <p className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2">
                                  Aprovaram o Prato
                                </p>
                                <div className="text-3xl font-black text-emerald-600 my-auto">
                                  {gostaram} <span className="text-sm font-bold text-emerald-700">alunos</span>
                                </div>
                                <p className="text-[10px] text-emerald-700/80 font-bold mt-2 uppercase tracking-wider">
                                  Calculado automaticamente
                                </p>
                              </div>
                            </div>

                            <div className="relative">
                              <input 
                                type="text" 
                                className="w-full px-4 py-3.5 bg-zinc-50/50 hover:bg-white focus:bg-white border border-zinc-200 focus:border-primaria focus:ring-4 focus:ring-primaria/10 rounded-xl text-zinc-800 placeholder-zinc-600 text-sm font-medium outline-none transition-all" 
                                placeholder="Observações sobre o lanche ou motivo de sobra (Opcional)" 
                                value={avaliacoes[ref]?.observacao || ''} 
                                onChange={e => setAvaliacoes(prev => ({ ...prev, [ref]: { ...prev[ref], observacao: e.target.value } }))} 
                              />
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              )}

              {etapaAtual === 99 && (
                <div className="animate-fade-in text-center py-16">
                  <div className="w-32 h-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg"><svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>
                  <h2 className="text-5xl font-black text-zinc-800 mb-5">{statusCorrecao.ativo ? 'Correção Aplicada!' : 'Lançamento Efetivado!'}</h2>
                  <button type="button" onClick={resetarFluxo} className="bg-zinc-900 text-white font-bold py-5 px-10 rounded-2xl shadow-xl transition-all">
                    Registrar Nova Turma
                  </button>
                </div>
              )}
            </div>
            
            {etapaAtual !== 99 && (
              <div className="bg-zinc-50 p-6 md:px-12 border-t border-zinc-200 flex justify-between items-center mt-auto">
                <button type="button" onClick={voltar} disabled={etapaAtual === 1 || carregando} className={`px-8 py-4 font-bold rounded-2xl transition-all ${etapaAtual === 1 ? 'text-zinc-400 bg-zinc-100 opacity-50' : 'text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-200'}`}>Voltar</button>
                {etapaAtual < passosExibidos.length ? (
                  <button type="button" onClick={avancar} disabled={(etapaAtual === 1 && (!turmaIdFinal || bloqueioInteracao)) || (passoAtualInfo.chave === 'frequencia' && (isSenai ? (presencaSenai.LM === '' || presencaSenai.A === '' || presencaSenai.LT === '') : presencaGeral === '')) || carregando} className="bg-primaria text-white px-10 py-4 font-bold rounded-2xl shadow-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
                    Próxima Etapa
                  </button>
                ) : (
                  <button type="button" onClick={enviarDados} disabled={carregando} className={`${statusCorrecao.ativo ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} text-white px-10 py-4 font-bold rounded-2xl shadow-lg disabled:opacity-70 flex items-center justify-center gap-2 transition-all`}>
                    {carregando ? <span className="flex items-center gap-2"><RingLoader tamanho="w-5 h-5" /> Salvando...</span> : statusCorrecao.ativo ? 'Confirmar Correção' : 'Concluir Chamada'}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
    </div>
  );
}