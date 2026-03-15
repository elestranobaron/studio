
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
  reps: number; // Nombre de répétitions (toujours présent)
  seconds: number | null; // Temps en secondes si fini, sinon null
  finished: boolean; // Si l'athlète a fini le WOD (chrono présent)
  scoreDisplay: string; // Chaîne officielle (ex: "11:25 (354)")
  overallScore: string; // Points (somme des rangs)
  region: string;
  scores: WorkoutScoreDetail[];
}

export interface StatsResult {
  median: number;
  p90: number;
  p99: number;
  data: LeaderboardEntry[];
  totalCount: number;
  isTime: boolean; // True seulement si 100% de l'échantillon a fini
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
          
          const officialScoreDisplay = workout === 0 ? (row.overallScore || "0") : (scoreObj?.scoreDisplay || '0');
          
          let reps = 0;
          let seconds: number | null = null;
          let finished = false;

          if (workout !== 0) {
            // Extraction des répétitions : soit "354 reps", soit dans les parenthèses "11:25 (354)"
            const repsMatch = officialScoreDisplay.match(/\((\d+)\)/) || officialScoreDisplay.match(/^(\d+)\s*reps/);
            if (repsMatch) {
              reps = parseInt(repsMatch[1]);
            } else {
              // Fallback si juste un nombre est présent
              reps = parseInt(officialScoreDisplay.replace(/[^0-9]/g, '')) || 0;
            }

            // Extraction du temps si présent
            if (officialScoreDisplay.includes(':')) {
              const timePart = officialScoreDisplay.split('(')[0].trim();
              const parts = timePart.split(':');
              if (parts.length >= 2) {
                const m = parseInt(parts[parts.length - 2]);
                const s = parseInt(parts[parts.length - 1]);
                seconds = m * 60 + s;
                finished = true;
              }
            }
          } else {
            // Pour l'overall, le "score" est le rang cumulé
            reps = parseInt(row.overallRank) || 0;
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
            reps,
            seconds,
            finished,
            scoreDisplay: officialScoreDisplay,
            overallScore: row.overallScore || row.overallRank,
            region: row.entrant.regionName,
            scores: detailedScores
          };
        });

        allEntries.push(...parsed);
        if (page >= json.pagination?.totalPages) break;
      }

      if (allEntries.length === 0) {
        throw new Error("Aucune donnée trouvée.");
      }

      // Règle d'homogénéité : Si tout le monde a fini, on peut utiliser le temps.
      // Sinon (si au moins une personne n'a pas fini), on utilise les répétitions pour tout le monde.
      const isWorkoutView = workout !== 0;
      const allFinished = isWorkoutView && allEntries.every(e => e.finished);
      const isTime = isWorkoutView && allFinished;

      // Valeurs pour les calculs statistiques (médiane, percentiles)
      const sortedVals = allEntries
        .map(e => isTime ? (e.seconds || 0) : e.reps)
        .sort((a, b) => a - b);
      
      const getPercentile = (p: number) => {
        const index = Math.floor(p * (sortedVals.length - 1));
        return sortedVals[index] || 0;
      };

      const result: StatsResult = {
        median: getPercentile(0.5),
        p90: isTime ? getPercentile(0.1) : getPercentile(0.9), // En temps, plus bas est meilleur
        p99: isTime ? getPercentile(0.01) : getPercentile(0.99),
        data: allEntries,
        totalCount: allEntries.length,
        isTime
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
