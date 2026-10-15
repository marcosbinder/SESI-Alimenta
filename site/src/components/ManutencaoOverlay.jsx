import React, { useState } from 'react';
import { Wrench, ShieldAlert, Clock, RefreshCw, ArrowRight, Lock, Key, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RingLoader } from './UI';

export default function ManutencaoOverlay({ mensagem, previsao }) {
  const navigate = useNavigate();
  const [modalAdmin, setModalAdmin] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [etapa2FA, setEtapa2FA] = useState(false);
  const [usuarioId2FA, setUsuarioId2FA] = useState(null);
  const [erroLogin, setErroLogin] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLoginAdmin = async (e) => {
    e.preventDefault();
    setErroLogin('');
    setCarregando(true);

    try {
      if (!etapa2FA) {
        const res = await fetch('/api/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario, senha })
        });
        const dados = await res.json();

        if (!res.ok) {
          setErroLogin(dados.erro || 'Credenciais inválidas.');
          setCarregando(false);
          return;
        }

        if (dados.exige2FA) {
          setUsuarioId2FA(dados.usuarioId);
          setEtapa2FA(true);
          setCarregando(false);
          return;
        }

        if (dados.tipo !== 'admin') {
          setErroLogin('Apenas administradores de TI podem acessar durante a manutenção.');
          setCarregando(false);
          return;
        }

        localStorage.setItem('tipo', dados.tipo);
        localStorage.setItem('usuario', dados.usuario);
        if (dados.expiracao) localStorage.setItem('session_exp', dados.expiracao);
        window.location.href = '/admin';
      } else {
        const res = await fetch('/api/login/validar-2fa', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuarioId: usuarioId2FA, token: totpCode })
        });
        const dados = await res.json();

        if (!res.ok) {
          setErroLogin(dados.erro || 'Código 2FA inválido.');
          setCarregando(false);
          return;
        }

        if (dados.tipo !== 'admin') {
          setErroLogin('Apenas administradores de TI podem acessar durante a manutenção.');
          setCarregando(false);
          return;
        }

        localStorage.setItem('tipo', dados.tipo);
        localStorage.setItem('usuario', dados.usuario);
        if (dados.expiracao) localStorage.setItem('session_exp', dados.expiracao);
        window.location.href = '/admin';
      }
    } catch (err) {
      setErroLogin('Falha ao conectar com o servidor.');
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-[#121110] text-white flex flex-col items-center justify-center p-6 selection:bg-primaria selection:text-white backdrop-blur-2xl animate-fade-in overflow-hidden">
      
      {/* O mesmo fundo oficial do SESI Alimenta em versão escura com os alimentos nítidos */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/bg_pattern.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          filter: "invert(1) hue-rotate(180deg) brightness(0.55) contrast(1.3)",
          opacity: 0.90
        }}
      />

      <div className="max-w-lg w-full bg-zinc-900/95 border border-orange-500/30 rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6 backdrop-blur-xl">
        
        {/* Badge Status */}
        <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/35 text-orange-400 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          <span>Manutenção Técnica Ativa</span>
        </div>

        {/* Ícone Animado */}
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-3xl flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/10">
          <Wrench className="w-10 h-10 animate-spin" style={{ animationDuration: '14s' }} />
        </div>

        {/* Título & Mensagem */}
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">SESI Alimenta</h2>
          <p className="text-zinc-300 text-sm font-medium leading-relaxed mt-3 bg-zinc-800/70 p-4 rounded-2xl border border-zinc-700/60">
            {mensagem || 'Informamos que o serviço estará indisponível temporariamente devido a uma manutenção programada para melhorias.'}
          </p>
        </div>

        {/* Informações de Previsão */}
        <div className="bg-zinc-950/70 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between text-left">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-orange-400" /> Previsão de Retorno
            </span>
            <p className="text-sm font-black text-zinc-200 mt-0.5">
              {previsao || 'Em instantes'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Reconexão
            </span>
            <p className="text-xs font-bold text-orange-400 flex items-center gap-1.5 justify-end mt-0.5">
              <RefreshCw className="w-3 h-3 animate-spin" /> Automática
            </p>
          </div>
        </div>

        {/* Rodapé e Link TI */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-zinc-800">
          <span className="text-zinc-500 font-medium">Equipe Técnica de TI</span>
          <button
            type="button"
            onClick={() => setModalAdmin(true)}
            className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 underline underline-offset-4 cursor-pointer transition-colors"
          >
            Acesso Administrativo (TI) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Modal de Login de Emergência de TI */}
      {modalAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000000] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-orange-500/40 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-left animate-slide-in-up">
            
            <button
              onClick={() => { setModalAdmin(false); setErroLogin(''); setEtapa2FA(false); }}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Login TI (Admin)</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Acesso de Manutenção</p>
              </div>
            </div>

            {erroLogin && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-3.5 py-2.5 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{erroLogin}</span>
              </div>
            )}

            <form onSubmit={handleLoginAdmin} className="space-y-4">
              {!etapa2FA ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">Usuário TI</label>
                    <input
                      type="text"
                      value={usuario}
                      onChange={e => setUsuario(e.target.value)}
                      placeholder="admin"
                      className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-orange-500"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">Senha</label>
                    <input
                      type="password"
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-orange-400 mb-1">Código Authenticator 2FA</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-zinc-800/80 border-2 border-orange-500 rounded-xl px-3.5 py-3 text-2xl text-center text-white font-black tracking-[0.4em] outline-none"
                    required
                    autoFocus
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {carregando ? <><RingLoader tamanho="w-4 h-4" /> Entrando...</> : 'Entrar no Painel Administrativo'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
