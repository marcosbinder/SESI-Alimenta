import React from 'react';
import { InfoTooltip } from './SharedUI';

const ParametrosTab = React.memo(({
  parametros,
  setParametros,
  mostrarToast,
  setIsProcessando,
  api,
  carregarHistoricos
}) => {
  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm h-fit animate-fade-in">
      <h2 className="text-2xl font-black text-zinc-800 mb-2">Parâmetros Operacionais</h2>
      <p className="text-zinc-500 font-medium text-sm mb-8 border-b border-zinc-100 pb-4">Ajuste as réguas de alerta para o sistema de Business Intelligence e PDF Contábil.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        
        {/** Resto Per Capita **/}
        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
             <div>
               <div className="mb-5">
                 <label className="block text-xs font-black uppercase text-zinc-600 tracking-widest flex items-center">
                  Resto Per Capita <InfoTooltip texto="Atenção / Crítico em gramas por aluno." />
                 </label>
                 <p className="text-[9px] font-bold text-zinc-400 mt-1.5 uppercase tracking-wider leading-relaxed">
                   Limite de comida descartada no prato por aluno alimentado.
                 </p>
               </div>
               <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Atenção (g)</span>
                   <input type="number" min="0" value={parametros?.resto_per_capita_atencao_g ?? ''} onChange={e => { const v = e.target.value; setParametros(prev => ({...prev, resto_per_capita_atencao_g: v === '' ? '' : Number(v)})); }} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-800 outline-none focus:border-primaria shadow-inner" />
                 </div>
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Crítico (g)</span>
                   <input type="number" min="0" value={parametros?.resto_per_capita_critico_g ?? ''} onChange={e => { const v = e.target.value; setParametros(prev => ({...prev, resto_per_capita_critico_g: v === '' ? '' : Number(v)})); }} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-800 outline-none focus:border-primaria shadow-inner" />
                 </div>
               </div>
             </div>
             <div className="w-full h-3 rounded-full bg-zinc-200 overflow-hidden shadow-inner">
               {(() => {
                 const at = parametros?.resto_per_capita_atencao_g ?? '';
                 const cr = parametros?.resto_per_capita_critico_g ?? '';
                 
                 if (at === '' || cr === '' || isNaN(Number(at)) || isNaN(Number(cr)) || Number(at) >= Number(cr) || Number(at) <= 0) {
                    return <div className="h-full w-full bg-red-500 opacity-40 animate-pulse" title="Configuração Inválida" />;
                 }
                 
                 const green = (Number(at) / Number(cr)) * 75;
                 const yellow = 75 - green;
                 
                 return (
                   <div className="flex h-full w-full">
                     <div style={{ width: `${green}%` }} className="bg-green-500" />
                     <div style={{ width: `${yellow}%` }} className="bg-yellow-400" />
                     <div style={{ width: `25%` }} className="bg-red-500" />
                   </div>
                 );
               })()}
             </div>
        </div>

        {/** Sobra Limpa **/}
        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
             <div>
               <div className="mb-5">
                 <label className="block text-xs font-black uppercase text-zinc-600 tracking-widest flex items-center">
                  Sobra Limpa <InfoTooltip texto="Atenção / Crítico em kg para sobra limpa (cuba)." />
                 </label>
                 <p className="text-[9px] font-bold text-zinc-400 mt-1.5 uppercase tracking-wider leading-relaxed">
                   Tolerância de alimento não servido excedente nas panelas.
                 </p>
               </div>
               <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Atenção (kg)</span>
                   <input type="number" min="0" value={parametros?.sobra_limpa_atencao_kg ?? ''} onChange={e => { const v = e.target.value; setParametros(prev => ({...prev, sobra_limpa_atencao_kg: v === '' ? '' : Number(v)})); }} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-800 outline-none focus:border-primaria shadow-inner" />
                 </div>
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Crítico (kg)</span>
                   <input type="number" min="0" value={parametros?.sobra_limpa_critico_kg ?? ''} onChange={e => { const v = e.target.value; setParametros(prev => ({...prev, sobra_limpa_critico_kg: v === '' ? '' : Number(v)})); }} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-800 outline-none focus:border-primaria shadow-inner" />
                 </div>
               </div>
             </div>
             <div className="w-full h-3 rounded-full bg-zinc-200 overflow-hidden shadow-inner">
               {(() => {
                 const at = parametros?.sobra_limpa_atencao_kg ?? '';
                 const cr = parametros?.sobra_limpa_critico_kg ?? '';
                 
                 if (at === '' || cr === '' || isNaN(Number(at)) || isNaN(Number(cr)) || Number(at) >= Number(cr) || Number(at) <= 0) {
                    return <div className="h-full w-full bg-red-500 opacity-40 animate-pulse" title="Configuração Inválida" />;
                 }
                 
                 const green = (Number(at) / Number(cr)) * 75;
                 const yellow = 75 - green;
                 
                 return (
                   <div className="flex h-full w-full">
                     <div style={{ width: `${green}%` }} className="bg-green-500" />
                     <div style={{ width: `${yellow}%` }} className="bg-yellow-400" />
                     <div style={{ width: `25%` }} className="bg-red-500" />
                   </div>
                 );
               })()}
             </div>
        </div>

        {/** Taxa de Rejeição **/}
        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
             <div>
               <div className="mb-5">
                 <label className="block text-xs font-black uppercase text-zinc-600 tracking-widest flex items-center">
                  Taxa Máxima de Rejeição <InfoTooltip texto="Percentual de rejeição que aciona aviso na escalação." />
                 </label>
                 <p className="text-[9px] font-bold text-zinc-400 mt-1.5 uppercase tracking-wider leading-relaxed">
                   Teto aceitável de alunos insatisfeitos antes do sistema alertar.
                 </p>
               </div>
               <div className="mb-6">
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Limite (%)</span>
                   <input type="number" min="0" max="100" value={parametros?.taxa_rejeicao_alerta_percentual ?? ''} onChange={e => { const v = e.target.value; setParametros(prev => ({...prev, taxa_rejeicao_alerta_percentual: v === '' ? '' : Number(v)})); }} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm font-black text-zinc-800 outline-none focus:border-primaria shadow-inner" />
                 </div>
               </div>
             </div>
             <div className="w-full h-3 rounded-full bg-zinc-200 overflow-hidden shadow-inner">
               {(() => {
                 const p = parametros?.taxa_rejeicao_alerta_percentual ?? '';
                 
                 if (p === '' || isNaN(Number(p)) || Number(p) <= 0 || Number(p) > 100) {
                    return <div className="h-full w-full bg-red-500 opacity-40 animate-pulse" title="Configuração Inválida" />;
                 }
                 
                 const red = Number(p);
                 const green = 100 - red;
                 
                 return (
                   <div className="flex h-full w-full">
                     <div style={{ width: `${green}%` }} className="bg-green-500" />
                     <div style={{ width: `${red}%` }} className="bg-red-500" />
                   </div>
                 );
               })()}
             </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button onClick={async () => {
          const p = parametros || {};
          
          if (p.resto_per_capita_atencao_g === '' || p.resto_per_capita_critico_g === '' || p.sobra_limpa_atencao_kg === '' || p.sobra_limpa_critico_kg === '' || p.taxa_rejeicao_alerta_percentual === '' || p.resto_per_capita_atencao_g == null || p.resto_per_capita_critico_g == null || p.sobra_limpa_atencao_kg == null || p.sobra_limpa_critico_kg == null || p.taxa_rejeicao_alerta_percentual == null) {
             mostrarToast('Preencha todos os campos vazios antes de salvar.', 'erro');
             return;
          }
          
          if (Number(p.resto_per_capita_atencao_g) >= Number(p.resto_per_capita_critico_g)) {
             mostrarToast('O Resto Per Capita de Atenção deve ser menor que o Crítico.', 'erro');
             return;
          }

          if (Number(p.sobra_limpa_atencao_kg) >= Number(p.sobra_limpa_critico_kg)) {
             mostrarToast('A Sobra Limpa de Atenção deve ser menor que a Crítica.', 'erro');
             return;
          }
          
          if (Number(p.taxa_rejeicao_alerta_percentual) <= 0 || Number(p.taxa_rejeicao_alerta_percentual) > 100) {
             mostrarToast('A taxa de rejeição deve estar entre 1 e 100.', 'erro');
             return;
          }

          setIsProcessando(true);
          try {
            const payload = {
              resto_per_capita_atencao_g: Number(p.resto_per_capita_atencao_g),
              resto_per_capita_critico_g: Number(p.resto_per_capita_critico_g),
              sobra_limpa_atencao_kg: Number(p.sobra_limpa_atencao_kg),
              sobra_limpa_critico_kg: Number(p.sobra_limpa_critico_kg),
              taxa_rejeicao_alerta_percentual: Number(p.taxa_rejeicao_alerta_percentual)
            };
            const res = await api('/api/parametros', { method: 'PUT', body: JSON.stringify(payload) });
            if (res?.sucesso) mostrarToast('Parâmetros salvos.'); else mostrarToast(res?.erro || 'Erro ao salvar parâmetros', 'erro');
          } catch { mostrarToast('Erro de rede ao salvar parâmetros', 'erro'); }
          setIsProcessando(false);
        }} className="bg-primaria text-white font-black px-6 py-3.5 rounded-xl shadow-md uppercase text-xs tracking-widest hover:bg-orange-600 transition-colors">
          Salvar Todos
        </button>
        <button onClick={() => carregarHistoricos && carregarHistoricos()} className="bg-zinc-100 text-zinc-600 font-bold px-6 py-3.5 rounded-xl border border-zinc-200 uppercase text-xs tracking-widest hover:bg-zinc-200 transition-colors">
          Recarregar
        </button>
      </div>
    </div>
  );
});

export default ParametrosTab;
