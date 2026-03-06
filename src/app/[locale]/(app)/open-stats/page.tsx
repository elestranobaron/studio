
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useOpenStats, LeaderboardEntry } from '@/hooks/use-open-stats';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, Cell 
} from 'recharts';
import { LoaderCircle, Info, Users, BarChart3, Weight, Trophy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';

export default function OpenStatsPage() {
  const t = useTranslations('OpenStatsPage');
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const { fetchLeaderboard, stats, isLoading } = useOpenStats();

  const [division, setDivision] = useState("1");
  const [region, setRegion] = useState("0");

  useEffect(() => {
    if (!isUserLoading && (!user || !user.premium)) {
      router.push('/premium');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user?.premium) {
      fetchLeaderboard(parseInt(division), parseInt(region));
    }
  }, [user, division, region, fetchLeaderboard]);

  const histogramData = useMemo(() => {
    if (!stats) return [];
    const bins: Record<string, number> = {};
    const step = 10;
    stats.data.forEach(entry => {
      const bin = Math.floor(entry.reps / step) * step;
      const label = `${bin}-${bin + step}`;
      bins[label] = (bins[label] || 0) + 1;
    });
    return Object.entries(bins).map(([name, count]) => ({ name, count })).sort((a, b) => parseInt(a.name) - parseInt(b.name));
  }, [stats]);

  const scatterData = useMemo(() => {
    if (!stats) return [];
    return stats.data
      .filter(e => e.bmi && e.bmi < 40 && e.bmi > 15)
      .map(e => ({ x: e.bmi, y: e.rank, name: e.name }));
  }, [stats]);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 border-b md:p-6 bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold font-headline tracking-tight md:text-3xl text-primary">
              {t('title')}
            </h1>
            <p className="text-xs text-muted-foreground hidden md:block">{t('description')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={division} onValueChange={setDivision}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Men Rx</SelectItem>
              <SelectItem value="2">Women Rx</SelectItem>
              <SelectItem value="11">Teens (14-15)</SelectItem>
              <SelectItem value="18">Masters (35-39)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Worldwide</SelectItem>
              <SelectItem value="29">Europe</SelectItem>
              <SelectItem value="35">NA East</SelectItem>
              <SelectItem value="34">NA West</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Users className="h-4 w-4" /> {t('analyzed')}</CardDescription>
              <CardTitle className="text-3xl font-bold">{stats?.totalCount || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('medianScore')}</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-400">{stats?.median || 0} {t('reps')}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /> {t('top10')}</CardDescription>
              <CardTitle className="text-3xl font-bold text-yellow-500">{stats?.p90 || 0} {t('reps')}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="font-bold text-yellow-600">{t('elite')}</CardDescription>
              <CardTitle className="text-3xl font-bold text-yellow-600">{stats?.p99 || 0} {t('reps')}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> {t('scoreDistribution')}</CardTitle>
              <CardDescription>{t('scoreDistributionDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Weight className="h-5 w-5" /> {t('bmiCorrelation')}</CardTitle>
              <CardDescription>{t('bmiCorrelationDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" dataKey="x" name="BMI" label={{ value: 'BMI', position: 'insideBottom', offset: -10 }} stroke="#888" />
                  <YAxis type="number" dataKey="y" name="Rank" reversed label={{ value: 'Rank', angle: -90, position: 'insideLeft' }} stroke="#888" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Scatter name="Athletes" data={scatterData} fill="hsl(var(--primary))">
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.y <= 100 ? '#eab308' : 'hsl(var(--primary))'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg flex items-start gap-3 border border-border/50">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{t('methodologyTitle')}</p>
            <p>{t('methodologyDesc')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
