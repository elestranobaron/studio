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
  score: string;
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
  if (heightStr.toLowerCase().includes('cm')) {
    heightCm = parseFloat(heightStr);
  } else if (heightStr.toLowerCase().includes('in')) {
    heightCm = parseFloat(heightStr) * 2.54;
  }

  let weightKg = 0;
  if (weightStr.toLowerCase().includes('kg')) {
    weightKg = parseFloat(weightStr);
  } else if (weightStr.toLowerCase().includes('lb')) {
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
      const rows: LeaderboardRow[] = [];
      let totalCompetitors = 0;
      const pagesToFetch = 5; // On récupère 250 athlètes pour avoir un échantillon significatif

      for (let page = 1; page <= pagesToFetch; page++) {
        const url = `https://c3po.crossfit.com/api/competitions/v2/competitions/open/2026/leaderboards?division=${division}&region=${region}&scaled=${scaled}&page=${page}&sort=0`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('CrossFit API Error');
        const json = await response.json();
        
        totalCompetitors = json.pagination.totalCompetitors;
        
        const processedRows = json.leaderboardRows.map((row: any) => ({
          ...row,
          bmi: parseBmi(row.entrant.height, row.entrant.weight)
        }));
        
        rows.push(...processedRows);
        
        if (page >= json.pagination.totalPages) break;
        // Petit délai pour le rate limit
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
