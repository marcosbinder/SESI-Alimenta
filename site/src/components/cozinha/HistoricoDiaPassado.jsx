import { useMemo, memo } from 'react';
import { Hourglass, Brain, Ban, Users, Leaf, Trash2, ChevronDown, ListChecks, MessageSquare, Utensils, Activity } from 'lucide-react';

const HistoricoDiaPassado = ({ 
  dadosDiaPassado, 
  diaSelecionado, 
  mesAtual, 
  nomesMeses, 
  mapNomesTurnos, 
  turmas,
  historicoDietas
}) => {
  // ========== LOOKUPS CENTRAIS O(1) ==========

  const mapTurmas = useMemo(() => {
    const mapa = {};
    if (turmas && Array.isArray(turmas)) {
      turmas.forEach(t => {
        mapa[t.id] = `${t.ano === 0 ? '' : t.ano + 'º '}${t.identificador}`;
      });
    }
    return mapa;
  }, [turmas]);

  // historicoDietas vem de /api/alunos-especiais/todos
  // Schema real: { id, nome, restricao, salaFormatada, senaiFormatado, personalizaFormatado }
  const mapAlunos = useMemo(() => {
    const mapa = {};
    if (historicoDietas && Array.isArray(historicoDietas)) {
      historicoDietas.forEach(h => {
        mapa[h.id] = {
          nome: h.nome || 'Aluno Desconhecido',
          restricao: h.restricao || 'Dieta Especial',
          turma: h.salaFormatada || 'S/N'
        };
      });
    }
    return mapa;
  }, [historicoDietas]);

  // ========== COMPUTAÇÕES GRANULARES ==========

  // 1. Presenças por Sala (presenca_geral: { turma_id, quantidade, tipo_refeicao })
  const presencasDetalhadas = useMemo(() => {
    if (!dadosDiaPassado?.presencas || (dadosDiaPassado.presencas || []).length === 0) return { total: 0, porTurma: [], porTurno: {} };
    
    let total = 0;
    const porTurmaMap = {};
    const porTurno = {};

    (dadosDiaPassado.presencas || []).forEach(p => {
      const qtd = Number(p?.quantidade) || 0;
      total += qtd;
      
      // Agrupar por turma (somar todos os turnos)
      const nomeTurma = mapTurmas?.[p?.turma_id] || `ID ${p?.turma_id}`;
      if (p?.turma_id != null) {
        if (!porTurmaMap[p.turma_id]) porTurmaMap[p.turma_id] = { nome: nomeTurma, qtd: 0 };
        porTurmaMap[p.turma_id].qtd += qtd;
      }

      // Agrupar por turno
      const turno = mapNomesTurnos?.[p?.tipo_refeicao] || p?.tipo_refeicao;
      if (turno) {
        if (!porTurno[turno]) porTurno[turno] = 0;
        porTurno[turno] += qtd;
      }
    });

    const porTurma = Object.values(porTurmaMap).sort((a, b) => (Number(b?.qtd) || 0) - (Number(a?.qtd) || 0));
    return { total, porTurma, porTurno };
  }, [dadosDiaPassado?.presencas, mapTurmas, mapNomesTurnos]);

  const dietasDetalhadas = useMemo(() => {
    if (!dadosDiaPassado?.dietas || (dadosDiaPassado.dietas || []).length === 0) return [];
    
    const agrupadas = {};
    (dadosDiaPassado.dietas || []).forEach(d => {
      const alunoId = d?.aluno_id;
      if (alunoId == null) return;
      const info = mapAlunos?.[alunoId];
      if (!agrupadas[alunoId]) {
         agrupadas[alunoId] = {
           id: d?.id || alunoId,
           nome: info ? info.nome : `Aluno #${alunoId}`,
           turma: info ? info.turma : 'S/N',
           restricao: info ? info.restricao : 'Não Especificada',
           turnos: []
         };
      }
      const nomeTurno = mapNomesTurnos?.[d?.tipo_refeicao] || d?.tipo_refeicao;
      if (nomeTurno && nomeTurno !== 'Geral') agrupadas[alunoId].turnos.push(nomeTurno);
    });

    return Object.values(agrupadas).map(a => ({
       ...a,
       turno: (a.turnos || []).length > 0 ? a.turnos.join(', ') : 'Geral'
    })).sort((a, b) => String(a?.turma || '').localeCompare(String(b?.turma || '')));
  }, [dadosDiaPassado?.dietas, mapAlunos, mapNomesTurnos]);

  // 3. Avaliações Granulares (avaliacoes_comida: { turma_id, tipo_refeicao, gostaram, nao_gostaram, observacao })
  const avaliacoesDetalhadas = useMemo(() => {
    if (!dadosDiaPassado?.avaliacoes || (dadosDiaPassado.avaliacoes || []).length === 0) return { taxa: 0, total: 0, porTurma: [], comentarios: [] };
    
    let totalGostaram = 0;
    let totalNaoGostaram = 0;
    const porTurma = [];
    const comentarios = [];

    (dadosDiaPassado.avaliacoes || []).forEach(a => {
      const g = Number(a?.gostaram) || 0;
      const ng = Number(a?.nao_gostaram) || 0;
      totalGostaram += g;
      totalNaoGostaram += ng;

      const totalLocal = g + ng;
      const taxaLocal = totalLocal > 0 ? Number(((g / totalLocal) * 100).toFixed(0)) : 0;
      
      porTurma.push({
        turma: mapTurmas?.[a?.turma_id] || `ID ${a?.turma_id}`,
        turno: mapNomesTurnos?.[a?.tipo_refeicao] || a?.tipo_refeicao,
        gostaram: g,
        naoGostaram: ng,
        taxa: taxaLocal
      });

      if (a?.observacao && typeof a.observacao === 'string' && a.observacao.trim()) {
        comentarios.push({
          turma: mapTurmas?.[a?.turma_id] || `ID ${a?.turma_id}`,
          turno: mapNomesTurnos?.[a?.tipo_refeicao] || a?.tipo_refeicao,
          texto: a.observacao.trim()
        });
      }
    });

    const totalVotos = totalGostaram + totalNaoGostaram;
    const taxa = totalVotos > 0 ? Number(((totalGostaram / totalVotos) * 100).toFixed(1)) : 0;

    return { taxa, total: totalVotos, porTurma: porTurma.sort((a,b) => a.taxa - b.taxa), comentarios };
  }, [dadosDiaPassado?.avaliacoes, mapTurmas, mapNomesTurnos]);

  // 4. Turmas Suspensas
  const turmasSuspensas = useMemo(() => {
    if (!dadosDiaPassado?.turmas_ignoradas || (dadosDiaPassado.turmas_ignoradas || []).length === 0) return [];
    return (dadosDiaPassado.turmas_ignoradas || []).map(id => mapTurmas?.[id] || `ID ${id}`);
  }, [dadosDiaPassado?.turmas_ignoradas, mapTurmas]);

  // 5. Cardápio Granular (calendario: { turma_id, tipo_refeicao, lanche_padrao, lanche_dieta, prato_principal, etc. })
  const cardapioGranular = useMemo(() => {
     if (!dadosDiaPassado?.cardapio || (dadosDiaPassado.cardapio || []).length === 0) return [];
     
     const agrupado = (dadosDiaPassado.cardapio || []).reduce((acc, c) => {
       const pratoNome = c?.prato_principal || c?.lanche_padrao || 'Não Informado';
       const key = `${c?.tipo_refeicao}__${pratoNome}`;
       if (!acc[key]) {
         acc[key] = { 
           turno: c?.tipo_refeicao, 
           prato: pratoNome,
           pratoDieta: c?.prato_principal_dieta || c?.lanche_dieta || null,
           arroz: c?.arroz || null,
           feijao: c?.feijao || null,
           guarnicao: c?.guarnicao || null,
           opcao_vegetal: c?.opcao_vegetal || null,
           molho_salada: c?.molho_salada || null,
           sobremesa: c?.sobremesa || null,
           fruta: c?.fruta || null,
           bebida: c?.bebida || null,
           turmas: [] 
         };
       }
       const nomeTurma = mapTurmas?.[c?.turma_id] || `ID ${c?.turma_id}`;
       acc[key].turmas.push(nomeTurma);
       return acc;
     }, {});

     return Object.values(agrupado).map(item => ({
       ...item,
       turmas: (item.turmas || []).sort()
     }));
  }, [dadosDiaPassado?.cardapio, mapTurmas]);

  // ========== RENDER ==========

  if (!dadosDiaPassado) return null;

  return (
    <div className="bg-zinc-900 text-white rounded-3xl p-8 shadow-2xl animate-fade-in relative overflow-hidden h-full">
       <div className="absolute top-[-20px] right-[-20px] p-6 opacity-[0.03] select-none pointer-events-none">
         <Hourglass className="w-48 h-48"/>
       </div>
       
       {/* Header */}
       <div className="flex justify-between items-center border-b border-zinc-800 pb-5 mb-6 relative z-10">
         <div>
           <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
             Auditoria Diária
             <span className="bg-zinc-800 text-zinc-400 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-black border border-zinc-700">Ultra Específico</span>
           </h3>
           <p className="text-zinc-500 text-xs mt-1">Relatório granular: salas, alunos, lanches e avaliações.</p>
         </div>
          <span className="bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-xl text-xs font-black tracking-widest text-zinc-300 shadow-sm">{diaSelecionado} DE {nomesMeses?.[mesAtual]?.toUpperCase() ?? ''}</span>
       </div>
       
       <div className="space-y-5 relative z-10 overflow-y-auto max-h-[600px] pr-2 pb-8" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
          
          {/* KPIs Macro */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-zinc-800/80 backdrop-blur-sm p-5 rounded-2xl border border-zinc-700/50 shadow-inner flex flex-col justify-center relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-10"><Users className="w-20 h-20 text-primaria"/></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 relative z-10">Presenças Auditadas</h4>
                <div className="text-4xl font-black text-primaria relative z-10">{presencasDetalhadas.total}</div>
                <div className="flex flex-wrap gap-1.5 mt-2 relative z-10">
                  {Object.entries(presencasDetalhadas.porTurno).map(([turno, qtd]) => (
                    <span key={turno} className="text-[9px] bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-zinc-400 font-bold">{turno}: {qtd}</span>
                  ))}
                </div>
             </div>
             <div className="bg-zinc-800/80 backdrop-blur-sm p-5 rounded-2xl border border-zinc-700/50 shadow-inner flex flex-col justify-center relative overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-10"><Leaf className="w-20 h-20 text-blue-400"/></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 relative z-10">Dietas Servidas</h4>
                <div className="text-4xl font-black text-blue-400 relative z-10">{dietasDetalhadas.length}</div>
             </div>
          </div>

          {/* Turmas Suspensas */}
          {turmasSuspensas.length > 0 && (
             <div className="bg-red-950/20 p-4 rounded-2xl border border-red-900/30">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2 flex items-center gap-2">
                 <Ban className="w-4 h-4"/> Turmas com Lote Suspenso
               </h4>
               <div className="flex flex-wrap gap-2">
                 {turmasSuspensas.map((nome, i) => (
                   <span key={i} className="text-xs font-bold bg-red-900/40 border border-red-800 text-red-300 px-2.5 py-1 rounded-lg">{nome}</span>
                 ))}
               </div>
             </div>
          )}

           {/* SEÇÃO 1: Presenças por Sala */}
           <details className="group bg-zinc-800/40 rounded-2xl border border-zinc-700/50 overflow-hidden">
             <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-zinc-800/60 transition-colors">
               <div className="flex items-center gap-3">
                 <ListChecks className="w-5 h-5 text-primaria"/>
                 <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Presenças por Sala ({presencasDetalhadas.porTurma.length} turmas)</h4>
               </div>
               <ChevronDown className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" />
             </summary>
             <div className="px-4 pb-4 pt-2 border-t border-zinc-700/50">
               {presencasDetalhadas.porTurma.length === 0 ? <p className="text-sm text-zinc-500">Nenhum dado.</p> : (
                 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                   {presencasDetalhadas.porTurma.map((p, i) => (
                     <div key={i} className="bg-zinc-900/60 border border-zinc-700 p-2.5 rounded-xl flex justify-between items-center">
                       <span className="font-bold text-zinc-300 text-xs">{p.nome}</span>
                       <span className="text-primaria font-black bg-primaria/10 px-2 py-0.5 rounded-lg text-xs">{p.qtd}</span>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </details>

            {/* SEÇÃO 2: Cardápio Granular */}
            <details className="group bg-zinc-800/40 rounded-2xl border border-zinc-700/50 overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-zinc-800/60 transition-colors">
                <div className="flex items-center gap-3">
                  <Utensils className="w-5 h-5 text-orange-400" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Rastreabilidade do Cardápio ({cardapioGranular.length} itens)</h4>
                </div>
                <ChevronDown className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-700/50 space-y-3">
                {cardapioGranular.length === 0 ? <p className="text-sm text-zinc-500">Sem registros.</p> : (
                  cardapioGranular.map((c, i) => (
                    <div key={i} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                      <div className="flex justify-between items-start mb-2 pb-2 border-b border-zinc-800">
                        <div>
                          <span className="text-[9px] font-black uppercase text-primaria tracking-widest block mb-0.5">{mapNomesTurnos?.[c?.turno] || c?.turno}</span>
                          <span className="font-black text-zinc-100">{c?.prato}</span>
                          {(c?.arroz || c?.feijao || c?.guarnicao || c?.opcao_vegetal || c?.molho_salada || c?.sobremesa || c?.fruta || c?.bebida) && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {c.arroz && (
                                <span title={`Arroz: ${c.arroz}`} className="text-[10px] bg-zinc-800 text-amber-300 border border-zinc-700/80 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0"></span>
                                  {c.arroz}
                                </span>
                              )}
                              {c.feijao && (
                                <span title={`Feijão: ${c.feijao}`} className="text-[10px] bg-zinc-800 text-stone-300 border border-zinc-700/80 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-stone-400 shrink-0"></span>
                                  {c.feijao}
                                </span>
                              )}
                              {c.guarnicao && (
                                <span title={`Guarnição: ${c.guarnicao}`} className="text-[10px] bg-zinc-800 text-orange-300 border border-zinc-700/80 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-orange-400 shrink-0"></span>
                                  {c.guarnicao}
                                </span>
                              )}
                              {c.opcao_vegetal && (
                                <span title={`Salada: ${c.opcao_vegetal}`} className="text-[10px] bg-zinc-800 text-emerald-300 border border-zinc-700/80 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0"></span>
                                  {c.opcao_vegetal}
                                </span>
                              )}
                              {c.molho_salada && (
                                <span title={`Molho: ${c.molho_salada}`} className="text-[10px] bg-zinc-800 text-lime-300 border border-zinc-700/80 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-lime-400 shrink-0"></span>
                                  {c.molho_salada}
                                </span>
                              )}
                              {c.sobremesa && (
                                <span title={`Sobremesa: ${c.sobremesa}`} className="text-[10px] bg-zinc-800 text-purple-300 border border-zinc-700/80 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0"></span>
                                  {c.sobremesa}
                                </span>
                              )}
                              {c.fruta && (
                                <span title={`Fruta: ${c.fruta}`} className="text-[10px] bg-zinc-800 text-yellow-300 border border-zinc-700/80 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-yellow-400 shrink-0"></span>
                                  {c.fruta}
                                </span>
                              )}
                              {c.bebida && (
                                <span title={`Bebida: ${c.bebida}`} className="text-[10px] bg-zinc-800 text-sky-300 border border-zinc-700/80 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-sky-400 shrink-0"></span>
                                  {c.bebida}
                                </span>
                              )}
                            </div>
                          )}
                          {c?.pratoDieta && <span className="block text-[10px] text-blue-400 mt-1">Opção Dieta: {c.pratoDieta}</span>}
                        </div>
                        <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg text-[10px] font-bold">{(c?.turmas || []).length} Sala(s)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(c?.turmas || []).map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </details>

            {/* SEÇÃO 3: Dietas Nominais */}
            <details className="group bg-zinc-800/40 rounded-2xl border border-zinc-700/50 overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-zinc-800/60 transition-colors">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Auditoria de Dietas ({dietasDetalhadas.length} alunos)</h4>
                </div>
                <ChevronDown className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-700/50 overflow-x-auto">
                {dietasDetalhadas.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma dieta servida.</p> : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-700">
                        <th className="pb-2 pt-1 font-black">Sala</th>
                        <th className="pb-2 pt-1 font-black px-3">Aluno</th>
                        <th className="pb-2 pt-1 font-black px-3 text-center">Turno</th>
                        <th className="pb-2 pt-1 font-black text-right">Restrição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {dietasDetalhadas.map((d, i) => (
                        <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-2.5 font-bold text-zinc-400 text-xs">{d?.turma}</td>
                          <td className="py-2.5 font-medium text-zinc-200 text-xs px-3">{d?.nome}</td>
                          <td className="py-2.5 font-bold text-zinc-500 text-[10px] uppercase text-center px-3">{d?.turno}</td>
                          <td className="py-2.5 text-right">
                            <span className="bg-blue-900/30 text-blue-400 border border-blue-800/50 px-2 py-0.5 rounded text-[10px] font-bold">{d?.restricao}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </details>

            {/* SEÇÃO 4: Desperdício + NPS lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 p-5 rounded-2xl border border-zinc-700/50">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2"><Trash2 className="w-4 h-4"/> Desperdício</h4>
                {(!dadosDiaPassado?.lixo || (dadosDiaPassado.lixo || []).length === 0) ? <p className="text-xs font-bold text-zinc-500 italic">Pesagem não realizada.</p> : (
                  <div className="space-y-2">
                    {(dadosDiaPassado?.lixo || []).map((l, i) => (
                      <div key={i} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 flex flex-col gap-2">
                        <span className="text-zinc-300 font-black text-[10px] uppercase tracking-wider">{mapNomesTurnos?.[l?.tipo_refeicao] || l?.tipo_refeicao}</span>
                        <div className="flex gap-2">
                         <div className="bg-orange-950/30 border border-orange-900/50 px-2 py-1 rounded-lg flex items-center gap-1.5">
                           <span className="text-[9px] uppercase font-black text-orange-600">Cuba</span>
                           <strong className="text-orange-400 text-xs">{l?.lixo_limpo_kg}kg</strong>
                         </div>
                         <div className="bg-red-950/30 border border-red-900/50 px-2 py-1 rounded-lg flex items-center gap-1.5">
                           <span className="text-[9px] uppercase font-black text-red-600">Prato</span>
                           <strong className="text-red-400 text-xs">{l?.lixo_sujo_kg}kg</strong>
                         </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-zinc-800/50 p-5 rounded-2xl border border-zinc-700/50">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2"><Brain className="w-4 h-4"/> NPS de Refeição</h4>
                 {avaliacoesDetalhadas.total === 0 ? <p className="text-xs font-bold text-zinc-500 italic">Sem avaliações.</p> : (
                    <div className="space-y-3">
                      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Aprovação Geral</p>
                        <p className="text-3xl font-black text-white">{avaliacoesDetalhadas.taxa}%</p>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div className={`h-1.5 rounded-full ${Number(avaliacoesDetalhadas.taxa) >= 70 ? 'bg-green-500' : Number(avaliacoesDetalhadas.taxa) >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${avaliacoesDetalhadas.taxa}%` }}></div>
                        </div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-2 font-bold">{avaliacoesDetalhadas.total} votos</p>
                      </div>
                    </div>
                 )}
              </div>
           </div>

           {/* SEÇÃO 5: Avaliações por Turma (Accordion) */}
           {avaliacoesDetalhadas.porTurma.length > 0 && (
            <details className="group bg-zinc-800/40 rounded-2xl border border-zinc-700/50 overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-zinc-800/60 transition-colors">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-purple-400"/>
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">NPS por Sala ({avaliacoesDetalhadas.porTurma.length} registros)</h4>
                </div>
                <ChevronDown className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-700/50 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-700">
                      <th className="pb-2 pt-1 font-black">Sala</th>
                      <th className="pb-2 pt-1 font-black px-3">Turno</th>
                      <th className="pb-2 pt-1 font-black text-center">Gostaram</th>
                      <th className="pb-2 pt-1 font-black text-center">Rejeitaram</th>
                      <th className="pb-2 pt-1 font-black text-right">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {avaliacoesDetalhadas.porTurma.map((a, i) => (
                      <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2 font-bold text-zinc-300 text-xs">{a.turma}</td>
                        <td className="py-2 text-zinc-400 text-xs px-3">{a.turno}</td>
                        <td className="py-2 text-green-400 font-bold text-xs text-center">{a.gostaram}</td>
                        <td className="py-2 text-red-400 font-bold text-xs text-center">{a.naoGostaram}</td>
                        <td className="py-2 text-right">
                          <span className={`text-xs font-black px-2 py-0.5 rounded ${Number(a.taxa) >= 70 ? 'bg-green-900/30 text-green-400' : Number(a.taxa) >= 40 ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'}`}>{a.taxa}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* SEÇÃO 6: Comentários dos Alunos */}
          {avaliacoesDetalhadas.comentarios.length > 0 && (
            <details className="group bg-zinc-800/40 rounded-2xl border border-zinc-700/50 overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-zinc-800/60 transition-colors">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-yellow-400"/>
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Observações dos Professores ({avaliacoesDetalhadas.comentarios.length})</h4>
                </div>
                <ChevronDown className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-700/50 space-y-2">
                {avaliacoesDetalhadas.comentarios.map((c, i) => (
                  <div key={i} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 flex gap-3">
                    <div className="flex-shrink-0 flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase text-primaria tracking-wider bg-primaria/10 px-2 py-0.5 rounded">{c.turno}</span>
                      <span className="text-[9px] font-bold text-zinc-500">{c.turma}</span>
                    </div>
                    <p className="text-zinc-300 text-xs italic leading-relaxed">"{c.texto}"</p>
                  </div>
                ))}
              </div>
            </details>
          )}

       </div>
    </div>
  );
};

export default memo(HistoricoDiaPassado);
