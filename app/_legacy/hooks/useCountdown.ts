"use client";
import { useState, useEffect } from 'react';

interface TimeLeft {
  h: number;
  m: number;
  s: number;
  totalMs: number;
}

function getTimeLeft(endsAt: string | number | Date): TimeLeft | null {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s, totalMs: diff };
}

export default function useCountdown(endsAt: string | number | Date | null | undefined): TimeLeft | null {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => endsAt ? getTimeLeft(endsAt) : null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setTimeLeft(getTimeLeft(endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return timeLeft;
}
