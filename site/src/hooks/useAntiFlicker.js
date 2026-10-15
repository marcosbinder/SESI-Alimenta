import { useState, useEffect, useRef } from 'react';

/**
 * useMDT (Minimum Display Time):
 * Garante que skeletons e spinners fiquem visíveis por pelo menos `minDisplayTime` ms.
 * Evita aquele "piscar" incômodo na tela quando a requisição responde rápido demais (ex: 20ms).
 */
export function useMDT(minDisplayTime = 400) {
  const [active, setActive] = useState(false);
  const [uiState, setUiState] = useState(false);
  const startTime = useRef(0);

  useEffect(() => {
    if (active) {
      setUiState(true);
      startTime.current = Date.now();
    } else {
      if (!startTime.current) {
         setUiState(false);
         return;
      }
      const elapsed = Date.now() - startTime.current;
      if (elapsed < minDisplayTime) {
        const t = setTimeout(() => {
          setUiState(false);
          startTime.current = 0;
        }, minDisplayTime - elapsed);
        return () => clearTimeout(t);
      } else {
        setUiState(false);
        startTime.current = 0;
      }
    }
  }, [active, minDisplayTime]);

  return [uiState, setActive, active];
}

/**
 * useDebouncedLoader:
 * Só exibe indicador de carregamento se a operação demorar mais que o `delay` (default 200ms).
 * Se a API responder antes disso, o usuário nem vê o spinner, deixando a UI mais ágil.
 */
export function useDebouncedLoader(delay = 200) {
  const [active, setActive] = useState(false);
  const [uiState, setUiState] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (active) {
      timer.current = setTimeout(() => setUiState(true), delay);
    } else {
      if (timer.current) clearTimeout(timer.current);
      setUiState(false);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, delay]);

  return [uiState, setActive, active];
}
