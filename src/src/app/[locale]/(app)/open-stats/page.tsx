'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOpenStats, type Athlete } from '@/hooks/use-open-stats';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, ZAxis, Cell 
} from 'recharts';
import { LoaderCircle, BarChart3, Info, TrendingUp, Users, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';

export default function OpenStatsPage() {
  const t = useTranslations('OpenStatsPage');
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const { data, loading, error, fetchStats } = useOpenStats();

  const [division, setDivision] = useState('1');
  const [region, setRegion] = useState('0');
  const [scaled, setScaled] = useState('0');

  useEffect(() => {
    if (!isUserLoading && (!user || !user.premium)) {
      router.push('/premium');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user?.premium) {
      fetchStats({ division, region, scaled });
    }
  }, [division, region, scaled, user?.premium, fetchStats]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const scores = data.map(a => a.scores[0]?.reps || 0).sort((a, b) => a - b);
    const median = scores[Math.floor(scores.length / 2)];
    const p90 = scores[Math.floor(scores.length * 0.9)];
    const p99 = scores[Math.floor(scores.length * 0.99)];

    // Distribution
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const step = Math.ceil((max - min) / 10);
    const distribution = Array.from({ length: 10 }, (_, i) => {
      const start = min + i * step;
      const end = start + step;
      return {
        range: `${start}-${end}`,
        count: scores.filter(s => s >= start && s < end).length
      };
    });

    // Correlation data
    const scatterData = data
      .filter(a => a.bmi && a.rank)
      .map(a => ({ x: a.bmi, y: a.rank, name: a.name }));

    return { median, p90, p99, distribution, scatterData };
  }, [data]);

  if (isUserLoading || !user?.premium) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 border-b md:p-6 bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center gap-2">
              <BarChart3 className="text-primary" /> {t('title')}
            </h1>
            <p className="text-xs text-muted-foreground hidden md:block">
              {t('description')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={division} onValueChange={setDivision}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Men Rx</SelectItem>
              <SelectItem value="2">Women Rx</SelectItem>
              <SelectItem value="18">Masters 35-39</SelectItem>
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Worldwide</SelectItem>
              <SelectItem value="29">Europe</SelectItem>
              <SelectItem value="35">NA East</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Analyzing Open Leaderboards...</p>
          </div>
        ) : error ? (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Median Score
                  </CardDescription>
                  <CardTitle className="text-3xl font-headline">{stats?.median || 0} <span className="text-sm font-normal text-muted-foreground">reps</span></CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> 90th Percentile
                  </CardDescription>
                  <CardTitle className="text-3xl font-headline">{stats?.p90 || 0} <span className="text-sm font-normal text-muted-foreground">reps</span></CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-yellow-500/5 border-yellow-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> 99th Percentile
                  </CardDescription>
                  <CardTitle className="text-3xl font-headline text-yellow-500">{stats?.p99 || 0} <span className="text-sm font-normal text-muted-foreground">reps</span></CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Score Distribution (26.1)</CardTitle>
                  <CardDescription>Frequency of scores in your current sample.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.distribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--primary))' }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rank vs. BMI Analysis</CardTitle>
                  <CardDescription>Correlation between Body Mass Index and overall ranking.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis type="number" dataKey="x" name="BMI" stroke="hsl(var(--muted-foreground))" fontSize={12} unit="" domain={['auto', 'auto']} />
                      <YAxis type="number" dataKey="y" name="Rank" stroke="hsl(var(--muted-foreground))" fontSize={12} reversed />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Athletes" data={stats?.scatterData} fill="hsl(var(--primary))">
                        {stats?.scatterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fillOpacity={0.6} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="text-primary" /> Advanced Cohort Analytics
                </CardTitle>
                <CardDescription>Sample of top performing athletes in this segment.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2">Rank</th>
                        <th className="text-left py-2">Name</th>
                        <th className="text-left py-2">Age</th>
                        <th className="text-left py-2">BMI</th>
                        <th className="text-right py-2">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 10).map((athlete) => (
                        <tr key={athlete.name} className="border-b border-muted/50 hover:bg-muted/30 transition-colors">
                          <td className="py-3 font-bold text-primary">#{athlete.rank}</td>
                          <td className="py-3">{athlete.name}</td>
                          <td className="py-3">{athlete.age}</td>
                          <td className="py-3">{athlete.bmi?.toFixed(1) || '-'}</td>
                          <td className="py-3 text-right font-mono">{athlete.scores[0]?.display || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
