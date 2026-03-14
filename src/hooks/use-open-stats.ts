import { useState, useCallback } from 'react';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  age: number;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  reps: number; // Valeur numérique normalisée (secondes ou reps)
  scoreDisplay: string;
  region: string;
  isTime: boolean; // Flag pour savoir si c'est un chrono
}

export interface StatsResult {
  median: number;
  p90: number;
  p99: number;
  data: LeaderboardEntry[];
  totalCount: number;
  isTime: boolean;
}

const parseHeight = (h: string): number | null => {
  if (!h) return null;
  const val = parseFloat(h);
  if (isNaN(val)) return null;
  if (h.toLowerCase().includes('cm')) return val;
  if (h.toLowerCase().includes('in')) return val * 2.54;
  return val;
};

const parseWeight = (w: string): number | null => {
  if (!w) return null;
  const val = parseFloat(w);
  if (isNaN(val)) return null;
  if (w.toLowerCase().includes('kg')) return val;
  if (w.toLowerCase().includes('lb')) return val * 0.453592;
  return val;
};

// Cache en mémoire
const statsCache = new Map<string, StatsResult>();

export function useOpenStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (year = 2025, workout = 0, division = 1, region = 0, scaled = 0, maxPages = 2) => {
    const cacheKey = `${year}-${workout}-${division}-${region}-${scaled}-${maxPages}`;
    
    if (statsCache.has(cacheKey)) {
      setStats(statsCache.get(cacheKey)!);
      return;
    }

    setIsLoading(true);
    setError(null);
    const allEntries: LeaderboardEntry[] = [];

    try {
      let isTimeDetected = false;

      for (let page = 1; page <= maxPages; page++) {
        const url = `/api/open-stats?year=${year}&division=${division}&region=${region}&scaled=${scaled}&page=${page}&sort=${workout}`;
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

          // Récupération du score spécifique au workout demandé
          // Si workout=0 (Overall), on prend le rang global
          const scoreObj = (workout === 0) ? { scoreDisplay: row.overallRank } : row.scores.find((s: any) => parseInt(s.ordinal) === workout) || row.scores[0];
          const scoreStr = scoreObj?.scoreDisplay || '0';
          
          let val = 0;
          let isTime = false;

          if (scoreStr.includes(':')) {
            const [m, s] = scoreStr.split(':').map(Number);
            val = m * 60 + s;
            isTime = true;
            isTimeDetected = true;
          } else {
            val = parseInt(scoreStr.replace(/[^0-9]/g, '')) || 0;
          }

          return {
            rank: parseInt(row.overallRank),
            name: row.entrant.competitorName,
            age: parseInt(row.entrant.age),
            heightCm: h,
            weightKg: w,
            bmi: bmi,
            reps: val,
            scoreDisplay: scoreStr,
            region: row.entrant.regionName,
            isTime
          };
        });

        allEntries.push(...parsed);
        if (page >= json.pagination?.totalPages) break;
      }

      if (allEntries.length === 0) {
        throw new Error("Aucune donnée trouvée.");
      }

      // Calcul des percentiles
      // Pour le temps, on trie du plus petit au plus grand (plus court = mieux)
      // Pour les reps ou le rang cumulé, on trie différemment
      const sortedVals = [...allEntries].map(e => e.reps).sort((a, b) => a - b);
      
      const getPercentile = (p: number) => {
        const index = Math.floor(p * (sortedVals.length - 1));
        return sortedVals[index] || 0;
      };

      const result: StatsResult = {
        median: getPercentile(0.5),
        p90: isTimeDetected ? getPercentile(0.1) : getPercentile(0.9), // Top 10%
        p99: isTimeDetected ? getPercentile(0.01) : getPercentile(0.99), // Elite 1%
        data: allEntries,
        totalCount: allEntries.length,
        isTime: isTimeDetected
      };

      statsCache.set(cacheKey, result);
      setStats(result);
    } catch (err: any) {
      setError(err.message || "Erreur réseau.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchLeaderboard, stats, isLoading, error };
}
