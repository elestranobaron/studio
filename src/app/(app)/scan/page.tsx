
'use client';

import { FileUploader } from "@/components/file-uploader";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/firebase/provider";

export default function ScanPage() {
    const { user } = useUser();

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between gap-4 p-4 border-b md:p-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
                        Scan WOD
                    </h1>
                </div>
                {user && !user.isAnonymous && (
                    <Button asChild variant="outline">
                        <Link href="/wod/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Ajouter manuellement
                        </Link>
                    </Button>
                )}
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
                <FileUploader />
            </main>
        </div>
    );
}
