'use client';

import { useState, useCallback } from 'react';

export interface Athlete {
  rank: number;
  name: string;
  age: number;
  height: number | null; // in cm
  weight: number | null; // in kg
  bmi: number | null;
  region: string;
  division: string;
  scores: {
    ordinal: number;
    reps: number | null;
    time: number | null; // in seconds
    display: string;
  }[];
}

export interface Stats {
  total: number;
  median: number;
  p90: number;
  p99: number;
  distribution: { range: string; count: number }[];
}

export function useOpenStats() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Athlete[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parseValue = (val: string, unit: 'cm' | 'kg') => {
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) return null;

    if (unit === 'cm') {
      if (val.includes('in')) return num * 2.54;
      return num;
    } else {
      if (val.includes('lb')) return num * 0.453592;
      return num;
    }
  };

  const fetchStats = useCallback(async (params: {
    division: string;
    region: string;
    scaled: string;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    const athletes: Athlete[] = [];
    const maxAthletes = params.limit || 500; // Limit for performance in UI

    try {
      // Fetching first few pages to get a good sample size
      for (let page = 1; athletes.length < maxAthletes; page++) {
        const url = `https://c3po.crossfit.com/api/competitions/v2/competitions/open/2026/leaderboards?division=${params.division}&region=${params.region}&scaled=${params.scaled}&page=${page}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Rate limit or network error');
        
        const json = await response.json();
        const rows = json.leaderboardRows || [];
        
        if (rows.length === 0) break;

        rows.forEach((row: any) => {
          const h = parseValue(row.entrant.height, 'cm');
          const w = parseValue(row.entrant.weight, 'kg');
          let bmi = null;
          if (h && w) {
            bmi = w / Math.pow(h / 100, 2);
          }

          athletes.push({
            rank: parseInt(row.overallRank),
            name: row.entrant.competitorName,
            age: parseInt(row.entrant.age),
            height: h,
            weight: w,
            bmi: bmi,
            region: row.entrant.regionName,
            division: row.entrant.divisionId,
            scores: (row.scores || []).map((s: any) => ({
              ordinal: s.ordinal,
              reps: s.scoreDisplay.includes('reps') ? parseInt(s.scoreDisplay) : null,
              time: s.time || null,
              display: s.scoreDisplay
            }))
          });
        });

        if (page >= json.pagination.totalPages) break;
        // Simple rate limiting
        await new Promise(r => setTimeout(r, 200));
      }

      setData(athletes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchStats };
}
