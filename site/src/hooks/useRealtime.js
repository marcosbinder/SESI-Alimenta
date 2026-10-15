import { useEffect, useRef } from 'react';

/**
 * Hook para escutar eventos de WebSocket transmitidos pela aplicação.
 * @param {string|string[]} eventTypes Tipo(s) de evento para escutar (ex: 'presenca_atualizada', 'cozinha_atualizada')
 * @param {Function} callback Função executada quando o evento ocorrer
 */
export function useRealtime(eventTypes, callback) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const eventTypesKey = Array.isArray(eventTypes) ? eventTypes.join(',') : String(eventTypes || '');

  useEffect(() => {
    const tipos = Array.isArray(eventTypes) ? eventTypes : [eventTypes];

    const handler = (event) => {
      const { detail } = event;
      if (detail && tipos.includes(detail.tipo)) {
        if (callbackRef.current) {
          callbackRef.current(detail.payload, detail.tipo);
        }
      }
    };

    window.addEventListener('sesi-ws-event', handler);
    return () => {
      window.removeEventListener('sesi-ws-event', handler);
    };
  }, [eventTypesKey]);
}

export default useRealtime;

