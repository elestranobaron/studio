
'use client';

import { useUser } from '@/firebase/provider';
import { useOpenStatsData, AthleteData } from '@/hooks/use-open-stats';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart3, LoaderCircle, Gem, Info, Filter } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function OpenStatsPage() {
  const { user, isUserLoading } = useUser();
  const t = useTranslations('OpenStatsPage');
  const { data, isLoading, error, progress, fetchStats } = useOpenStatsData();

  const [params, setParams] = useState({ division: '1', region: '0', scaled: '0' });

  useEffect(() => {
    if (user?.premium && data.length === 0 && !isLoading) {
      fetchStats(params, 10); // Fetch top 500
    }
  }, [user?.premium, fetchStats, params, data.length, isLoading]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const sortedAges = [...data].map(a => a.age).sort((a, b) => a - b);
    const medianAge = sortedAges[Math.floor(sortedAges.length / 2)];
    
    // Percentiles logic
    const getPercentileRank = (p: number) => Math.ceil((p / 100) * data.length);
    
    // Distribution for Histogram
    const bins: Record<string, number> = {};
    data.forEach(a => {
      const bin = Math.floor(a.age / 5) * 5;
      const label = `${bin}-${bin + 4}`;
      bins[label] = (bins[label] || 0) + 1;
    });
    const distribution = Object.entries(bins).map(([name, count]) => ({ name, count }));

    return { medianAge, distribution, total: data.length };
  }, [data]);

  if (isUserLoading) return <div className="p-8 flex justify-center"><LoaderCircle className="animate-spin" /></div>;

  if (!user?.premium) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6">
        <div className="bg-primary/10 p-6 rounded-full">
          <Gem className="w-16 h-16 text-primary animate-pulse" />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-3xl font-headline font-bold">{t('upgradeTitle')}</h1>
          <p className="text-muted-foreground">{t('upgradeDescription')}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/premium">Go Premium</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="p-4 border-b md:p-6 bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
              <BarChart3 className="text-primary" /> {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={params.division} onValueChange={(v) => setParams(p => ({...p, division: v}))}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Division" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Men Rx</SelectItem>
                <SelectItem value="2">Women Rx</SelectItem>
                <SelectItem value="11">Teens (14-15)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => fetchStats(params, 10)} disabled={isLoading}>
              {isLoading ? <LoaderCircle className="animate-spin h-4 w-4" /> : <Filter className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {isLoading && (
          <div className="mt-4 space-y-1">
            <Progress value={progress} className="h-1" />
            <p className="text-[10px] text-center text-muted-foreground animate-pulse">Fetching pages... {Math.round(progress)}%</p>
          </div>
        )}
      </header>

      <main className="p-4 md:p-6 space-y-6">
        {error && <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm">{error}</div>}

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Sample Size</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{stats?.total || 0} athletes</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Median Age</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{stats?.medianAge || '--'} years</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Data Source</CardTitle></CardHeader>
            <CardContent><div className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Live CrossFit API</div></CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle>Age Distribution</CardTitle>
              <CardDescription>Number of athletes per age group</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.distribution}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle>BMI vs Performance</CardTitle>
              <CardDescription>Correlation between Body Mass Index and Rank</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" dataKey="bmi" name="BMI" unit="" stroke="#888888" fontSize={10} domain={['dataMin - 2', 'dataMax + 2']} />
                  <YAxis type="number" dataKey="rank" name="Rank" stroke="#888888" fontSize={10} reversed />
                  <ZAxis type="number" range={[50, 50]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'hsl(var(--card))' }} />
                  <Scatter name="Athletes" data={data.filter(a => a.bmi)} fill="hsl(var(--primary))" opacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
