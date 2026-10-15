import React from 'react';
import { Printer, Download, Bot } from 'lucide-react';
import { InfoTooltip } from './SharedUI';

const RelatoriosTab = React.memo(({
  nomesMeses,
  mesAtual,
  dadosMensais,
  isProcessando,
  exportarCSV,
  exportarGuiaDietas,
  exportarPDF,
  exportarDossieIA
}) => {
  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm animate-fade-in">
      <div className="border-b border-zinc-100 pb-4 mb-8">
       <h2 className="text-2xl font-black text-zinc-800">Relatórios Institucionais (SESI)</h2>
       <p className="text-zinc-500 font-medium text-sm mt-1">Visão consolidada do período para prestação de contas com a Diretoria.</p>
      </div>
   
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-200 shadow-inner">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 border-b border-zinc-200 pb-2">Acumulado do Mês ({nomesMeses?.[mesAtual] ?? ''})</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
              <span className="text-xs font-black uppercase text-zinc-600">Refeições Servidas</span>
              <span className="text-xl font-black text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-200 shadow-sm">{dadosMensais ? (dadosMensais.totalRefeicoes || 0) : 0}</span>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
              <span className="text-xs font-black uppercase text-zinc-600">Dietas Especiais</span>
              <span className="text-xl font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 shadow-sm">{dadosMensais ? (dadosMensais.totalDietas || 0) : 0}</span>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
              <span className="text-xs font-black uppercase text-zinc-600">Sobra Intacta Acumulada</span>
              <span className="text-xl font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200 shadow-sm">{dadosMensais?.lixoSobra != null ? Number(dadosMensais.lixoSobra).toFixed(1) : 0} kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-zinc-600">Resto Sujo Acumulado</span>
              <span className="text-xl font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200 shadow-sm">{dadosMensais?.lixoResto != null ? Number(dadosMensais.lixoResto).toFixed(1) : 0} kg</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-8 shadow-sm">
             <div className="flex items-center gap-4 mb-6">
                <Printer className="w-10 h-10 text-blue-800" />
                <div>
                  <h3 className="text-xl font-black text-blue-900 uppercase tracking-widest">Central de Relatórios</h3>
                  <p className="text-sm text-blue-700 font-bold leading-relaxed">Geração de arquivos para prestação de contas e planejamento logístico.</p>
                </div>
             </div>
             <div className="grid grid-cols-1 gap-4">
                <button onClick={exportarCSV} disabled={isProcessando} className="w-full bg-emerald-100 text-emerald-800 font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-emerald-200 border border-emerald-200 transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Exportar Base de Dados Completa (CSV)
                </button>
                <button onClick={exportarGuiaDietas} disabled={isProcessando} className="w-full bg-indigo-100 text-indigo-700 font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-indigo-200 border border-indigo-200 transition-colors">
                  Folha de Produção
                </button>
                <button onClick={exportarPDF} disabled={isProcessando} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg hover:bg-blue-700 border border-blue-900/10 transition-colors">
                  Relatório de Desempenho Institucional
                </button>
             </div>
          </div>
          <div className="bg-zinc-900 text-white rounded-3xl p-8 shadow-sm border-2 border-purple-500/30 relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.2),_transparent_40%)]"></div>
             <div className="relative z-10">
                <h3 className="text-lg font-black uppercase tracking-widest mb-2 flex items-center gap-2 text-purple-300"><Bot className="w-5 h-5" /> Inteligência Artificial (LLMs)</h3>
                <p className="text-xs text-zinc-400 font-bold mb-4">Gere um dossiê completo de 12 meses para análise preditiva em plataformas de IA.</p>
                <button onClick={exportarDossieIA} disabled={isProcessando} className="w-full bg-purple-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg hover:bg-purple-700 border border-purple-900/10 transition-colors flex items-center justify-center gap-2">
                  Gerar Dossiê IA (PDF)
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RelatoriosTab;
