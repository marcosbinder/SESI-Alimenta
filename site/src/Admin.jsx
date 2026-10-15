import { useDebouncedLoader } from './hooks/useAntiFlicker';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SessionTimer from './components/SessionTimer';
import { AlertTriangle, Check, Key, Users, Inbox, Activity, Save, AlertOctagon, RefreshCw, MessageSquare, Trash2, Globe, Bell, Ghost, Eye, Clock, Wrench, Laptop, Power, Terminal, Plus, ShieldAlert, Server, Radio, CheckCircle2, Database, Download, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from './services/api';
import { RingLoader, ToastAlert } from './components/UI';

const formatarEspacos = (text) => {
  if (!text) return text;
  return text.replace(/\n/g, '  \n').replace(/(  \n){2,}/g, (match) => {
      const lines = match.length / 3;
      if (lines === 2) return '\n\n';
      return '\n\n' + Array(lines - 2).fill('\u00A0\n\n').join('');
  });
};

const LoadingIcon = () => (
  <svg className="animate-spin h-5 w-5 text-current inline-block mr-2" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function Admin() {
  const [visaoAtiva, setVisaoAtiva] = useState('usuarios');
  const [isProcessandoUI, setIsProcessando, isProcessando] = useDebouncedLoader(200);
  const [notificacao, setNotificacao] = useState({ visivel: false, texto: '', tipo: 'sucesso' });
  
  const [usuarios, setUsuarios] = useState([]);
  const [novoUserNome, setNovoUserNome] = useState('');
  const [novoUserTipo, setNovoUserTipo] = useState('professor');
  const [senhaGerada, setSenhaGerada] = useState(null);
  const [modalResetSenha, setModalResetSenha] = useState({ visivel: false, id: null, nome: '', novaSenha: '', codigo2FA: '' });

  const [erros, setErros] = useState([]);

  const [backups, setBackups] = useState([]);

  const [confirmacaoPurge, setConfirmacaoPurge] = useState('');
  const [codigo2FA, setCodigo2FA] = useState('');

  const [logs, setLogs] = useState([]);
  const [filtroLogs, setFiltroLogs] = useState({ data: '', usuario: '', rota: '', nivel: [] });
  const [adminNotificacoes, setAdminNotificacoes] = useState([]);
  const [notificacaoForm, setNotificacaoForm] = useState({ titulo: '', mensagem: '', alvo_tipo: 'GLOBAL', alvo_usuario_id: [] });
  const [notificacaoEnviando, setNotificacaoEnviando] = useState(false);

  // Estados do Modo de Manutenção & Servidor
  const [manutencaoConfig, setManutencaoConfig] = useState({
    ativo: 0,
    mensagem: 'O sistema está passando por manutenção programada para melhorias técnicas. Retornaremos em breve.',
    previsao: '',
    ips_autorizados: '127.0.0.1,::1',
    meuIp: ''
  });
  const [novoIpInput, setNovoIpInput] = useState('');
  const [modalReiniciar, setModalReiniciar] = useState(false);
  const [reiniciandoServidor, setReiniciandoServidor] = useState(false);

  const mostrarToast = useCallback((texto, tipo = 'sucesso') => {
    setNotificacao({ visivel: true, texto, tipo });
    setTimeout(() => setNotificacao({ visivel: false }), 5000);
  }, []);

  const carregarUsuarios = useCallback(async () => {
    const res = await api('/api/admin/usuarios');
    if (res.sucesso) setUsuarios(res.dados || []);
    else mostrarToast(res.erro || 'Erro ao carregar utilizadores.', 'erro');
  }, [mostrarToast]);

  const carregarBackups = useCallback(async () => {
    const res = await api('/api/admin/backups');
    if (res.sucesso) setBackups(res.arquivos || []);
    else mostrarToast(res.erro || 'Erro ao carregar backups.', 'erro');
  }, [mostrarToast]);

  const carregarErros = useCallback(async () => {
    const res = await api('/api/admin/erros');
    if (res.sucesso) setErros(res.dados || []);
    else mostrarToast(res.erro || 'Erro ao carregar relatórios de bug.', 'erro');
  }, [mostrarToast]);

  const carregarLogs = useCallback(async () => {
    const res = await api('/api/admin/logs');
    if (res.sucesso) setLogs(res.dados || []);
    else mostrarToast(res.erro || 'Erro ao carregar auditoria do sistema.', 'erro');
  }, [mostrarToast]);

  const carregarManutencao = useCallback(async () => {
    const res = await api('/api/admin/manutencao');
    if (res.sucesso && res.dados) {
      setManutencaoConfig({
        ativo: res.dados.ativo ? 1 : 0,
        mensagem: res.dados.mensagem || 'O sistema está passando por manutenção programada para melhorias técnicas. Retornaremos em breve.',
        previsao: res.dados.previsao || '',
        ips_autorizados: res.dados.ips_autorizados || '127.0.0.1,::1',
        meuIp: res.dados.meuIp || ''
      });
    }
  }, []);

  const salvarManutencao = async (novaConfig = null) => {
    const configParaSalvar = novaConfig || manutencaoConfig;
    setIsProcessando(true);
    try {
      const res = await api('/api/admin/manutencao', {
        method: 'POST',
        body: JSON.stringify(configParaSalvar)
      });
      if (res.sucesso) {
        mostrarToast(configParaSalvar.ativo ? 'Modo de Manutenção ATIVADO! Apenas IPs autorizados acessam.' : 'Modo de Manutenção DESATIVADO. Sistema aberto.');
        carregarManutencao();
      } else {
        mostrarToast(res.erro || 'Erro ao atualizar manutenção.', 'erro');
      }
    } catch (e) {
      mostrarToast('Erro de rede ao salvar manutenção.', 'erro');
    } finally {
      setIsProcessando(false);
    }
  };

  const adicionarMeuIp = () => {
    if (!manutencaoConfig.meuIp) return;
    const ips = (manutencaoConfig.ips_autorizados || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!ips.includes(manutencaoConfig.meuIp)) {
      ips.push(manutencaoConfig.meuIp);
      const atualizado = { ...manutencaoConfig, ips_autorizados: ips.join(', ') };
      setManutencaoConfig(atualizado);
      salvarManutencao(atualizado);
    } else {
      mostrarToast('Seu IP já está presente na lista de autorizados.');
    }
  };

  const adicionarIpManual = (e) => {
    if (e) e.preventDefault();
    const ipLimpo = novoIpInput.trim();
    if (!ipLimpo) return;
    const ips = (manutencaoConfig.ips_autorizados || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!ips.includes(ipLimpo)) {
      ips.push(ipLimpo);
      const atualizado = { ...manutencaoConfig, ips_autorizados: ips.join(', ') };
      setManutencaoConfig(atualizado);
      setNovoIpInput('');
      salvarManutencao(atualizado);
    } else {
      mostrarToast('Este IP já está na lista.');
    }
  };

  const removerIp = (ipRemover) => {
    const ips = (manutencaoConfig.ips_autorizados || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s && s !== ipRemover);
    const atualizado = { ...manutencaoConfig, ips_autorizados: ips.join(', ') };
    setManutencaoConfig(atualizado);
    salvarManutencao(atualizado);
  };

  const reiniciarServidorPrincipal = async () => {
    setReiniciandoServidor(true);
    try {
      const res = await api('/api/admin/reiniciar-servidor', { method: 'POST' });
      if (res.sucesso) {
        mostrarToast('Comando de reinício enviado. O Gateway manterá a tela ativa.');
        setModalReiniciar(false);
        setTimeout(() => {
          setReiniciandoServidor(false);
        }, 4000);
      } else {
        mostrarToast(res.erro || 'Falha ao solicitar reinício.', 'erro');
        setReiniciandoServidor(false);
      }
    } catch (e) {
      mostrarToast('Servidor reiniciando. Retornará em instantes.');
      setModalReiniciar(false);
      setTimeout(() => {
        setReiniciandoServidor(false);
      }, 4000);
    }
  };

  const enviarNotificacao = async (e) => {
    e.preventDefault();
    setNotificacaoEnviando(true);
    const [res] = await Promise.all([
      api('/api/notificacoes', { method: 'POST', body: JSON.stringify(notificacaoForm) })
    ]);
    if (res.sucesso) {
      mostrarToast('Aviso Global disparado com sucesso!');
      setNotificacaoForm({ titulo: '', mensagem: '', alvo_tipo: 'GLOBAL', alvo_usuario_id: [] });
      carregarAdminNotificacoes();
    } else {
      mostrarToast(res.erro || 'Erro ao disparar aviso.', 'erro');
    }
    setNotificacaoEnviando(false);
  };

  const carregarAdminNotificacoes = useCallback(async () => {
    const res = await api('/api/notificacoes?todas=true');
    if (res.sucesso) setAdminNotificacoes(res.dados || []);
  }, []);

  const apagarNotificacao = async (id) => {
    const res = await api(`/api/notificacoes/${id}`, { method: 'DELETE' });
    if (res.sucesso) {
      mostrarToast('Aviso apagado com sucesso.');
      carregarAdminNotificacoes();
    } else {
      mostrarToast(res.erro || 'Erro ao apagar aviso.', 'erro');
    }
  };

  useEffect(() => {
    carregarUsuarios();
    carregarBackups();
    carregarErros();
    carregarLogs(); 
    carregarAdminNotificacoes();
    carregarManutencao();
  }, [carregarUsuarios, carregarBackups, carregarErros, carregarLogs, carregarAdminNotificacoes, carregarManutencao]);

  const criarUsuario = async () => {
    if (!novoUserNome || novoUserNome.length < 3) return mostrarToast('Nome de utilizador muito curto.', 'erro');
    setIsProcessando(true);
    const [res] = await Promise.all([
      api('/api/admin/usuarios', {
        method: 'POST', body: JSON.stringify({ usuario: novoUserNome.trim(), tipo: novoUserTipo })
      })
    ]);
    
    if (res.sucesso) {
      setSenhaGerada({ usuario: novoUserNome, senha: res.senhaTemporaria });
      setNovoUserNome('');
      carregarUsuarios();
      mostrarToast('Utilizador criado com sucesso!');
    } else { mostrarToast(res.erro, 'erro'); }
    setIsProcessando(false);
  };

  const alternarStatusUsuario = async (id, statusAtual, usuario) => {
    const contaProtegida = ['DesenvolvedorAdmin', 'admin'].includes(usuario);

    if (contaProtegida && statusAtual) {
      mostrarToast('Esta conta é protegida e não pode ser desativada.', 'erro');
      return;
    }

    setIsProcessando(true);
    const [res] = await Promise.all([
      api(`/api/admin/usuarios/${id}/status`, {
        method: 'PUT', body: JSON.stringify({ ativo: !statusAtual })
      })
    ]);

    if (!res.sucesso) {
      mostrarToast(res.erro || 'Erro ao alterar status.', 'erro');
    } else {
      carregarUsuarios();
      mostrarToast(statusAtual ? 'Acesso bloqueado.' : 'Acesso libertado.');
    }
    setIsProcessando(false);
  };

  const alterarTipoUsuario = async (id, novoTipo, usuario) => {
    setIsProcessando(true);
    const res = await api(`/api/admin/usuarios/${id}/tipo`, {
      method: 'PATCH',
      body: JSON.stringify({ novoTipo, tipo: novoTipo })
    });

    if (!res.sucesso) {
      mostrarToast(res.erro || 'Erro ao alterar perfil do usuário.', 'erro');
    } else {
      carregarUsuarios();
      mostrarToast(`Perfil de ${usuario} atualizado para ${novoTipo.toUpperCase()}!`, 'sucesso');
    }
    setIsProcessando(false);
  };

 const confirmarResetSenha = async () => {
    const { id, nome, novaSenha, codigo2FA } = modalResetSenha;
    if (novaSenha.length < 8) return mostrarToast('A senha deve ter no mínimo 8 caracteres.', 'erro');
    if (!codigo2FA || codigo2FA.trim().length === 0) return mostrarToast('Insira seu código 2FA para autorizar a redefinição.', 'erro');

    setIsProcessando(true);
    const [res] = await Promise.all([
      api(`/api/admin/usuarios/${id}/reset`, { 
        method: 'POST',
        headers: { 'x_2fa_code': codigo2FA.trim() },
        body: JSON.stringify({ novaSenha }) 
      })
    ]);

    if (res.sucesso) {
      mostrarToast(`A palavra-passe de ${nome} foi alterada manualmente!`, 'sucesso');
      setModalResetSenha({ visivel: false, id: null, nome: '', novaSenha: '', codigo2FA: '' });
    } else { mostrarToast(res.erro, 'erro'); }
    setIsProcessando(false);
  };

  const resolverErro = async (id) => {
    setIsProcessando(true);
    const [res] = await Promise.all([
      api(`/api/admin/erros/${id}/resolver`, {
        method: 'PUT'
      })
    ]);

    if (res.sucesso) {
      mostrarToast('Erro marcado como resolvido e arquivado.', 'sucesso');
      carregarErros();
    } else {
      mostrarToast(res.erro || 'Falha ao resolver erro.', 'erro');
    }
    setIsProcessando(false);
  };

  const forcarBackup = async () => {
    setIsProcessando(true);
    try {
      const res = await api('/api/admin/backups/forcar', { method: 'POST' });
      if (res.sucesso) {
        mostrarToast('Snapshot de segurança criado!');
        carregarBackups();
      } else {
        mostrarToast(res.erro || 'Falha ao gerar backup.', 'erro');
      }
    } catch {
      mostrarToast('Erro de rede ao forçar backup.', 'erro');
    } finally {
      setIsProcessando(false);
    }
  };

  const limparBackupsAntigos = async () => {
    setIsProcessando(true);
    try {
      const res = await api('/api/admin/backups/limpar', { method: 'POST' });
      if (res.sucesso) {
        mostrarToast(`Limpeza concluída! ${res.totalRemovidos || 0} backup(s) antigo(s) removido(s).`);
        carregarBackups();
      } else {
        mostrarToast(res.erro || 'Falha ao executar limpeza de backups.', 'erro');
      }
    } catch {
      mostrarToast('Erro de rede ao executar limpeza.', 'erro');
    } finally {
      setIsProcessando(false);
    }
  };

  const baixarBackup = async (nomeArquivo) => {
    try {
      const response = await fetch(`/api/admin/backups/download/${nomeArquivo}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Falha no download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch { mostrarToast('Erro ao transferir ficheiro.', 'erro'); }
  };

  const executarPurge = async () => {
    if (confirmacaoPurge !== 'CONFIRMO_EXCLUSAO_TOTAL_DO_ANO_LETIVO') {
      return mostrarToast('Código de segurança incorreto. Expurgo abortado.', 'erro');
    }
    
    setIsProcessando(true);
    const [res] = await Promise.all([
      api('/api/admin/purge', {
        method: 'POST', 
        headers: { 'x_2fa_code': codigo2FA },
        body: JSON.stringify({ confirmacao_seguranca: confirmacaoPurge })
      })
    ]);
    
    if (res.sucesso) {
      setConfirmacaoPurge('');
      setCodigo2FA('');
      mostrarToast('Expurgo concluído. Base de dados limpa para o novo ano.', 'sucesso');
    } else { mostrarToast(res.erro, 'erro'); }
    setIsProcessando(false);
  };

  const logsFiltrados = logs.filter(log => {
    let matchData = true;
    if (filtroLogs.data) {
      const [ano, mes, dia] = filtroLogs.data.split('-');
      matchData = log.criado_em?.startsWith(`${dia}/${mes}/${ano}`);
    }

    const matchUsuario = filtroLogs.usuario ? (log.usuario || '').toLowerCase().includes(filtroLogs.usuario.toLowerCase()) : true;
    const matchRota = filtroLogs.rota ? (log.rota || '').toLowerCase().includes(filtroLogs.rota.toLowerCase()) : true;
    const niveisSelecionados = (filtroLogs.nivel || []).map(n => String(n).toUpperCase());
    const matchNivel = niveisSelecionados.length > 0 ? niveisSelecionados.includes(String(log.nivel || '').toUpperCase()) : true;

    return matchData && matchUsuario && matchRota && matchNivel;
  });

  return (
    <>
      <div className="flex justify-end px-8 py-4">
        <SessionTimer />
      </div>
      <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in pb-20 relative">

        <ToastAlert visivel={notificacao.visivel} tipo={notificacao.tipo} texto={notificacao.texto} />

        {/* Portais dos Modais do Admin */}
        {typeof document !== 'undefined' && createPortal(
          <>
            {/* Modal Senha Gerada */}
            {senhaGerada && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fade-in" onClick={() => setSenhaGerada(null)}>
                 <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-zinc-200 animate-slide-in-right my-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><Key className="w-8 h-8" /></div>
                    <h3 className="text-xl font-black text-zinc-800 mb-2">Credencial Gerada</h3>
                    <p className="text-zinc-500 text-xs font-medium mb-6">Copie e envie esta senha para o operador. Ela não será exibida novamente.</p>
                    
                    <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 mb-6 text-left">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Usuário</p>
                      <p className="font-black text-zinc-800 text-base mb-3">{senhaGerada.usuario}</p>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Senha Temporária</p>
                      <div className="p-3.5 bg-zinc-100 rounded-xl border border-zinc-300 mt-1 text-center">
                        <p className="font-mono font-black text-zinc-900 text-xl tracking-wider select-all break-all">
                          {senhaGerada.senha}
                        </p>
                      </div>
                    </div>

                    <button onClick={() => setSenhaGerada(null)} className="w-full bg-primaria hover:bg-orange-600 text-white shadow-md font-black py-3.5 rounded-xl transition-all uppercase tracking-widest text-xs">
                      Ciente, fechar aviso
                    </button>
                 </div>
              </div>
            )}

            {modalResetSenha.visivel && (() => {
               const forca = (() => {
                 const s = modalResetSenha.novaSenha;
                 if (!s) return 0;
                 let f = 0;
                 if (s.length >= 8) f += 1;
                 if (/[A-Z]/.test(s)) f += 1;
                 if (/[0-9]/.test(s)) f += 1;
                 if (/[^A-Za-z0-9]/.test(s)) f += 1;
                 return f;
               })();
               const coresForca = ['bg-zinc-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-green-500'];
               const labelsForca = ['Muito Fraca', 'Fraca', 'Razoável', 'Forte', 'Muito Forte'];

               return (
                 <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fade-in" onClick={() => setModalResetSenha({ visivel: false, id: null, nome: '', novaSenha: '' })}>
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-zinc-200 animate-slide-in-right my-auto" onClick={(e) => e.stopPropagation()}>
                       <h3 className="text-xl font-black text-zinc-800 mb-2">Reset de Senha</h3>
                       <p className="text-zinc-500 text-sm mb-6">Defina a nova senha para <strong className="text-primaria">{modalResetSenha.nome}</strong>.</p>
                       
                       <input
                          type="password"
                          value={modalResetSenha.novaSenha}
                          onChange={e => setModalResetSenha({...modalResetSenha, novaSenha: e.target.value})}
                          className={`w-full bg-zinc-50 border rounded-xl px-4 py-3 text-sm font-bold mb-3 outline-none transition-all duration-500 ${
                            modalResetSenha.novaSenha.length === 0 
                              ? 'border-zinc-300 focus:border-primaria' 
                              : forca < 3 
                                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                                : 'border-green-500 focus:border-green-600 focus:ring-4 focus:ring-green-500/10'
                          }`}
                          placeholder="Nova credencial..."
                        />

                       {modalResetSenha.novaSenha.length > 0 && (
                         <div className="mb-4 animate-fade-in">
                           <div className="flex gap-1 mb-1.5">
                             {[1, 2, 3, 4].map(nivel => (
                               <div key={nivel} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${nivel <= forca ? coresForca[forca] : 'bg-zinc-100'}`}></div>
                             ))}
                           </div>
                           <p className={`text-[10px] font-black uppercase tracking-widest text-right transition-colors ${forca < 3 ? 'text-red-500' : 'text-green-600'}`}>{labelsForca[forca]}</p>
                         </div>
                       )}

                       <p className="text-[10px] text-zinc-400 font-bold uppercase mb-4 tracking-wider">Mínimo 8 caracteres, contendo letras maiúsculas e números.</p>
                       
                       <div className="mb-4">
                         <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1.5 tracking-widest">
                           Seu Código 2FA de Administrador:
                         </label>
                         <input
                           type="text"
                           value={modalResetSenha.codigo2FA || ''}
                           onChange={e => setModalResetSenha({...modalResetSenha, codigo2FA: e.target.value.trim()})}
                           className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-center tracking-widest outline-none focus:border-primaria"
                           placeholder="Código TOTP ou Recuperação"
                         />
                       </div>

                       <div className="flex gap-3">
                         <button type="button" onClick={() => setModalResetSenha({ visivel: false, id: null, nome: '', novaSenha: '', codigo2FA: '' })} className="flex-1 bg-zinc-100 text-zinc-600 font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider text-xs">Cancelar</button>
                         <button type="button" onClick={confirmarResetSenha} disabled={isProcessando || (modalResetSenha.novaSenha.length > 0 && forca < 3) || !modalResetSenha.codigo2FA} className="flex-1 bg-primaria hover:bg-orange-600 text-white shadow-md font-bold py-3.5 rounded-xl transition-all uppercase tracking-wider text-xs disabled:opacity-30">Confirmar</button>
                       </div>
                    </div>
                 </div>
               );
            })()}

            {/* Modal Confirmação de Reinício do Servidor */}
            {modalReiniciar && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fade-in" onClick={() => setModalReiniciar(false)}>
                 <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-red-200 animate-slide-in-right my-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Server className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 mb-2">Reiniciar Servidor Principal?</h3>
                    <p className="text-zinc-600 text-xs font-medium mb-6 leading-relaxed">
                      O processo Node.js na porta 3001 será reiniciado. O <strong>Gateway Sentinela</strong> na porta 3000 continuará de pé, exibindo a tela de reconexão automática aos usuários conectados até o motor subir (cerca de 2 segundos).
                    </p>

                    <div className="flex gap-3">
                      <button 
                        type="button" 
                        onClick={() => setModalReiniciar(false)} 
                        className="flex-1 bg-zinc-100 text-zinc-700 font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button" 
                        onClick={reiniciarServidorPrincipal} 
                        disabled={reiniciandoServidor} 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-md font-black py-3.5 rounded-xl transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {reiniciandoServidor ? <><RingLoader tamanho="w-4 h-4" /> Reiniciando...</> : 'Sim, Reiniciar'}
                      </button>
                    </div>
                 </div>
              </div>
            )}
          </>,
          document.body
        )}

        <div className="mb-10 flex flex-col xl:flex-row bg-white rounded-[2rem] shadow-sm border border-zinc-100 overflow-hidden border-l-[6px] border-l-primaria">
          <div className="flex items-center gap-4 p-5 xl:pr-10 xl:border-r border-zinc-100 shrink-0 w-full xl:w-auto pl-6 bg-white/80 z-10 relative">
            <div className="w-14 h-14 bg-primaria text-white rounded-full flex items-center justify-center shadow-inner shrink-0">
              <AlertOctagon className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-zinc-900 font-black text-xl tracking-tight mb-0.5">Painel Administrativo</h2>
              <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                Gestão e Configuração do Sistema
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 w-full xl:border-l border-zinc-100">
            {[
              { id: 'usuarios', label: 'Usuários & Acessos', icon: <Users className="w-6 h-6" /> },
              { id: 'comunicacoes', label: 'Comunicados', icon: <MessageSquare className="w-6 h-6" /> },
              { id: 'erros', label: `Relatórios de Erros ${erros.length > 0 ? `(${erros.length})` : ''}`, icon: <Inbox className="w-6 h-6" />, error: erros.length > 0 },
              { id: 'manutencao', label: 'Manutenção & Servidor', icon: <Wrench className="w-6 h-6" />, warning: manutencaoConfig.ativo === 1 },
              { id: 'logs', label: 'Logs de Auditoria', icon: <Activity className="w-6 h-6" /> },
              { id: 'backups', label: 'Cópias de Segurança', icon: <Save className="w-6 h-6" /> },
              { id: 'purge', label: 'Encerramento de Ano', icon: <AlertOctagon className="w-6 h-6" />, danger: true }
            ].map((tab) => {
              const ativo = visaoAtiva === tab.id;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => setVisaoAtiva(tab.id)} 
                  className={`flex flex-col items-center justify-center py-5 px-2 transition-all duration-300 border-r border-b xl:border-b-0 border-zinc-100 relative group ${
                    ativo ? (tab.danger ? 'bg-gradient-to-br from-red-50 to-red-100/50 shadow-inner' : 'bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-inner') : 'bg-white/80 hover:bg-zinc-50'
                  }`}
                >
                  {ativo && <div className={`absolute bottom-0 left-6 right-6 h-[4px] rounded-t-full ${tab.danger ? 'bg-red-600' : 'bg-primaria'}`}></div>}
                  <span className={`mb-1.5 transition-all duration-300 ${ativo ? (tab.danger ? 'scale-110 text-red-600' : 'scale-110 text-primaria') : tab.error ? 'text-red-500' : tab.danger ? 'text-red-400' : 'text-zinc-400 group-hover:text-zinc-600'}`}>
                    {tab.icon}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${ativo ? (tab.danger ? 'text-red-600' : 'text-primaria') : tab.error ? 'text-red-600' : tab.danger ? 'text-red-500' : 'text-zinc-500 group-hover:text-zinc-700'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {visaoAtiva === 'usuarios' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm h-fit">
              <h2 className="text-xl font-black text-zinc-800 mb-6 border-b border-zinc-100 pb-4">Novo Operador</h2>
              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest">Identificador de Login</label>
                  <input type="text" value={novoUserNome} onChange={e => setNovoUserNome(e.target.value.toLowerCase().replace(/\s/g, '.'))} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-primaria" placeholder="ex: joao.silva" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest">Nível de Permissão</label>
                  <select value={novoUserTipo} onChange={e => setNovoUserTipo(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-primaria">
                    <option value="professor">Professor (Lançamentos)</option>
                    <option value="coordenacao">Coordenação (Contraturno)</option>
                    <option value="cozinha">Cozinha (Gestão/B.I.)</option>
                    <option value="admin">Administrador TI</option>
                  </select>
                </div>
              </div>
              <button onClick={criarUsuario} disabled={isProcessando} className="w-full bg-zinc-900 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-70 flex justify-center items-center gap-2">
                {isProcessandoUI ? <><RingLoader tamanho="w-5 h-5" /> Processando...</> : 'Gerar Credencial'}
              </button>
            </div>

            <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-600 mb-6 border-b border-zinc-100 pb-3">Contas Registadas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-zinc-400">
                      <th className="pb-4 font-black uppercase tracking-widest">Utilizador</th>
                      <th className="pb-4 font-black uppercase tracking-widest">Perfil</th>
                      <th className="pb-4 font-black uppercase tracking-widest text-center">Status</th>
                      <th className="pb-4 font-black uppercase tracking-widest text-right">Ações de Segurança</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium text-zinc-700">
                    {usuarios.map(u => (
                      <tr key={u.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                        <td className="py-4 font-bold text-zinc-800">{u.usuario}</td>
                        <td className="py-4">
                          <select
                            value={u.tipo}
                            onChange={(e) => alterarTipoUsuario(u.id, e.target.value, u.usuario)}
                            disabled={isProcessando || (['DesenvolvedorAdmin'].includes(u.usuario))}
                            className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 text-[11px] font-black uppercase tracking-wider rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primaria/20 cursor-pointer transition-colors disabled:opacity-50"
                            title="Alterar perfil deste usuário"
                          >
                            <option value="professor">Professor</option>
                            <option value="cozinha">Cozinha</option>
                            <option value="coordenacao">Coordenação</option>
                            <option value="admin">Administrador (TI)</option>
                          </select>
                        </td>
                        <td className="py-4 text-center">
                           <span className={`px-2 py-1 rounded text-[10px] uppercase font-black tracking-widest border ${u.ativo ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-red-500/10 text-red-700 border-red-500/20'}`}>
                             {u.ativo ? 'Ativo' : 'Bloqueado'}
                           </span>
                        </td>
                        <td className="py-4 text-right space-x-2">
                          <button onClick={() => alternarStatusUsuario(u.id, u.ativo, u.usuario)} disabled={isProcessando || (u.ativo && ['DesenvolvedorAdmin', 'admin'].includes(u.usuario))} className={`px-3 py-2 rounded-lg font-bold transition-colors text-[10px] uppercase tracking-wider disabled:opacity-30 ${u.ativo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                            {u.ativo ? 'Desativar' : 'Reativar'}
                          </button>
                          <button onClick={() => setModalResetSenha({ visivel: true, id: u.id, nome: u.usuario, novaSenha: '' })} disabled={isProcessando} className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg font-bold hover:bg-blue-100 transition-colors text-[10px] uppercase tracking-wider">
                            Reset Senha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {visaoAtiva === 'comunicacoes' && (
              <div className="flex flex-col gap-6 xl:gap-8 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 min-h-[600px]">
                  {/* Lado Esquerdo: Formulário */}
                  <div className="bg-white p-5 md:p-6 xl:p-8 rounded-[2rem] border border-zinc-200 shadow-xl shadow-primaria/5 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primaria/5 rounded-bl-full -z-10"></div>
                  <h3 className="text-xl font-black text-zinc-900 mb-8 flex items-center gap-3 tracking-tight">
                    <div className="w-10 h-10 rounded-xl bg-primaria/10 flex items-center justify-center text-primaria">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    Novo Aviso
                  </h3>
                  
                  <form onSubmit={enviarNotificacao} className="flex-1 flex flex-col gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Título do Aviso</label>
                      <input 
                        required 
                        type="text" 
                        value={notificacaoForm.titulo}
                        onChange={e => setNotificacaoForm(prev => ({...prev, titulo: e.target.value}))}
                        className="w-full bg-zinc-50/50 border-2 border-zinc-200 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-800 focus:border-primaria focus:bg-white outline-none transition-all focus:shadow-[0_0_0_4px_rgba(249,115,22,0.1)]"
                        placeholder="Ex: Manutenção no Sistema"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Alvo</label>
                        <select 
                          value={notificacaoForm.alvo_tipo}
                          onChange={e => setNotificacaoForm(prev => ({...prev, alvo_tipo: e.target.value}))}
                          className="w-full bg-zinc-50/50 border-2 border-zinc-200 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-800 outline-none focus:border-primaria focus:bg-white transition-all cursor-pointer"
                        >
                          <option value="GLOBAL">Todos (Global)</option>
                          <option value="INDIVIDUAL">Lista Específica</option>
                        </select>
                      </div>
                      
                      {notificacaoForm.alvo_tipo === 'INDIVIDUAL' && (
                        <div className="mt-2 animate-fade-in">
                          <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider mb-2">Selecione os Destinatários</label>
                          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {usuarios.map(u => (
                              <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 p-1.5 rounded">
                                <input 
                                  type="checkbox" 
                                  checked={notificacaoForm.alvo_usuario_id.includes(u.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNotificacaoForm(prev => ({...prev, alvo_usuario_id: [...prev.alvo_usuario_id, u.id]}));
                                    } else {
                                      setNotificacaoForm(prev => ({...prev, alvo_usuario_id: prev.alvo_usuario_id.filter(id => id !== u.id)}));
                                    }
                                  }}
                                  className="w-4 h-4 text-primaria rounded focus:ring-primaria"
                                />
                                <span className="text-xs font-bold text-zinc-700">{u.usuario}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col mt-2">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2 ml-1 gap-2">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Mensagem (Markdown)</label>
                        <span className="text-[10px] text-zinc-400 font-bold bg-zinc-100 px-2.5 py-1 rounded-full w-fit">Use **negrito**, *itálico*, [link](url)</span>
                      </div>
                      <textarea 
                        required
                        value={notificacaoForm.mensagem}
                        onChange={e => setNotificacaoForm(prev => ({...prev, mensagem: e.target.value}))}
                        className="w-full flex-1 bg-zinc-50/50 border-2 border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium text-zinc-800 focus:border-primaria focus:bg-white outline-none resize-none font-mono transition-all focus:shadow-[0_0_0_4px_rgba(249,115,22,0.1)] custom-scrollbar"
                        placeholder="Escreva a mensagem aqui usando a sintaxe Markdown..."
                      ></textarea>
                    </div>

                    <button 
                      type="submit" 
                      disabled={notificacaoEnviando}
                      className="w-full bg-primaria text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50 mt-4 uppercase tracking-widest text-[11px]"
                    >
                      {notificacaoEnviando ? <><RingLoader tamanho="w-5 h-5" /> Processando...</> : <><MessageSquare className="w-5 h-5" /> Disparar Aviso Global</>}
                    </button>
                  </form>
                </div>

                {/* Lado Esquerdo: Preview */}
                <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 p-5 md:p-6 xl:p-8 rounded-[2rem] border border-zinc-200 shadow-inner flex flex-col overflow-y-auto relative">
                  <h3 className="text-[11px] font-black text-zinc-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
                    <Eye className="w-4 h-4" />
                    Preview em Tempo Real
                  </h3>
                  
                  {notificacaoForm.titulo || notificacaoForm.mensagem ? (
                    <div className="bg-white p-5 md:p-6 xl:p-8 rounded-[2rem] border-2 border-zinc-100 shadow-xl shadow-black/5 animate-slide-up animate-fade-in relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primaria to-orange-400"></div>
                      <h4 className="text-xl md:text-2xl font-black text-zinc-900 mb-5 pb-5 border-b border-zinc-100/80 break-words hyphens-auto">
                        {notificacaoForm.titulo || 'Sem Título'}
                      </h4>
                      <div className="prose prose-zinc prose-sm md:prose-base max-w-none prose-headings:font-black prose-a:text-primaria prose-a:no-underline hover:prose-a:underline prose-p:leading-relaxed prose-strong:text-zinc-800">
                        <ReactMarkdown>
                          {formatarEspacos(notificacaoForm.mensagem || '*A mensagem aparecerá aqui...*')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-zinc-400 animate-fade-in">
                      <div className="w-20 h-20 bg-zinc-200/50 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <p className="font-bold text-sm tracking-wide">Comece a digitar para ver o preview</p>
                    </div>
                  )}
                </div>
              </div>

                {/* Linha Inferior: Histórico de Avisos Enviados */}
                <div className="bg-white p-5 md:p-6 xl:p-8 rounded-[2rem] border border-zinc-200 shadow-xl shadow-primaria/5 flex flex-col relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10"></div>
                  <h3 className="text-xl font-black text-zinc-900 mb-8 flex items-center gap-3 tracking-tight">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                      <Bell className="w-5 h-5" />
                    </div>
                    Avisos Recentes
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {adminNotificacoes.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 opacity-50">
                        <Ghost className="w-12 h-12 text-zinc-300 mb-3" />
                        <p className="text-sm text-zinc-400 font-bold">Nenhum aviso enviado recentemente.</p>
                      </div>
                    ) : (
                      adminNotificacoes.map(notif => (
                        <div key={notif.id} className="p-5 bg-zinc-50/80 hover:bg-white border-2 border-zinc-100 hover:border-primaria/30 rounded-2xl relative group transition-all duration-300 hover:shadow-lg cursor-default">
                          <button 
                            onClick={() => apagarNotificacao(notif.id)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all bg-white hover:bg-red-500 border border-zinc-200 hover:border-red-500 rounded-lg p-1.5 shadow-sm"
                            title="Apagar permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div className="pr-10">
                            <h4 className="text-[15px] font-black text-zinc-800 flex items-center gap-2 mb-1.5">
                              {notif.alvo_tipo === 'GLOBAL' ? 
                                <span className="bg-orange-100 text-primaria p-1 rounded-md"><Globe className="w-3 h-3"/></span> 
                                : 
                                <span className="bg-blue-100 text-blue-600 p-1 rounded-md"><Users className="w-3 h-3"/></span>
                              }
                              {notif.titulo}
                            </h4>
                            <div className="text-[13px] text-zinc-500 line-clamp-2 leading-relaxed mt-1 prose prose-sm max-w-none prose-p:my-0 prose-headings:my-0 prose-a:text-primaria">
                              <ReactMarkdown>{formatarEspacos(notif.mensagem)}</ReactMarkdown>
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-200/60">
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(notif.criado_em).toLocaleDateString()} {new Date(notif.criado_em).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${notif.alvo_tipo === 'GLOBAL' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                {notif.alvo_tipo === 'GLOBAL' ? 'Global' : (notif.alvo_usuario_nome ? `Para: ${notif.alvo_usuario_nome.split(' ')[0]}` : 'Selecionados')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

        {visaoAtiva === 'erros' && (
          <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm animate-fade-in">
             <div className="flex justify-between items-center mb-8 border-b border-zinc-100 pb-6">
               <div>
                 <h2 className="text-2xl font-black text-zinc-800">Caixa de Entrada (Relatórios de Bug)</h2>
                 <p className="text-zinc-500 font-medium text-sm mt-1">Mensagens enviadas pelos operadores através do botão de suporte.</p>
               </div>
               <button onClick={carregarErros} disabled={isProcessando} className="bg-white border border-zinc-200 text-zinc-600 p-3 rounded-xl shadow-sm hover:bg-zinc-100 transition-all">
                 ↻
               </button>
             </div>

             {erros.length === 0 ? (
               <div className="text-center py-20 text-zinc-400 font-bold text-sm animate-fade-in">
                 <CheckCircle2 className="w-12 h-12 text-zinc-300 mx-auto mb-3" /> Nenhum problema pendente. Tudo funcionando perfeitamente.
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                 {erros.map(erro => (
                   <div key={erro.id} className="bg-zinc-50 border border-zinc-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                     <div>
                       <div className="flex justify-between items-start mb-4">
                         <div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">{erro.criado_em}</span>
                           <div className="font-black text-zinc-800">{erro.usuario} <span className="bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded text-[10px] uppercase ml-2">{erro.perfil}</span></div>
                         </div>
                       </div>
                       <p className="text-sm text-zinc-700 font-medium leading-relaxed bg-white p-4 rounded-xl border border-zinc-100 shadow-inner mb-6">
                         "{erro.mensagem}"
                       </p>
                     </div>
                     <button onClick={() => resolverErro(erro.id)} disabled={isProcessando} className="w-full bg-green-50 text-green-700 border border-green-200 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                        <Check className="w-4 h-4" /> Marcar como Resolvido
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {visaoAtiva === 'logs' && (
          <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm animate-fade-in">
              <div className="flex justify-between items-start mb-6 border-b border-zinc-100 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-800">Auditoria do Sistema (Logs)</h2>
                  <p className="text-zinc-500 font-medium text-sm mt-1">Registro de erros críticos e eventos executados no backend.</p>
                </div>
                <button onClick={carregarLogs} disabled={isProcessando} className="bg-zinc-100 text-zinc-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-2" >
                   <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                </button>
              </div>

              <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 mb-6 flex flex-col gap-5 shadow-inner">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mr-2">Gravidade:</span>
                    <button 
                      onClick={() => setFiltroLogs(prev => ({ ...prev, nivel: prev.nivel?.includes('INFO') ? prev.nivel.filter(n => n !== 'INFO') : [...(prev.nivel || []), 'INFO'] }))} 
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${filtroLogs.nivel?.includes('INFO') ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-zinc-400 border-zinc-200 hover:border-blue-200 hover:text-blue-500'}`}>
                      INFO
                    </button>
                    <button 
                      onClick={() => setFiltroLogs(prev => ({ ...prev, nivel: prev.nivel?.includes('ERRO') ? prev.nivel.filter(n => n !== 'ERRO') : [...(prev.nivel || []), 'ERRO'] }))} 
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${filtroLogs.nivel?.includes('ERRO') ? 'bg-orange-100 text-orange-700 border-orange-200 shadow-sm' : 'bg-white text-zinc-400 border-zinc-200 hover:border-orange-200 hover:text-orange-500'}`}>
                      ERRO
                    </button>
                    <button 
                      onClick={() => setFiltroLogs(prev => ({ ...prev, nivel: prev.nivel?.includes('CRITICO') ? prev.nivel.filter(n => n !== 'CRITICO') : [...(prev.nivel || []), 'CRITICO'] }))} 
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${filtroLogs.nivel?.includes('CRITICO') ? 'bg-red-100 text-red-700 border-red-200 shadow-sm' : 'bg-white text-zinc-400 border-zinc-200 hover:border-red-200 hover:text-red-500'}`}>
                      CRÍTICO
                    </button>
                  </div>
                  <button onClick={() => setFiltroLogs({ data: '', usuario: '', rota: '', nivel: [] })} className="w-full md:w-auto bg-zinc-200 text-zinc-600 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-zinc-300 transition-colors shadow-sm">
                     Limpar Filtros
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input type="date" value={filtroLogs.data} onChange={e => setFiltroLogs(prev => ({ ...prev, data: e.target.value }))} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm transition-colors" />
                  <input type="text" placeholder="Buscar por usuário..." value={filtroLogs.usuario} onChange={e => setFiltroLogs(prev => ({ ...prev, usuario: e.target.value }))} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm transition-colors" />
                  <input type="text" placeholder="Filtrar por Rota (ex: /login)" value={filtroLogs.rota} onChange={e => setFiltroLogs(prev => ({ ...prev, rota: e.target.value }))} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm transition-colors" />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-2">
                 <table className="w-full text-left text-xs">
                   <thead className="sticky top-0 bg-white z-10 shadow-sm">
                     <tr className="text-zinc-400 border-b border-zinc-200">
                       <th className="pb-4 font-black uppercase tracking-widest">Data/Hora</th>
                       <th className="pb-4 font-black uppercase tracking-widest">Nível</th>
                       <th className="pb-4 font-black uppercase tracking-widest">Usuário</th>
                       <th className="pb-4 font-black uppercase tracking-widest">Rota Afetada</th>
                       <th className="pb-4 font-black uppercase tracking-widest">Diagnóstico da Matriz</th>
                     </tr>
                   </thead>
                   <tbody className="font-medium text-zinc-700">
                     {logsFiltrados.length === 0 ? <tr><td colSpan="5" className="py-12 text-center text-zinc-400 italic font-bold">Nenhum evento corresponde aos filtros.</td></tr> : null}
                     {logsFiltrados.map(log => (
                       <tr key={log.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                         <td className="py-4 whitespace-nowrap text-zinc-500 font-bold">{log.criado_em}</td>
                         <td className="py-4">
                           <span className={`px-2 py-1 rounded text-[9px] uppercase font-black tracking-widest border ${log.nivel === 'CRITICO' ? 'bg-red-500/10 text-red-700 border-red-500/20' : log.nivel === 'ERRO' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' : 'bg-blue-500/10 text-blue-700 border-blue-500/20'}`}>
                             {log.nivel}
                           </span>
                         </td>
                         <td className="py-4 font-black text-zinc-800">{log.usuario || 'N/A'}</td>
                         <td className="py-4 font-mono text-[10px] text-zinc-400">{log.rota || 'N/A'}</td>
                         <td className="py-4 text-zinc-800">
                            <div className="font-bold mb-1">{log.mensagem}</div>
                            {log.detalhes && (
                              <details className="text-[10px] text-zinc-400 cursor-pointer mt-1 animate-fade-in">
                                <summary className="outline-none hover:text-primaria font-black uppercase tracking-widest">Ver Stack Trace</summary>
                                <div className="mt-2 p-3 bg-zinc-900 text-green-400 rounded-lg border border-zinc-800 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto shadow-inner">
                                  {log.detalhes}
                                </div>
                              </details>
                            )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
          </div>
        )}

        {visaoAtiva === 'backups' && (
          <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-zinc-100 pb-6">
               <div>
                 <div className="flex items-center gap-3 flex-wrap">
                   <h2 className="text-2xl font-black text-zinc-800">Cofre de Backups (Locais)</h2>
                   <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                     Retenção: 30 dias (1 mês)
                   </span>
                 </div>
                 <p className="text-zinc-500 font-medium text-sm mt-1">Dumps automatizados do SQLite às 03:00 AM com expurgo mensal automático.</p>
               </div>
               <div className="flex items-center gap-3 flex-wrap">
                 <button onClick={limparBackupsAntigos} disabled={isProcessando} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                   <Trash2 className="w-4 h-4 text-zinc-500" /> Expurgar Antigos (+30d)
                 </button>
                 <button onClick={forcarBackup} disabled={isProcessando} className="bg-zinc-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 flex items-center gap-2 transition-all">
                   {isProcessandoUI ? <><RingLoader tamanho="w-5 h-5" /> Processando...</> : 'Forçar Snapshot Agora'}
                 </button>
               </div>
             </div>

             {backups.length === 0 ? (
               <div className="text-center py-20 text-zinc-400 font-bold text-sm animate-fade-in">
                 <Database className="w-12 h-12 text-zinc-300 mx-auto mb-3" /> Nenhum backup encontrado no disco.
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                 {backups.map((b, i) => (
                   <div key={i} className="border border-zinc-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all bg-zinc-50 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-zinc-400 mb-1">
                          <span>{b.tamanhoMB} MB</span>
                          {b.idadeDias !== undefined && (
                            <span className={b.idadeDias > 30 ? 'text-amber-600 font-bold' : 'text-zinc-500 font-medium'}>
                              {b.idadeDias === 0 ? 'Hoje' : `${b.idadeDias}d`}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-zinc-800 text-sm break-words">{b.nome}</div>
                        <div className="text-xs text-zinc-500 mt-2">{new Date(b.data).toLocaleString('pt-BR')}</div>
                      </div>
                      <button onClick={() => baixarBackup(b.nome)} className="mt-4 w-full bg-blue-50 text-blue-600 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-100 flex justify-center items-center gap-2">
                         <Download className="w-4 h-4" /> Baixar .DB
                      </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {visaoAtiva === 'manutencao' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            
            {/* CARD STATUS GERAL */}
            <div className={`p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
              manutencaoConfig.ativo 
                ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/30' 
                : 'bg-white border-zinc-200'
            }`}>
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
                  manutencaoConfig.ativo 
                    ? 'bg-amber-100 text-amber-600 border-amber-300 animate-pulse' 
                    : 'bg-green-100 text-green-600 border-green-300'
                }`}>
                  {manutencaoConfig.ativo ? <Wrench className="w-8 h-8" /> : <Check className="w-8 h-8" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                      manutencaoConfig.ativo 
                        ? 'bg-amber-500/20 text-amber-700 border-amber-400' 
                        : 'bg-green-500/20 text-green-700 border-green-400'
                    }`}>
                      {manutencaoConfig.ativo ? 'Modo de Manutenção Ativo' : 'Sistema Aberto & Operacional'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">
                    {manutencaoConfig.ativo ? 'Acesso Restrito a IPs Autorizados' : 'Todos os Acessos Liberados'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    {manutencaoConfig.ativo 
                      ? 'Outras máquinas da escola verão a tela de manutenção e reconexão automática.' 
                      : 'Professores, Cozinha, Totem e Coordenação operando normalmente.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const novoStatus = manutencaoConfig.ativo === 1 ? 0 : 1;
                    const atualizado = { ...manutencaoConfig, ativo: novoStatus };
                    setManutencaoConfig(atualizado);
                    salvarManutencao(atualizado);
                  }}
                  disabled={isProcessando}
                  className={`w-full md:w-auto px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                    manutencaoConfig.ativo 
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20' 
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                  }`}
                >
                  {manutencaoConfig.ativo ? <><Check className="w-4 h-4" /> Desativar Manutenção</> : <><Wrench className="w-4 h-4" /> Ativar Manutenção</>}
                </button>
              </div>
            </div>

            {/* CONFIGURAÇÕES DA MANUTENÇÃO */}
            <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm space-y-6">
              <h4 className="text-lg font-black text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-4">
                <ShieldAlert className="w-5 h-5 text-primaria" /> Configurações de Mensagem e Retorno
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest">
                    Mensagem Exibida aos Usuários
                  </label>
                  <textarea
                    rows={3}
                    value={manutencaoConfig.mensagem}
                    onChange={e => setManutencaoConfig({ ...manutencaoConfig, mensagem: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm font-medium text-zinc-800 outline-none focus:border-primaria shadow-inner resize-none"
                    placeholder="Ex: O sistema está passando por manutenção programada para melhorias técnicas. Retornaremos em breve."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest">
                      Previsão de Retorno (Opcional)
                    </label>
                    <input
                      type="text"
                      value={manutencaoConfig.previsao}
                      onChange={e => setManutencaoConfig({ ...manutencaoConfig, previsao: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-primaria shadow-inner"
                      placeholder="Ex: 16:30 ou Em 10 minutos"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest">
                      IP Detectado Desta Máquina
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={manutencaoConfig.meuIp || '127.0.0.1'}
                        className="flex-1 bg-zinc-100 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-zinc-600 outline-none cursor-default"
                      />
                      <button
                        type="button"
                        onClick={adicionarMeuIp}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Meu IP
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* LISTA DE IPS AUTORIZADOS */}
              <div className="pt-4 border-t border-zinc-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-black uppercase text-zinc-500 tracking-widest">
                      IPs Autorizados a Testar no Modo de Manutenção
                    </label>
                    <p className="text-xs text-zinc-400 font-medium">
                      Estes endereços continuarão com acesso completo para testes mesmo com o modo manutenção ativo.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl min-h-[60px] items-center">
                  {(manutencaoConfig.ips_autorizados || '').split(',').map(s => s.trim()).filter(Boolean).map(ip => (
                    <span 
                      key={ip} 
                      className="bg-white border border-zinc-300 text-zinc-800 font-mono font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2"
                    >
                      <Laptop className="w-3.5 h-3.5 text-zinc-500" />
                      {ip}
                      <button
                        type="button"
                        onClick={() => removerIp(ip)}
                        className="text-zinc-400 hover:text-red-500 transition-colors ml-1 cursor-pointer"
                        title="Remover IP"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <form onSubmit={adicionarIpManual} className="flex gap-2">
                  <input
                    type="text"
                    value={novoIpInput}
                    onChange={e => setNovoIpInput(e.target.value)}
                    placeholder="Digitar outro IP para liberar (ex: 10.134.230.15)..."
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-zinc-800 outline-none focus:border-primaria"
                  />
                  <button
                    type="submit"
                    disabled={!novoIpInput.trim()}
                    className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Adicionar IP
                  </button>
                </form>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => salvarManutencao()}
                  disabled={isProcessando}
                  className="bg-primaria hover:bg-orange-600 text-white font-black py-4 px-8 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Salvar Configurações
                </button>
              </div>
            </div>

            {/* REINÍCIO DO SERVIDOR PRINCIPAL */}
            <div className="bg-red-50/70 border border-red-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 border border-red-300 flex items-center justify-center shrink-0">
                  <Server className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-red-900 tracking-tight">Reiniciar Servidor Principal</h4>
                  <p className="text-xs text-red-700 font-medium mt-0.5 leading-relaxed">
                    Recicla o processo Node.js principal na porta 3001. O <strong>Gateway Sentinela</strong> na porta 3000 continuará de pé, mostrando a tela de reconexão automática aos computadores conectados.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalReiniciar(true)}
                disabled={reiniciandoServidor}
                className="w-full md:w-auto px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {reiniciandoServidor ? <><RingLoader tamanho="w-4 h-4" /> Reiniciando...</> : <><Power className="w-4 h-4" /> Reiniciar Servidor</>}
              </button>
            </div>

          </div>
        )}

        {visaoAtiva === 'purge' && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-3xl p-8 shadow-sm animate-fade-in">
             <div className="text-center mb-8">
               <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-10 h-10" /></div>
               <h2 className="text-3xl font-black text-red-800 tracking-tight">Perigo de Perda de Dados</h2>
               <p className="text-red-700 font-medium text-sm mt-3 leading-relaxed">
                 A Limpeza de Ano Letivo apagará permanentemente <strong>todos</strong> os registos de presenças, lixo, cardápios e histórico de dietas. Apenas as contas de utilizador e o registo de turmas/ingredientes serão mantidos. <strong>Esta ação não pode ser desfeita.</strong>
               </p>
             </div>

             <div className="bg-white p-6 rounded-2xl border border-red-200 mb-6 shadow-inner">
                <label className="block text-[10px] font-black uppercase text-red-600 mb-3 tracking-widest text-center">
                  Para prosseguir, digite exatamente o código abaixo:
                </label>
                <div className="text-center bg-red-50 p-3 rounded-lg mb-4 font-mono font-bold text-red-900 text-xs sm:text-sm select-all">
                  CONFIRMO_EXCLUSAO_TOTAL_DO_ANO_LETIVO
                </div>
                <input 
                  type="text" 
                  value={confirmacaoPurge} 
                  onChange={e => setConfirmacaoPurge(e.target.value)} 
                  className="w-full bg-white border-2 border-red-300 rounded-xl px-4 py-4 text-sm font-bold text-red-900 outline-none focus:border-red-600 text-center placeholder-red-300 mb-4" 
                  placeholder="Digite o código de confirmação aqui..." 
                />
                
                <label className="block text-[10px] font-black uppercase text-red-600 mb-3 tracking-widest text-center mt-4">
                  Código de Autenticação 2FA:
                </label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={codigo2FA} 
                  onChange={e => setCodigo2FA(e.target.value.replace(/\D/g, ''))} 
                  className="w-full bg-white border-2 border-red-300 rounded-xl px-4 py-4 text-2xl font-black tracking-[0.5em] text-red-900 outline-none focus:border-red-600 text-center placeholder-red-200" 
                  placeholder="000000" 
                />
             </div>

             <button 
               onClick={executarPurge} 
               disabled={isProcessando || confirmacaoPurge !== 'CONFIRMO_EXCLUSAO_TOTAL_DO_ANO_LETIVO' || codigo2FA.length !== 6} 
               className="w-full bg-red-600 text-white py-5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all shadow-lg"
             >
               {isProcessandoUI ? <><RingLoader tamanho="w-5 h-5" /> Processando...</> : 'Confirmar Encerramento do Ano Letivo'}
             </button>
          </div>
        )}
      </div>
    </>
  );
}