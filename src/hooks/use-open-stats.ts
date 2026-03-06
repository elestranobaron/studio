
import { useState, useCallback } from 'react';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  age: number;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  reps: number;
  scoreDisplay: string;
  region: string;
}

export interface StatsResult {
  median: number;
  p90: number;
  p99: number;
  data: LeaderboardEntry[];
  totalCount: number;
}

const parseHeight = (h: string): number | null => {
  if (!h) return null;
  const val = parseFloat(h);
  if (isNaN(val)) return null;
  if (h.toLowerCase().includes('cm')) return val;
  if (h.toLowerCase().includes('in')) return val * 2.54;
  return val; // Assume cm if no unit
};

const parseWeight = (w: string): number | null => {
  if (!w) return null;
  const val = parseFloat(w);
  if (isNaN(val)) return null;
  if (w.toLowerCase().includes('kg')) return val;
  if (w.toLowerCase().includes('lb')) return val * 0.453592;
  return val; // Assume kg if no unit
};

export function useOpenStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (division = 1, region = 0, scaled = 0, maxPages = 3) => {
    setIsLoading(true);
    setError(null);
    const allEntries: LeaderboardEntry[] = [];

    try {
      // On boucle sur quelques pages pour avoir un échantillon statistique représentatif
      for (let page = 1; page <= maxPages; page++) {
        const url = `/api/open-stats?division=${division}&region=${region}&scaled=${scaled}&page=${page}&sort=0`;
        const response = await fetch(url);
        
        if (!response.ok) break;
        
        const json = await response.json();
        const rows = json.leaderboardRows || [];
        
        const parsed = rows.map((row: any) => {
          const h = parseHeight(row.entrant.height);
          const w = parseWeight(row.entrant.weight);
          let bmi = null;
          if (h && w && h > 0) {
            const heightM = h / 100;
            bmi = w / (heightM * heightM);
          }

          const scoreObj = row.scores && row.scores[0];
          // On essaie d'extraire les reps. Souvent formaté "337 reps" ou "12:30"
          const scoreStr = scoreObj?.scoreDisplay || '0';
          const reps = parseInt(scoreStr) || 0;

          return {
            rank: parseInt(row.overallRank),
            name: row.entrant.competitorName,
            age: parseInt(row.entrant.age),
            heightCm: h,
            weightKg: w,
            bmi: bmi,
            reps: reps,
            scoreDisplay: scoreStr,
            region: row.entrant.regionName
          };
        });

        allEntries.push(...parsed);
        if (page >= json.pagination?.totalPages) break;
      }

      if (allEntries.length === 0) {
        throw new Error("No data found");
      }

      const sortedReps = [...allEntries].map(e => e.reps).sort((a, b) => a - b);
      const getPercentile = (p: number) => {
        const index = Math.floor(p * (sortedReps.length - 1));
        return sortedReps[index] || 0;
      };

      setStats({
        median: getPercentile(0.5),
        p90: getPercentile(0.9),
        p99: getPercentile(0.99),
        data: allEntries,
        totalCount: allEntries.length
      });
    } catch (err: any) {
      setError(err.message || "Erreur lors de la récupération des données.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchLeaderboard, stats, isLoading, error };
}
