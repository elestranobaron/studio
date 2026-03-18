
'use client';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogIn, LogOut, Settings, User as UserIcon, LoaderCircle } from "lucide-react";
import { useUser } from "@/firebase";
import { useAuth } from "@/firebase/provider";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function UserNav() {
  const t = useTranslations('UserNav');
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();


  const handleLogin = () => {
    setOpenMobile(false);
    router.push('/login');
  };

  const handleLogout = async () => {
    setOpenMobile(false);
    try {
      if (auth) {
        await auth.signOut();
      }
      // Force navigation to clear any remaining protected routes state
      window.location.href = '/login';
    } catch (error) {
      console.error("Logout error:", error);
      router.push('/login');
    }
  };
  
  if(isUserLoading || !auth) {
    return (
        <div className="flex items-center gap-3 p-2">
             <div className="p-2 flex items-center justify-center">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton disabled>
                            <LoaderCircle className="animate-spin" />
                            <span>{t('loading')}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </div>
        </div>
    )
  }
  
  if(!user) {
    return (
        <div className="p-2">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogin}>
                        <LogIn className="text-muted-foreground" />
                        <span>{t('signIn')}</span>
                        <span className="ml-auto h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </div>
    )
  }

  // Fallback to email prefix if displayName is missing
  const userDisplayName = user.displayName || user.email?.split('@')[0] || 'User';

  return (
    <div>
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={{children: t('settingsTooltip')}} onClick={() => setOpenMobile(false)}>
                    <Link href="/settings">
                        <Settings />
                        <span>{t('settingsTooltip')}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                    <LogOut />
                    <span>{t('signOut')}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-3 p-2">
            <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-transparent">
                    {user.photoURL && (
                        <AvatarImage src={user.photoURL} alt="User avatar" />
                    )}
                    <AvatarFallback>
                        {user.isAnonymous ? <UserIcon /> : (userDisplayName.charAt(0).toUpperCase())}
                    </AvatarFallback>
                </Avatar>
                <span 
                    className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-sidebar-background transition-all duration-500",
                        user.isAnonymous ? "bg-amber-500" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                    )} 
                    title={user.isAnonymous ? t('temporaryProfile') : "Connected"}
                />
            </div>
            <div className="flex flex-col truncate">
                <span className="font-semibold text-sm text-sidebar-foreground">
                    {user.isAnonymous ? t('anonymousUser') : userDisplayName}
                </span>
                <span className="text-xs text-sidebar-foreground/70">
                    {user.isAnonymous ? t('temporaryProfile') : user.email}
                </span>
            </div>
        </div>
    </div>
  );
}
