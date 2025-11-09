
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Repeat, Clock, Hourglass, Timer as TimerIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

const timerTypes = [
  {
    name: "For Time",
    description: "A simple stopwatch to time your workout.",
    icon: Clock,
    href: "/timers/for-time",
  },
  {
    name: "AMRAP",
    description: "As Many Rounds/Reps As Possible in a set time.",
    icon: Repeat,
    href: "/timers/amrap",
  },
  {
    name: "EMOM",
    description: "Every Minute On the Minute, for a set number of minutes.",
    icon: Hourglass,
    href: "/timers/emom",
  },
  {
    name: "Tabata",
    description: "High-intensity intervals of 20s work, 10s rest.",
    icon: TimerIcon,
    href: "/timers/tabata",
  },
];

export default function TimersPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 p-4 border-b md:p-6">
         <SidebarTrigger className="md:hidden" />
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
          Smart Timers
        </h1>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {timerTypes.map((timer) => (
            <Link href={timer.href} key={timer.name} className="block h-full">
                <Card className="h-full flex flex-col justify-center text-center p-6 hover:border-primary hover:shadow-xl transition-all">
                  <CardHeader>
                    <timer.icon className="h-12 w-12 mx-auto text-primary" />
                    <CardTitle className="mt-4 font-headline text-2xl">
                      {timer.name}
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                      {timer.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-center text-muted-foreground">
          Or, select a WOD from the dashboard to launch a pre-configured timer.
        </p>
      </main>
    </div>
  );
}
