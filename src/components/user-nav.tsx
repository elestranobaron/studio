'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { LogIn, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useUser } from "@/firebase";
import { Skeleton } from "./ui/skeleton";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";
import { useAuth } from "@/firebase/provider";

export function UserNav() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogin = () => {
    initiateAnonymousSignIn(auth);
  };
  
  if(isUserLoading) {
    return (
        <div className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
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
                        <span>Log in</span>
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
                <SidebarMenuButton asChild tooltip={{children: "Settings"}}>
                    <a href="#">
                        <Settings />
                        <span>Settings</span>
                    </a>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={{children: "Log out"}} onClick={() => auth.signOut()}>
                    <a href="#">
                        <LogOut />
                        <span>Log out</span>
                    </a>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-3 p-2">
            <Avatar className="h-10 w-10">
                {user.photoURL && (
                    <AvatarImage src={user.photoURL} alt="User avatar" />
                )}
                <AvatarFallback>
                    {user.displayName ? user.displayName.charAt(0) : <UserIcon />}
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
                <span className="font-semibold text-sm text-sidebar-foreground">
                    {user.displayName || 'Anonymous User'}
                </span>
                <span className="text-xs text-sidebar-foreground/70">
                    {user.email || user.uid}
                </span>
            </div>
        </div>
    </div>
  );
}
