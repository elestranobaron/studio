
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

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const { openMobile, setOpenMobile } = useSidebar();
    const isMobile = useIsMobile();

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
                            className="w-full h-full object-contain transition-transform duration-300 transform scale-[1.3] md:scale-125"
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
            <SidebarInset>{children}</SidebarInset>
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
