
'use client';

import { Logo } from "@/components/icons";
import { MainNav } from "@/components/main-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
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
            <Sidebar>
                <SidebarHeader>
                    {isMobile && openMobile ? (
                        <Button
                            variant="ghost"
                            onClick={handleClose}
                            className="flex items-center gap-2 text-xl font-bold font-headline text-foreground h-auto p-0 hover:bg-transparent"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span>Retour</span>
                        </Button>
                    ) : (
                        <Logo />
                    )}
                </SidebarHeader>
                <SidebarContent>
                    <MainNav />
                </SidebarContent>
                <SidebarFooter className="mt-auto">
                    <SidebarSeparator />
                    <UserNav />
                </SidebarFooter>
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
