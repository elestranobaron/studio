
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
  if (h.includes('cm')) return parseFloat(h);
  if (h.includes('in')) return parseFloat(h) * 2.54;
  return null;
};

const parseWeight = (w: string): number | null => {
  if (!w) return null;
  if (w.includes('kg')) return parseFloat(w);
  if (w.includes('lb')) return parseFloat(w) * 0.453592;
  return null;
};

export function useOpenStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (division = 1, region = 0, scaled = 0, maxPages = 5) => {
    setIsLoading(true);
    setError(null);
    const allEntries: LeaderboardEntry[] = [];

    try {
      for (let page = 1; page <= maxPages; page++) {
        const url = `https://c3po.crossfit.com/api/competitions/v2/competitions/open/2026/leaderboards?division=${division}&region=${region}&scaled=${scaled}&page=${page}&sort=0`;
        const response = await fetch(url);
        if (!response.ok) break;
        
        const json = await response.json();
        const rows = json.leaderboardRows || [];
        
        const parsed = rows.map((row: any) => {
          const h = parseHeight(row.entrant.height);
          const w = parseWeight(row.entrant.weight);
          let bmi = null;
          if (h && w) {
            const heightM = h / 100;
            bmi = w / (heightM * heightM);
          }

          // Extraction des reps du scoreDisplay (ex: "337 reps")
          const scoreObj = row.scores[0];
          const reps = scoreObj ? parseInt(scoreObj.scoreDisplay) || 0 : 0;

          return {
            rank: parseInt(row.overallRank),
            name: row.entrant.competitorName,
            age: parseInt(row.entrant.age),
            heightCm: h,
            weightKg: w,
            bmi: bmi,
            reps: reps,
            scoreDisplay: scoreObj?.scoreDisplay || '0',
            region: row.entrant.regionName
          };
        });

        allEntries.push(...parsed);
        if (page >= json.pagination.totalPages) break;
      }

      const sortedReps = [...allEntries].map(e => e.reps).sort((a, b) => a - b);
      const getPercentile = (p: number) => {
        if (sortedReps.length === 0) return 0;
        const index = Math.floor(p * (sortedReps.length - 1));
        return sortedReps[index];
      };

      setStats({
        median: getPercentile(0.5),
        p90: getPercentile(0.9),
        p99: getPercentile(0.99),
        data: allEntries,
        totalCount: allEntries.length
      });
    } catch (err) {
      setError("Erreur lors de la récupération des données.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchLeaderboard, stats, isLoading, error };
}
