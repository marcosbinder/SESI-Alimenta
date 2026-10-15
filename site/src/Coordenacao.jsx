import { useMDT, useDebouncedLoader } from './hooks/useAntiFlicker';
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Check, Info, X, ClipboardList, CalendarDays, Undo2, XCircle, Users, BarChart3, Inbox, Search, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EstatisticasBI from './components/EstatisticasBI';
import { api } from './services/api';
import { getServerTime } from './utils/time';
import { RingLoader, ToastAlert } from './components/UI';

const LoadingIcon = ({ tamanho = "w-5 h-5" }) => (
  <RingLoader tamanho={tamanho} />
);

export default function Coordenacao() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregandoUI, setCarregando, carregando] = useMDT(400);
  const [processandoUI, setProcessando, processando] = useDebouncedLoader(200);
  const [modalNegar, setModalNegar] = useState({ visivel: false, id: null, justificativa: '' });
  const [modalDesfazer, setModalDesfazer] = useState({ visivel: false, id: null });
  const navigate = useNavigate();

  const [visaoAtiva, setVisaoAtiva] = useState('pendentes');
  const [busca, setBusca] = useState('');
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const itensPorPagina = 10;

  const [notificacao, setNotificacao] = useState({ visivel: false, texto: '', tipo: 'sucesso' });
  const mostrarToast = (texto, tipo = 'sucesso') => {
    setNotificacao({ visivel: true, texto, tipo });
    setTimeout(() => setNotificacao({ visivel: false }), 4000);
  };

  const carregarSolicitacoes = useCallback(async () => {
    setCarregando(true);
    const [res] = await Promise.all([
      api('/api/solicitacoes')
    ]);
    if (res.sucesso) {
      setSolicitacoes(res.dados || []);
    } else {
      mostrarToast(res.erro || 'Erro ao carregar solicitações.', 'erro');
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  const avaliar = async (id, status, justificativa = '') => {
    setProcessando(true);
    const [res] = await Promise.all([
      api(`/api/solicitacoes/${id}/avaliar`, {
        method: 'PUT',
        body: JSON.stringify({ status, justificativa })
      })
    ]);

    if (res.sucesso) {
      setSolicitacoes(prev => prev.map(s => s.id === id ? { ...s, status, avaliado_por: 'Você', avaliado_em: getServerTime().toLocaleTimeString('pt-BR') } : s));
      setModalNegar({ visivel: false, id: null, justificativa: '' });
      carregarSolicitacoes();
    } else {
      mostrarToast(res.erro || 'Falha ao processar avaliação.', 'erro');
    }
    setProcessando(false);
  };

  const aprovarLote = async (grupo_lote_id) => {
    setProcessando(true);
    const [res] = await Promise.all([
      api(`/api/lote/${grupo_lote_id}/aprovar`, {
        method: 'PUT'
      })
    ]);

    if (res.sucesso) {
      mostrarToast('Lote aprovado com sucesso!', 'sucesso');
      carregarSolicitacoes();
    } else {
      mostrarToast(res.erro || 'Falha ao aprovar lote.', 'erro');
    }
    setProcessando(false);
  };

  const desfazerAcao = async () => {
    if (!modalDesfazer.id) return;
    setProcessando(true);
    const [res] = await Promise.all([
      api(`/api/solicitacoes/${modalDesfazer.id}/desfazer`, {
        method: 'PUT'
      })
    ]);

    if (res.sucesso) {
      setSolicitacoes(prev => prev.map(s => s.id === modalDesfazer.id ? { ...s, status: 'Pendente' } : s));
      setModalDesfazer({ visivel: false, id: null });
      carregarSolicitacoes();
    } else {
      mostrarToast(res.erro || 'Falha ao desfazer.', 'erro');
    }
    setProcessando(false);
  };

  const getStatusStyle = (status) => {
    if (status === 'Aprovado') return 'bg-green-500/10 text-green-700 border-green-500/20';
    if (status === 'Negado') return 'bg-red-500/10 text-red-700 border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
  };

  const listaSolicitacoes = Array.isArray(solicitacoes) ? solicitacoes : [];
  const pendentes = listaSolicitacoes.filter(s => s?.status === 'Pendente');
  const historico = listaSolicitacoes.filter(s => s?.status !== 'Pendente');
  
  const historicoFiltrado = historico.filter(s => {
    const termo = (busca || '').toLowerCase();
    const nomeCompleto = `${s?.aluno_nome || ''} ${s?.aluno_sobrenome || ''}`.toLowerCase();
    return nomeCompleto.includes(termo) || 
           (s?.turma || '').toLowerCase().includes(termo) || 
           (s?.professor || '').toLowerCase().includes(termo);
  });
  
  const historicoPaginado = historicoFiltrado.slice((paginaHistorico - 1) * itensPorPagina, paginaHistorico * itensPorPagina);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-20 bg-white rounded-[2rem] shadow-xl my-6 border border-zinc-100">
      <ToastAlert visivel={notificacao.visivel} tipo={notificacao.tipo} texto={notificacao.texto} />

      {modalNegar.visivel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in transition-all">
           <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in transition-all border border-zinc-200">
              <h3 className="text-xl font-black text-red-600 mb-2 border-b pb-3">Justificar Recusa</h3>
              <p className="text-zinc-500 text-sm mb-4">A justificativa é obrigatória para que o professor compreenda o motivo da negativa.</p>
              
              <textarea 
                className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-4 text-sm font-bold text-zinc-800 outline-none focus:border-red-500 min-h-[120px] resize-none mb-6"
                placeholder="Digite o motivo..."
                value={modalNegar.justificativa}
                onChange={(e) => setModalNegar({ ...modalNegar, justificativa: e.target.value })}
              ></textarea>

              <div className="flex gap-3">
                <button onClick={() => setModalNegar({ visivel: false, id: null, justificativa: '' })} className="flex-1 bg-zinc-100 text-zinc-600 font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider text-xs">Cancelar</button>
                <button 
                  onClick={() => avaliar(modalNegar.id, 'Negado', modalNegar.justificativa)} 
                  disabled={!modalNegar.justificativa.trim() || processando} 
                  className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors uppercase tracking-wider text-xs flex justify-center items-center gap-2"
                >
                  {processandoUI ? <RingLoader tamanho="w-5 h-5" /> : 'Confirmar Recusa'}
                </button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6 mb-8 shadow-sm flex items-start gap-4">
        <div className="text-orange-500 mt-1"><AlertTriangle className="w-6 h-6" /></div>
        <div>
          <h2 className="text-sm font-black text-orange-800 uppercase tracking-widest mb-1">Atividade Extracurricular</h2>
          <p className="text-orange-700 font-bold text-xs leading-relaxed">
            A aprovação neste sistema serve <strong>apenas para a contagem logística da Cozinha</strong>. O protocolo escolar exige que a confirmação oficial seja enviada respondendo ao e-mail original do professor solicitante.
          </p>
        </div>
      </div>

      <div className="mb-10 flex flex-col xl:flex-row bg-white rounded-[2rem] shadow-sm border border-zinc-100 overflow-hidden border-l-[6px] border-l-primaria">
        <div className="flex items-center gap-4 p-5 xl:pr-10 xl:border-r border-zinc-100 shrink-0 w-full xl:w-auto pl-6 bg-white z-10 relative">
          <div className="w-14 h-14 bg-primaria text-white rounded-full flex items-center justify-center shadow-inner shrink-0">
            <ClipboardList className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-zinc-900 font-black text-xl tracking-tight mb-0.5">Coordenação</h2>
            <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
              Avaliação de Almoço Extra
            </div>
          </div>
        </div>

        <div className="flex w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { id: 'pendentes', label: `Pendentes ${pendentes.length > 0 ? `(${pendentes.length})` : ''}`, icon: <AlertTriangle className="w-6 h-6" />, destaque: pendentes.length > 0 },
            { id: 'historico', label: 'Histórico', icon: <Check className="w-6 h-6" /> },
            { id: 'bi', label: 'Dashboard B.I.', icon: <BarChart3 className="w-6 h-6" /> }
          ].map((tab) => {
            const ativo = visaoAtiva === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setVisaoAtiva(tab.id)} 
                className={`flex-1 min-w-[140px] flex flex-col items-center justify-center py-5 px-2 transition-all duration-300 border-r border-zinc-100 last:border-r-0 relative group ${
                  ativo ? (tab.destaque ? 'bg-orange-50/40' : 'bg-zinc-50/40') : 'bg-white hover:bg-zinc-50'
                }`}
              >
                {ativo && <div className={`absolute bottom-0 left-6 right-6 h-[4px] rounded-t-full ${tab.destaque ? 'bg-primaria' : 'bg-zinc-800'}`}></div>}
                <span className={`mb-1.5 transition-all duration-300 ${ativo ? (tab.destaque ? 'scale-110 text-primaria' : 'scale-110 text-zinc-800') : tab.destaque ? 'text-orange-500' : 'text-zinc-400 group-hover:text-zinc-600'}`}>
                  {tab.icon}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${ativo ? (tab.destaque ? 'text-primaria' : 'text-zinc-800') : tab.destaque ? 'text-orange-600' : 'text-zinc-500 group-hover:text-zinc-700'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
          
          <button 
            onClick={() => navigate('/professor')} 
            className="flex-1 min-w-[140px] flex flex-col items-center justify-center py-5 px-2 transition-all duration-300 relative group bg-white hover:bg-orange-50 border-l border-zinc-100"
          >
            <span className="mb-1.5 transition-all duration-300 text-primaria group-hover:scale-110">
              <Users className="w-6 h-6" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest transition-colors text-primaria group-hover:text-orange-600">
              Lançar Chamada
            </span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-6 md:p-8 border-b border-zinc-100 bg-zinc-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-zinc-800 tracking-tight">
              {visaoAtiva === 'pendentes' ? 'Solicitações Pendentes' : visaoAtiva === 'historico' ? 'Histórico de Avaliações' : 'Desempenho Operacional'}
            </h2>
            <p className="text-zinc-500 font-medium text-sm mt-1">
              {visaoAtiva === 'pendentes' ? 'Pedidos de Almoço Extra aguardando ação.' : visaoAtiva === 'historico' ? 'Registro de solicitações processadas ou canceladas.' : 'Análise de aprovação e métricas de refeitório.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {visaoAtiva === 'historico' && (
              <input 
                type="text" 
                value={busca}
                onChange={e => { setBusca(e.target.value); setPaginaHistorico(1); }}
                placeholder="Buscar aluno, turma..."
                className="w-full sm:w-64 bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primaria"
              />
            )}
            <button onClick={carregarSolicitacoes} disabled={carregando} className="w-full sm:w-auto bg-white border border-zinc-200 text-zinc-600 p-3 rounded-xl shadow-sm hover:bg-zinc-100 transition-all flex items-center justify-center">
              ↻ Atualizar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {visaoAtiva === 'bi' ? (
            <EstatisticasBI />
          ) : carregando ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-16">
              <RingLoader tamanho="w-8 h-8" />
              <span className="mt-4 font-bold text-xs uppercase tracking-widest">Sincronizando...</span>
            </div>
          ) : (visaoAtiva === 'pendentes' ? pendentes : historicoPaginado).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 text-zinc-400">
              {visaoAtiva === 'pendentes' ? <Inbox className="w-12 h-12 text-zinc-300 mb-3" /> : <Search className="w-12 h-12 text-zinc-300 mb-3" />}
              <p className="font-bold text-sm">{visaoAtiva === 'pendentes' ? 'Nenhuma solicitação pendente.' : 'Nenhum registro encontrado no histórico.'}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {(() => {
                  const renderReqCard = (req, isSubItem = false) => (
                    <div key={req.id} className={`bg-white border ${isSubItem ? 'border-zinc-100 shadow-none' : 'border-zinc-200 shadow-sm'} rounded-2xl p-5 md:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 hover:shadow-md animate-fade-in transition-all`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-black text-zinc-800 uppercase flex items-center gap-2">
                        <span className="text-zinc-400 text-sm">#{String(req?.id ?? '').padStart(4, '0')}</span> 
                        <span className={req?.status === 'Cancelado' ? 'text-zinc-500 line-through' : ''}>{req?.aluno_nome} {req?.aluno_sobrenome}</span>
                      </h3>
                      {req.is_dieta === 1 && (
                        <span className="flex items-center gap-1.5 mt-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-100">
                          <AlertTriangle className="w-3.5 h-3.5" /> Requer Dieta
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${req.status === 'Cancelado' ? 'bg-zinc-200 text-zinc-600 border-zinc-300' : getStatusStyle(req.status)}`}>
                        {req.status}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-600 mb-3">
                      <span className="bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">Chamada: <strong className="text-zinc-900">{req.chamada}</strong></span>
                      <span className="bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">Turma: <strong className="text-zinc-900">{req.ano}º {req.turma} ({req.nivel})</strong></span>
                      <span className="bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">Prof: <strong className="text-zinc-900">{req.professor}</strong></span>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl space-y-2">
                      <p className="text-sm text-zinc-700 flex items-center gap-1"><strong><CalendarDays className="w-4 h-4"/> Datas Aprovadas:</strong> {req.datas}</p>
                      <p className="text-sm text-zinc-700"><strong>Motivo:</strong> {req.motivo}</p>
                      {req.justificativa && (
                        <p className="text-sm text-red-600 mt-2 border-t pt-2 border-red-100"><strong>Justificativa da Recusa:</strong> {req.justificativa}</p>
                      )}
                    </div>
                    {req.status === 'Cancelado' && (
                      <div className="mt-3 bg-zinc-100 p-3 rounded-lg border border-zinc-200">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-zinc-500"/>
                          <span className="text-xs font-bold text-zinc-600">Cancelado pelo {req?.autor_cancelamento || ''} {req?.cancelado_em ? `às ${(String(req.cancelado_em).includes(' ') ? String(req.cancelado_em).split(' ')[1] : String(req.cancelado_em)).slice(0, 5)}` : ''}</span>
                        </div>
                        {req.motivo_cancelamento && (
                          <p className="text-xs text-zinc-500 mt-2 border-t border-zinc-200 pt-2"><strong>Motivo:</strong> {req.motivo_cancelamento}</p>
                        )}
                      </div>
                    )}
                    {(req.status === 'Aprovado' || req.status === 'Negado') && req.avaliado_em && (
                      <div className="mt-3 px-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          {req?.status === 'Aprovado' ? <><Check className="w-4 h-4 inline-block mr-1"/> Aprovado</> : <><X className="w-4 h-4 inline-block mr-1"/> Negado</>} às {(String(req?.avaliado_em || '').includes(' ') ? String(req.avaliado_em).split(' ')[1] : String(req?.avaliado_em || '')).slice(0, 5)}
                        </span>
                      </div>
                    )}
                  </div>

                  {req.status === 'Pendente' && (
                    <div className="flex flex-row xl:flex-col gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                      <button 
                        onClick={() => avaliar(req.id, 'Aprovado')}
                        disabled={processando}
                        className="flex-1 xl:w-48 bg-green-600 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-xs hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Autorizar</span>
                      </button>
                      <button 
                        onClick={() => setModalNegar({ visivel: true, id: req.id, justificativa: '' })}
                        disabled={processando}
                        className="flex-1 xl:w-48 bg-red-50 text-red-600 font-black py-3.5 rounded-xl uppercase tracking-widest text-xs hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50 border border-red-200 flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4 shrink-0" /> Recusar
                      </button>
                    </div>
                  )}

                  {(req.status === 'Aprovado' || req.status === 'Negado') && (
                    <div className="flex flex-row xl:flex-col gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                       <button onClick={() => setModalDesfazer({ visivel: true, id: req.id })} disabled={processando} className="flex-1 xl:w-48 bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 font-black py-3.5 rounded-xl uppercase tracking-widest text-xs hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                         <Undo2 className="w-4 h-4"/> Desfazer Ação
                       </button>
                    </div>
                  )}
                </div>
                  );

                  if (visaoAtiva === 'historico') {
                    return historicoPaginado.map(req => renderReqCard(req));
                  } else {
                    const lotes = {};
                    const avulsos = [];
                    pendentes.forEach(req => {
                      if (req.grupo_lote_id) {
                        if (!lotes[req.grupo_lote_id]) {
                          lotes[req.grupo_lote_id] = { id: req.grupo_lote_id, motivo: req.motivo_lote || req.motivo, itens: [] };
                        }
                        lotes[req.grupo_lote_id].itens.push(req);
                      } else {
                        avulsos.push(req);
                      }
                    });

                    return (
                      <>
                        {Object.values(lotes).filter(lote => lote.itens.length > 1).map(lote => (
                          <div key={`lote-${lote.id}`} className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 shadow-sm mb-6 animate-fade-in transition-all">
                            <div className="flex justify-between items-center mb-6">
                              <div>
                                <h3 className="text-xl font-black text-zinc-800 flex items-center gap-2"><Package className="w-5 h-5 text-zinc-700" /> Lote: {lote.motivo}</h3>
                                <p className="text-sm font-bold text-zinc-500 mt-1">{lote.itens.length} solicitações neste lote.</p>
                              </div>
                              <button
                                onClick={() => aprovarLote(lote.id)}
                                disabled={processando}
                                className="bg-zinc-800 text-white font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs hover:bg-zinc-900 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                              >
                                {processandoUI ? <RingLoader tamanho="w-5 h-5" /> : 'Aprovar Lote Inteiro'}
                              </button>
                            </div>
                            <div className="space-y-3">
                              {lote.itens.map(req => renderReqCard(req, true))}
                            </div>
                          </div>
                        ))}
                        {Object.values(lotes).filter(lote => lote.itens.length === 1).map(lote => (
                          renderReqCard(lote.itens[0])
                        ))}
                        {avulsos.map(req => renderReqCard(req))}
                      </>
                    );
                  }
                })()}
              </div>
              {visaoAtiva === 'historico' && historicoFiltrado.length > itensPorPagina && (
                <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-zinc-100">
                  <button onClick={() => setPaginaHistorico(p => Math.max(1, p - 1))} disabled={paginaHistorico === 1} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 shadow-sm">Anterior</button>
                  <span className="text-sm font-bold text-zinc-500">Pág. {paginaHistorico} de {Math.ceil(historicoFiltrado.length / itensPorPagina)}</span>
                  <button onClick={() => setPaginaHistorico(p => Math.min(Math.ceil(historicoFiltrado.length / itensPorPagina), p + 1))} disabled={paginaHistorico === Math.ceil(historicoFiltrado.length / itensPorPagina)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 shadow-sm">Próxima</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalDesfazer.visivel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in transition-all">
           <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in transition-all">
              <h3 className="text-xl font-black text-zinc-800 mb-2 border-b pb-3 flex items-center gap-2">
                <Undo2 className="w-6 h-6 text-zinc-500"/> Desfazer Avaliação
              </h3>
              <p className="text-zinc-500 text-sm mb-6 font-medium">
                Tem certeza que deseja desfazer a avaliação? A solicitação voltará para o status <strong>Pendente</strong> e precisará ser reavaliada.
              </p>
              
              <div className="flex justify-end gap-3">
                 <button onClick={() => setModalDesfazer({ visivel: false, id: null })} className="px-5 py-2.5 rounded-xl font-bold text-sm text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors">Voltar</button>
                 <button onClick={desfazerAcao} disabled={processando} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-zinc-800 hover:bg-zinc-900 transition-colors disabled:opacity-50 flex items-center gap-2">
                   {processandoUI ? <RingLoader tamanho="w-5 h-5" /> : 'Desfazer Ação'}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}