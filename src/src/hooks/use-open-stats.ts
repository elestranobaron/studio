'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AthleteData {
  id: string;
  name: string;
  rank: number;
  age: number;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  region: string;
  reps: number;
  scoreDisplay: string;
  isTime: boolean;
}

interface FetchOptions {
  division: string;
  region: string;
  scaled: string;
  workout: number; // 1, 2...
  samplePages: number; // Max pages to fetch
}

export function useOpenStatsData(options: FetchOptions) {
  const [data, setData] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const parseValue = (val: string, unit: 'cm' | 'kg' | 'in' | 'lb') => {
    const num = parseFloat(val);
    if (isNaN(num)) return null;
    if (unit === 'in') return num * 2.54;
    if (unit === 'lb') return num * 0.453592;
    return num;
  };

  const calculateBMI = (weight: number | null, height: number | null) => {
    if (!weight || !height) return null;
    const heightMeters = height / 100;
    return weight / (heightMeters * heightMeters);
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    const athletes: AthleteData[] = [];

    try {
      for (let p = 1; p <= options.samplePages; p++) {
        const url = `https://c3po.crossfit.com/api/competitions/v2/competitions/open/2026/leaderboards?division=${options.division}&region=${options.region}&scaled=${options.scaled}&sort=${options.workout}&page=${p}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('API request failed');
        
        const json = await response.json();
        const rows = json.leaderboardRows || [];

        rows.forEach((row: any) => {
          const scoreObj = row.scores.find((s: any) => s.ordinal === options.workout) || row.scores[0];
          
          // Parsing height
          let h = null;
          if (row.entrant.height) {
            h = row.entrant.height.includes('in') 
              ? parseValue(row.entrant.height, 'in') 
              : parseValue(row.entrant.height, 'cm');
          }

          // Parsing weight
          let w = null;
          if (row.entrant.weight) {
            w = row.entrant.weight.includes('lb') 
              ? parseValue(row.entrant.weight, 'lb') 
              : parseValue(row.entrant.weight, 'kg');
          }

          // Parsing reps from score string (e.g. "3370008" -> 337)
          // The API uses a padded format for reps + tiebreak
          const rawScore = scoreObj.score || "0";
          const reps = Math.floor(parseInt(rawScore) / 10000);

          athletes.push({
            id: row.entrant.competitorId,
            name: row.entrant.competitorName,
            rank: parseInt(row.overallRank),
            age: parseInt(row.entrant.age),
            heightCm: h,
            weightKg: w,
            bmi: calculateBMI(w, h),
            region: row.entrant.regionName,
            reps: reps,
            scoreDisplay: scoreObj.scoreDisplay,
            isTime: scoreObj.scoreDisplay.includes(':'),
          });
        });

        setProgress(Math.round((p / options.samplePages) * 100));
        
        // Anti-throttle pause
        if (options.samplePages > 1) await new Promise(r => setTimeout(r, 200));
      }
      setData(athletes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.division, options.region, options.scaled, options.workout, options.samplePages]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, loading, error, progress, refetch: fetchStats };
}
