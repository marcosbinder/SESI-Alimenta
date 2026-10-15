import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Página não encontrada | SESI Alimenta";
  }, []);

  const handleVoltar = () => {
    const papel = localStorage.getItem('tipo');
    if (papel === 'admin') navigate('/admin');
    else if (papel === 'professor') navigate('/professor');
    else if (papel === 'cozinha') navigate('/cozinha');
    else if (papel === 'coordenacao') navigate('/coordenacao');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[url('/escola.jpeg')] bg-cover bg-center bg-fixed relative flex items-center justify-center p-4 sm:p-8 font-sans selection:bg-primaria selection:text-white">
      
      {/* Overlay Escuro com Blur */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"></div>
      
      {/* Efeitos de luz coloridos por cima do overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primaria/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-primaria/20 blur-[100px] rounded-full"></div>
      </div>

      <div className="max-w-md w-full bg-zinc-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] border border-white/10 p-8 md:p-12 text-center animate-fade-in relative overflow-hidden z-10">
        
        {/* Detalhe interno */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_var(--color-primaria)_0%,_transparent_70%)]"></div>

        <div className="relative z-10">
          <div className="mx-auto w-24 h-24 bg-primaria/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-primaria/20 backdrop-blur-sm">
            <Compass className="w-12 h-12 text-primaria" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 mb-2">Erro 404</h1>
          <h2 className="text-lg font-bold text-primaria mb-4">Você saiu da rota</h2>
          
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed font-medium">
            A página que você está procurando não existe ou foi movida. 
            Verifique o endereço digitado ou retorne ao seu painel.
          </p>

          <button 
            onClick={handleVoltar}
            className="w-full flex items-center justify-center gap-2 bg-primaria hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] border border-primaria/50 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para Segurança
          </button>
        </div>
      </div>
    </div>
  );
}
