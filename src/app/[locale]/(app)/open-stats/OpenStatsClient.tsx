
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useOpenStats, type LeaderboardEntry, type WorkoutScoreDetail } from '@/hooks/use-open-stats';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, Cell, ReferenceLine, Label as RechartsLabel
} from 'recharts';
import { 
  LoaderCircle, Info, Users, BarChart3, Weight, Trophy, 
  AlertTriangle, Calendar as CalendarIcon, Activity, Target, Gem, Lock, ListOrdered, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function OpenStatsClient() {
  const t = useTranslations('OpenStatsPage');
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { fetchLeaderboard, stats, isLoading, error } = useOpenStats();

  const [year, setYear] = useState("2026");
  const [workout, setWorkout] = useState("0");
  const [division, setDivision] = useState("1");
  const [region, setRegion] = useState("0");
  
  const [userScoreInput, setUserScoreInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      fetchLeaderboard(parseInt(year), parseInt(workout), parseInt(division), parseInt(region));
    }
  }, [year, workout, division, region, fetchLeaderboard, isMounted]);

  const formatScore = (val: number, isTime: boolean) => {
    if (workout === "0") return `#${val}`;
    if (!isTime) return `${val} reps`;
    const m = Math.floor(val / 60);
    const s = val % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const histogramData = useMemo(() => {
    if (!stats || !stats.data || stats.data.length === 0) return [];
    const bins: Record<string, number> = {};
    const values = stats.data.map(e => e.reps);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const binCount = 12;
    const step = Math.ceil((max - min) / binCount) || 1;

    stats.data.forEach(entry => {
      const bin = Math.floor(entry.reps / step) * step;
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
      .filter(e => e.bmi && e.bmi < 40 && e.bmi > 15)
      .map(e => ({ x: e.bmi, y: e.rank, name: e.name }));
  }, [stats]);

  const topTenAthletes = useMemo(() => {
    if (!stats || !stats.data) return [];
    return [...stats.data]
      .sort((a, b) => {
        if (workout === "0") return a.rank - b.rank;
        return stats.isTime ? a.reps - b.reps : b.reps - a.reps;
      })
      .slice(0, 10);
  }, [stats, workout]);

  const userNumericScore = useMemo(() => {
    if (!userScoreInput) return null;
    if (userScoreInput.includes(':')) {
      const [m, s] = userScoreInput.split(':').map(Number);
      return (m * 60) + (s || 0);
    }
    return parseInt(userScoreInput) || null;
  }, [userScoreInput]);

  const userPercentile = useMemo(() => {
    if (!stats || !stats.data || userNumericScore === null) return null;
    const scores = stats.data.map(e => e.reps).sort((a, b) => a - b);
    
    let index = scores.findIndex(s => s >= userNumericScore);
    if (index === -1) index = scores.length;

    let percentile = Math.round((index / scores.length) * 100);
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
                {workout === "0" ? "Classement mondial (Points)" : `Statistiques de l'épreuve ${year}.${workout}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={year} onValueChange={setYear} disabled={isLoading}>
              <SelectTrigger className="w-[100px] h-9 border-primary/20 bg-primary/5">
                <CalendarIcon className="h-3 w-3 mr-2" />
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workout} onValueChange={setWorkout} disabled={isLoading}>
              <SelectTrigger className="w-[120px] h-9">
                <Activity className="h-3 w-3 mr-2" />
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
        
        <div className="flex items-center gap-4 px-4 pb-3 md:px-6 overflow-x-auto no-scrollbar border-t pt-3 bg-muted/20">
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
            <Button variant="outline" size="sm" onClick={() => fetchLeaderboard(parseInt(year), parseInt(workout), parseInt(division), parseInt(region))} className="ml-auto">
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
                  placeholder={workout === "0" ? "Rang" : (stats?.isTime ? "MM:SS" : "Reps")}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg overflow-hidden h-[450px]">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" /> 
                {workout === "0" ? "Distribution des rangs" : t('charts.distribution')}
              </CardTitle>
              <CardDescription>
                {workout === "0" 
                  ? "Aperçu de la position relative des athlètes dans l'échantillon." 
                  : "Fréquence des scores obtenus par les athlètes analysés."}
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
                        label={{ value: 'Score / Rang', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Nb Athlètes', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      
                      {userNumericScore !== null && (
                        <ReferenceLine 
                          x={histogramData.find(b => userNumericScore >= b.name && userNumericScore < (b.name + 10))?.label} 
                          stroke="hsl(var(--accent-foreground))" 
                          strokeWidth={3} 
                          strokeDasharray="5 5"
                        >
                          <RechartsLabel 
                            value="MOI" 
                            position="top" 
                            fill="hsl(var(--accent-foreground))" 
                            fontSize={12} 
                            fontWeight="bold"
                          />
                        </ReferenceLine>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg overflow-hidden h-[450px]">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2 text-lg"><Weight className="h-5 w-5 text-primary" /> {t('charts.bmi')}</CardTitle>
              <CardDescription>{t('charts.bmiSub')}</CardDescription>
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
                      <XAxis type="number" dataKey="x" name="BMI" domain={[18, 35]} label={{ value: 'IMC (BMI)', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis type="number" dataKey="y" name="Rank" reversed label={{ value: 'Rang Mondial', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
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

        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListOrdered className="h-5 w-5 text-primary" /> 
                {t('leaderboard.title')}
              </CardTitle>
              <CardDescription>
                {workout === "0" ? "Top 10 du classement mondial par points (somme des rangs)." : `Top 10 des athlètes pour l'épreuve ${year}.${workout}.`}
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
                  {topTenAthletes.map((athlete, idx) => (
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
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Aide à la lecture</p>
            <p className="mb-2">
              <strong>Overall</strong> : Le score affiché correspond au total des points (somme des places). James Sprague avec 31 points signifie qu'il a été extrêmement régulier sur les 3 épreuves.
            </p>
            <p>
              <strong>Distribution</strong> : Pour un workout spécifique, montre si vous êtes dans la "bosse" (la moyenne) ou dans les extrémités (élite ou débutant). 
              {stats?.isTime ? " Plus le chrono est bas, plus vous êtes vers la gauche." : " Plus le nombre de reps est haut, plus vous êtes vers la droite."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
