
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

  const fetchLeaderboard = useCallback(async (year = 2026, division = 1, region = 0, sort = 0, scaled = 0, maxPages = 3) => {
    setIsLoading(true);
    setError(null);
    const allEntries: LeaderboardEntry[] = [];

    try {
      for (let page = 1; page <= maxPages; page++) {
        const url = `/api/open-stats?year=${year}&division=${division}&region=${region}&scaled=${scaled}&page=${page}&sort=${sort}`;
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

          // Extraction du score selon le workout sélectionné (sort)
          // Si sort=0 (Overall), on prend l'overallScore ou le premier score valide
          // Si sort > 0, on cherche le score dont l'ordinal correspond
          const scoreObj = sort === 0 ? (row.scores?.[0]) : row.scores?.find((s: any) => s.ordinal === sort);
          const scoreStr = scoreObj?.scoreDisplay || '0';
          
          // Calcul de la valeur numérique pour les stats
          let scoreValue = 0;
          if (scoreStr.includes(':')) {
            // Format temps (12:30) -> convertir en secondes
            const parts = scoreStr.split(':').map(Number);
            if (parts.length === 2) {
              scoreValue = (parts[0] * 60) + parts[1];
            } else {
              scoreValue = parts[0] || 0;
            }
          } else {
            // Format reps (337 reps) -> extraire l'entier
            scoreValue = parseInt(scoreStr) || 0;
          }

          return {
            rank: parseInt(row.overallRank),
            name: row.entrant.competitorName,
            age: parseInt(row.entrant.age),
            heightCm: h,
            weightKg: w,
            bmi: bmi,
            reps: scoreValue,
            scoreDisplay: scoreStr,
            region: row.entrant.regionName
          };
        });

        allEntries.push(...parsed);
        if (page >= json.pagination?.totalPages) break;
      }

      if (allEntries.length === 0) {
        throw new Error("Aucune donnée trouvée.");
      }

      const sortedScores = [...allEntries].map(e => e.reps).sort((a, b) => a - b);
      const getPercentile = (p: number) => {
        const index = Math.floor(p * (sortedScores.length - 1));
        return sortedScores[index] || 0;
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
