import { useState } from 'react';
import { api } from '../services/api';
import { Bug, X } from 'lucide-react';

export default function ReportErrorButton() {
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const dispararReporte = async () => {
    if (!mensagem.trim()) return;
    setEnviando(true);
    try {
      const res = await api('/api/publico/reportar-erro', {
        method: 'POST',
        body: JSON.stringify({ mensagem })
      });

      if (res.sucesso) {
        setSucesso(true);
        setMensagem('');
      }
    } catch { 
      setSucesso(false); 
    } finally { 
      setEnviando(false); 
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {aberto && (
        <div className="bg-white border border-red-200 p-5 rounded-2xl shadow-2xl w-80 animate-slide-in-right mb-4">
          <div className="flex justify-between items-center mb-3 border-b border-zinc-100 pb-2">
            <h4 className="text-xs font-black uppercase text-red-600 tracking-widest flex items-center gap-2">
              <Bug className="w-4 h-4" /> Relatar Bug
            </h4>
            <button onClick={() => setAberto(false)} className="text-zinc-400 hover:text-red-500 font-bold flex items-center"><X className="w-4 h-4" /></button>
          </div>
          
          {sucesso ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl text-xs font-bold text-center border border-green-200 relative flex flex-col items-center gap-2">
              <span>Reporte enviado à equipe de TI!</span>
              <button 
                onClick={() => { setSucesso(false); setMensagem(''); setAberto(false); }}
                className="mt-2 bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1.5 rounded-lg flex items-center gap-1 font-black uppercase tracking-widest text-[10px] transition-colors"
              >
                <X className="w-3 h-3" /> Fechar
              </button>
            </div>
          ) : (
            <>
              <textarea 
                value={mensagem} onChange={e => setMensagem(e.target.value)}
                className="w-full bg-red-50/30 border border-red-100 rounded-xl p-3 text-xs font-bold text-zinc-800 h-24 resize-none outline-none focus:border-red-400 mb-3 placeholder-zinc-400"
                placeholder="Descreva o problema encontrado..."
              />
              <button onClick={dispararReporte} disabled={enviando || !mensagem.trim()} className="w-full bg-red-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 transition-colors">
                {enviando ? 'Enviando...' : 'Enviar Relatório'}
              </button>
            </>
          )}
        </div>
      )}

      <button onClick={() => setAberto(!aberto)} className="bg-red-600 text-white px-5 py-3 rounded-full flex items-center justify-center gap-2 font-black shadow-2xl border border-red-800 text-xs hover:bg-red-700 transition-transform hover:scale-105 uppercase tracking-widest">
        <Bug className="w-4 h-4" /> Reportar Erro
      </button>
    </div>
  );
}