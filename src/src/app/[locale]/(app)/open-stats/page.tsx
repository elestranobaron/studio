'use client';

import { useState, useMemo } from 'react';
import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, ZAxis, Cell, LineChart, Line 
} from 'recharts';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { 
  LoaderCircle, ArrowLeft, BarChart3, Info, 
  TrendingUp, Users, Scale, Activity 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOpenStatsData, AthleteData } from '@/hooks/use-open-stats';
import { useTranslations } from 'next-intl';

const DIVISIONS = [
  { id: "1", name: "Men Rx" },
  { id: "2", name: "Women Rx" },
  { id: "18", name: "Men 35-39" },
  { id: "19", name: "Women 35-39" },
];

const REGIONS = [
  { id: "0", name: "Worldwide" },
  { id: "29", name: "Europe" },
  { id: "35", name: "NA East" },
  { id: "34", name: "NA West" },
  { id: "32", name: "Oceania" },
];

export default function OpenStatsPage() {
  const t = useTranslations('OpenStatsPage');
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();

  const [division, setDivision] = useState("1");
  const [region, setRegion] = useState("0");
  const [workout, setWorkout] = useState(1);
  const [scaled, setScaled] = useState("0");

  const { data, loading, error, progress } = useOpenStatsData({
    division,
    region,
    scaled,
    workout,
    samplePages: 10 // Fetch top 500 for statistics
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const sortedReps = [...data].sort((a, b) => a.reps - b.reps);
    const median = sortedReps[Math.floor(data.length * 0.5)].reps;
    const p90 = sortedReps[Math.floor(data.length * 0.9)].reps;
    const p99 = sortedReps[Math.floor(data.length * 0.99)].reps;

    const avgBMI = data.reduce((acc, curr) => acc + (curr.bmi || 0), 0) / data.filter(a => a.bmi).length;

    // Reps distribution histogram
    const min = sortedReps[0].reps;
    const max = sortedReps[data.length - 1].reps;
    const step = Math.max(1, Math.ceil((max - min) / 10));
    const histogram: { range: string, count: number }[] = [];

    for (let i = min; i <= max; i += step) {
      const count = data.filter(a => a.reps >= i && a.reps < i + step).length;
      histogram.push({ range: `${i}-${i+step-1}`, count });
    }

    return { median, p90, p99, avgBMI, histogram };
  }, [data]);

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><LoaderCircle className="animate-spin" /></div>;

  if (!user?.premium) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="bg-primary/10 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
            <BarChart3 className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-headline font-bold">Open Stats Premium</h1>
          <p className="text-muted-foreground text-lg">
            Compare yourself to the best. Unlock advanced analytics for the CrossFit Open 2026.
          </p>
          <Button size="lg" onClick={() => router.push('/premium')} className="w-full">
            Upgrade to Premium
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      <header className="flex items-center justify-between p-4 border-b md:p-6 bg-background">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
            Open Stats 2026
          </h1>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          Live Data
        </Badge>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Filters */}
        <Card className="border-2 border-primary/10">
          <CardContent className="p-4 md:p-6 flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[150px]">
              <label className="text-xs font-bold uppercase text-muted-foreground">Division</label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-[150px]">
              <label className="text-xs font-bold uppercase text-muted-foreground">Region</label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGIONS.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-[150px]">
              <label className="text-xs font-bold uppercase text-muted-foreground">Workout</label>
              <Select value={workout.toString()} onValueChange={(v) => setWorkout(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">26.1</SelectItem>
                  <SelectItem value="2">26.2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-[150px]">
              <label className="text-xs font-bold uppercase text-muted-foreground">Scaled/Rx</label>
              <Select value={scaled} onValueChange={setScaled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Rx</SelectItem>
                  <SelectItem value="1">Scaled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <LoaderCircle className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Scanning Leaderboards...</p>
              <div className="w-full max-w-xs">
                <Progress value={progress} />
              </div>
            </div>
          </div>
        ) : error ? (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-6 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : stats ? (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Median Score</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.median} <span className="text-sm font-normal text-muted-foreground">reps</span></div>
                  <p className="text-xs text-muted-foreground">Top 50% percentile</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Top 10% (P90)</CardTitle>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.p90} <span className="text-sm font-normal text-muted-foreground">reps</span></div>
                  <p className="text-xs text-muted-foreground">Elite amateur level</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Top 1% (P99)</CardTitle>
                  <Activity className="w-4 h-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.p99} <span className="text-sm font-normal text-muted-foreground">reps</span></div>
                  <p className="text-xs text-muted-foreground">Games athlete territory</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Avg BMI</CardTitle>
                  <Scale className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.avgBMI.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">Across top athletes</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribution Chart */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                  <CardDescription>Number of athletes per rep range (Sample: {data.length})</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.histogram}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="range" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                        cursor={{ fill: 'hsl(var(--primary))', opacity: 0.1 }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* BMI vs Rank Scatter */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>BMI vs Performance</CardTitle>
                  <CardDescription>Correlation between BMI and World Rank</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis 
                        type="number" 
                        dataKey="bmi" 
                        name="BMI" 
                        unit="" 
                        domain={['dataMin - 1', 'dataMax + 1']} 
                        fontSize={10}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="rank" 
                        name="Rank" 
                        reversed 
                        fontSize={10}
                      />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Athletes" data={data.filter(a => a.bmi)} fill="hsl(var(--primary))" opacity={0.6}>
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.rank < 100 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3 border border-border">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">About this data</p>
                Live CrossFit Open 2026 data fetched via public API. These analytics are based on a significant sample size of the top leaderboard. Data is refreshed daily.
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            No data available for this selection.
          </div>
        )}
      </main>
    </div>
  );
}
