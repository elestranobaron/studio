
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
  reps: number;
  seconds: number | null;
  finished: boolean;
  scoreDisplay: string;
  overallScore: string;
  region: string;
  scores: WorkoutScoreDetail[];
}

export interface StatsResult {
  median: number;
  p90: number;
  p99: number;
  data: LeaderboardEntry[];
  totalCount: number;
  isTime: boolean;
  maxRepsInSample: number;
  inferredTimeCap: string | null;
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
          const breakdownStr = scoreObj?.breakdown || "";
          
          let reps = 0;
          let seconds: number | null = null;
          let finished = false;

          if (workout !== 0) {
            // 1. Détection du temps (ex: "12:30")
            if (officialScoreDisplay.includes(':')) {
              const timePart = officialScoreDisplay.split('(')[0].trim();
              const parts = timePart.split(':').map(p => parseInt(p));
              if (parts.length >= 2) {
                const s = parts.pop() || 0;
                const m = parts.pop() || 0;
                const h = parts.pop() || 0;
                seconds = (h * 3600) + (m * 60) + s;
                finished = true;
              }
            }

            // 2. Extraction des répétitions via parenthèses ou breakdown
            const parenMatch = officialScoreDisplay.match(/\((\d+)\)/);
            const breakdownMatch = breakdownStr.match(/(\d+)\s*reps/i);
            const repsSuffixMatch = officialScoreDisplay.match(/^(\d+)\s*reps/i);
            
            if (parenMatch) {
              reps = parseInt(parenMatch[1]);
            } else if (breakdownMatch) {
              reps = parseInt(breakdownMatch[1]);
            } else if (repsSuffixMatch) {
              reps = parseInt(repsSuffixMatch[1]);
            } else if (!finished) {
                const simpleNum = parseInt(officialScoreDisplay.trim());
                if (!isNaN(simpleNum)) {
                    reps = simpleNum;
                }
            }
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
            bmi: (bmi && bmi > 15 && bmi < 50) ? bmi : null, // Filtrage des BMI aberrants dès le départ
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

      // --- Déduction dynamique haute fidélité ---
      const isWorkoutView = workout !== 0;
      
      // Déduction du Max Reps en analysant le breakdown des finishers (les premiers du classement)
      let detectedMaxReps = 0;
      if (isWorkoutView) {
          for (let i = 0; i < Math.min(allEntries.length, 10); i++) {
              const athlete = allEntries[i];
              if (athlete.reps > detectedMaxReps) detectedMaxReps = athlete.reps;
          }
      }
      const maxRepsInSample = detectedMaxReps;

      // Unification pour les épreuves mixtes : si qqn a fini (temps), il a fait le max de reps
      if (isWorkoutView) {
          allEntries.forEach(e => {
              if (e.finished) {
                  e.reps = maxRepsInSample;
              }
          });
      }

      // Déduction si c'est une épreuve au temps pure ou mixte
      // On regarde s'il y a des gens qui n'ont pas fini (reps < maxReps)
      const anyNonFinisher = isWorkoutView && allEntries.some(e => !e.finished && e.reps > 0 && e.reps < maxRepsInSample);
      const isTime = isWorkoutView && !anyNonFinisher;

      // Inférence du Time Cap (le temps le plus élevé arrondi à la minute supérieure)
      let inferredTimeCap = null;
      if (isWorkoutView) {
          const finishedAthletes = allEntries.filter(e => e.seconds !== null);
          if (finishedAthletes.length > 0) {
              const maxSeconds = Math.max(...finishedAthletes.map(e => e.seconds!));
              const minutes = Math.ceil(maxSeconds / 60);
              inferredTimeCap = `${minutes}:00`;
          } else {
              inferredTimeCap = "N/A";
          }
      }

      const sortedVals = allEntries
        .map(e => isTime ? (e.seconds || 0) : e.reps)
        .sort((a, b) => a - b);
      
      const getPercentile = (p: number) => {
        const index = Math.floor(p * (sortedVals.length - 1));
        return sortedVals[index] || 0;
      };

      const result: StatsResult = {
        median: getPercentile(0.5),
        p90: isTime ? getPercentile(0.1) : getPercentile(0.9),
        p99: isTime ? getPercentile(0.01) : getPercentile(0.99),
        data: allEntries,
        totalCount: allEntries.length,
        isTime,
        maxRepsInSample,
        inferredTimeCap
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
