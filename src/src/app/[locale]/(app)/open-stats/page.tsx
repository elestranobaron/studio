'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useOpenStats } from '@/hooks/use-open-stats';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, Cell 
} from 'recharts';
import { LoaderCircle, Info, Users, BarChart3, Weight, Trophy, AlertTriangle, Calendar as CalendarIcon, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';

export default function OpenStatsPage() {
  const t = useTranslations('OpenStatsPage');
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const { fetchLeaderboard, stats, isLoading, error } = useOpenStats();

  // Filter states
  const [year, setYear] = useState("2026");
  const [workout, setWorkout] = useState("0"); // 0 = Overall, 1, 2, 3
  const [division, setDivision] = useState("1");
  const [region, setRegion] = useState("0");

  useEffect(() => {
    if (!isUserLoading && (!user || !user.premium)) {
      router.push('/premium');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user?.premium) {
      fetchLeaderboard(parseInt(year), parseInt(division), parseInt(region), parseInt(workout));
    }
  }, [user, year, division, region, workout, fetchLeaderboard]);

  const histogramData = useMemo(() => {
    if (!stats || stats.data.length === 0) return [];
    const bins: Record<string, number> = {};
    
    // Adjust binning based on overall or workout
    const step = parseInt(workout) === 0 ? 50 : 10;
    
    stats.data.forEach(entry => {
      const bin = Math.floor(entry.reps / step) * step;
      const label = `${bin}`;
      bins[label] = (bins[label] || 0) + 1;
    });
    return Object.entries(bins)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));
  }, [stats, workout]);

  const scatterData = useMemo(() => {
    if (!stats) return [];
    return stats.data
      .filter(e => e.bmi && e.bmi < 40 && e.bmi > 15)
      .map(e => ({ x: e.bmi, y: e.rank, name: e.name }));
  }, [stats]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const workoutLabel = workout === "0" ? "Overall" : `${year.slice(2)}.${workout}`;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex flex-col border-b bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center justify-between p-4 md:p-6 pb-2">
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
             <Select value={year} onValueChange={setYear} disabled={isLoading}>
              <SelectTrigger className="w-[100px] h-9 border-primary/20">
                <CalendarIcon className="h-3 w-3 mr-2 text-primary" />
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workout} onValueChange={setWorkout} disabled={isLoading}>
              <SelectTrigger className="w-[120px] h-9 border-primary/20">
                <Zap className="h-3 w-3 mr-2 text-primary" />
                <SelectValue placeholder="Workout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Overall</SelectItem>
                <SelectItem value="1">{year.slice(2)}.1</SelectItem>
                <SelectItem value="2">{year.slice(2)}.2</SelectItem>
                <SelectItem value="3">{year.slice(2)}.3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-4 pt-0 md:px-6 overflow-x-auto no-scrollbar">
          <Select value={division} onValueChange={setDivision} disabled={isLoading}>
            <SelectTrigger className="w-[140px] h-8 text-xs shrink-0">
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Men Rx</SelectItem>
              <SelectItem value="2">Women Rx</SelectItem>
              <SelectItem value="11">Teens (14-15)</SelectItem>
              <SelectItem value="18">Masters (35-39)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion} disabled={isLoading}>
            <SelectTrigger className="w-[140px] h-8 text-xs shrink-0">
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
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchLeaderboard(parseInt(year), parseInt(division), parseInt(region), parseInt(workout))} className="ml-auto">
              Réessayer
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
                <Users className="h-3 w-3" /> Athlètes ({year})
              </CardDescription>
              <CardTitle className="text-3xl font-bold">{isLoading ? "..." : (stats?.totalCount || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-bold">Médiane {workoutLabel}</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-400">{isLoading ? "..." : (stats?.median || 0)} <span className="text-sm font-normal text-muted-foreground">{workout === "0" ? "pts" : "reps"}</span></CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
                <Trophy className="h-3 w-3 text-yellow-500" /> Top 10%
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-yellow-500">{isLoading ? "..." : (stats?.p90 || 0)} <span className="text-sm font-normal text-muted-foreground">{workout === "0" ? "pts" : "reps"}</span></CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="font-bold text-yellow-600 text-xs uppercase tracking-wider">Élite (1%)</CardDescription>
              <CardTitle className="text-3xl font-bold text-yellow-600">{isLoading ? "..." : (stats?.p99 || 0)} <span className="text-sm font-normal text-muted-foreground">{workout === "0" ? "pts" : "reps"}</span></CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg overflow-hidden border-border/50">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-primary" /> Distribution des scores ({workoutLabel})</CardTitle>
              <CardDescription>Répartition de l'échantillon analysé</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[350px] w-full min-h-[350px]">
                {isLoading ? (
                  <div className="h-full w-full flex items-center justify-center bg-muted/10 rounded-md">
                    <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg overflow-hidden border-border/50">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2 text-lg"><Weight className="h-5 w-5 text-primary" /> Corrélation IMC / Rang</CardTitle>
              <CardDescription>Impact de la composition corporelle sur le classement</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[350px] w-full min-h-[350px]">
                {isLoading ? (
                  <div className="h-full w-full flex items-center justify-center bg-muted/10 rounded-md">
                    <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" dataKey="x" name="BMI" domain={[18, 35]} label={{ value: 'IMC', position: 'insideBottom', offset: -10, fontSize: 10 }} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis type="number" dataKey="y" name="Rank" reversed label={{ value: 'Rang', angle: -90, position: 'insideLeft', fontSize: 10 }} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      />
                      <Scatter name="Athletes" data={scatterData}>
                        {scatterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.y <= 100 ? '#eab308' : 'hsl(var(--primary))'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg flex items-start gap-3 border border-border/50">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Méthodologie</p>
            <p>Les données sont récupérées en temps réel via l'API CrossFit. Les statistiques sont basées sur un échantillon représentatif des premiers athlètes classés (Top Pages).</p>
          </div>
        </div>
      </main>
    </div>
  );
}
