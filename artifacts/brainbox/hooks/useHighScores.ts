import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type ScoreEntry = {
  moves: number;
  time: number;
  combo: number;
};

/**
 * High scores keyed by "pack_difficulty" e.g. "alphabet_easy", "food_hard".
 * Tracks best (lowest) move count, fastest time, and highest combo streak.
 */
const SCORES_KEY = '@brainbox_high_scores_v4';

export function useHighScores() {
  const [scores, setScores] = useState<Record<string, ScoreEntry | null>>({});

  useEffect(() => {
    AsyncStorage.getItem(SCORES_KEY)
      .then(data => {
        if (data) setScores(JSON.parse(data));
      })
      .catch(() => {});
  }, []);

  const saveScore = useCallback((key: string, moves: number, time: number, combo: number) => {
    setScores(prev => {
      const best = prev[key] ?? null;
      const isBetterMoves = best === null || moves < best.moves;
      const isBetterTime = best === null || time < best.time;
      const isBetterCombo = best === null || combo > best.combo;
      if (isBetterMoves || isBetterTime || isBetterCombo) {
        const updated: Record<string, ScoreEntry | null> = {
          ...prev,
          [key]: {
            moves: best === null ? moves : Math.min(moves, best.moves),
            time: best === null ? time : Math.min(time, best.time),
            combo: best === null ? combo : Math.max(combo, best.combo),
          },
        };
        AsyncStorage.setItem(SCORES_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      }
      return prev;
    });
  }, []);

  const clearScores = useCallback(() => {
    setScores({});
    AsyncStorage.removeItem(SCORES_KEY).catch(() => {});
  }, []);

  return { scores, saveScore, clearScores };
}
