
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
import { useRef, useEffect, useState } from "react";
import { ScrollProvider } from "@/hooks/use-scroll-context";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const { openMobile, setOpenMobile } = useSidebar();
    const isMobile = useIsMobile();
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;

        const handleScroll = () => {
            const { scrollTop } = scrollEl;
            setShowScrollTop(scrollTop > 200);
        };

        scrollEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollEl.removeEventListener('scroll', handleScroll);
    }, []);


    const handleClose = () => setOpenMobile(false);

    return (
        <ScrollProvider scrollContainerRef={scrollRef} showScrollTop={showScrollTop}>
            <Sidebar className="flex flex-col">
                 <div className="absolute inset-0 w-full z-0 brightness-50 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                        <video
                            src="/lateral_logo.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-contain transition-transform duration-300 transform scale-[1.3] md:scale-[1.17]"
                            aria-label="WODBurner logo animation in background"
                        />
                    </div>
                 </div>
                 <div className="relative z-10 flex flex-col h-full">
                    <SidebarHeader>
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
                            <div className="h-10 flex items-center px-2">
                                 <div className="text-2xl font-bold font-headline text-primary tracking-wider">
                                    WODBurner
                                 </div>
                            </div>
                        )}
                    </SidebarHeader>
                    <SidebarContent className="flex-1">
                        <MainNav />
                    </SidebarContent>
                    <SidebarFooter>
                        <SidebarSeparator />
                        <UserNav />
                    </SidebarFooter>
                </div>
            </Sidebar>
            <SidebarInset ref={scrollRef}>{children}</SidebarInset>
        </ScrollProvider>
    );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}
