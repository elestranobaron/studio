import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Repeat, Clock, Hourglass, Timer as TimerIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getTranslations } from "next-intl/server";

export default async function TimersPage() {
  const t = await getTranslations('TimersPage');

  const timerTypes = [
    {
      name: t('forTime'),
      description: t('forTimeDescription'),
      icon: Clock,
      href: "/timers/for-time",
    },
    {
      name: t('amrap'),
      description: t('amrapDescription'),
      icon: Repeat,
      href: "/timers/amrap",
    },
    {
      name: t('emom'),
      description: t('emomDescription'),
      icon: Hourglass,
      href: "/timers/emom",
    },
    {
      name: t('tabata'),
      description: t('tabataDescription'),
      icon: TimerIcon,
      href: "/timers/tabata",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 p-4 border-b md:p-6">
         <SidebarTrigger className="md:hidden" />
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
          {t('title')}
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
          {t('footer')}
        </p>
      </main>
    </div>
  );
}
