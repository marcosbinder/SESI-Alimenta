import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Activity, Sunrise, Sun, UtensilsCrossed, Pause, Play, ChefHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { getServerTime } from './utils/time';
import { useRealtime } from './hooks/useRealtime';

const Relogio = () => {
  const [tempo, setTempo] = useState(getServerTime());
  
  useEffect(() => {
    const id = setInterval(() => setTempo(getServerTime()), 1000);
    return () => clearInterval(id);
  }, []);
  
  return (
    <div className="text-right hidden sm:block">
      <p className="text-3xl lg:text-4xl font-black tabular-nums tracking-tighter text-white drop-shadow-md">
        {tempo.toLocaleTimeString('pt-BR')}
      </p>
      <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] mt-1">
        {tempo.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </div>
  );
};

export default function PublicDashboard() {
  const [dados, setDados] = useState(null);
  const [erroRede, setErroRede] = useState(false);
  const [vistaAtual, setVistaAtual] = useState(0);
  const [modoDinamico, setModoDinamico] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Dashboard Público | SESI Alimenta";
  }, []);

  const buscarDados = useCallback(async () => {
    try {
      const r = await fetch('/api/publico/dashboard');
      if (!r.ok) throw new Error('Falha HTTP');

      const res = await r.json();
      setDados(res.sucesso ? res : null);
      setErroRede(false);
    } catch (e) {
      console.error("Falha ao buscar dados no backend:", e);
      setErroRede(true);
    }
  }, []);

  useEffect(() => {
    buscarDados();
    const intervalData = setInterval(buscarDados, 60000);
    return () => clearInterval(intervalData);
  }, [buscarDados]);

  // Sincronização instantânea via WebSocket para o Totem
  useRealtime(['presenca_atualizada', 'cozinha_atualizada', 'cardapio_atualizado'], () => {
    buscarDados();
  });

  useEffect(() => {
    if (!modoDinamico) return;
    const ciclo = setInterval(() => {
       setVistaAtual((prev) => (prev >= 2 ? 0 : prev + 1));
    }, 12000);
    
    return () => clearInterval(ciclo);
  }, [modoDinamico]);

  if (!dados && !erroRede) return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-6">
      <div className="w-16 h-16 border-4 border-primaria/30 border-t-primaria rounded-full animate-spin"></div>
      <p className="font-black tracking-[0.3em] uppercase text-xs text-zinc-400 animate-pulse">Sincronizando Terminal...</p>
    </div>
  );

  const menuSeguro = dados?.cardapio_hoje || { LM: [], A: [], LT: [] };
  const rankingSeguro = Array.isArray(dados?.ranking_top) ? dados.ranking_top : [];
  const sustentabilidadeSegura = Array.isArray(dados?.sustentabilidade) ? dados.sustentabilidade : [];
  
  const configTotem = dados?.parametros_totem || {};
  const atencaoG = Number(configTotem?.atencao ?? 25);
  const criticoG = Number(configTotem?.critico ?? 45);

  const dadosGrafico = sustentabilidadeSegura.map(d => {
    const bruto = Number(d?.totalKg) || 0;
    const alunos = Number(d?.alunos) || 0;
    const perCapita = alunos > 0 ? Math.round((bruto * 1000) / alunos) : 0;
    return {
      ...d,
      perCapita: perCapita,
      labelBruto: `${bruto}kg bruto`,
      labelPerCapita: alunos > 0 ? `${perCapita}g/aluno` : ''
    };
  });

  const mapIconeTurno = { LM: <Sunrise className="w-5 h-5"/>, A: <Sun className="w-5 h-5"/>, LT: <UtensilsCrossed className="w-5 h-5"/> };
  const titulosTurno = { LM: 'Lanche da Manhã', A: 'Almoço Principal', LT: 'Lanche da Tarde' };

  const horaLocal = getServerTime().getHours();
  let saudacao = "O Que Temos Para Hoje?";
  let corFundo = "from-zinc-800 via-zinc-950 to-black";
  let luzPrimaria = "bg-primaria/10";
  let luzSecundaria = "bg-blue-500/5";

  if (horaLocal >= 5 && horaLocal < 12) {
    saudacao = "Bom dia! Seja bem-vindo ao Terminal";
    corFundo = "from-primaria/40 to-black";
    luzPrimaria = "bg-primaria/20";
    luzSecundaria = "bg-orange-500/10";
  } else if (horaLocal >= 12 && horaLocal < 18) {
    saudacao = "Boa tarde! Confira o panorama de hoje";
    corFundo = "from-primaria/40 to-black";
    luzPrimaria = "bg-primaria/20";
    luzSecundaria = "bg-orange-500/10";
  } else {
    saudacao = "Boa noite! Painel em repouso";
    corFundo = "from-primaria/30 to-black";
    luzPrimaria = "bg-primaria/20";
    luzSecundaria = "bg-orange-500/10";
  }

  return (
    <div className={`h-screen w-screen bg-black bg-gradient-to-b ${corFundo} flex flex-col overflow-hidden select-none font-sans relative transition-colors duration-1000`}>
      
      {/* Luzes de Fundo Geométricas */}
      <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full ${luzPrimaria} blur-[120px] pointer-events-none transition-colors duration-1000`}></div>
      <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full ${luzSecundaria} blur-[120px] pointer-events-none transition-colors duration-1000`}></div>

      <style>{`
        @keyframes barraCarregamento {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(150%) skewX(-15deg); }
        }
      `}</style>

      {/* HEADER DE COMANDO */}
      <header className="bg-zinc-950/40 backdrop-blur-2xl text-white p-6 md:px-12 flex justify-between items-center z-50 border-b border-white/5 absolute w-full top-0 h-[100px] lg:h-[110px]">
        <div className="flex items-center gap-6">
          <img src="/logo_limpa.png" alt="SESI" className="h-10 lg:h-12 drop-shadow-lg" />
          <div className="hidden md:block w-px h-10 bg-white/10"></div>
          <div>
             <h1 className="text-xl lg:text-2xl font-black tracking-tight uppercase text-zinc-100 drop-shadow-md">Dashboard Público</h1>
             <p className="text-zinc-400 font-black text-[10px] tracking-[0.25em] uppercase flex items-center gap-2 mt-0.5">
                Unidade Caçapava
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-1 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
             </p>
          </div>
        </div>
        <div className="flex items-center gap-6 lg:gap-10">
          <button 
             onClick={() => setModoDinamico(!modoDinamico)} 
             className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border backdrop-blur-md flex items-center gap-2 ${modoDinamico ? 'bg-white/10 text-white border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10'}`}>
             {modoDinamico ? <><Pause className="w-3 h-3 text-orange-400" /> Rotação Ativa</> : <><Play className="w-3 h-3 text-zinc-400" /> Rotação Pausada</>}
          </button>
          <Relogio />
          <button onClick={() => navigate('/login')} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black px-6 py-3.5 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-xl">
            Acesso Restrito
          </button>
        </div>
      </header>

      {erroRede && (
        <div className="bg-red-500/90 backdrop-blur-md border-b border-red-400 text-white p-2.5 text-center font-black uppercase tracking-widest text-[10px] animate-pulse absolute w-full top-[100px] lg:top-[110px] z-[60] shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Conexão Perdida. Operando com dados em cache.
        </div>
      )}

      {/* ÁREA DE RENDERIZAÇÃO ESTÁTICA */}
      <div className="flex-1 w-full h-[calc(100vh-110px)] mt-[100px] lg:mt-[110px] pb-6 relative z-10">
        
        {/* TELA 0: CARDÁPIO */}
        <div className={`absolute inset-0 px-6 lg:px-12 flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out ${vistaAtual === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
           <div className="w-full max-w-[1700px] flex flex-col my-auto">
              <h2 className="text-3xl lg:text-5xl font-black text-white uppercase tracking-tight mb-8 lg:mb-12 flex items-center justify-center gap-4 text-center drop-shadow-2xl flex-shrink-0 transition-all duration-1000">
                {saudacao}
              </h2>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
               {['LM', 'A', 'LT'].map((turno) => {
                 const pratosDoTurno = menuSeguro[turno];
                 const vazio = !pratosDoTurno || pratosDoTurno.length === 0;

                 return (
                   <div key={turno} className="relative flex flex-col p-8 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden bg-white/5 backdrop-blur-xl h-fit min-h-[350px]">
                     <div className="absolute -right-4 -bottom-6 text-[160px] opacity-[0.08] pointer-events-none drop-shadow-2xl">
                       {mapIconeTurno[turno]}
                     </div>
                     <div className="z-10 flex flex-col flex-shrink-0 mb-6">
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-primaria shadow-[0_0_10px_rgba(192,82,29,0.8)]"></div>
                         <span className="text-xs font-black text-zinc-300 uppercase tracking-[0.25em]">{titulosTurno[turno]}</span>
                       </div>
                     </div>
                     
                     <div className="z-10 flex-1 flex flex-col justify-center">
                       {vazio ? (
                         <div className="flex items-center justify-center">
                           <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-zinc-500 text-sm font-black uppercase tracking-widest">
                             Em Definição
                           </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {(Array.isArray(pratosDoTurno) ? pratosDoTurno : []).map((item, idx) => {
                              const pratoNome = item?.prato_principal || item?.lanche_padrao || item?.prato;
                              const temDetalhes = Boolean(
                                item?.arroz || item?.feijao || item?.guarnicao || 
                                item?.opcao_vegetal || item?.molho_salada || item?.sobremesa || 
                                item?.fruta || item?.bebida
                              );
                              const pratoDieta = item?.prato_principal_dieta || item?.lanche_dieta;

                              return (
                                <div key={idx} className="bg-black/30 p-6 rounded-3xl border border-white/5 shadow-inner relative overflow-hidden group">
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-full h-full opacity-50" style={{ animation: `shimmer ${3 + idx}s infinite linear` }}></div>
                                  <div className="relative z-10">
                                    <p className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3 break-words drop-shadow-md">
                                      {pratoNome}
                                    </p>

                                    {temDetalhes && (
                                      <div className="flex flex-wrap gap-2 mb-3">
                                        {item?.arroz && (
                                          <span title={`Arroz: ${item.arroz}`} className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-200 border border-amber-500/25 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-[0_0_6px_rgba(251,191,36,0.8)]"></span>
                                            {item.arroz}
                                          </span>
                                        )}
                                        {item?.feijao && (
                                          <span title={`Feijão: ${item.feijao}`} className="inline-flex items-center gap-1.5 bg-stone-700/30 text-stone-200 border border-stone-600/30 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0"></span>
                                            {item.feijao}
                                          </span>
                                        )}
                                        {item?.guarnicao && (
                                          <span title={`Guarnição: ${item.guarnicao}`} className="inline-flex items-center gap-1.5 bg-orange-500/15 text-orange-200 border border-orange-500/25 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 shadow-[0_0_6px_rgba(251,146,60,0.8)]"></span>
                                            {item.guarnicao}
                                          </span>
                                        )}
                                        {item?.opcao_vegetal && (
                                          <span title={`Salada: ${item.opcao_vegetal}`} className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-200 border border-emerald-500/25 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                                            {item.opcao_vegetal}
                                          </span>
                                        )}
                                        {item?.molho_salada && (
                                          <span title={`Molho: ${item.molho_salada}`} className="inline-flex items-center gap-1.5 bg-lime-500/15 text-lime-200 border border-lime-500/25 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shrink-0"></span>
                                            {item.molho_salada}
                                          </span>
                                        )}
                                        {item?.sobremesa && (
                                          <span title={`Sobremesa: ${item.sobremesa}`} className="inline-flex items-center gap-1.5 bg-purple-500/15 text-purple-200 border border-purple-500/25 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 shadow-[0_0_6px_rgba(192,132,252,0.8)]"></span>
                                            {item.sobremesa}
                                          </span>
                                        )}
                                        {item?.fruta && (
                                          <span title={`Fruta: ${item.fruta}`} className="inline-flex items-center gap-1.5 bg-yellow-500/15 text-yellow-200 border border-yellow-500/25 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0 shadow-[0_0_6px_rgba(250,204,21,0.8)]"></span>
                                            {item.fruta}
                                          </span>
                                        )}
                                        {item?.bebida && (
                                          <span title={`Bebida: ${item.bebida}`} className="inline-flex items-center gap-1.5 bg-sky-500/15 text-sky-200 border border-sky-500/25 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 shadow-[0_0_6px_rgba(56,189,248,0.8)]"></span>
                                            {item.bebida}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {pratoDieta && (
                                      <div className="mb-3">
                                        <span title={`Dieta Adaptada: ${pratoDieta}`} className="inline-flex items-center gap-1.5 bg-blue-500/15 text-blue-200 border border-blue-400/25 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 shadow-[0_0_6px_rgba(96,165,250,0.8)] animate-pulse"></span>
                                          {pratoDieta}
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                      {(Array.isArray(item?.niveis) ? item.niveis : []).map(n => (
                                         <span key={n} className="bg-white/10 text-zinc-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-sm">
                                           {n}
                                         </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
        </div>

        {/* TELA 1: RANKING */}
        <div className={`absolute inset-0 px-6 lg:px-12 flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out ${vistaAtual === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="w-full max-w-[1100px] flex flex-col my-auto">
             <div className="text-center mb-10 flex-shrink-0">
               <h2 className="text-4xl lg:text-6xl font-black text-white uppercase tracking-tight mb-3 drop-shadow-2xl">
                 Ranking de Sabor
               </h2>
               <p className="text-primaria font-black text-[11px] tracking-[0.3em] uppercase">Top 5 pratos mais elogiados no semestre</p>
             </div>

             <div className="w-full flex flex-col justify-center gap-5">
                {rankingSeguro.length === 0 ? (
                   <div className="flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 py-16">
                      <div className="flex justify-center mb-6 opacity-20"><Activity className="w-16 h-16"/></div>
                      <p className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em]">Acumulando Avaliações...</p>
                   </div>
                ) : (
                  (Array.isArray(rankingSeguro) ? rankingSeguro : []).map((prato, i) => (
                    <div key={i} className={`flex items-center gap-6 p-4 lg:p-6 rounded-[2rem] border shadow-2xl transition-all ${i === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30 backdrop-blur-xl' : 'bg-white/5 border-white/10 backdrop-blur-md'}`}>
                       <div className={`w-14 h-14 lg:w-16 lg:h-16 flex-shrink-0 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner ${i === 0 ? 'bg-yellow-500 text-yellow-950 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : i === 1 ? 'bg-zinc-300 text-zinc-900' : i === 2 ? 'bg-orange-400 text-orange-950' : 'bg-white/10 text-zinc-400'}`}>
                          {i+1}º
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className={`font-black text-xl lg:text-3xl truncate uppercase tracking-tighter drop-shadow-md ${i === 0 ? 'text-yellow-400' : 'text-zinc-100'}`}>{prato?.nome}</p>
                          <div className="w-full bg-black/40 rounded-full h-2 mt-3 overflow-hidden border border-white/5">
                             <div className={`h-full rounded-full ${i === 0 ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]' : 'bg-primaria shadow-[0_0_15px_rgba(192,82,29,0.8)]'}`} style={{ width: `${Number(prato?.porcentagem) || 0}%` }}></div>
                          </div>
                       </div>
                       <div className="text-right pl-6">
                          <span className={`text-3xl lg:text-4xl font-black block leading-none tracking-tighter drop-shadow-lg ${i === 0 ? 'text-yellow-500' : 'text-white'}`}>{Number(prato?.porcentagem) || 0}%</span>
                          <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] mt-1 block">Aprovação</span>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        {/* TELA 2: SUSTENTABILIDADE */}
        <div className={`absolute inset-0 px-6 lg:px-12 flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out ${vistaAtual === 2 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="w-full max-w-[1500px] flex flex-col items-center my-auto">
             <div className="text-center mb-8 flex-shrink-0">
               <h2 className="text-4xl lg:text-6xl font-black text-green-400 uppercase tracking-tight mb-3 drop-shadow-[0_0_25px_rgba(74,222,128,0.3)]">
                 Termômetro do Desperdício
               </h2>
               <p className="text-zinc-400 font-bold text-xs lg:text-sm tracking-widest max-w-3xl mx-auto uppercase">
                 Volume de "Resto no Prato". <strong className="text-zinc-100">Coloque no prato apenas o que for comer.</strong>
               </p>
             </div>

             <div className="w-full h-[450px] lg:h-[500px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-6 lg:p-10 shadow-2xl relative">
                {dadosGrafico.length === 0 ? (
                   <div className="h-full flex items-center justify-center">
                     <div className="px-8 py-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-500 font-black uppercase tracking-widest text-sm">
                       Aguardando Auditoria da Balança...
                     </div>
                   </div>
                ) : (
                   <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                     <BarChart data={dadosGrafico} margin={{ top: 40, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="data" tick={{fontSize: 14, fill: '#a1a1aa', fontWeight: '900', fontFamily: 'system-ui, sans-serif'}} axisLine={false} tickLine={false} dy={15} />
                        <YAxis width={45} tick={{fontSize: 14, fill: '#a1a1aa', fontWeight: '900'}} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}g`} />
                        <Bar dataKey="perCapita" radius={[8, 8, 0, 0]}>
                           {dadosGrafico?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.perCapita >= criticoG ? '#ef4444' : entry.perCapita >= atencaoG ? '#f59e0b' : '#22c55e'} />
                           ))}
                           <LabelList dataKey="labelPerCapita" position="top" fill="#a1a1aa" fontSize={14} fontWeight="900" fontFamily="system-ui, sans-serif" offset={10} />
                           <LabelList dataKey="labelBruto" position="insideTop" fill="#ffffff" fontSize={22} fontWeight="900" fontFamily="system-ui, sans-serif" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.5)' }} offset={25} />
                        </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                )}
             </div>
             
             {/* LEGENDA DINÂMICA (PER CAPITA EM GRAMAS) */}
             <div className="flex flex-wrap justify-center gap-6 lg:gap-10 mt-8 bg-white/5 backdrop-blur-md px-10 py-5 rounded-3xl border border-white/10 shadow-xl flex-shrink-0">
               <span className="flex items-center gap-3 text-[10px] lg:text-xs font-black uppercase text-zinc-300 tracking-[0.2em]">
                 <span className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></span> 
                 Aceitável (Até {atencaoG}g)
               </span>
               <span className="flex items-center gap-3 text-[10px] lg:text-xs font-black uppercase text-zinc-300 tracking-[0.2em]">
                 <span className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]"></span> 
                 Atenção (De {atencaoG}g a {criticoG}g)
               </span>
               <span className="flex items-center gap-3 text-[10px] lg:text-xs font-black uppercase text-zinc-300 tracking-[0.2em]">
                 <span className="w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span> 
                 Crítico (+{criticoG}g)
               </span>
             </div>
          </div>
        </div>

      </div>

      {/* BARRA DE PROGRESSO DO CARROSSEL */}
      {modoDinamico && (
        <div className="absolute bottom-0 left-0 w-full h-2 bg-black/50 z-50">
          <div 
            key={vistaAtual} 
            className="h-full bg-primaria shadow-[0_0_15px_rgba(192,82,29,1)]"
            style={{ animation: 'barraCarregamento 12s linear forwards' }}
          />
        </div>
      )}

    </div>
  );
}
