'use client';

import { FileUploader } from "@/components/file-uploader";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft } from "lucide-react";
import { useUser } from "@/firebase/provider";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function ScanClient() {
    const t = useTranslations('ScanPage');
    const { user } = useUser();
    const router = useRouter();
    const { toggleSidebar } = useSidebar();

    const handleManualAddClick = () => {
        if (!user || user.isAnonymous) {
            router.push('/login');
        } else {
            router.push('/wod/new');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between gap-4 p-4 border-b md:p-6">
                <div className="flex items-center gap-2 md:hidden">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div onClick={toggleSidebar} className="flex items-center gap-4 cursor-pointer">
                        <h1 className="text-2xl font-bold tracking-tight font-headline">
                            {t('title')}
                        </h1>
                    </div>
                </div>
                <div className="hidden items-center gap-4 md:flex">
                    <SidebarTrigger />
                    <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
                        {t('title')}
                    </h1>
                </div>
                <Button onClick={handleManualAddClick} variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('manualButton')}
                </Button>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
                <FileUploader />
            </main>
        </div>
    );
}
