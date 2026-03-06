
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, ZAxis, Legend, LineChart, Line 
} from 'recharts';
import { 
  BarChart3, Users, Scale, Calendar, Filter, 
  Loader2, ArrowLeft, Info, Trophy, TrendingUp 
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// --- Types ---
interface Athlete {
  rank: number;
  name: string;
  age: number;
  height: number; // in cm
  weight: number; // in kg
  bmi: number;
  scores: {
    workout: number;
    reps: number;
    time?: number;
    rank: number;
  }[];
  region: string;
}

interface StatsResult {
  median: number;
  p90: number;
  p99: number;
  total: number;
  distribution: { range: string; count: number }[];
  correlations: { bmi: number; rank: number; age: number; score: number }[];
}

// --- Helper Functions ---
const parseHeight = (h: string): number => {
  if (!h) return 0;
  if (h.includes('cm')) return parseFloat(h);
  if (h.includes('in')) return Math.round(parseFloat(h) * 2.54);
  return 0;
};

const parseWeight = (w: string): number => {
  if (!w) return 0;
  if (w.includes('kg')) return parseFloat(w);
  if (w.includes('lb')) return Math.round(parseFloat(w) * 0.453592);
  return 0;
};

// --- Hook ---
function useOpenStatsData(division: string, region: string, scaled: string) {
  const [data, setData] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        // Limitation à 2 pages (100 athlètes) pour la démo/perf, peut être augmenté
        const athletes: Athlete[] = [];
        for (let p = 1; p <= 2; p++) {
          const res = await fetch(
            `https://c3po.crossfit.com/api/competitions/v2/competitions/open/2026/leaderboards?division=${division}&region=${region}&scaled=${scaled}&page=${p}`
          );
          if (!res.ok) throw new Error('API Rate limit or error');
          const json = await res.json();
          
          json.leaderboardRows.forEach((row: any) => {
            const h = parseHeight(row.entrant.height);
            const w = parseWeight(row.entrant.weight);
            const bmi = h > 0 ? parseFloat((w / ((h / 100) ** 2)).toFixed(1)) : 0;

            athletes.push({
              rank: parseInt(row.overallRank),
              name: row.entrant.competitorName,
              age: parseInt(row.entrant.age),
              height: h,
              weight: w,
              bmi: bmi,
              region: row.entrant.regionName,
              scores: row.scores.map((s: any) => ({
                workout: s.ordinal,
                reps: parseInt(s.scoreDisplay.replace(/[^0-9]/g, '')),
                time: s.time || 0,
                rank: parseInt(s.rank)
              }))
            });
          });
        }
        setData(athletes);
      } catch (err) {
        setError("Impossible de récupérer les données live. Réessayez dans 1 minute.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [division, region, scaled]);

  return { data, loading, error };
}

export default function OpenStatsPage() {
  const t = useTranslations('OpenStatsPage');
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();

  // Filtres
  const [division, setDivision] = useState("1");
  const [region, setRegion] = useState("0");
  const [scaled, setScaled] = useState("0");
  const [activeWorkout, setActiveWorkout] = useState(1);

  const { data, loading, error } = useOpenStatsData(division, region, scaled);

  // Redirection si non premium
  useEffect(() => {
    if (!isUserLoading && (!user || !user.premium)) {
      router.push('/premium');
    }
  }, [user, isUserLoading, router]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const scores = data.map(a => a.scores.find(s => s.workout === activeWorkout)?.reps || 0).sort((a, b) => a - b);
    const median = scores[Math.floor(scores.length / 2)];
    const p90 = scores[Math.floor(scores.length * 0.9)];
    const p99 = scores[Math.floor(scores.length * 0.99)];

    // Distribution
    const ranges = [
      { min: 0, max: 100, label: "0-100" },
      { min: 101, max: 200, label: "101-200" },
      { min: 201, max: 300, label: "201-300" },
      { min: 301, max: 400, label: "301-400" },
      { min: 401, max: 999, label: "401+" },
    ];

    const distribution = ranges.map(r => ({
      range: r.label,
      count: scores.filter(s => s >= r.min && s <= r.max).length
    }));

    const correlations = data.filter(a => a.bmi > 0).map(a => ({
      bmi: a.bmi,
      rank: a.rank,
      age: a.age,
      score: a.scores.find(s => s.workout === activeWorkout)?.reps || 0
    }));

    return { median, p90, p99, total: data.length, distribution, correlations };
  }, [data, activeWorkout]);

  if (isUserLoading || (user && !user.premium)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 border-b md:p-6 sticky top-0 bg-background/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-headline tracking-tight">{t('title')}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> {t('description')}
              </p>
            </div>
          </div>
        </div>
        <div className="hidden md:flex">
          <SidebarTrigger />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Filtres Bar */}
        <Card className="border-primary/20 shadow-lg">
          <CardContent className="p-4 flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Division
              </label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger className="bg-muted/50 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Men Rx</SelectItem>
                  <SelectItem value="2">Women Rx</SelectItem>
                  <SelectItem value="11">Teens (14-15)</SelectItem>
                  <SelectItem value="18">Masters (35-39)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Région
              </label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="bg-muted/50 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Worldwide</SelectItem>
                  <SelectItem value="29">Europe</SelectItem>
                  <SelectItem value="35">North America East</SelectItem>
                  <SelectItem value="32">Oceania</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Workout
              </label>
              <Select value={activeWorkout.toString()} onValueChange={(v) => setActiveWorkout(parseInt(v))}>
                <SelectTrigger className="bg-muted/50 border-none text-primary font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Workout 26.1</SelectItem>
                  <SelectItem value="2">Workout 26.2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Type</label>
              <div className="flex bg-muted/50 rounded-md p-1 gap-1">
                <Button 
                  size="sm" 
                  variant={scaled === "0" ? "default" : "ghost"} 
                  className="h-8 text-xs px-3" 
                  onClick={() => setScaled("0")}
                >Rx</Button>
                <Button 
                  size="sm" 
                  variant={scaled === "1" ? "default" : "ghost"} 
                  className="h-8 text-xs px-3" 
                  onClick={() => setScaled("1")}
                >Scaled</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-[400px] md:col-span-2 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : error ? (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-12 text-center space-y-4">
              <div className="bg-destructive/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Info className="text-destructive h-8 w-8" />
              </div>
              <p className="text-lg font-medium">{error}</p>
              <Button onClick={() => window.location.reload()}>Réessayer</Button>
            </CardContent>
          </Card>
        ) : stats ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/5 to-background border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider">Median Score</CardDescription>
                  <CardTitle className="text-4xl font-headline text-primary">{stats.median} <span className="text-sm font-sans font-normal text-muted-foreground">reps</span></CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500/5 to-background border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider">Top 10% (P90)</CardDescription>
                  <CardTitle className="text-4xl font-headline text-yellow-500">{stats.p90} <span className="text-sm font-sans font-normal text-muted-foreground">reps</span></CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500/5 to-background border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider">Top 1% (P99)</CardDescription>
                  <CardTitle className="text-4xl font-headline text-emerald-500">{stats.p99} <span className="text-sm font-sans font-normal text-muted-foreground">reps</span></CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/5 to-background border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider">Sample Size</CardDescription>
                  <CardTitle className="text-4xl font-headline text-blue-500">{stats.total} <span className="text-sm font-sans font-normal text-muted-foreground">athletes</span></CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Main Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Score Distribution
                  </CardTitle>
                  <CardDescription>Number of athletes per rep range</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.distribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                      <Tooltip 
                        contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} 
                        cursor={{fill: 'hsl(var(--primary)/0.1)'}}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" /> BMI vs Performance
                  </CardTitle>
                  <CardDescription>Correlation between Body Mass Index and Reps</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis type="number" dataKey="bmi" name="BMI" domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} />
                      <YAxis type="number" dataKey="score" name="Score" domain={['dataMin - 10', 'dataMax + 10']} axisLine={false} tickLine={false} />
                      <ZAxis type="number" range={[50, 400]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Athletes" data={stats.correlations} fill="hsl(var(--primary))" fillOpacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Cohort Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" /> Leaderboard Top 10 Insights
                </CardTitle>
                <CardDescription>Analyse des profils physiques des meilleurs mondiaux</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
                        <th className="py-3 px-2">Rank</th>
                        <th className="py-3 px-2">Athlete</th>
                        <th className="py-3 px-2">Age</th>
                        <th className="py-3 px-2">Weight</th>
                        <th className="py-3 px-2 text-right">26.{activeWorkout} Reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 10).map((a) => (
                        <tr key={a.name} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2 font-bold text-primary">#{a.rank}</td>
                          <td className="py-3 px-2 font-medium">{a.name}</td>
                          <td className="py-3 px-2">{a.age}y</td>
                          <td className="py-3 px-2">{a.weight > 0 ? `${a.weight}kg` : '--'}</td>
                          <td className="py-3 px-2 text-right font-mono font-bold">
                            {a.scores.find(s => s.workout === activeWorkout)?.reps || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            Sélectionnez des filtres pour charger les analyses.
          </div>
        )}
      </main>
    </div>
  );
}
