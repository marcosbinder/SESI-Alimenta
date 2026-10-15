import { useDebouncedLoader } from '../../hooks/useAntiFlicker';
import React from 'react';
import { Ban, Hourglass, TrendingUp, Brain } from 'lucide-react';
import { 
  CustomDropdown, 
  InfoTooltip, 
  LoadingIcon, 
  nomesMeses, 
  diasDaSemanaLetras, 
  agrupamentoTurmas, 
  mapNomesTurnos 
} from './SharedUI';
import { getServerTime } from '../../utils/time';
import HistoricoDiaPassado from './HistoricoDiaPassado';

const CalendarioTab = ({
  mesAtual,
  setMesAtual,
  anoAtual,
  feriados,
  diaSelecionado,
  setDiaSelecionado,
  alternarFeriado,
  isProcessando,
  dadosDiaPassado,
  refeicaoCardapio,
  setRefeicaoCardapio,
  setTurmasSelecionadas,
  inputLanchePadrao,
  setLanchePadrao,
  lanchesCadastrados,
  inputLancheDieta,
  setLancheDieta,
  inputBebida,
  setBebida,
  inputFruta,
  setFruta,
  inputArroz,
  setArroz,
  inputFeijao,
  setFeijao,
  inputPratoPrincipal,
  setPratoPrincipal,
  inputOpcaoVegetal,
  setOpcaoVegetal,
  inputGuarnicao,
  setGuarnicao,
  inputMolhoSalada,
  setMolhoSalada,
  inputSobremesa,
  setSobremesa,
  obterOpcoesCatalogo = () => [],
  turmasValidasParaCardapio,
  cardapioDoDiaSelecionado,
  turmasSelecionadas,
  alternarTurmaSelecionada,
  converterNivelVisual,
  salvarItemCalendario,
  turmas,
  historicoDietas
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm h-fit">
        <div className="flex justify-between items-center mb-6">
          <strong className="text-zinc-800 font-black text-lg uppercase tracking-wider">{nomesMeses?.[mesAtual] ?? ''} {anoAtual}</strong>
          <div className="flex gap-2">
            <button onClick={() => setMesAtual(p => p === 0 ? 11 : p - 1)} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center font-bold text-sm transition-colors">&lt;</button>
            <button onClick={() => setMesAtual(p => p === 11 ? 0 : p + 1)} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center font-bold text-sm transition-colors">&gt;</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-black text-[10px] text-zinc-400 mb-3 border-b border-zinc-100 pb-2">
          {diasDaSemanaLetras.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: new Date(anoAtual, mesAtual, 1).getDay() }).map((_, i) => <div key={`empty-${i}`}></div>)}
          {Array.from({ length: new Date(anoAtual, mesAtual + 1, 0).getDate() }).map((_, i) => {
            const dia = i + 1;
            const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const ehFeriado = (feriados || []).includes(dataFormatada);
            const diaSemana = new Date(anoAtual, mesAtual, dia).getDay();
            const ehFimDeSemana = (diaSemana === 0 || diaSemana === 6);
            const dataHojeReal = getServerTime();
            const isHoje = dia === dataHojeReal.getDate() && mesAtual === dataHojeReal.getMonth() && anoAtual === dataHojeReal.getFullYear();
            
            if (ehFimDeSemana) return <div key={dia} className="py-3 text-center text-xs font-black text-zinc-200 bg-zinc-50/50 rounded-lg">X</div>;
            
            return (
              <button 
                key={dia} onClick={() => setDiaSelecionado(dia)}
                className={`py-3 rounded-lg text-xs font-black transition-all relative ${isHoje ? 'ring-2 ring-purple-500 ring-offset-2 scale-105 z-10' : ''} ${ehFeriado ? 'bg-red-100 text-red-600 border border-red-200' : diaSelecionado === dia ? 'bg-primaria text-white shadow-md' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200/50'}`}
              >
                {isHoje && <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-[8px] px-1.5 py-0.5 rounded-full shadow-sm tracking-wider">HOJE</span>}
                {dia}
              </button>
            );
          })}
        </div>
        <div className="mt-8 pt-6 border-t border-zinc-100">
           <button onClick={alternarFeriado} disabled={isProcessando} className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${(feriados || []).includes(`${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`) ? 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'}`}>
             <span className="flex items-center justify-center gap-2">{(feriados || []).includes(`${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}`) ? <><Ban className="w-4 h-4"/> Remover Restrição Letiva</> : 'Marcar Dia Selecionado como Feriado'}</span>
           </button>
        </div>
      </div>

      <div className="lg:col-span-2">
         {dadosDiaPassado ? (
            <HistoricoDiaPassado 
              dadosDiaPassado={dadosDiaPassado}
              diaSelecionado={diaSelecionado}
              mesAtual={mesAtual}
              nomesMeses={nomesMeses}
              mapNomesTurnos={mapNomesTurnos}
              turmas={turmas}
              historicoDietas={historicoDietas}
            />
         ) : (
            <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm flex flex-col h-full">
              <div className="border-b border-zinc-100 pb-4 mb-6">
                <h3 className="text-xl font-black text-zinc-800">Criação de Cardápio</h3>
                <p className="text-zinc-500 text-sm font-medium mt-1">Configuração para o dia <strong className="text-primaria">{diaSelecionado} de {nomesMeses?.[mesAtual] ?? ''}</strong></p>
              </div>
              
              <div className="mb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest">1. Turno da Refeição</label>
                    <select 
                      value={refeicaoCardapio} 
                      onChange={e => {
                        setRefeicaoCardapio(e.target.value); 
                        setTurmasSelecionadas([]);
                      }} 
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm"
                    >
                      <option value="LM">Lanche da Manhã (LM)</option>
                      <option value="A">Almoço (A)</option>
                      <option value="LT">Lanche da Tarde (LT)</option>
                    </select>
                  </div>

                  {refeicaoCardapio === 'A' ? (
                    <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-orange-900 font-bold">
                      <InfoTooltip texto="O cardápio do almoço é composto pela bandeja completa. Norma SESI: almoço não possui bebida." />
                      <span>Estrutura completa de almoço escolar (sem bebida).</span>
                    </div>
                  ) : (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-zinc-600 font-bold">
                      <InfoTooltip texto="Defina o lanche principal e os complementos deste turno." />
                      <span>Lanche escolar com opção de bebida e fruta.</span>
                    </div>
                  )}
                </div>

                {refeicaoCardapio === 'A' ? (
                  /* FORMULÁRIO DO ALMOÇO */
                  <div className="space-y-4 bg-zinc-50/70 p-5 rounded-3xl border border-zinc-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-700 mb-1.5 tracking-widest flex items-center">
                          Prato Principal (Mistura) * <InfoTooltip texto="Proteína ou prato principal da refeição (ex: Frango grelhado, Carne de panela)." />
                        </label>
                        <CustomDropdown 
                          valor={inputPratoPrincipal} 
                          aoMudar={setPratoPrincipal} 
                          placeholder="Mistura principal..." 
                          opcoes={obterOpcoesCatalogo('prato_principal')} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-blue-600 mb-1.5 tracking-widest flex items-center">
                          Mistura Adaptada (Dieta) <InfoTooltip texto="Adaptação para alunos com restrição alimentar." />
                        </label>
                        <CustomDropdown 
                          valor={inputLancheDieta} 
                          aoMudar={setLancheDieta} 
                          placeholder="Mistura adaptada (se houver)..." 
                          opcoes={obterOpcoesCatalogo('prato_principal')} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Tipo do Arroz</label>
                        <CustomDropdown 
                          valor={inputArroz} 
                          aoMudar={setArroz} 
                          placeholder="Ex: Arroz branco, Arroz integral..." 
                          opcoes={obterOpcoesCatalogo('arroz')} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Tipo do Feijão</label>
                        <CustomDropdown 
                          valor={inputFeijao} 
                          aoMudar={setFeijao} 
                          placeholder="Ex: Feijão carioca, Feijão preto..." 
                          opcoes={obterOpcoesCatalogo('feijao')} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Opção Vegetal (Salada)</label>
                        <CustomDropdown 
                          valor={inputOpcaoVegetal} 
                          aoMudar={setOpcaoVegetal} 
                          placeholder="Ex: Salada de alface e tomate, Beterraba..." 
                          opcoes={obterOpcoesCatalogo('opcao_vegetal')} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Molho da Salada</label>
                        <CustomDropdown 
                          valor={inputMolhoSalada} 
                          aoMudar={setMolhoSalada} 
                          placeholder="Ex: Vinagre e azeite, Molho de mostarda..." 
                          opcoes={obterOpcoesCatalogo('molho_salada')} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Guarnição</label>
                        <CustomDropdown 
                          valor={inputGuarnicao} 
                          aoMudar={setGuarnicao} 
                          placeholder="Ex: Purê de batata, Farofa rica..." 
                          opcoes={obterOpcoesCatalogo('guarnicao')} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Sobremesa</label>
                        <CustomDropdown 
                          valor={inputSobremesa} 
                          aoMudar={setSobremesa} 
                          placeholder="Ex: Pudim de leite, Gelatina..." 
                          opcoes={obterOpcoesCatalogo('sobremesa')} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Fruta</label>
                        <CustomDropdown 
                          valor={inputFruta} 
                          aoMudar={setFruta} 
                          placeholder="Ex: Maçã, Banana, Melancia..." 
                          opcoes={obterOpcoesCatalogo('fruta')} 
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* FORMULÁRIO DOS LANCHES (LM / LT) */
                  <div className="space-y-4 bg-zinc-50/70 p-5 rounded-3xl border border-zinc-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-700 mb-1.5 tracking-widest flex items-center">
                          Lanche Principal * <InfoTooltip texto="Alimento principal do lanche (ex: Pão com queijo, Bolo de cenoura, Torta)." />
                        </label>
                        <CustomDropdown 
                          valor={inputLanchePadrao} 
                          aoMudar={setLanchePadrao} 
                          placeholder="Pesquise o lanche..." 
                          opcoes={obterOpcoesCatalogo('lanche').length > 0 ? obterOpcoesCatalogo('lanche') : lanchesCadastrados} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-blue-600 mb-1.5 tracking-widest flex items-center">
                          Lanche Adaptado (Dieta) <InfoTooltip texto="O que os alunos com laudo receberão no lugar do lanche principal." />
                        </label>
                        <CustomDropdown 
                          valor={inputLancheDieta} 
                          aoMudar={setLancheDieta} 
                          placeholder="Prescrição Especial..." 
                          opcoes={obterOpcoesCatalogo('lanche').length > 0 ? obterOpcoesCatalogo('lanche') : lanchesCadastrados} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Bebida do Lanche</label>
                        <CustomDropdown 
                          valor={inputBebida} 
                          aoMudar={setBebida} 
                          placeholder="Ex: Suco de laranja natural, Leite com cacau..." 
                          opcoes={obterOpcoesCatalogo('bebida')} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-zinc-500 mb-1.5 tracking-widest">Fruta do Lanche</label>
                        <CustomDropdown 
                          valor={inputFruta} 
                          aoMudar={setFruta} 
                          placeholder="Ex: Banana prata, Maçã fuji..." 
                          opcoes={obterOpcoesCatalogo('fruta')} 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <label className="block text-xs font-black uppercase text-zinc-500 mb-3 tracking-widest mt-6 border-t pt-4 flex items-center justify-between">
                <span>2. Mapeamento de Turmas Disponíveis (Lote)</span>
                <div className="flex gap-2">
                   <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Pendentes</span>
                   <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Já Lançados</span>
                </div>
              </label>
              
              <div className="space-y-4 mb-8 p-5 border border-zinc-200 rounded-2xl bg-zinc-50 max-h-[400px] overflow-y-auto shadow-inner">
                {(turmasValidasParaCardapio || []).length === 0 ? (
                   <p className="text-sm font-bold text-zinc-400 italic text-center py-6">Nenhuma turma consome <strong>{mapNomesTurnos?.[refeicaoCardapio] || refeicaoCardapio}</strong> neste dia letivo.</p>
                ) : (
                  (agrupamentoTurmas || []).map(nivel => {
                     const turmasDoNivel = (turmasValidasParaCardapio || []).filter(t => converterNivelVisual(t?.nivel) === nivel);
                     if(turmasDoNivel.length === 0) return null;
                     

                     const turmasPendentes = turmasDoNivel.filter(t => {
                         const ignorada = (dadosDiaPassado?.turmas_ignoradas || []).includes(t?.id);
                         if (ignorada) return false;
                         return !(cardapioDoDiaSelecionado || []).find(c => c?.turma_id === t?.id && c?.tipo_refeicao === refeicaoCardapio);
                     });

                     return (
                        <div key={nivel} className="mb-4">
                           <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black uppercase text-zinc-600 tracking-widest">{nivel}</span>
                              <div className="flex gap-2">
                                  <button 
                                    disabled={!(turmasSelecionadas || []).some(id => turmasDoNivel.some(t => t?.id == id))}
                                    onClick={() => {
                                      const ids = (turmasSelecionadas || []).filter(id => turmasDoNivel.some(t => t?.id == id));
                                      if (ids.length > 0) salvarItemCalendario(true);
                                  }} className="text-[10px] font-bold text-orange-700 hover:text-orange-900 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm border border-orange-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Suspender / Reativar
                                  </button>
                                <button onClick={() => {
                                    const ids = turmasPendentes.map(t => t?.id).filter(Boolean);
                                    setTurmasSelecionadas(prev => [...new Set([...(prev || []), ...ids])]);
                                }} className="text-[10px] font-bold text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                  Selecionar {turmasPendentes.length} Pendentes
                                </button>
                                <button onClick={() => {
                                    const ids = turmasDoNivel.map(t => t?.id).filter(Boolean);
                                    setTurmasSelecionadas(prev => [...new Set([...(prev || []), ...ids])]);
                                }} className="text-[10px] font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-200 hover:bg-zinc-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                  Selecionar Todas
                                </button>
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                              {turmasDoNivel.map(t => {

                                 const cardapioTurma = (cardapioDoDiaSelecionado || []).find(c => c?.turma_id === t?.id && c?.tipo_refeicao === refeicaoCardapio);
                                 const jaLancado = !!cardapioTurma;
                                 const selecionado = (turmasSelecionadas || []).includes(t?.id);
                                 const ignorada = (dadosDiaPassado?.turmas_ignoradas || []).includes(t?.id);

                                 return (
                                    <button key={t?.id} onClick={() => alternarTurmaSelecionada(t?.id)} className={`p-3 text-left font-bold rounded-xl border-2 transition-all flex flex-col gap-1 ${
                                       selecionado 
                                       ? 'bg-primaria border-primaria text-white shadow-md scale-105 z-10' 
                                       : ignorada
                                         ? 'bg-zinc-100 border-zinc-300 text-zinc-400 opacity-60'
                                         : jaLancado 
                                           ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100 opacity-80' 
                                           : 'bg-white border-red-300 text-zinc-800 hover:border-red-500 shadow-sm'
                                    }`}>
                                       <div className="flex justify-between w-full items-center">
                                         <span className="text-sm">{t?.ano === 0 ? '' : (t?.ano ? t.ano + 'º ' : '')}{t?.identificador || ''} {ignorada && <span className="text-[9px] bg-zinc-300 text-zinc-600 px-1.5 rounded ml-1">SUSPENSA</span>}</span>
                                         {jaLancado && !selecionado && !ignorada && <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                         {ignorada && !selecionado && <Ban className="w-3.5 h-3.5 text-zinc-400" />}
                                       </div>
                                       
                                       {jaLancado && !selecionado && !ignorada ? (
                                          <span className="text-[9px] font-black uppercase tracking-widest text-green-700 truncate w-full" title={cardapioTurma?.lanche_padrao}>
                                             {cardapioTurma?.lanche_padrao}
                                          </span>
                                       ) : ignorada && !selecionado ? (
                                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                             Não terá aula
                                          </span>
                                       ) : !selecionado ? (
                                          <span className="text-[9px] font-black uppercase tracking-widest text-red-500">
                                             Sem Lançamento
                                          </span>
                                       ) : (
                                          <span className="text-[9px] font-black uppercase tracking-widest text-white/80">
                                             Selecionada
                                          </span>
                                       )}
                                    </button>
                                 )
                              })}
                           </div>
                        </div>
                     );
                  })
                )}
              </div>
              
              <button onClick={() => salvarItemCalendario(false)} disabled={isProcessando} className="w-full bg-zinc-900 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-zinc-800 transition-all disabled:opacity-70 flex justify-center items-center gap-2 mt-auto">
                {isProcessando ? <LoadingIcon /> : `Aplicar Cardápio em ${(turmasSelecionadas || []).length} Turmas`}
              </button>
            </div>
         )}
      </div>
    </div>
  );
};

export default React.memo(CalendarioTab);
