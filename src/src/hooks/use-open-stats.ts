
'use client';

import { useState, useCallback } from 'react';

export interface AthleteData {
  id: string;
  name: string;
  age: number;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  rank: number;
  score1: number | null;
  score2: number | null;
  region: string;
}

interface LeaderboardParams {
  division: string;
  region: string;
  scaled: string;
}

export function useOpenStatsData() {
  const [data, setData] = useState<AthleteData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const parseMetric = (val: string, unitType: 'height' | 'weight'): number | null => {
    if (!val) return null;
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return null;

    if (unitType === 'height') {
      if (val.toLowerCase().includes('in')) return num * 2.54;
      return num; // assume cm
    } else {
      if (val.toLowerCase().includes('lb')) return num * 0.453592;
      return num; // assume kg
    }
  };

  const calculateBMI = (heightCm: number | null, weightKg: number | null): number | null => {
    if (!heightCm || !weightKg || heightCm === 0) return null;
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  };

  const fetchStats = useCallback(async (params: LeaderboardParams, maxPages: number = 5) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    const allAthletes: AthleteData[] = [];

    try {
      for (let page = 1; page <= maxPages; page++) {
        const url = `https://c3po.crossfit.com/api/competitions/v2/competitions/open/2026/leaderboards?division=${params.division}&region=${params.region}&scaled=${params.scaled}&page=${page}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const json = await response.json();
        const rows = json.leaderboardRows || [];
        
        const parsedRows = rows.map((row: any) => {
          const h = parseMetric(row.entrant.height, 'height');
          const w = parseMetric(row.entrant.weight, 'weight');
          return {
            id: row.entrant.competitorId,
            name: row.entrant.competitorName,
            age: parseInt(row.entrant.age),
            heightCm: h,
            weightKg: w,
            bmi: calculateBMI(h, w),
            rank: parseInt(row.overallRank),
            score1: row.scores[0]?.score ? parseInt(row.scores[0].score) : null,
            score2: row.scores[1]?.score ? parseInt(row.scores[1].score) : null,
            region: row.entrant.regionName,
          };
        });

        allAthletes.push(...parsedRows);
        setProgress((page / maxPages) * 100);

        if (page >= json.pagination.totalPages) break;
        // Respect rate limit
        await new Promise(r => setTimeout(r, 500));
      }
      setData(allAthletes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, progress, fetchStats };
}
