import React from 'react';
import { Hourglass, TrendingUp, Brain, Ban, Info, ShieldAlert, Star, Users, Leaf, Trash2, Utensils } from 'lucide-react';

const HistoricoDiaPassadoTab = ({ 
  dadosDiaPassado, 
  diaSelecionado, 
  mesAtual, 
  nomesMeses, 
  mapNomesTurnos, 
  turmas 
}) => {
  // 1. Processar Presenças (evitando inflação do SENAI ao pegar o max(turno) por turma)
  const totalPresencas = React.useMemo(() => {
    if (!dadosDiaPassado?.presencas) return 0;
    const porTurma = {};
    (dadosDiaPassado.presencas || []).forEach(p => {
      const qtd = Number(p?.quantidade) || 0;
      if (!p?.turma_id) return;
      if (!porTurma[p.turma_id]) porTurma[p.turma_id] = {};
      porTurma[p.turma_id][p.tipo_refeicao] = (porTurma[p.turma_id][p.tipo_refeicao] || 0) + qtd;
    });
    return Object.values(porTurma).reduce((acc, turma) => acc + Math.max(...Object.values(turma), 0), 0);
  }, [dadosDiaPassado?.presencas]);

  // 2. Processar Dietas (Agrupar por restrição)
  const totalDietasServidas = new Set((dadosDiaPassado?.dietas || []).map(d => d?.aluno_id).filter(Boolean)).size;
  const dietasAgrupadas = (dadosDiaPassado?.dietas || []).reduce((acc, d) => {
    const restricao = d?.restricao || 'Não Informada';
    if (!acc[restricao]) acc[restricao] = 0;
    acc[restricao]++;
    return acc;
  }, {});

  // 3. Processar Avaliações (Inteligência de Rejeição)
  const totalAvaliacoes = (dadosDiaPassado?.avaliacoes || []).length;
  const notaMedia = totalAvaliacoes > 0 
    ? ((dadosDiaPassado?.avaliacoes || []).reduce((acc, a) => acc + (Number(a?.nota) || 0), 0) / totalAvaliacoes).toFixed(1)
    : 'N/A';

  // 4. Processar Turmas Suspensas
  const turmasSuspensas = (dadosDiaPassado?.turmas_ignoradas || []).map(id => {
    const t = (turmas || []).find(turma => turma?.id === id);
    return t ? `${t?.ano === 0 ? '' : (t?.ano ? t.ano + 'º ' : '')}${t?.identificador || ''}` : `ID ${id}`;
  });

  if (!dadosDiaPassado) return null;

  return (
    <div className="bg-zinc-900 text-white rounded-3xl p-8 shadow-2xl animate-fade-in relative overflow-hidden h-full">
       <div className="absolute top-[-20px] right-[-20px] p-6 opacity-[0.03] select-none pointer-events-none">
         <Hourglass className="w-48 h-48"/>
       </div>
       
       <div className="flex justify-between items-center border-b border-zinc-800 pb-5 mb-6 relative z-10">
         <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
           Histórico Escolar 
           <span className="bg-zinc-800 text-zinc-400 text-xs px-3 py-1 rounded-full uppercase tracking-widest font-black border border-zinc-700">Auditado</span>
         </h3>
         <span className="bg-gradient-to-r from-primaria to-blue-500 px-4 py-2 rounded-xl text-xs font-black tracking-widest text-white shadow-lg">{diaSelecionado} DE {nomesMeses?.[mesAtual]?.toUpperCase() ?? ''}</span>
       </div>
       
       <div className="space-y-6 relative z-10 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
          
          {/* Top Metrics */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-zinc-800/80 backdrop-blur-sm p-6 rounded-2xl border border-zinc-700/50 shadow-inner flex flex-col justify-center relative overflow-hidden group hover:border-primaria/50 transition-colors">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:opacity-20 transition-opacity"><Users className="w-24 h-24 text-primaria"/></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 relative z-10">Presença Física (Auditada)</h4>
                <div className="text-5xl font-black text-primaria relative z-10">{totalPresencas}</div>
             </div>
             
             <div className="bg-zinc-800/80 backdrop-blur-sm p-6 rounded-2xl border border-zinc-700/50 shadow-inner flex flex-col justify-center relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:opacity-20 transition-opacity"><Leaf className="w-24 h-24 text-blue-400"/></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 relative z-10">Dietas Servidas</h4>
                <div className="text-5xl font-black text-blue-400 relative z-10">{totalDietasServidas}</div>
                {Object.keys(dietasAgrupadas).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 relative z-10">
                    {Object.entries(dietasAgrupadas).map(([restricao, qtd]) => (
                      <span key={restricao} className="text-[9px] font-bold bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-zinc-300">
                        {restricao}: <span className="text-blue-400">{qtd}</span>
                      </span>
                    ))}
                  </div>
                )}
             </div>
          </div>

          {/* Turmas Suspensas */}
          {turmasSuspensas.length > 0 && (
             <div className="bg-red-950/20 p-5 rounded-2xl border border-red-900/30">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                 <Ban className="w-4 h-4"/> Exceções Letivas: Turmas Suspensas
               </h4>
               <div className="flex flex-wrap gap-2">
                 {turmasSuspensas.map((nome, i) => (
                   <span key={i} className="text-[10px] font-bold bg-red-900/40 border border-red-800 text-red-300 px-2.5 py-1.5 rounded-lg shadow-sm">
                     {nome}
                   </span>
                 ))}
               </div>
             </div>
          )}

           {/* Caderno de Receitas */}
           <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-400" /> Cardápio Operado</h4>
             {(dadosDiaPassado?.cardapio || []).length === 0 ? <p className="text-xs font-bold text-zinc-500 italic">Sem registros no caderno.</p> : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {Object.values((dadosDiaPassado?.cardapio || []).reduce((acc, c) => {
                   const key = `${c?.tipo_refeicao}_${c?.lanche_padrao}`;
                   if (!acc[key]) acc[key] = { turno: c?.tipo_refeicao, prato: c?.lanche_padrao, qtd: 0 };
                   acc[key].qtd++;
                   return acc;
                 }, {})).map((c, i) => (
                   <div key={i} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center shadow-sm">
                     <div>
                       <span className="text-[9px] font-black uppercase text-primaria tracking-widest block mb-1">{mapNomesTurnos?.[c?.turno] || c?.turno}</span>
                       <span className="font-bold text-zinc-200 text-sm">{c?.prato}</span>
                     </div>
                     <span className="bg-zinc-800 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-400">
                       {c?.qtd} Sala(s)
                     </span>
                   </div>
                 ))}
               </div>
             )}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Auditoria de Desperdício */}
             <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2"><Trash2 className="w-4 h-4"/> Desperdício</h4>
               {(dadosDiaPassado?.lixo || []).length === 0 ? <p className="text-xs font-bold text-zinc-500 italic">Pesagem não realizada.</p> : (
                 <div className="grid grid-cols-1 gap-3">
                   {(dadosDiaPassado?.lixo || []).map((l, i) => (
                     <div key={i} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-sm flex flex-col justify-between gap-3">
                       <span className="text-zinc-300 font-black text-[10px] uppercase tracking-wider">{mapNomesTurnos?.[l?.tipo_refeicao] || l?.tipo_refeicao}</span>
                       <div className="flex gap-2">
                        <div className="bg-orange-950/30 border border-orange-900/50 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                          <span className="text-[9px] uppercase font-black text-orange-600">Cuba</span>
                          <strong className="text-orange-400 text-xs">{l?.lixo_limpo_kg}kg</strong>
                        </div>
                        <div className="bg-red-950/30 border border-red-900/50 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                          <span className="text-[9px] uppercase font-black text-red-600">Prato</span>
                          <strong className="text-red-400 text-xs">{l?.lixo_sujo_kg}kg</strong>
                        </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>

             {/* Inteligência de Rejeição */}
             <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2"><Brain className="w-4 h-4"/> NPS de Refeição</h4>
                {totalAvaliacoes === 0 ? <p className="text-xs font-bold text-zinc-500 italic">Sem relatórios de satisfação.</p> : (
                   <div className="space-y-4">
                     <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 text-center flex flex-col items-center justify-center">
                       <div className="flex items-center gap-1 mb-2">
                         {[1,2,3,4,5].map(star => (
                           <Star key={star} className={`w-5 h-5 ${star <= Math.round(Number(notaMedia) || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-700 fill-zinc-800'}`} />
                         ))}
                       </div>
                       <p className="text-3xl font-black text-white">{notaMedia} <span className="text-xs text-zinc-500">/ 5.0</span></p>
                       <p className="text-[9px] uppercase tracking-widest text-zinc-400 mt-2 font-bold">{totalAvaliacoes} avaliações</p>
                     </div>
                     
                     {/* Comentários Recentes */}
                     <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 max-h-[120px] overflow-y-auto custom-scrollbar space-y-3">
                       {(dadosDiaPassado?.avaliacoes || []).slice(0, 5).map((av, i) => (
                         <div key={i} className="text-xs">
                           <span className="text-[9px] uppercase font-black text-primaria mr-2">[{mapNomesTurnos?.[av?.tipo_refeicao] || av?.tipo_refeicao}]</span>
                           <span className="text-zinc-300 italic">"{av?.comentario || 'Sem comentário'}"</span>
                         </div>
                       ))}
                     </div>
                   </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default React.memo(HistoricoDiaPassadoTab);
