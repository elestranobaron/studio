
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
    if (auth) {
      await auth.signOut();
    }
    router.push('/login');
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
                        <LogIn />
                        <span>{t('signIn')}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </div>
    )
  }

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
            <Avatar className="h-10 w-10">
                {user.photoURL && (
                    <AvatarImage src={user.photoURL} alt="User avatar" />
                )}
                <AvatarFallback>
                    {user.isAnonymous ? <UserIcon /> : (user.displayName ? user.displayName.charAt(0) : <UserIcon />)}
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
                <span className="font-semibold text-sm text-sidebar-foreground">
                    {user.isAnonymous ? t('anonymousUser') : (user.email || 'User')}
                </span>
                <span className="text-xs text-sidebar-foreground/70">
                    {user.isAnonymous ? t('temporaryProfile') : user.email}
                </span>
            </div>
        </div>
    </div>
  );
}
