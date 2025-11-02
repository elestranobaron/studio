import Link from "next/link";
import { Button } from "@/components/ui/button";
import { wods } from "@/lib/data";
import { WodCard } from "@/components/wod-card";
import { PlusCircle } from "lucide-react";
import {
  SidebarTrigger
} from "@/components/ui/sidebar"

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b md:p-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden"/>
          <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
            My WODs
          </h1>
        </div>
        <Button asChild>
          <Link href="/scan">
            <PlusCircle className="mr-2 h-4 w-4" />
            Scan New WOD
          </Link>
        </Button>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wods.map((wod) => (
            <WodCard key={wod.id} wod={wod} />
          ))}
        </div>
      </main>
    </div>
  );
}
