
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useOpenStats } from '@/hooks/use-open-stats';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, Cell
} from 'recharts';
import { 
  LoaderCircle, Users, BarChart3, Weight, Trophy, 
  AlertTriangle, Calendar as CalendarIcon, Activity, Target, Gem, Lock, ListOrdered, ChevronDown, ChevronUp, Scale, Ruler, UserCircle2, Filter, Info as InfoIcon
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type ScatterMetric = 'bmi' | 'age' | 'height' | 'weight';

export default function OpenStatsClient() {
  const t = useTranslations('OpenStatsPage');
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { fetchLeaderboard, stats, isLoading, error } = useOpenStats();

  const [year, setYear] = useState("2026");
  const [workout, setWorkout] = useState("0");
  const [division, setDivision] = useState("1");
  const [region, setRegion] = useState("0");
  const [scaled, setScaled] = useState("0");
  const [scatterMetric, setScatterMetric] = useState<ScatterMetric>('bmi');
  
  const [userScoreInput, setUserScoreInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      fetchLeaderboard(parseInt(year), parseInt(workout), parseInt(division), parseInt(region), parseInt(scaled));
    }
  }, [year, workout, division, region, scaled, fetchLeaderboard, isMounted]);

  const formatScore = (val: number, isTime: boolean) => {
    if (workout === "0") return val.toString();
    if (!isTime) return `${val} reps`;
    const m = Math.floor(val / 60);
    const s = val % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const histogramData = useMemo(() => {
    if (!stats || !stats.data || stats.data.length === 0) return [];
    
    const isWorkoutView = workout !== "0";
    if (!isWorkoutView) return [];

    const values = stats.data.map(e => stats.isTime ? (e.seconds || 0) : e.reps);
    
    const counts: Record<number, number> = {};
    values.forEach(v => {
        counts[v] = (counts[v] || 0) + 1;
    });

    const uniqueValues = Object.keys(counts).map(Number).sort((a, b) => a - b);
    
    // Si peu de valeurs uniques (< 25), on les affiche telles quelles pour éviter les "ghost scores"
    if (uniqueValues.length <= 25) {
        return uniqueValues.map(v => ({
            name: v,
            count: counts[v],
            label: formatScore(v, stats.isTime)
        }));
    }

    // Sinon regroupement logique par paliers de 30s ou 5 reps
    const step = stats.isTime ? 30 : 5;
    const bins: Record<number, number> = {};
    
    values.forEach(val => {
      const bin = Math.floor(val / step) * step;
      bins[bin] = (bins[bin] || 0) + 1;
    });

    return Object.entries(bins)
      .map(([name, count]) => ({ 
        name: parseInt(name), 
        count,
        label: formatScore(parseInt(name), stats.isTime)
      }))
      .sort((a, b) => a.name - b.name);
  }, [stats, workout]);

  const scatterData = useMemo(() => {
    if (!stats || !stats.data) return [];
    return stats.data
      .map(e => {
        let xValue: number | null = null;
        switch(scatterMetric) {
          case 'age': xValue = (e.age > 10 && e.age < 90) ? e.age : null; break;
          case 'height': xValue = (e.heightCm && e.heightCm > 120 && e.heightCm < 230) ? e.heightCm : null; break;
          case 'weight': xValue = (e.weightKg && e.weightKg > 35 && e.weightKg < 200) ? e.weightKg : null; break;
          case 'bmi': default: xValue = e.bmi; break;
        }
        return { x: xValue, y: e.rank, name: e.name };
      })
      .filter(e => e.x !== null);
  }, [stats, scatterMetric]);

  const athletesList = useMemo(() => {
    if (!stats || !stats.data) return [];
    return [...stats.data].sort((a, b) => a.rank - b.rank);
  }, [stats]);

  const userNumericScore = useMemo(() => {
    if (!userScoreInput) return null;
    if (userScoreInput.includes(':')) {
      const parts = userScoreInput.split(':');
      const m = parseInt(parts[0]);
      const s = parseInt(parts[1]) || 0;
      return (m * 60) + s;
    }
    return parseInt(userScoreInput) || null;
  }, [userScoreInput]);

  const userPercentile = useMemo(() => {
    if (!stats || !stats.data || userNumericScore === null) return null;
    const values = stats.data.map(e => stats.isTime ? (e.seconds || 0) : e.reps).sort((a, b) => a - b);
    
    let index = values.findIndex(s => s >= userNumericScore);
    if (index === -1) index = values.length;

    let percentile = Math.round((index / values.length) * 100);
    if (stats.isTime) {
        percentile = 100 - percentile;
    }
    return Math.max(1, Math.min(100, percentile));
  }, [stats, userNumericScore]);

  if (!isMounted || isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const scatterConfig = {
    bmi: { domain: ['auto', 'auto'], label: t('filters.selector.bmi'), icon: Weight },
    age: { domain: ['auto', 'auto'], label: t('filters.selector.age'), icon: UserCircle2 },
    height: { domain: ['auto', 'auto'], label: t('filters.selector.height'), icon: Ruler },
    weight: { domain: ['auto', 'auto'], label: t('filters.selector.weight'), icon: Scale },
  };

  const yearsRange = Array.from({ length: 2026 - 2007 + 1 }, (_, i) => (2026 - i).toString());

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex flex-col border-b bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-headline tracking-tight md:text-3xl text-primary">
                  {t('title')}
                </h1>
              </div>
              <p className="text-xs text-muted-foreground hidden md:block">
                {workout === "0" ? t('description') : `${year}.${workout}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={year} onValueChange={setYear} disabled={isLoading}>
              <SelectTrigger className="w-[100px] h-9 border-primary/20 bg-primary/5">
                <CalendarIcon className="h-3 w-3 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearsRange.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={workout} onValueChange={setWorkout} disabled={isLoading}>
              <SelectTrigger className="w-[120px] h-9">
                <Activity className="h-3 w-3 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('filters.allWorkouts')}</SelectItem>
                <SelectItem value="1">{year.slice(2)}.1</SelectItem>
                <SelectItem value="2">{year.slice(2)}.2</SelectItem>
                <SelectItem value="3">{year.slice(2)}.3</SelectItem>
                <SelectItem value="4">{year.slice(2)}.4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-4 px-4 pb-3 md:px-6 overflow-x-auto no-scrollbar border-t pt-3 bg-muted/20">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground mr-2">{t('filters.label')}</span>
          </div>
          <Select value={division} onValueChange={setDivision} disabled={isLoading}>
            <SelectTrigger className="w-[140px] h-8 text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t('filters.divisions.men')}</SelectItem>
              <SelectItem value="2">{t('filters.divisions.women')}</SelectItem>
              <SelectItem value="11">{t('filters.divisions.teens1415')}</SelectItem>
              <SelectItem value="18">{t('filters.divisions.masters3539')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion} disabled={isLoading}>
            <SelectTrigger className="w-[140px] h-8 text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t('filters.regions.worldwide')}</SelectItem>
              <SelectItem value="30">{t('filters.regions.africa')}</SelectItem>
              <SelectItem value="28">{t('filters.regions.asia')}</SelectItem>
              <SelectItem value="29">{t('filters.regions.europe')}</SelectItem>
              <SelectItem value="35">{t('filters.regions.naEast')}</SelectItem>
              <SelectItem value="34">{t('filters.regions.naWest')}</SelectItem>
              <SelectItem value="32">{t('filters.regions.oceania')}</SelectItem>
              <SelectItem value="33">{t('filters.regions.southAmerica')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={scaled} onValueChange={setScaled} disabled={isLoading}>
            <SelectTrigger className="w-[140px] h-8 text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t('filters.scaledTypes.rxd')}</SelectItem>
              <SelectItem value="1">{t('filters.scaledTypes.scaled')}</SelectItem>
              <SelectItem value="2">{t('filters.scaledTypes.foundations')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchLeaderboard(parseInt(year), parseInt(workout), parseInt(division), parseInt(region), parseInt(scaled))} className="ml-auto">
              Réessayer
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
                <Users className="h-3 w-3" /> {t('metrics.athletes')}
              </CardDescription>
              <CardTitle className="text-3xl font-bold">{isLoading ? "..." : (stats?.totalCount || 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-bold">{t('metrics.median')}</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-400">
                {isLoading ? "..." : formatScore(stats?.median || 0, stats?.isTime || false)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold">
                <Trophy className="h-3 w-3 text-yellow-500" /> {t('metrics.top10')}
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-yellow-500">
                {isLoading ? "..." : formatScore(stats?.p90 || 0, stats?.isTime || false)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="font-bold text-yellow-600 text-xs uppercase tracking-wider">{t('metrics.elite')}</CardDescription>
              <CardTitle className="text-3xl font-bold text-yellow-600">
                {isLoading ? "..." : formatScore(stats?.p99 || 0, stats?.isTime || false)}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="md:col-span-4 lg:col-span-1 border-accent/30 shadow-lg relative overflow-hidden">
            {!user?.premium && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center">
                <Lock className="h-6 w-6 text-muted-foreground mb-2" />
                <p className="text-[10px] font-bold uppercase mb-2">Réservé Premium</p>
                <Button asChild size="sm" className="h-7 text-[10px] px-2">
                  <Link href="/premium"><Gem className="h-3 w-3 mr-1" /> Devenir Premium</Link>
                </Button>
              </div>
            )}
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-accent-foreground">
                <Target className="h-3 w-3" /> {t('userScore.title')}
              </CardDescription>
              <div className="flex items-center gap-2 mt-1">
                <Input 
                  placeholder={workout === "0" ? "Points" : (stats?.isTime ? "MM:SS" : "Reps")}
                  value={userScoreInput}
                  onChange={(e) => setUserScoreInput(e.target.value)}
                  className="h-8 text-sm border-accent/50 bg-background/50 focus-visible:ring-accent"
                  disabled={!user?.premium}
                />
              </div>
            </CardHeader>
            <CardContent>
               {userPercentile !== null && (
                 <div className="flex flex-col items-center justify-center pt-1 animate-in fade-in slide-in-from-top-1">
                    <p className="text-2xl font-bold text-accent-foreground">{userPercentile}%</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{t('userScore.percentile')}</p>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

        {stats && workout !== "0" && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="flex items-center justify-center gap-8 py-4">
              <div className="flex items-center gap-2">
                <InfoIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t('recap.maxReps')}:</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary">{stats.maxRepsInSample || "N/A"} reps</Badge>
              </div>
              {stats.inferredTimeCap && (
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{t('recap.timeCap')}:</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">{stats.inferredTimeCap}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg overflow-hidden h-[450px]">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" /> 
                {stats?.isTime ? t('charts.distribution') : "Distribution (Reps)"}
              </CardTitle>
              <CardDescription>
                {t('charts.distributionSub')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 h-full">
              <div className="h-[300px] w-full">
                {!isMounted || isLoading ? (
                  <div className="h-full w-full flex items-center justify-center bg-muted/10 rounded-md">
                    <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <BarChart data={histogramData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="label" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="text-center text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-widest">
                {stats?.isTime ? "Nb Athlètes (Score)" : "Nb Athlètes (Répétitions)"}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg overflow-hidden h-[450px]">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {React.createElement(scatterConfig[scatterMetric].icon, { className: "h-5 w-5 text-primary" })}
                  {t('charts.bmi')}
                </CardTitle>
                <CardDescription>{t('charts.bmiSub')}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {!user?.premium && <Gem className="h-4 w-4 text-yellow-500" />}
                <Select 
                  value={scatterMetric} 
                  onValueChange={(v) => setScatterMetric(v as ScatterMetric)}
                  disabled={!user?.premium || isLoading}
                >
                  <SelectTrigger className="w-[100px] h-8 text-xs bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bmi">{t('filters.selector.bmi')}</SelectItem>
                    <SelectItem value="age">{t('filters.selector.age')}</SelectItem>
                    <SelectItem value="height">{t('filters.selector.height')}</SelectItem>
                    <SelectItem value="weight">{t('filters.selector.weight')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-6 h-full">
              <div className="h-[300px] w-full">
                {!isMounted || isLoading ? (
                  <div className="h-full w-full flex items-center justify-center bg-muted/10 rounded-md">
                    <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name={scatterMetric} 
                        domain={scatterConfig[scatterMetric].domain as any} 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10} 
                      />
                      <YAxis type="number" dataKey="y" name="Rank" reversed domain={['auto', 'auto']} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                      />
                      <Scatter name="Athletes" data={scatterData}>
                        {scatterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.y <= 10 ? '#eab308' : 'hsl(var(--primary))'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex justify-between px-10 text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-2">
                <span>{scatterConfig[scatterMetric].label}</span>
                <span>{workout === "0" ? "Rang Global" : "Rang Workout"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListOrdered className="h-5 w-5 text-primary" /> 
                {t('leaderboard.title')}
              </CardTitle>
              <CardDescription>
                {workout === "0" ? t('leaderboard.descriptionOverall') : t('leaderboard.descriptionWorkout', { year, workout })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!isMounted || isLoading ? (
              <div className="p-8 flex justify-center"><LoaderCircle className="animate-spin h-8 w-8 text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[100px]">{t('leaderboard.rank')}</TableHead>
                    <TableHead>{t('leaderboard.name')}</TableHead>
                    <TableHead className="text-right">{workout === "0" ? "Points" : t('leaderboard.score')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {athletesList.map((athlete, idx) => (
                    <React.Fragment key={`row-group-${idx}`}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(expandedRow === athlete.name ? null : athlete.name)}
                      >
                        <TableCell>
                          {expandedRow === athlete.name ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-bold">
                          {athlete.rank === 1 ? '🥇' : athlete.rank === 2 ? '🥈' : athlete.rank === 3 ? '🥉' : `#${athlete.rank}`}
                        </TableCell>
                        <TableCell className="font-medium uppercase">
                          {athlete.name}
                          <p className="text-[10px] text-muted-foreground font-normal">{athlete.region}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary font-bold">
                          {workout === "0" ? athlete.overallScore : athlete.scoreDisplay}
                        </TableCell>
                      </TableRow>
                      {expandedRow === athlete.name && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={4} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                              {athlete.scores.map((s) => (
                                <div key={s.ordinal} className={cn("p-3 rounded-md border", s.ordinal === parseInt(workout) ? "bg-primary/10 border-primary/30" : "bg-card/50")}>
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{year.slice(2)}.{s.ordinal}</p>
                                  <div className="flex justify-between items-end">
                                    <div>
                                      <p className="text-sm font-bold">{s.scoreDisplay}</p>
                                      <p className="text-[10px] text-muted-foreground">Rang: #{s.rank}</p>
                                    </div>
                                  </div>
                                  {s.breakdown && (
                                    <div className="mt-2 text-[10px] text-foreground leading-tight whitespace-pre-wrap border-t pt-2 border-border/50">
                                      {s.breakdown}
                                    </div>
                                  )}
                                  {s.time && (
                                    <p className="mt-1 text-[10px] text-accent-foreground font-semibold">Tiebreak: {s.time}</p>
                                  )}
                                  {(s.affiliate || s.judge) && (
                                    <div className="mt-2 space-y-0.5 opacity-70">
                                      {s.affiliate && <p className="text-[9px]">At: {s.affiliate}</p>}
                                      {s.judge && <p className="text-[9px]">Judge: {s.judge}</p>}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="bg-muted/30 p-4 rounded-lg flex items-start gap-3 border border-border/50">
          <InfoIcon className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{t('methodology.title')}</p>
            <p className="mb-2">
              <strong>{t('methodology.unificationTitle')}</strong> : {t('methodology.unificationDesc')}
            </p>
            <p>
              <strong>{t('methodology.overallTitle')}</strong> : {t('methodology.overallDesc')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
