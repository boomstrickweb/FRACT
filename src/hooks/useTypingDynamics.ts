import { useRef, useCallback } from 'react';

export interface TypingDynamicsData {
  intervals: number[];
  avgSpeed: number;
  totalChars: number;
  totalTime: number;
}

export function useTypingDynamics() {
  const lastKeystroke = useRef<number>(0);
  const intervals = useRef<number[]>([]);
  const totalChars = useRef(0);
  const startTime = useRef<number>(0);

  const recordKeystroke = useCallback(() => {
    const now = performance.now();

    if (lastKeystroke.current > 0) {
      const interval = now - lastKeystroke.current;
      intervals.current.push(interval);
    } else {
      startTime.current = now;
    }

    lastKeystroke.current = now;
    totalChars.current++;
  }, []);

  const getSnapshot = useCallback((): TypingDynamicsData | null => {
    if (intervals.current.length < 5) return null;

    const allIntervals = intervals.current;
    const sum = allIntervals.reduce((a, b) => a + b, 0);
    const avg = sum / allIntervals.length;
    const totalTime = performance.now() - startTime.current;

    return {
      intervals: allIntervals.slice(-200),
      avgSpeed: Math.round(avg * 100) / 100,
      totalChars: totalChars.current,
      totalTime: Math.round(totalTime),
    };
  }, []);

  const reset = useCallback(() => {
    lastKeystroke.current = 0;
    intervals.current = [];
    totalChars.current = 0;
    startTime.current = 0;
  }, []);

  return { recordKeystroke, getSnapshot, reset };
}
