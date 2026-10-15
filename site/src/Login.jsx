import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, Search } from 'lucide-react';
import { RingLoader, ToastAlert } from './components/UI';

function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const [etapa, setEtapa] = useState('login');
  const [usuarioId, setUsuarioId] = useState(null);
  const [qrCodeData, setQrCodeData] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [preAuthToken, setPreAuthToken] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Acesso Restrito | SESI Alimenta';
    localStorage.clear();
    
    if (location.state && location.state.erro_sessao) {
      setErro(location.state.erro_sessao);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const finalizarLogin = (dados) => {
    localStorage.setItem('tipo', dados.tipo);
    localStorage.setItem('usuario', dados.usuario);
    if (dados.expiracao) localStorage.setItem('session_exp', dados.expiracao);
    
    if (dados.tipo === 'admin') navigate('/admin');
    else if (dados.tipo === 'professor') navigate('/professor');
    else if (dados.tipo === 'cozinha') navigate('/cozinha');
    else if (dados.tipo === 'coordenacao') navigate('/coordenacao');
  };

  const processarAcesso = async (e) => {
    if (e) e.preventDefault();

    setErro('');
    setCarregando(true);
    
    try {
      if (etapa === 'login') {
        const [resposta] = await Promise.all([
          fetch('/api/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, senha })
          }),
          new Promise(r => setTimeout(r, 600))
        ]);
        
        const dados = await resposta.json();
        
        if (!resposta.ok) {
          setErro(dados.erro || 'Acesso recusado. Verifique suas credenciais.');
          setCarregando(false);
          return;
        }
        
        if (dados.exigeSetup2FA) {
          setQrCodeData(dados.qrCode);
          setUsuarioId(dados.usuarioId);
          setPreAuthToken(dados.preAuthToken || '');
          setEtapa('2fa_setup');
          setCarregando(false);
          return;
        }
        
        if (dados.exige2FA) {
          setUsuarioId(dados.usuarioId);
          setPreAuthToken(dados.preAuthToken || '');
          setEtapa('2fa_input');
          setCarregando(false);
          return;
        }
        
        finalizarLogin(dados);
      } 
      
      else if (etapa === '2fa_input') {
        const [resposta] = await Promise.all([
          fetch('/api/login/validar-2fa', {
            method: 'POST',
            credentials: 'include',
            headers: { 
              'Content-Type': 'application/json',
              ...(preAuthToken ? { 'Authorization': `Bearer ${preAuthToken}` } : {})
            },
            body: JSON.stringify({ usuarioId, token: totpCode, preAuthToken })
          }),
          new Promise(r => setTimeout(r, 800))
        ]);
        
        const dados = await resposta.json();
        
        if (!resposta.ok) {
          setErro(dados.erro || 'Código inválido ou expirado.');
          setTotpCode('');
          setCarregando(false);
          return;
        }
        
        finalizarLogin(dados);
      }
      
    } catch (err) {
      setErro('Falha de conexão com o servidor central.');
      setCarregando(false);
    }
  };

  const confirmarSetup2FA = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const [res] = await Promise.all([
        fetch('/api/login/ativar-2fa', {
          method: 'POST',
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json',
            ...(preAuthToken ? { 'Authorization': `Bearer ${preAuthToken}` } : {})
          },
          body: JSON.stringify({ usuarioId, token: totpCode, preAuthToken })
        }),
        new Promise(r => setTimeout(r, 800))
      ]);
      const dados = await res.json();
      
      if (dados.sucesso) {
        setRecoveryCodes(Array.isArray(dados?.recoveryCodes) ? dados.recoveryCodes : []);
        localStorage.setItem('tipo', dados.tipo);
        localStorage.setItem('usuario', dados.usuario);
        if (dados.expiracao) localStorage.setItem('session_exp', dados.expiracao);
        
        setEtapa('recovery_codes');
      } else {
        setErro(dados.erro || 'Código do Autenticador inválido.');
      }
    } catch (err) {
      setErro('Erro de comunicação ao validar código.');
    } finally {
      setCarregando(false);
    }
  };

  const finalizarSetup = () => {
    navigate('/admin');
  };

  return (
    <div className="flex min-h-screen bg-white selection:bg-primaria selection:text-white">
      
      {/* Desktop Banner */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden group border-r border-zinc-200/50">
        <div className="absolute inset-0 bg-[url('/escola.jpeg')] bg-cover bg-center group-hover:scale-105 transition-transform duration-1000 ease-out"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent pointer-events-none"></div>
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none"></div>
        
        <div className="absolute bottom-20 left-20 z-10">
          <h1 className="text-white text-6xl font-black tracking-tighter drop-shadow-2xl uppercase mb-2">Escola SESI</h1>
          <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-primaria to-orange-400 text-3xl font-bold tracking-[0.2em] uppercase mt-2">Caçapava</h2>
        </div>
      </div>
      
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 sm:px-16 md:px-24 xl:px-32 relative bg-white shadow-[-30px_0_80px_-20px_rgba(0,0,0,0.15)] z-20 overflow-hidden">
        
        {/* Efeitos visuais suaves no painel direito */}
        <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-primaria/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-orange-300/5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-md mx-auto relative z-10">
          
          {/* Mobile Banner */}
          <div className="lg:hidden relative w-full h-64 mb-10 overflow-hidden rounded-[2rem] shadow-2xl border border-zinc-100 group">
            <div className="absolute inset-0 bg-[url('/escola.jpeg')] bg-cover bg-center group-hover:scale-105 transition-transform duration-1000 ease-out"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10 pointer-events-none"></div>
            <div className="absolute bottom-6 left-6 z-10">
              <div className="text-white text-4xl font-black tracking-tighter drop-shadow-xl uppercase mb-1">Escola SESI</div>
              <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-primaria to-orange-400 text-lg font-bold tracking-[0.2em] uppercase">Caçapava</h2>
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 to-zinc-600 tracking-tight">Boas-vindas</h2>
          <p className="text-zinc-500 mt-4 mb-10 text-base leading-relaxed font-medium">
            Plataforma oficial do <strong className="text-primaria">SESI Alimenta</strong>. Ferramenta de gestão inteligente para o controle do refeitório, fluxo de chamadas e administração.
          </p>
          {etapa === 'login' && (
            <form onSubmit={processarAcesso} className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-xs font-black text-zinc-700 mb-2 uppercase tracking-widest">Identificação</label>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="w-full px-5 py-4 bg-zinc-50/50 backdrop-blur-sm border border-zinc-200 rounded-2xl text-zinc-900 focus:ring-4 focus:ring-primaria/10 focus:border-primaria focus:bg-white outline-none transition-all duration-300 placeholder-zinc-400 text-lg shadow-sm hover:border-zinc-300"
                  placeholder="Seu usuário"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-black text-zinc-700 mb-2 uppercase tracking-widest">Código de Segurança</label>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-5 py-4 bg-zinc-50/50 backdrop-blur-sm border border-zinc-200 rounded-2xl text-zinc-900 focus:ring-4 focus:ring-primaria/10 focus:border-primaria focus:bg-white outline-none transition-all duration-300 placeholder-zinc-400 text-lg shadow-sm hover:border-zinc-300"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {erro && (
                <div className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-3.5 rounded-2xl flex items-center gap-3 animate-fade-in shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                    <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs font-bold leading-snug">{erro}</span>
                </div>
              )}
              
              <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-4 shadow-sm flex items-center gap-3.5 mt-2 transition-all hover:bg-orange-50/40 hover:border-orange-200 group">
                <div className="w-10 h-10 rounded-xl bg-orange-100/80 text-primaria flex items-center justify-center shrink-0 border border-orange-200/70 shadow-xs group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <p className="text-xs text-zinc-600 font-medium leading-snug">
                  Ao prosseguir, você concorda com os{' '}
                  <Link 
                    to="/termos" 
                    className="text-primaria font-black underline decoration-primaria/40 hover:decoration-primaria underline-offset-4 transition-colors"
                  >
                    Termos de Consentimento
                  </Link>{' '}
                  da plataforma.
                </p>
              </div>

              <div className="pt-2 space-y-4">
                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full bg-gradient-to-r from-primaria to-primaria-hover hover:from-primaria-hover text-white font-black py-4 px-4 rounded-2xl transition-all duration-300 shadow-[0_8px_30px_rgb(192,82,29,0.3)] hover:shadow-[0_8px_30px_rgb(192,82,29,0.5)] hover:-translate-y-0.5 flex justify-center items-center text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none uppercase tracking-wide gap-2 cursor-pointer"
                >
                  {carregando ? <><RingLoader tamanho="w-5 h-5" /> Processando...</> : 'Acessar Sistema'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard-publico')}
                  className="w-full bg-white hover:bg-zinc-50 text-zinc-700 font-black py-4 px-4 rounded-2xl transition-all duration-300 uppercase tracking-widest text-xs border-2 border-zinc-100 hover:border-zinc-200 shadow-sm flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4 text-zinc-500" /> Dashboard Público
                </button>
              </div>
            </form>
          )}

          {etapa === '2fa_input' && (
            <form onSubmit={processarAcesso} className="space-y-6 animate-fade-in">
              <div className="bg-orange-50/80 backdrop-blur-md border border-orange-200 p-6 sm:p-8 rounded-[2rem] shadow-sm relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-400/10 blur-3xl rounded-full"></div>
                <h3 className="font-black text-orange-900 uppercase tracking-widest mb-2 text-sm text-center relative z-10">Autenticação em 2 Passos</h3>
                <p className="text-xs font-bold text-orange-700/70 text-center mb-6 max-w-[260px] mx-auto relative z-10">Abra o Google Authenticator ou Authy e digite os 6 dígitos para continuar.</p>
                
                {erro && (
                  <div className="bg-red-50/80 border border-red-200/60 text-red-700 px-4 py-3.5 rounded-2xl flex items-center justify-center gap-2.5 mt-4 mb-6 animate-fade-in shadow-sm backdrop-blur-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" strokeWidth={2.5} />
                    <span className="text-sm font-semibold tracking-tight">{erro}</span>
                  </div>
                )}
                
                <input
                  type="text"
                  name="totpCode"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength="8"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.trim())}
                  className="w-full px-5 py-5 bg-white border-2 border-orange-200 rounded-2xl text-center text-3xl font-black text-zinc-900 focus:ring-4 focus:ring-primaria/20 focus:border-primaria outline-none transition-all duration-300 tracking-[0.5em] shadow-sm relative z-10"
                  placeholder="000000"
                  required
                  autoFocus
                />
              </div>
              
              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-black py-4 px-4 rounded-2xl transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:-translate-y-0.5 flex justify-center items-center text-lg uppercase tracking-wide disabled:opacity-70 disabled:transform-none gap-2"
              >
                {carregando ? <><RingLoader tamanho="w-5 h-5" /> Processando...</> : 'Validar Acesso'}
              </button>
              
              <button type="button" onClick={() => { setEtapa('login'); setTotpCode(''); }} className="w-full text-center text-xs font-black text-zinc-400 hover:text-zinc-700 transition-colors uppercase tracking-widest mt-4 py-2">
                Voltar
              </button>
            </form>
          )}

          {etapa === '2fa_setup' && (
            <form onSubmit={confirmarSetup2FA} className="space-y-6 animate-fade-in">
              <div className="bg-zinc-50/80 backdrop-blur-sm border border-zinc-200 p-8 rounded-[2rem] text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-400/10 blur-2xl rounded-full"></div>
                <h3 className="font-black text-zinc-900 uppercase tracking-widest mb-3 text-sm relative z-10">Configuração de Segurança</h3>
                <p className="text-xs font-bold text-zinc-500 mb-8 leading-relaxed relative z-10">Contas administrativas exigem Autenticação de 2 Fatores. Escaneie o QR Code abaixo com seu aplicativo (Google Authenticator, Authy, etc).</p>
                
                {erro && (
                  <div className="bg-red-50/80 border border-red-200/60 text-red-700 px-4 py-3.5 rounded-2xl flex items-center gap-2.5 mt-4 animate-fade-in shadow-sm backdrop-blur-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" strokeWidth={2.5} />
                    <span className="text-sm font-semibold tracking-tight">{erro}</span>
                  </div>
                )}
                
                {qrCodeData && (
                  <div className="bg-white p-4 rounded-3xl shadow-md border border-zinc-100 inline-block mb-8 relative z-10 animate-fade-in">
                    <img src={qrCodeData} alt="QR Code 2FA" className="w-48 h-48 rounded-xl" />
                  </div>
                )}
                
                <div className="relative z-10">
                  <input
                    type="text"
                    name="totpSetupCode"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength="6"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-5 py-5 bg-white border-2 border-zinc-200 rounded-2xl text-center text-3xl font-black text-zinc-900 focus:ring-4 focus:ring-primaria/20 focus:border-primaria outline-none transition-all tracking-[0.5em] shadow-sm"
                    placeholder="000000"
                    required
                  />
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-3">Digite o código gerado no app para confirmar</p>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={carregando || totpCode.length !== 6}
                className="w-full bg-gradient-to-r from-primaria to-primaria-hover hover:from-primaria-hover text-white font-black uppercase tracking-widest py-4 px-4 rounded-2xl transition-all duration-300 shadow-[0_8px_30px_rgb(192,82,29,0.3)] hover:shadow-[0_8px_30px_rgb(192,82,29,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none flex justify-center items-center gap-2"
              >
                {carregando ? <><RingLoader tamanho="w-5 h-5" /> Processando...</> : 'Vincular Dispositivo'}
              </button>
            </form>
          )}

          {etapa === 'recovery_codes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-red-50/80 backdrop-blur-md border border-red-200 p-8 rounded-[2rem] text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/10 blur-2xl rounded-full"></div>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative z-10"><AlertTriangle className="w-8 h-8" /></div>
                <h3 className="font-black text-red-900 uppercase tracking-widest mb-3 text-sm relative z-10">Guarde Estes Códigos</h3>
                <p className="text-xs font-bold text-red-700/80 mb-8 leading-relaxed relative z-10">Se você perder o celular, estes códigos de backup são a única forma de acessar sua conta Admin. Cada código só pode ser usado uma vez.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                  {(Array.isArray(recoveryCodes) ? recoveryCodes : []).map((code, index) => (
                    <div key={index} className="bg-white border-2 border-red-100 text-red-900 font-mono font-black text-lg py-3 rounded-xl tracking-widest select-all hover:border-red-300 transition-colors cursor-copy shadow-sm">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={finalizarSetup}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest py-5 px-4 rounded-2xl transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:-translate-y-0.5"
              >
                Eu anotei os códigos
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Login;