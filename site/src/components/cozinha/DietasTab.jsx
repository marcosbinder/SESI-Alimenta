import { useDebouncedLoader } from '../../hooks/useAntiFlicker';
import React from 'react';
import { 
  InfoTooltip, 
  LoadingIcon, 
  MultiTagInput,
  restricoesComuns,
  agrupamentoTurmas
} from './SharedUI';

const converterNivelVisual = (nivel) => { 
  if (!nivel) return '';
  const n = String(nivel).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (n === 'Fundamental 1') return 'Fund I'; 
  if (n === 'Fundamental 2') return 'Fund II'; 
  if (n === 'Ensino Tecnico (SENAI)') return 'Técnico'; 
  if (n === 'Ensino Medio') return 'EM'; 
  return n; 
};

const renderAno = (ano) => (ano && ano !== 0) ? ano + 'º ' : '';

const DietasTab = ({
  nomeAluno,
  setNomeAluno,
  restricoesSelecionadas,
  setRestricoesSelecionadas,
  todasRestricoes = [],
  salaRegularId,
  setSalaRegularId,
  salaTecnicaId,
  setSalaTecnicaId,
  salaPersonalizaId,
  setSalaPersonalizaId,
  alunoEmEdicaoId,
  iniciarEdicao,
  cancelarEdicao,
  turmas,
  historicoDietas,
  isProcessando,
  salvarAlunoDieta,
  setModalExclusao
}) => {
  const turmaBaseSelecionada = (turmas || []).find(t => t?.id === Number(salaRegularId));
  const anoBase = turmaBaseSelecionada ? turmaBaseSelecionada.ano : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Formulário de Cadastro / Edição */}
      <div className={`bg-white rounded-3xl border ${alunoEmEdicaoId ? 'border-blue-300 ring-2 ring-blue-100 shadow-md' : 'border-zinc-200 shadow-sm'} p-8 h-fit transition-all`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black text-zinc-800">
            {alunoEmEdicaoId ? 'Editar Ficha Clínica' : 'Ficha de Restrição Clínica'}
          </h2>
          {alunoEmEdicaoId && (
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1.5 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Editando Paciente
            </span>
          )}
        </div>

        <div className="text-zinc-500 font-medium text-sm mb-6 border-b pb-4 flex items-center justify-between">
          <span>Gestão privativa da Nutricionista. <InfoTooltip texto="Alunos cadastrados aqui são computados na contagem da panela e inseridos na lista de Linha de Montagem de Dietas." /></span>
          {alunoEmEdicaoId && (
            <button 
              type="button" 
              onClick={cancelarEdicao} 
              className="text-xs text-zinc-400 hover:text-zinc-700 font-bold underline ml-2"
            >
              Cancelar Edição
            </button>
          )}
        </div>
        
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest">Nome Completo do Paciente</label>
            <input 
              type="text" 
              value={nomeAluno || ''} 
              onChange={e => setNomeAluno(e.target.value)} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-primaria shadow-sm transition-all" 
              placeholder="Ex: João da Silva" 
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-zinc-500 mb-2 tracking-widest flex items-center justify-between">
              <span>Condições Clínicas / Restrições (Multi-Tags)</span>
              <span className="text-[10px] text-zinc-400 font-bold normal-case tracking-normal">Pressione Enter ou clique para adicionar</span>
            </label>
            <MultiTagInput 
              tags={restricoesSelecionadas || []} 
              aoMudar={setRestricoesSelecionadas} 
              opcoes={todasRestricoes || []} 
              placeholder="Digite (ex: Diabetes, Sem Lactose) e dê Enter..." 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Sala Base (Obrigatório)</label>
              <select 
                value={salaRegularId || ''} 
                onChange={e => setSalaRegularId(e.target.value)} 
                className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm"
              >
                <option value="">Selecione a base...</option>
                {(turmas || []).filter(t => t?.nivel !== 'Ensino Técnico (SENAI)' && t?.nivel !== 'Personaliza').map(t => (
                  <option key={t?.id} value={t?.id}>{converterNivelVisual(t?.nivel)} {renderAno(t?.ano)}{t?.identificador}</option>
                ))}
              </select>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Oficina SENAI (Opcional)</label>
              <select 
                value={salaTecnicaId || ''} 
                onChange={e => setSalaTecnicaId(e.target.value)} 
                className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm"
              >
                <option value="">Sem vínculo...</option>
                {(turmas || [])
                  .filter(t => t?.nivel === 'Ensino Técnico (SENAI)' && (!anoBase || t?.ano === anoBase))
                  .map(t => (
                    <option key={t?.id} value={t?.id}>{converterNivelVisual(t?.nivel)} {t?.identificador}</option>
                  ))}
              </select>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Personaliza (Opcional)</label>
              <select 
                value={salaPersonalizaId || ''} 
                onChange={e => setSalaPersonalizaId(e.target.value)} 
                className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-primaria shadow-sm"
              >
                <option value="">Sem vínculo...</option>
                {(turmas || [])
                  .filter(t => t?.nivel === 'Personaliza' && (!anoBase || t?.ano === anoBase))
                  .map(t => (
                    <option key={t?.id} value={t?.id}>Pers. {t?.ano}º {t?.identificador}</option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {alunoEmEdicaoId && (
            <button 
              type="button" 
              onClick={cancelarEdicao} 
              disabled={isProcessando} 
              className="w-1/3 bg-zinc-100 text-zinc-700 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-zinc-300 hover:bg-zinc-200 transition-all"
            >
              Cancelar
            </button>
          )}
          <button 
            onClick={salvarAlunoDieta} 
            disabled={isProcessando} 
            className={`flex-1 ${alunoEmEdicaoId ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-white'} py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl disabled:opacity-70 flex justify-center items-center gap-2 transition-all`}
          >
            {isProcessando ? <LoadingIcon /> : alunoEmEdicaoId ? 'Atualizar Ficha Clínica' : 'Salvar Ficha Clínica'}
          </button>
        </div>
      </div>

      {/* Tabela de Pacientes Cadastrados */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm flex flex-col max-h-[720px]">
         <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-600">Pacientes Cadastrados</h3>
            <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
              {(historicoDietas || []).length} cadastrados
            </span>
         </div>

         <div className="overflow-y-auto pr-2 flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-zinc-400">
                  <th className="pb-4 font-black uppercase tracking-widest">Aluno / Condições Clínicas</th>
                  <th className="pb-4 font-black uppercase tracking-widest">Vínculos de Sala</th>
                  <th className="pb-4 font-black uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="font-medium text-zinc-700">
                {(historicoDietas || []).length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-12 text-center text-zinc-400 italic">
                      Nenhuma restrição alimentar ativa no sistema.
                    </td>
                  </tr>
                ) : null}
                {(historicoDietas || []).map(d => {
                  const estaSendoEditado = alunoEmEdicaoId === d?.id;
                  const tagsCondicoes = Array.isArray(d?.restricoes) && d.restricoes.length > 0 
                    ? d.restricoes 
                    : (d?.restricao ? d.restricao.split(' • ') : ['Sem restrição']);

                  return (
                    <tr 
                      key={d?.id} 
                      className={`border-b border-zinc-100 transition-colors ${estaSendoEditado ? 'bg-blue-50/50' : 'hover:bg-zinc-50'}`}
                    >
                      <td className="py-4 pr-2">
                        <div className="font-bold text-zinc-800 text-sm mb-1.5 flex items-center gap-2">
                          {d?.nome || 'N/A'}
                          {estaSendoEditado && (
                            <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded">Em edição</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {tagsCondicoes.map((tag, idx) => (
                            <span 
                              key={idx} 
                              className="text-[10px] bg-blue-50 border border-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded-md shadow-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 text-zinc-500 pr-2">
                        <div className="font-bold text-zinc-700">{d?.salaFormatada || 'N/A'}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {d?.senaiFormatado && (
                            <span className="text-[10px] bg-zinc-200 border border-zinc-300 text-zinc-700 font-bold px-2 py-0.5 rounded">
                              SENAI: {d.senaiFormatado}
                            </span>
                          )}
                          {d?.personalizaFormatado && (
                            <span className="text-[10px] bg-purple-100 border border-purple-200 text-purple-700 font-bold px-2 py-0.5 rounded">
                              {d.personalizaFormatado}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                         <div className="flex items-center justify-end gap-1.5">
                           <button 
                             onClick={() => iniciarEdicao(d)} 
                             disabled={isProcessando} 
                             title="Editar aluno e vínculos"
                             className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white p-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
                           >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                              </svg>
                           </button>
                           <button 
                             onClick={() => setModalExclusao({ visivel: true, id: d?.id })} 
                             disabled={isProcessando} 
                             title="Excluir aluno"
                             className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white p-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
                           >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                           </button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default React.memo(DietasTab);
