'use client';

import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { useOpenStats } from '@/hooks/use-open-stats';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { BarChart3, Info, Loader2, TrendingUp, Users, Scale, Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter
} from 'recharts';

export default function OpenStatsPage() {
  const t = useTranslations('OpenStatsPage');
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [division, setDivision] = useState('1');
  const [region, setRegion] = useState('0');
  const [scaled, setScaled] = useState('0');

  const { rows, totalCompetitors, loading, error } = useOpenStats(division, region, scaled);

  const stats = useMemo(() => {
    if (!rows.length) return null;

    const workout1Scores = rows
      .map(r => parseInt(r.scores[0]?.score || '0'))
      .filter(s => s > 0)
      .sort((a, b) => a - b);

    const bmis = rows
      .map(r => r.bmi)
      .filter((b): b is number => b !== undefined);

    const getPercentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[index];
    };

    // Distribution des scores
    const bins: Record<string, number> = {};
    workout1Scores.forEach(s => {
      // On simplifie le score pour l'affichage (ex: reps)
      const bin = Math.floor(s / 1000000) * 10;
      const label = `${bin} reps`;
      bins[label] = (bins[label] || 0) + 1;
    });

    const chartData = Object.entries(bins).map(([name, value]) => ({ name, value }));

    const scatterData = rows
      .filter(r => r.bmi !== undefined)
      .map(r => ({
        bmi: r.bmi,
        rank: parseInt(r.overallRank),
        name: r.entrant.competitorName
      }));

    return {
      median: getPercentile(workout1Scores, 50),
      avgBmi: bmis.length ? (bmis.reduce((a, b) => a + b, 0) / bmis.length).toFixed(1) : 'N/A',
      chartData,
      scatterData
    };
  }, [rows]);

  if (isUserLoading) return null;

  if (!user?.premium) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6">
        <BarChart3 className="w-20 h-20 text-primary opacity-20" />
        <h1 className="text-3xl font-bold font-headline">{t('upgradeTitle')}</h1>
        <p className="max-w-md text-muted-foreground">{t('upgradeDescription')}</p>
        <Button onClick={() => router.push('/premium')} size="lg">Go Premium</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b md:p-6 bg-background/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
              {t('title')}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" /> {t('description')}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Division
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Men (Rx)</SelectItem>
                  <SelectItem value="2">Women (Rx)</SelectItem>
                  <SelectItem value="18">Men Masters 35-39</SelectItem>
                  <SelectItem value="19">Women Masters 35-39</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Region
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Worldwide</SelectItem>
                  <SelectItem value="29">Europe</SelectItem>
                  <SelectItem value="35">NA East</SelectItem>
                  <SelectItem value="34">NA West</SelectItem>
                  <SelectItem value="32">Oceania</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Scale className="w-4 h-4 text-green-400" /> Version
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Select value={scaled} onValueChange={setScaled}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Rx</SelectItem>
                  <SelectItem value="1">Scaled</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Analyzing Open Data...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="p-4 pb-0">
                  <CardDescription className="text-xs">Median Score</CardDescription>
                  <CardTitle className="text-2xl font-bold">Top 50%</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-primary font-mono font-bold">RANK #{Math.floor(totalCompetitors / 2).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader className="p-4 pb-0">
                  <CardDescription className="text-xs">Elite Threshold</CardDescription>
                  <CardTitle className="text-2xl font-bold">Top 10%</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-blue-400 font-mono font-bold">RANK #{Math.floor(totalCompetitors * 0.1).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500/5 border-yellow-500/20">
                <CardHeader className="p-4 pb-0">
                  <CardDescription className="text-xs">Quarterfinals Target</CardDescription>
                  <CardTitle className="text-2xl font-bold">Top 25%</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-yellow-500 font-mono font-bold">RANK #{Math.floor(totalCompetitors * 0.25).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="p-4 pb-0">
                  <CardDescription className="text-xs">Avg. Body Mass Index</CardDescription>
                  <CardTitle className="text-2xl font-bold">{stats?.avgBmi}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-green-400 font-mono font-bold">KG/M²</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" /> Rank vs. BMI Correlation
                  </CardTitle>
                  <CardDescription>Analysis of body composition influence on rank (Top 250 sample)</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" dataKey="bmi" name="BMI" unit="kg/m²" domain={['dataMin - 2', 'dataMax + 2']} />
                      <YAxis type="number" dataKey="rank" name="Rank" reversed domain={[1, 250]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                      <Scatter name="Athletes" data={stats?.scatterData || []} fill="hsl(var(--primary))" opacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" /> Score Distribution
                  </CardTitle>
                  <CardDescription>Frequency of scores in current sample</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.chartData || []}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
