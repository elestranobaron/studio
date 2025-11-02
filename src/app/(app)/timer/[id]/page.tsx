import Link from "next/link";
import { notFound } from "next/navigation";
import { wods } from "@/lib/data";
import { TimerClient } from "@/components/timer-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TimerPage({ params }: { params: { id: string } }) {
  const wod = wods.find((w) => w.id === params.id);

  if (!wod) {
    notFound();
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-background p-4">
      <div className="absolute top-4 left-4">
        <Button asChild variant="ghost">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>
      <div className="grid lg:grid-cols-2 gap-16 items-center w-full max-w-6xl">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-primary">
            {wod.name}
          </h1>
          <p className="text-xl text-muted-foreground">{wod.type}</p>
          <Card>
            <CardHeader>
              <CardTitle>The Workout</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-muted-foreground text-lg">
              {wod.description}
            </CardContent>
          </Card>
        </div>
        <div className="flex items-center justify-center">
          <TimerClient wod={wod} />
        </div>
      </div>
    </div>
  );
}
