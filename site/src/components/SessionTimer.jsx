import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function SessionTimer() {
  const [tempoRestante, setTempoRestante] = useState(600);
  const navigate = useNavigate();

  const executarLogoutForcado = useCallback(() => {
    localStorage.clear();
    navigate('/login', { state: { erro_sessao: 'Sessão administrativa encerrada por limite de tempo ou inatividade.' }, replace: true });
  }, [navigate]);

  useEffect(() => {
    const sessionExp = localStorage.getItem('session_exp');
    
    if (!sessionExp) {
      executarLogoutForcado();
      return;
    }

    try {
      const tempoExpiracaoAbsoluto = parseInt(sessionExp, 10);
      if (isNaN(tempoExpiracaoAbsoluto)) { executarLogoutForcado(); return; }

      const calcularTempoRestante = () => {
        const timestampAgora = Math.floor(Date.now() / 1000);
        return tempoExpiracaoAbsoluto - timestampAgora;
      };

      const tempoInicial = calcularTempoRestante();
      
      if (tempoInicial <= 0) {
        executarLogoutForcado();
        return;
      }
      
      setTempoRestante(tempoInicial);

      const intervalo = setInterval(() => {
        const restanteAtualizado = calcularTempoRestante();
        
        if (restanteAtualizado <= 1) {
          clearInterval(intervalo);
          executarLogoutForcado();
        } else {
          setTempoRestante(restanteAtualizado);
        }
      }, 1000);

      return () => clearInterval(intervalo);
      
    } catch (e) {
      executarLogoutForcado();
    }
  }, [executarLogoutForcado]);

  const formatarTempo = (segundos) => {
    const s = Math.max(0, Math.floor(Number(segundos) || 0));
    const minutos = Math.floor(s / 60);
    const resto = s % 60;
    return `${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;
  };

  const estiloAlerta = tempoRestante < 120 
    ? "bg-red-600 text-white animate-pulse font-black" 
    : "bg-zinc-900 text-zinc-300 font-bold";

  return (
    <div className={`px-4 py-2 rounded-lg text-xs tracking-wider uppercase flex items-center gap-2 shadow-sm border border-zinc-700/50 ${estiloAlerta}`}>
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block tokens-status"></span>
      Sessão Admin: <span className="font-mono text-sm">{formatarTempo(tempoRestante)}</span>
    </div>
  );
}

export default SessionTimer;