
'use client';

import { MainNav } from "@/components/main-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const { openMobile, setOpenMobile, toggleSidebar } = useSidebar();
    const isMobile = useIsMobile();
    const t = useTranslations('UserNav');

    const handleClose = () => setOpenMobile(false);

    return (
        <>
            <Sidebar className="flex flex-col">
                 <div className="absolute inset-0 w-full z-0 brightness-50 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                        <video
                            src="/lateral_logo.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-contain transition-transform duration-300 transform scale-[1.3] md:scale-[1.1]"
                            aria-label="WODBurner logo animation in background"
                        />
                    </div>
                 </div>
                 <div className="relative z-10 flex flex-col h-full bg-black/20 backdrop-blur-[2px]">
                    <SidebarHeader className="p-4">
                        {isMobile && openMobile ? (
                            <Button
                                variant="ghost"
                                onClick={handleClose}
                                className="flex items-center gap-2 text-xl font-bold font-headline text-foreground h-auto p-0 hover:bg-transparent"
                            >
                                <ArrowLeft className="h-5 w-5" />
                                <span>Back</span>
                            </Button>
                        ) : (
                             <button
                                onClick={toggleSidebar}
                                className="h-12 flex items-center px-3 w-full text-left focus:outline-none focus:ring-2 focus:ring-sidebar-ring rounded-md transition-all hover:bg-white/5"
                                aria-label="Toggle sidebar"
                            >
                                 <div className="text-3xl font-bold font-headline text-primary tracking-widest drop-shadow-lg">
                                    WODBurner
                                 </div>
                            </button>
                        )}
                    </SidebarHeader>
                    <SidebarContent className="flex-1 px-2 py-4">
                        <MainNav />
                    </SidebarContent>
                    <SidebarFooter className="p-4">
                        <SidebarSeparator className="bg-white/10 mb-4" />
                        <UserNav />
                    </SidebarFooter>
                </div>
            </Sidebar>
            <SidebarInset className="bg-background shadow-inner">{children}</SidebarInset>
        </>
    );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}
