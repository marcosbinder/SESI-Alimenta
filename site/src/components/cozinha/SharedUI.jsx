import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export const LoadingIcon = () => (
  <svg className="animate-spin h-5 w-5 text-current inline-block mr-2" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export const InfoTooltip = ({ texto }) => (
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

export function CustomDropdown({ valor, aoMudar, placeholder, opcoes }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fechar = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) setAberto(false); 
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  const opcoesUnicas = [...new Set(opcoes || [])];
  const filtrados = opcoesUnicas.filter(o => String(o || '').toLowerCase().includes(String(valor || '').toLowerCase()));

  return (
    <div className="relative w-full" ref={ref}>
      <input 
        type="text" 
        value={valor || ''} 
        onFocus={() => setAberto(true)} 
        onChange={e => { aoMudar(e.target.value); setAberto(true); }} 
        onKeyDown={e => { if (e.key === 'Enter') setAberto(false); }}
        placeholder={placeholder} 
        className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-primaria shadow-sm" 
      />
      {aberto && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {filtrados.length > 0 ? filtrados.map((op, i) => (
            <li 
              key={i} 
              onClick={() => { aoMudar(op); setAberto(false); }} 
              className="px-4 py-3 hover:bg-zinc-50 cursor-pointer text-sm font-bold text-zinc-700 border-b border-zinc-100 last:border-0"
            >
              {op}
            </li>
          )) : (
            <li className="px-4 py-3 text-sm italic text-zinc-400">
              Pressione Enter para salvar: "{valor}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function MultiTagInput({ tags = [], aoMudar, placeholder = "Digite e pressione Enter ou selecione...", opcoes = [] }) {
  const [textoInput, setTextoInput] = useState('');
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fechar = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) setAberto(false); 
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  const adicionarTag = (novaTag) => {
    const limpa = String(novaTag || '').trim();
    if (!limpa) return;
    if (!tags.includes(limpa)) {
      aoMudar([...tags, limpa]);
    }
    setTextoInput('');
    setAberto(false);
  };

  const removerTag = (tagRemover) => {
    aoMudar(tags.filter(t => t !== tagRemover));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      adicionarTag(textoInput);
    } else if (e.key === 'Backspace' && !textoInput && tags.length > 0) {
      removerTag(tags[tags.length - 1]);
    }
  };

  const opcoesDisponiveis = [...new Set([...opcoes, ...restricoesComuns])].filter(
    op => op && !tags.includes(op) && String(op).toLowerCase().includes(textoInput.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={ref}>
      <div className="w-full bg-white border border-zinc-300 rounded-xl p-2 min-h-[48px] flex flex-wrap items-center gap-1.5 focus-within:border-primaria shadow-sm transition-all">
        {tags.map((tag, idx) => (
          <span 
            key={idx} 
            className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black px-2.5 py-1 rounded-lg shadow-sm animate-fade-in"
          >
            {tag}
            <button 
              type="button" 
              onClick={() => removerTag(tag)} 
              className="text-blue-500 hover:text-red-600 font-bold ml-1 transition-colors flex items-center"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input 
          type="text" 
          value={textoInput} 
          onFocus={() => setAberto(true)} 
          onChange={e => { setTextoInput(e.target.value); setAberto(true); }} 
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : "Adicionar outra..."} 
          className="flex-1 min-w-[140px] bg-transparent text-sm font-bold text-zinc-800 outline-none px-2 py-1 placeholder:text-zinc-400"
        />
      </div>

      {aberto && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {textoInput.trim() && !opcoesDisponiveis.some(o => o.toLowerCase() === textoInput.trim().toLowerCase()) && (
            <li 
              onClick={() => adicionarTag(textoInput)} 
              className="px-4 py-2.5 bg-blue-50/60 hover:bg-blue-100/80 cursor-pointer text-xs font-bold text-blue-700 border-b border-zinc-100 flex items-center justify-between"
            >
              <span>Criar nova condição: <strong>"{textoInput.trim()}"</strong></span>
              <span className="text-[10px] uppercase font-black bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">Enter</span>
            </li>
          )}
          {opcoesDisponiveis.length > 0 ? (
            opcoesDisponiveis.map((op, i) => (
              <li 
                key={i} 
                onClick={() => adicionarTag(op)} 
                className="px-4 py-2.5 hover:bg-zinc-50 cursor-pointer text-xs font-bold text-zinc-700 border-b border-zinc-100 last:border-0 flex items-center justify-between"
              >
                <span>{op}</span>
                <span className="text-[10px] text-zinc-400 font-medium">+ Adicionar</span>
              </li>
            ))
          ) : !textoInput.trim() ? (
            <li className="px-4 py-3 text-xs italic text-zinc-400 text-center">
              Todas as condições comuns já foram adicionadas. Digite para criar uma nova.
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

export const mapNomesTurnos = { 'LM': 'Lanche da Manhã', 'A': 'Almoço', 'LT': 'Lanche da Tarde' };
export const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const diasDaSemanaLetras = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const restricoesComuns = ["APLV (Sem Leite)", "Intolerante à Lactose", "Doença Celíaca (Sem Glúten)", "Diabetes (Sem Açúcar)", "Vegetariano", "Vegano"];
export const agrupamentoTurmas = ['Fund I', 'Fund II', 'EM', 'Técnico', 'Personaliza'];
