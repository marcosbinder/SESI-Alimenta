import React from 'react';
import { createPortal } from 'react-dom';

export const RingLoader = ({ tamanho = 'w-24 h-24' }) => (
  <div className={`flex items-center justify-center ${tamanho}`}>
    <svg viewBox="0 0 240 240" className="loader w-full h-full">
      <circle strokeLinecap="round" strokeDashoffset="-330" strokeDasharray="0 660" strokeWidth="20" fill="none" r="105" cy="120" cx="120" className="loader-ring loader-ring-a"></circle>
      <circle strokeLinecap="round" strokeDashoffset="-110" strokeDasharray="0 220" strokeWidth="20" fill="none" r="35" cy="120" cx="120" className="loader-ring loader-ring-b"></circle>
      <circle strokeLinecap="round" strokeDasharray="0 440" strokeWidth="20" fill="none" r="70" cy="120" cx="85" className="loader-ring loader-ring-c"></circle>
      <circle strokeLinecap="round" strokeDasharray="0 440" strokeWidth="20" fill="none" r="70" cy="120" cx="155" className="loader-ring loader-ring-d"></circle>
    </svg>
  </div>
);

export const ToastAlert = ({ visivel, tipo, texto }) => {
  if (!visivel) return null;

  const conf = {
    sucesso: {
      bg: 'bg-green-100 border-green-500 text-green-900',
      iconColor: 'text-green-600',
      title: 'Sucesso',
      svg: (
        <path d="M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )
    },
    info: {
      bg: 'bg-blue-100 border-blue-500 text-blue-900',
      iconColor: 'text-blue-600',
      title: 'Info',
      svg: (
        <path d="M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )
    },
    aviso: {
      bg: 'bg-yellow-100 border-yellow-500 text-yellow-900',
      iconColor: 'text-yellow-600',
      title: 'Aviso',
      svg: (
        <path d="M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )
    },
    erro: {
      bg: 'bg-red-100 border-red-500 text-red-900',
      iconColor: 'text-red-600',
      title: 'Erro',
      svg: (
        <path d="M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )
    }
  };

  const c = conf[tipo] || conf.sucesso;

  const conteudoToast = (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999999] px-4 max-w-lg w-full pointer-events-none animate-slide-down">
      <div role="alert" className={`${c.bg} pointer-events-auto border-l-4 p-4 rounded-2xl flex items-center shadow-2xl transition duration-300 ease-in-out border border-black/10 backdrop-blur-sm`}>
        <svg stroke="currentColor" viewBox="0 0 24 24" fill="none" className={`h-6 w-6 flex-shrink-0 mr-3.5 ${c.iconColor}`} xmlns="http://www.w3.org/2000/svg">
          {c.svg}
        </svg>
        <div className="flex-1 pr-2">
          <h4 className="text-sm font-black uppercase tracking-wider">{c.title}</h4>
          <p className="text-xs font-semibold mt-0.5 leading-snug">{typeof texto === 'object' && texto !== null ? (texto.message || JSON.stringify(texto)) : String(texto ?? '')}</p>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(conteudoToast, document.body);
  }

  return conteudoToast;
};

export const GlobalLoader = ({ visivel, texto = "SALVANDO..." }) => {
  if (!visivel) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md animate-fade-in">
       <RingLoader tamanho="w-48 h-48" />
       <h2 className="mt-8 text-3xl font-black text-primaria uppercase tracking-[0.3em] animate-pulse">{texto}</h2>
    </div>
  );
};

