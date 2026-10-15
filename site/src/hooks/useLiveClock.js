import { useState, useEffect } from 'react';
import { getServerTime } from '../utils/time';

export function useLiveClock(intervalMs = 60000) {
  const [agora, setAgora] = useState(getServerTime());

  useEffect(() => {
    const id = setInterval(() => setAgora(getServerTime()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return agora;
}
