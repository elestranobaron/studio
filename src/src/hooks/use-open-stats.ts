
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Entrant {
  competitorId: string;
  competitorName: string;
  age: string;
  height: string;
  weight: string;
  gender: string;
  regionName: string;
}

export interface Score {
  ordinal: number;
  scoreDisplay: string;
  time?: number;
  rank: string;
}

export interface LeaderboardRow {
  overallRank: string;
  entrant: Entrant;
  scores: Score[];
  bmi?: number;
}

interface OpenStatsData {
  rows: LeaderboardRow[];
  totalCompetitors: number;
  loading: boolean;
  error: string | null;
}

const parseBmi = (heightStr: string, weightStr: string): number | undefined => {
  if (!heightStr || !weightStr) return undefined;

  let heightCm = 0;
  if (heightStr.includes('cm')) {
    heightCm = parseFloat(heightStr);
  } else if (heightStr.includes('in')) {
    heightCm = parseFloat(heightStr) * 2.54;
  }

  let weightKg = 0;
  if (weightStr.includes('kg')) {
    weightKg = parseFloat(weightStr);
  } else if (weightStr.includes('lb')) {
    weightKg = parseFloat(weightStr) * 0.453592;
  }

  if (heightCm > 0 && weightKg > 0) {
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  }
  return undefined;
};

export function useOpenStats(division: string = '1', region: string = '0', scaled: string = '0') {
  const [data, setData] = useState<OpenStatsData>({
    rows: [],
    totalCompetitors: 0,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Pour des raisons de performance et de rate limit, on récupère les 10 premières pages (500 athlètes)
      // On pourrait augmenter cette limite, mais 500 est un échantillon statistique solide pour un dashboard.
      const rows: LeaderboardRow[] = [];
      let totalCompetitors = 0;
      const pagesToFetch = 5; 

      for (let page = 1; page <= pagesToFetch; page++) {
        const url = `https://c3po.crossfit.com/api/competitions/v2/competitions/open/2026/leaderboards?division=${division}&region=${region}&scaled=${scaled}&page=${page}&sort=0`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Error');
        const json = await response.json();
        
        totalCompetitors = json.pagination.totalCompetitors;
        
        const processedRows = json.leaderboardRows.map((row: any) => ({
          ...row,
          bmi: parseBmi(row.entrant.height, row.entrant.weight)
        }));
        
        rows.push(...processedRows);
        
        if (page >= json.pagination.totalPages) break;
        // Respect rate limit
        await new Promise(r => setTimeout(r, 200));
      }

      setData({
        rows,
        totalCompetitors,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setData(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, [division, region, scaled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return data;
}
