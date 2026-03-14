
import { useState, useCallback } from 'react';

export interface WorkoutScoreDetail {
  ordinal: number;
  rank: number;
  scoreDisplay: string;
  breakdown?: string;
  time?: string;
  judge?: string;
  affiliate?: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  age: number;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  reps: number; // Valeur numérique brute pour les calculs
  scoreDisplay: string;
  overallScore: string; // Points (somme des rangs)
  region: string;
  isTime: boolean;
  scores: WorkoutScoreDetail[];
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

const statsCache = new Map<string, StatsResult>();

export function useOpenStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (year = 2026, workout = 0, division = 1, region = 0, scaled = 0, maxPages = 2) => {
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

          const scoreObj = (workout === 0) 
            ? null 
            : row.scores.find((s: any) => parseInt(s.ordinal) === workout);
          
          const scoreStr = workout === 0 ? (row.overallScore || row.overallRank) : (scoreObj?.scoreDisplay || '0');
          
          let val = 0;
          let isTime = false;

          // Parsing intelligent pour les statistiques
          if (workout !== 0 && scoreStr.includes(':')) {
            const parts = scoreStr.split('(')[0].trim().split(':');
            if (parts.length >= 2) {
                const m = parseInt(parts[parts.length - 2]);
                const s = parseInt(parts[parts.length - 1]);
                val = m * 60 + s;
                isTime = true;
                isTimeDetected = true;
            }
          } else if (workout !== 0) {
            val = parseInt(scoreStr.replace(/[^0-9]/g, '')) || 0;
          } else {
            val = parseInt(row.overallRank) || 0;
          }

          const currentRank = workout === 0 ? parseInt(row.overallRank) : (scoreObj ? parseInt(scoreObj.rank) : parseInt(row.overallRank));

          const detailedScores = row.scores.map((s: any) => ({
            ordinal: parseInt(s.ordinal),
            rank: parseInt(s.rank),
            scoreDisplay: s.scoreDisplay,
            breakdown: s.breakdown,
            time: s.time,
            judge: s.judgeName,
            affiliate: s.affiliateName
          }));

          return {
            rank: currentRank,
            name: row.entrant.competitorName,
            age: parseInt(row.entrant.age),
            heightCm: h,
            weightKg: w,
            bmi: bmi,
            reps: val,
            scoreDisplay: scoreStr,
            overallScore: row.overallScore || row.overallRank,
            region: row.entrant.regionName,
            isTime,
            scores: detailedScores
          };
        });

        allEntries.push(...parsed);
        if (page >= json.pagination?.totalPages) break;
      }

      if (allEntries.length === 0) {
        throw new Error("Aucune donnée trouvée.");
      }

      // Trier les valeurs pour les percentiles (attention au sens si temps ou reps)
      const sortedVals = [...allEntries].map(e => e.reps).sort((a, b) => a - b);
      
      const getPercentile = (p: number) => {
        const index = Math.floor(p * (sortedVals.length - 1));
        return sortedVals[index] || 0;
      };

      const result: StatsResult = {
        median: getPercentile(0.5),
        p90: isTimeDetected ? getPercentile(0.1) : getPercentile(0.9),
        p99: isTimeDetected ? getPercentile(0.01) : getPercentile(0.99),
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
