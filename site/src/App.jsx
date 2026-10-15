import React, { useState, useEffect, Suspense, lazy, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Key, LogOut, Bell, X, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import Login from './Login';
import { TermosDeConsentimento } from './TermosDeConsentimento';
import ReportErrorButton from './components/ReportErrorButton';
import ManutencaoOverlay from './components/ManutencaoOverlay';
import NotFound from './NotFound';
import { sincronizarTempo } from './utils/time';
import { api } from './services/api';


const Professor = lazy(() => import('./Professor'));
const Cozinha = lazy(() => import('./Cozinha'));
const Admin = lazy(() => import('./Admin'));
const Coordenacao = lazy(() => import('./Coordenacao'));
const PublicDashboard = lazy(() => import('./PublicDashboard'));
const Apresentacao = lazy(() => import('./Apresentacao'));

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

function NotificationProvider({ children }) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [bannerOculto, setBannerOculto] = useState(false);
  const [manutencao, setManutencao] = useState({ ativo: false, mensagem: '', previsao: '', isIpAutorizado: false });
  
  const fetchNotificacoes = async () => {
    if (!localStorage.getItem('usuario')) return;
    try {
      const res = await api('/api/notificacoes');
      if (res?.sucesso && Array.isArray(res.dados)) {
        setNotificacoes(res.dados);
      } else if (res?.sucesso) {
        setNotificacoes([]);
      }
    } catch (e) {
      console.warn('Erro ao buscar notificações');
    }
  };

  const checarManutencao = async () => {
    try {
      const res = await api('/api/status-manutencao');
      if (res && typeof res.modoManutencao !== 'undefined') {
        const isManutencaoAtiva = Boolean(res.modoManutencao || res.emManutencao);
        setManutencao({
          ativo: isManutencaoAtiva,
          mensagem: res.mensagem || '',
          previsao: res.previsao || '',
          isIpAutorizado: Boolean(res.isIpAutorizado)
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    // Limpa silenciosamente parâmetros residuais como ?reload= da barra de endereços
    if (window.location.search.includes('reload=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('reload');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }

    fetchNotificacoes();
    checarManutencao();
    
    // Polling inteligente e ágil para notificações e manutenção
    const intervalNotif = setInterval(fetchNotificacoes, 5000);
    const intervalManut = setInterval(checarManutencao, 3000);

    const handleFocus = () => {
      fetchNotificacoes();
      checarManutencao();
    };
    const handleVisibility = () => {
      if (!document.hidden) {
        fetchNotificacoes();
        checarManutencao();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('notificacoes-atualizadas', handleFocus);

    // WebSocket listener nativo para eventos em tempo real
    let ws = null;
    let wsReconnectTimeout = null;

    const conectarWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = window.location.port === '5173' 
          ? `ws://${window.location.hostname}:3000/ws` 
          : `${protocol}//${window.location.host}/ws`;

        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.tipo === 'manutencao_status') {
              checarManutencao();
            } else if (data.tipo === 'notificacao_criada') {
              fetchNotificacoes();
            }
            // Dispara evento global para que qualquer componente (Cozinha, Professor, Totem) reaja na hora
            window.dispatchEvent(new CustomEvent('sesi-ws-event', { detail: data }));
          } catch (err) {}
        };

        ws.onclose = () => {
          wsReconnectTimeout = setTimeout(conectarWs, 3000);
        };
      } catch (err) {}
    };

    conectarWs();

    return () => {
      clearInterval(intervalNotif);
      clearInterval(intervalManut);
      clearTimeout(wsReconnectTimeout);
      if (ws) ws.close();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('notificacoes-atualizadas', handleFocus);
    };
  }, []);

  const marcarComoLida = async (id) => {
    try {
      setNotificacoes(prev => (Array.isArray(prev) ? prev : []).map(n => n?.id === id ? { ...n, lida: true } : n));
      await api(`/api/notificacoes/${id}/ler`, { method: 'POST' });
      window.dispatchEvent(new Event('notificacoes-atualizadas'));
    } catch (e) {}
  };

  const unreadCount = (Array.isArray(notificacoes) ? notificacoes : []).filter(n => Boolean(n) && !n.lida).length;

  const tipoUsuario = localStorage.getItem('tipo');
  const pathnameAtual = window.location.pathname;
  const isRotaAdmin = pathnameAtual.startsWith('/admin');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const bloquearPorManutencao = manutencao.ativo && tipoUsuario !== 'admin' && !isLocalhost && !isRotaAdmin;

  return (
    <NotificationContext.Provider value={{ notificacoes, unreadCount, marcarComoLida, bannerOculto, setBannerOculto, manutencao }}>
      {bloquearPorManutencao && (
        <ManutencaoOverlay mensagem={manutencao.mensagem} previsao={manutencao.previsao} />
      )}
      {children}
    </NotificationContext.Provider>
  );
}

function Topbar({ titulo }) {
  const navigate = useNavigate();
  const nomeUsuario = localStorage.getItem('usuario') || '';
  
  useEffect(() => {
    document.title = `${titulo} | SESI Alimenta`;
  }, [titulo]);
  
  const [modalSenha, setModalSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [processando, setProcessando] = useState(false);
  const [msgErro, setMsgErro] = useState('');
  const [msgSucesso, setMsgSucesso] = useState('');

  const calcularForcaSenha = (s) => {
    if (!s) return 0;
    let forca = 0;
    if (s.length >= 8) forca += 1;
    if (/[A-Z]/.test(s)) forca += 1;
    if (/[0-9]/.test(s)) forca += 1;
    if (/[^A-Za-z0-9]/.test(s)) forca += 1;
    return forca;
  };

  const forca = calcularForcaSenha(novaSenha);
  const coresForca = ['bg-zinc-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-green-500'];
  const labelsForca = ['Muito Fraca', 'Fraca', 'Razoável', 'Forte', 'Muito Forte'];

  const sair = () => { localStorage.clear(); navigate('/login'); };

  const trocarSenha = async () => {
    setMsgErro(''); setMsgSucesso('');
    if (!senhaAtual || !novaSenha) return setMsgErro('Preencha os dois campos.');
    setProcessando(true);
    try {
      const res = await fetch('/api/alterar-minha-senha', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha })
      }).then(r => r.json());
      
      if (res.sucesso) {
        setMsgSucesso('Sua senha foi atualizada! Você pode fechar esta janela.');
        setSenhaAtual(''); setNovaSenha('');
        setTimeout(() => setModalSenha(false), 3000);
      } else { setMsgErro(res.erro); }
    } catch { setMsgErro('Erro de rede ao trocar senha.'); } finally { setProcessando(false); }
  };

  return (
    <>
      <header className="bg-white border-b border-zinc-200 px-4 sm:px-6 md:px-8 py-3.5 md:py-4 flex flex-wrap justify-between items-center shadow-xs sticky top-0 z-50 gap-3">
        <div className="flex items-center gap-3 md:gap-4">
          <img src="/logo_limpa.png" alt="Logotipo Institucional SESI" className="h-10 sm:h-12 md:h-14 object-contain shrink-0" />
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-zinc-800 tracking-tight leading-tight">{titulo}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Tempo Real</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          {nomeUsuario && (
            <span className="text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-widest hidden lg:block">
              Operador: <span className="text-primaria">{nomeUsuario}</span>
            </span>
          )}
          <div className="flex gap-2 sm:gap-2.5 items-center">
             <MenuSino />
             <button 
               onClick={() => setModalSenha(true)} 
               title="Alterar Minha Senha"
               className="h-10 w-10 sm:w-auto sm:px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-600 hover:text-primaria bg-zinc-100 hover:bg-orange-50 border border-zinc-200 transition-all cursor-pointer shadow-2xs shrink-0"
             >
               <Key className="w-4.5 h-4.5 text-zinc-600 group-hover:text-primaria shrink-0" />
               <span className="hidden sm:inline">Senha</span>
             </button>
             <button 
               onClick={sair} 
               title="Sair do Sistema"
               className="h-10 w-10 sm:w-auto sm:px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-600 hover:text-white bg-zinc-100 hover:bg-red-500 border border-zinc-200 hover:border-red-600 transition-all cursor-pointer shadow-2xs shrink-0 group"
             >
               <LogOut className="w-4.5 h-4.5 text-zinc-600 group-hover:text-white shrink-0" />
               <span className="hidden sm:inline">Sair</span>
             </button>
          </div>
        </div>
      </header>

      {modalSenha && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-zinc-200 animate-slide-in-right">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-zinc-800">Alterar Senha</h3>
                <button onClick={() => setModalSenha(false)} className="text-zinc-400 hover:text-red-500 font-bold">X</button>
             </div>
             {msgErro && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold mb-4 border border-red-200">{msgErro}</div>}
             {msgSucesso && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-xs font-bold mb-4 border border-green-200">{msgSucesso}</div>}
             
             <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Senha Atual</label>
             <input type="password" value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold mb-4 outline-none focus:border-primaria" />
             
             <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Nova Senha</label>
             <input 
                type="password" 
                value={novaSenha} 
                onChange={e=>setNovaSenha(e.target.value)} 
                className={`w-full bg-zinc-50 border rounded-xl px-4 py-3 text-sm font-bold mb-3 outline-none transition-all duration-500 ${
                  novaSenha.length === 0 
                    ? 'border-zinc-300 focus:border-primaria' 
                    : forca < 3 
                      ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                      : 'border-green-500 focus:border-green-600 focus:ring-4 focus:ring-green-500/10'
                }`} 
              />
             
             {novaSenha.length > 0 && (
               <div className="mb-4">
                 <div className="flex gap-1 mb-1.5">
                   {[1, 2, 3, 4].map(nivel => (
                     <div key={nivel} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${nivel <= forca ? coresForca[forca] : 'bg-zinc-100'}`}></div>
                   ))}
                 </div>
                 <p className={`text-[10px] font-black uppercase tracking-widest text-right transition-colors ${forca < 3 ? 'text-red-500' : 'text-green-600'}`}>{labelsForca[forca]}</p>
               </div>
             )}

             <p className="text-[10px] text-zinc-400 font-bold uppercase mb-8 tracking-wider">Mínimo 8 caracteres, contendo letras maiúsculas e números.</p>
             
             <button onClick={trocarSenha} disabled={processando || (novaSenha.length > 0 && forca < 3)} className="w-full bg-zinc-900 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-zinc-800 disabled:opacity-30 transition-colors">
               Confirmar Troca
             </button>
          </div>
        </div>
      )}
    </>
  );
}

function MenuSino() {
  const { notificacoes, unreadCount, marcarComoLida } = useNotifications();
  const [aberto, setAberto] = useState(false);
  const [avisoExpandido, setAvisoExpandido] = useState(null);

  const lerAviso = (aviso) => {
    if (!aviso.lida) marcarComoLida(aviso.id);
    setAvisoExpandido(aviso);
    setAberto(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setAberto(!aberto)} 
        title="Notificações e Avisos"
        className={`relative h-10 w-10 rounded-xl transition-all focus:outline-none flex items-center justify-center border shrink-0 cursor-pointer shadow-2xs ${
          unreadCount > 0 
            ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100' 
            : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-primaria hover:bg-orange-50'
        }`}
      >
        <Bell className="w-4.5 h-4.5 shrink-0" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm animate-bounce border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-zinc-200 z-[200] animate-fade-in">
          <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 rounded-t-xl">
            <h4 className="font-black text-zinc-800 uppercase tracking-wider text-xs">Comunicações</h4>
            {unreadCount === 0 && <span className="text-[10px] text-green-600 font-bold bg-green-100 px-2 py-1 rounded">Tudo Lido</span>}
          </div>
          <div className="p-2 flex flex-col gap-2">
            {(!Array.isArray(notificacoes) || notificacoes.length === 0) ? (
              <p className="text-xs text-zinc-400 text-center py-4 font-bold">Nenhum aviso no momento.</p>
            ) : (
              (Array.isArray(notificacoes) ? notificacoes : []).map(n => (
                <div key={n?.id || Math.random()} className={`p-3 rounded-lg border transition-all ${!n?.lida ? 'bg-orange-50/50 border-orange-200 shadow-sm' : 'bg-white border-zinc-100'} cursor-pointer hover:bg-zinc-50`} onClick={() => n && lerAviso(n)}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-zinc-800 flex items-center gap-2">
                      {!n?.lida && <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse"></span>}
                      {n?.titulo}
                    </span>
                    <span className="text-[9px] text-zinc-400 whitespace-nowrap ml-2 font-bold">{n?.criado_em ? new Date(n.criado_em).toLocaleDateString() : ''}</span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-1">{(n?.mensagem || '').substring(0, 50).replace(/[^a-zA-Z0-9 ]/g, '')}...</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {avisoExpandido && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-in-up relative">
            <div className="flex justify-between items-center p-6 border-b border-zinc-100 bg-orange-50">
              <h2 className="text-lg md:text-xl font-black text-orange-800 flex items-center gap-3">
                <Bell className="text-orange-600 w-6 h-6"/> 
                {avisoExpandido.titulo}
              </h2>
              <button onClick={() => setAvisoExpandido(null)} className="p-2 bg-white hover:bg-zinc-200 rounded-full transition-colors border border-zinc-200">
                <X className="w-5 h-5 text-zinc-700"/>
              </button>
            </div>
            
            <div className="p-6 md:p-10 overflow-y-auto flex-1 bg-white">
              <div className="prose prose-zinc prose-orange max-w-none prose-headings:font-black prose-a:text-orange-600 prose-p:leading-relaxed text-zinc-700">
                <ReactMarkdown>{avisoExpandido.mensagem}</ReactMarkdown>
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-100 bg-zinc-50 text-right flex justify-between items-center">
               <span className="text-xs font-black text-zinc-400 uppercase tracking-widest bg-zinc-200 px-3 py-1.5 rounded-lg">
                 Enviado por {avisoExpandido.autor}
               </span>
               <span className="text-xs font-bold text-zinc-500 flex items-center gap-1">
                 {new Date(avisoExpandido.criado_em).toLocaleString('pt-BR')}
               </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BannerNotificacao() {
  const { unreadCount, bannerOculto, setBannerOculto } = useNotifications();
  if (unreadCount === 0 || bannerOculto) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 flex justify-between items-center animate-slide-in-down shadow-md z-40 relative">
      <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
        <Bell className="w-5 h-5" /> 
        Você tem {unreadCount} comunicado(s) não lido(s) da administração. Clique no sino para visualizar.
      </div>
      <button onClick={() => setBannerOculto(true)} className="p-1 hover:bg-white/20 rounded-full transition-colors" title="Ocultar por enquanto">
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

function RotaProtegida({ children, papeisPermitidos = [] }) {
  const tipoUsuario = localStorage.getItem('tipo');
  const papeis = Array.isArray(papeisPermitidos) ? papeisPermitidos : [];

  if (!tipoUsuario) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  if (!papeis.includes(tipoUsuario) && tipoUsuario !== 'admin') {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return children;
}

class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  recarregarAplicacao = () => {
    window.location.reload();
  };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Erro de Carregamento de Módulo:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-fundo flex items-center justify-center flex-col p-6 text-center animate-fade-in">
          <div className="text-red-500 mb-4">
             <svg className="w-16 h-16 mx-auto drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-800 mb-2 uppercase tracking-tight">Falha de Conexão</h1>
          <p className="text-zinc-500 mb-8 font-medium max-w-sm">Não foi possível carregar a interface solicitada. Verifique sua rede e tente novamente.</p>
          <button type="button" onClick={this.recarregarAplicacao} className="bg-primaria text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-orange-600 transition-colors shadow-lg">
            Recarregar Sistema
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const FallbackLoader = () => (
  <div className="h-screen w-screen bg-fundo flex items-center justify-center animate-fade-in">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primaria/30 border-t-primaria rounded-full animate-spin"></div>
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500 animate-pulse">Buscando Módulo...</p>
    </div>
  </div>
);

function GlobalErrorButton() {
  const location = useLocation();
  if (location.pathname === '/dashboard-publico' || location.pathname === '/totem-publico' || location.pathname === '/apresentacao') return null;
  return <ReportErrorButton />;
}

function TimeBlocker({ children }) {
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    sincronizarTempo().then(() => setIsSynced(true));
  }, []);

  if (!isSynced) return <FallbackLoader />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <ChunkErrorBoundary>
        <TimeBlocker>
          <NotificationProvider>
            <Suspense fallback={<FallbackLoader />}>
              <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
            
            <Route path="/login" element={<div className="page-transition min-h-screen"><Login /></div>} />
            <Route path="/termos" element={<div className="page-transition min-h-screen"><TermosDeConsentimento /></div>} />
            <Route path="/dashboard-publico" element={<div className="page-transition"><PublicDashboard /></div>} />
            <Route path="/totem-publico" element={<Navigate to="/dashboard-publico" replace />} />
          <Route path="/admin" element={
            <RotaProtegida papeisPermitidos={['admin']}>
              <div className="min-h-screen bg-fundo bg-pattern-ppt flex flex-col">
                <Topbar titulo="Painel Administrativo (TI)" />
                <BannerNotificacao />
                <div className="flex-1 page-transition">
                  <Admin />
                </div>
              </div>
            </RotaProtegida>
          } />
        
          <Route path="/professor" element={
            <RotaProtegida papeisPermitidos={['professor', 'coordenacao']}>
              <div className="min-h-screen bg-fundo bg-pattern-ppt flex flex-col">
                <Topbar titulo="Painel Docente" />
                <BannerNotificacao />
                <div className="flex-1 page-transition">
                  <Professor />
                </div>
              </div>
            </RotaProtegida>
          } />

          <Route path="/coordenacao" element={
            <RotaProtegida papeisPermitidos={['coordenacao']}>
              <div className="min-h-screen bg-fundo bg-pattern-ppt flex flex-col">
                <Topbar titulo="Painel da Coordenação" />
                <BannerNotificacao />
                <div className="flex-1 page-transition">
                  <Coordenacao />
                </div>
              </div>
            </RotaProtegida>
          } />
        
          <Route path="/cozinha" element={
            <RotaProtegida papeisPermitidos={['cozinha', 'coordenacao']}>
              <div className="min-h-screen bg-fundo bg-pattern-ppt flex flex-col">
                <Topbar titulo="Operação Cozinha" />
                <BannerNotificacao />
                <div className="flex-1 page-transition">
                  <Cozinha />
                </div>
              </div>
            </RotaProtegida>
          } />
          <Route path="/apresentacao" element={<div className="page-transition min-h-screen"><Apresentacao /></div>} />
          <Route path="*" element={<div className="page-transition min-h-screen"><NotFound /></div>} />
            </Routes>
            <GlobalErrorButton />
          </Suspense>
          </NotificationProvider>
        </TimeBlocker>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
}

export default App;