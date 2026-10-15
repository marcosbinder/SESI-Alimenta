import { memo } from 'react';
import { ClipboardList, UtensilsCrossed, Clock, Utensils, AlertTriangle, Package, Lock } from 'lucide-react';
import { getServerTime } from '../../utils/time';

const InfoTooltip = ({ texto }) => (
  <div className="relative flex items-center group cursor-pointer ml-2 inline-block" tabIndex="0">
    <div className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-500 flex items-center justify-center text-[10px] font-black group-hover:bg-primaria group-hover:text-white transition-colors">
      i
    </div>
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-56 bg-zinc-800 text-white text-[11px] p-3 rounded-xl shadow-2xl text-center z-50 pointer-events-none font-medium leading-relaxed">
      {texto}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800"></div>
    </div>
  </div>
);

const LoadingIcon = () => (
  <svg className="animate-spin h-5 w-5 text-current inline-block mr-2" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const mapNomesTurnos = { 'LM': 'Lanche da Manhã', 'A': 'Almoço', 'LT': 'Lanche da Tarde' };
const agrupamentoTurmas = ['Fund I', 'Fund II', 'EM', 'Técnico', 'Personaliza'];

const ProducaoTab = memo(({ 
  abaTurno, setAbaTurno, 
  dadosDashboard, 
  mostrarRaioX, setMostrarRaioX,
  historicoBI, 
  pesosLixo, atualizarInputLixo, salvarLixo, 
  isProcessando 
}) => {
  const turnoAtual = dadosDashboard ? (dadosDashboard[abaTurno] || { confirmados: 0, projecao_extra: 0, salas_pendentes: [], salas_confirmadas: [], dietas_total: 0, lista_dietas: [], extras_total: 0, lista_extras: [] }) : { confirmados: 0, projecao_extra: 0, salas_pendentes: [], salas_confirmadas: [], dietas_total: 0, lista_dietas: [], extras_total: 0, lista_extras: [] };

  return (
    <div className="space-y-6">
      <div className="flex bg-zinc-200 p-1 rounded-xl max-w-md shadow-inner">
        {['LM', 'A', 'LT'].map(t => (
          <button key={t} onClick={() => setAbaTurno(t)} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${abaTurno === t ? 'bg-white text-primaria shadow-sm border border-zinc-100' : 'text-zinc-500 hover:text-zinc-700'}`}>{mapNomesTurnos?.[t] || t}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-green-50 border border-green-300 rounded-2xl p-6 flex flex-col justify-center relative shadow-sm overflow-x-auto">
          <div className="flex justify-between items-start">
             <span className="text-xs font-black text-green-700 uppercase tracking-widest mb-1">{mapNomesTurnos?.[abaTurno] || abaTurno}</span>
             <button onClick={() => setMostrarRaioX(!mostrarRaioX)} className="bg-white border border-green-200 text-green-700 px-3 py-1 text-xs font-black rounded-lg shadow-sm hover:bg-green-100 transition-colors uppercase tracking-wider">
               {mostrarRaioX ? 'Ocultar Detalhes' : 'Ver Raio-X por Sala'}
             </button>
          </div>
          
          <div className="text-7xl font-black text-green-600 tracking-tight flex items-end">
            {turnoAtual?.confirmados ?? 0}
          </div>
          
          <div className="text-sm font-bold text-green-800 mt-1 flex items-center">
            Refeições Padrão <InfoTooltip texto="Fórmula: (Total de Alunos Presentes no Turno) subtraído do (Total de Pacientes com Dieta do Turno). Essa é a contagem real para a panela principal." />
          </div>
          <p className="text-[10px] font-bold text-green-600/80 uppercase tracking-widest mt-1 whitespace-nowrap">
            Presença Física Geral: {(Number(turnoAtual?.confirmados) || 0) + (Number(turnoAtual?.dietas_total) || 0)} | Dietas Retiradas: {turnoAtual?.dietas_total ?? 0}
          </p>

          {mostrarRaioX && (
             <div className="mt-6 pt-4 border-t border-green-200 grid grid-cols-2 sm:grid-cols-3 gap-4 animate-fade-in">
                {(agrupamentoTurmas || []).map(nivel => {
                   const salas = (turnoAtual?.salas_confirmadas || []).filter(s => s?.nivel === nivel);
                   if (salas.length === 0) return null;
                   return (
                      <div key={nivel} className="bg-white p-3 rounded-xl shadow-sm border border-green-100">
                         <h4 className="text-[10px] font-black uppercase text-zinc-400 border-b border-zinc-100 pb-1 mb-2">{nivel}</h4>
                             <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                             {salas.map((s, i) => (
                               <div key={i} className="flex justify-between items-center text-[11px] font-bold text-zinc-700 mb-1 border-b border-zinc-50 pb-1 last:border-0">
                                 <span className="truncate pr-2">{s?.sala}</span>
                                 <div className="flex items-center gap-1 shrink-0">
                                   {Number(s?.quantidade_extra) > 0 && (
                                     <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 text-[9px] uppercase tracking-widest" title="Alunos de Contraturno">
                                       +{s.quantidade_extra} extra
                                     </span>
                                   )}
                                   <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{s?.quantidade}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                      </div>
                   )
                })}
             </div>
          )}
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col justify-center shadow-sm">
          <span className="text-xs font-black text-blue-700 uppercase tracking-widest mb-1">Refeições Especiais</span>
          <div className="text-6xl font-black text-blue-600 tracking-tight">{turnoAtual?.dietas_total || 0}</div>
          <div className="text-sm font-bold text-blue-800 mt-1 flex items-center">
            Preparos Especiais. <InfoTooltip texto="Pacientes que exigem preparo individualizado. Verifique a lista nominal abaixo para os diagnósticos e salas." />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 max-h-[400px]">
        <div className={`p-6 rounded-2xl border shadow-sm flex flex-col ${(turnoAtual?.salas_pendentes || []).length > 0 ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-200'}`}>
          <h3 className="text-xs font-black uppercase tracking-widest mb-4 text-zinc-600 border-b border-zinc-100 pb-3 flex items-center gap-2"><Clock className="w-4 h-4"/> Salas Faltantes ({mapNomesTurnos?.[abaTurno] || abaTurno})</h3>
          {(turnoAtual?.salas_pendentes || []).length > 0 ? (
            <div className="overflow-y-auto flex-1 pr-2">
              <div className="space-y-2">
                <p className="text-xs text-red-700 font-bold mb-3 bg-red-100 p-2 rounded-lg border border-red-200">
                  Aguardando envio pelo tablet do professor.
                </p>
                {(turnoAtual?.salas_pendentes || []).map((s, i) => (
                  <div key={i} className="flex justify-between text-xs border-b border-zinc-200/50 pb-2 mb-2 font-bold text-zinc-800 last:border-0">
                    {s} <span className="text-red-500 uppercase">Pendente</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500">
               <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-3"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>
               <p className="font-bold text-xs uppercase tracking-wider">100% Sincronizado</p>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col h-full max-h-[400px]">
          <h3 className="text-xs font-black uppercase tracking-widest mb-4 text-zinc-600 border-b border-zinc-100 pb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4"/> Lista de Preparo Especial (Nominal)</h3>
          <div className="overflow-y-auto flex-1 pr-2">
            {(turnoAtual?.lista_dietas || []).length === 0 ? (
              <div className="text-zinc-400 font-bold text-xs italic text-center py-20 flex flex-col items-center">
                <Utensils className="w-10 h-10 mb-2 text-zinc-300" /> Nenhum paciente alocado neste turno.
              </div>
            ) : (
              <div className="space-y-2">
                {(turnoAtual?.lista_dietas || []).map((d, i) => (
                  <div key={i} className="flex justify-between items-center bg-zinc-50 hover:bg-zinc-100 transition-colors p-3 rounded-xl border border-zinc-200 text-xs">
                    <div>
                      <strong className="text-zinc-800 text-sm">{d?.nome}</strong>
                      <span className="ml-2 text-zinc-500 font-bold text-[10px] uppercase bg-white px-2 py-0.5 rounded border border-zinc-200">Sala {d?.sala}</span>
                    </div>
                    <span className="bg-blue-100 border border-blue-200 text-blue-800 font-black px-3 py-1 rounded-md uppercase tracking-wider text-[10px] shadow-sm">
                      {d?.restricao || 'Não Informada'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BLOCO ALMOÇO EXTRA */}
      {(turnoAtual?.extras_total || 0) > 0 && (
        <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6 shadow-sm mt-6 animate-slide-in-right overflow-x-auto">
          <div className="flex justify-between items-center mb-4 border-b border-orange-200 pb-3 min-w-max">
            <h3 className="text-sm font-black uppercase tracking-widest text-orange-800 flex items-center gap-2">
              <span className="flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-orange-600"/> Almoço Extra Aprovado</span>
            </h3>
            <span className="bg-orange-600 text-white font-black px-3 py-1 rounded-lg text-xs">
              +{turnoAtual?.extras_total || 0} na Panela
            </span>
          </div>
          
          <div className="space-y-6">
            {(() => {
              const lotes = {};
              const avulsos = [];
              (turnoAtual?.lista_extras || []).forEach(extra => {
                if (extra?.grupo_lote_id) {
                  if (!lotes[extra.grupo_lote_id]) {
                    lotes[extra.grupo_lote_id] = { id: extra.grupo_lote_id, motivo: extra.motivo_lote || extra.motivo, itens: [], normais: 0, dietas: [] };
                  }
                  lotes[extra.grupo_lote_id].itens.push(extra);
                  if (Number(extra?.is_dieta) === 1) {
                    lotes[extra.grupo_lote_id].dietas.push(extra);
                  } else {
                    lotes[extra.grupo_lote_id].normais++;
                  }
                } else {
                  avulsos.push(extra);
                }
              });

              return (
                <>
                  {Object.values(lotes).map(lote => (
                    <div key={`lote-${lote.id}`} className="bg-white border border-orange-300 rounded-xl p-5 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-3 border-b border-orange-100 gap-3">
                        <div>
                          <h4 className="text-lg font-black text-orange-900 flex items-center gap-2"><Package className="w-5 h-5 text-orange-800" /> Evento: {lote.motivo}</h4>
                          <div className="flex gap-3 mt-2 text-xs font-bold">
                            <span className="text-orange-700 bg-orange-100 px-2.5 py-1 rounded-md">Total de Alunos: {(lote.itens || []).length}</span>
                            <span className="text-green-700 bg-green-100 px-2.5 py-1 rounded-md">Normais: {lote.normais}</span>
                            {(lote.dietas || []).length > 0 && <span className="text-red-700 bg-red-100 px-2.5 py-1 rounded-md">Dietas: {lote.dietas.length}</span>}
                          </div>
                        </div>
                      </div>
                      
                      {(lote.dietas || []).length > 0 && (
                        <div className="mb-4 bg-red-50 border border-red-100 rounded-lg p-3">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-red-800 mb-2">Atenção: Dietas neste Lote</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(lote.dietas || []).map((d, i) => (
                              <div key={i} className="text-xs bg-white p-2 rounded border border-red-100 flex flex-col gap-1 shadow-sm">
                                <strong className="text-red-900">{d?.nome} (Sala {d?.sala})</strong>
                                <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded self-start border border-red-100">Sugestão: {d?.dieta_sugerida || 'Verificar'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(lote.itens || []).map((extra, i) => (
                          <div key={i} className={`bg-zinc-50 border ${Number(extra?.is_dieta) === 1 ? 'border-red-200 bg-red-50/30' : 'border-zinc-200'} p-3 rounded-xl flex justify-between items-start`}>
                            <div>
                              <strong className="text-zinc-800 text-sm block">{extra?.nome}</strong>
                              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-1">Data(s): {extra?.datas}</p>
                            </div>
                            <span className="bg-white text-zinc-600 font-black px-2 py-0.5 rounded text-[10px] uppercase border border-zinc-200 ml-2 shadow-sm">
                              Nº {extra?.chamada} | {extra?.sala}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {avulsos.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {avulsos.map((extra, i) => (
                        <div key={`avulso-${i}`} className="bg-white border border-orange-200 p-4 rounded-xl shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <strong className="text-zinc-800 text-sm block">{extra?.nome}</strong>
                              {Number(extra?.is_dieta) === 1 && (
                                <span className="inline-block mt-1 bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">
                                  Dieta Especial {extra?.dieta_sugerida ? `(${extra.dieta_sugerida})` : ''}
                                </span>
                              )}
                            </div>
                            <span className="bg-zinc-100 text-zinc-600 font-black px-2 py-0.5 rounded text-[10px] uppercase border border-zinc-200 ml-2">
                              Nº {extra?.chamada} | {extra?.sala}
                            </span>
                          </div>
                          <p className="text-xs text-orange-700 font-bold mb-1 truncate" title={extra?.motivo}>Motivo: {extra?.motivo}</p>
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-100 px-2 py-1 rounded inline-block">
                            Data(s): {extra?.datas}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm mt-8 border-t-[6px] border-t-zinc-800">
        <h2 className="text-2xl font-black text-zinc-800 mb-2 flex items-center gap-3">
          Auditoria de Sobras ({mapNomesTurnos?.[abaTurno] || abaTurno})
        </h2>
        <p className="text-zinc-500 font-medium text-sm mb-6 border-b border-zinc-100 pb-4">Insira o peso balança de encerramento do turno atual.</p>
        
        {(() => {
          const dHoje = new Date(getServerTime().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
          const horaH = dHoje.getHours();

          const bloqueioAuditoria = 
            (abaTurno === 'LM' && horaH < 8) ? 'Pesagem bloqueada. Aguarde a metade do Lanche da Manhã (08h00).' :
            (abaTurno === 'A' && horaH < 11) ? 'Pesagem bloqueada. Aguarde a metade do Almoço (11h00).' :
            (abaTurno === 'LT' && horaH < 14) ? 'Pesagem bloqueada. Aguarde a metade do Lanche da Tarde (14h00).' : null;

          const dataHojeIso = `${dHoje.getFullYear()}-${String(dHoje.getMonth() + 1).padStart(2, '0')}-${String(dHoje.getDate()).padStart(2, '0')}`;

          const auditoriaJaFeita = (historicoBI || []).find(h => 
            h?.data?.startsWith(dataHojeIso) && 
            h?.turno === abaTurno && 
            (parseFloat(h?.lixo_limpo || 0) > 0 || parseFloat(h?.lixo_sujo || 0) > 0)
          );

          if (bloqueioAuditoria) {
            return (
              <div className="bg-zinc-100 border border-zinc-300 rounded-2xl p-6 text-center shadow-inner">
                <Lock className="w-8 h-8 mx-auto mb-2 text-zinc-400 opacity-60" />
                <p className="text-sm font-black uppercase tracking-widest text-zinc-500">{bloqueioAuditoria}</p>
              </div>
            );
          }

          return (
            <div className="space-y-6 animate-fade-in overflow-x-auto">
              {auditoriaJaFeita && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-4 text-sm font-bold flex flex-col gap-1 shadow-sm">
                  <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> Turno já auditado hoje!</span>
                  <span className="text-yellow-700 text-xs mt-1">Valores atuais no banco: <strong>{auditoriaJaFeita?.lixo_limpo}kg (Sobra)</strong> e <strong>{auditoriaJaFeita?.lixo_sujo}kg (Resto)</strong>. Enviar novamente irá sobrescrever o registro.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-5 min-w-[300px]">
                <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 shadow-sm">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-orange-700 mb-3 flex items-center">
                    Sobra Intacta <InfoTooltip texto="Alimentos não servidos que sobraram na panela ou cuba da cozinha. Considerado Erro de Superprodução." />
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="number" min="0" step="0.1" className="w-full bg-white border border-orange-300 rounded-xl px-4 py-4 text-2xl text-center font-black text-orange-900 outline-none focus:border-orange-500 shadow-inner" placeholder="0.0" value={pesosLixo?.[abaTurno]?.limpo ?? ''} onChange={e => atualizarInputLixo(abaTurno, 'limpo', e.target.value)} />
                    <span className="font-bold text-orange-700">KG</span>
                  </div>
                </div>

                <div className="bg-red-50 p-5 rounded-2xl border border-red-200 shadow-sm">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-red-700 mb-3 flex items-center">
                    Resto Sujo <InfoTooltip texto="Comida rejeitada pelos alunos, descartada após o prato ser montada." />
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="number" min="0" step="0.1" className="w-full bg-white border border-red-300 rounded-xl px-4 py-4 text-2xl text-center font-black text-red-900 outline-none focus:border-red-500 shadow-inner" placeholder="0.0" value={pesosLixo?.[abaTurno]?.sujo ?? ''} onChange={e => atualizarInputLixo(abaTurno, 'sujo', e.target.value)} />
                    <span className="font-bold text-red-700">KG</span>
                  </div>
                </div>
              </div>

              <button onClick={() => salvarLixo(false, abaTurno)} disabled={isProcessando} className="w-full bg-zinc-900 text-white py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-zinc-800 disabled:opacity-70 flex justify-center items-center gap-2 transition-all">
                  {isProcessando ? <LoadingIcon /> : 'Gravar Auditoria na Matriz'}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
});

export default ProducaoTab;
