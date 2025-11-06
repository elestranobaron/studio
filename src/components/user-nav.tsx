
'use client';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { LogIn, LogOut, Settings, User as UserIcon, LoaderCircle } from "lucide-react";
import { useUser } from "@/firebase";
import { useAuth } from "@/firebase/provider";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

export function UserNav() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    router.push('/login');
  };
  
  if(isUserLoading) {
    return (
        <div className="flex items-center gap-3 p-2">
             <div className="p-2 flex items-center justify-center">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton disabled>
                            <LoaderCircle className="animate-spin" />
                            <span>Logging in...</span>
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
                <SidebarMenuButton asChild tooltip={{children: "Log out"}} onClick={() => auth?.signOut()}>
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
                    {user.isAnonymous ? <UserIcon /> : (user.displayName ? user.displayName.charAt(0) : <UserIcon />)}
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
                <span className="font-semibold text-sm text-sidebar-foreground">
                    {user.isAnonymous ? 'Anonymous User' : (user.email || 'User')}
                </span>
                <span className="text-xs text-sidebar-foreground/70">
                    {user.isAnonymous ? 'Temporary Profile' : user.email}
                </span>
            </div>
        </div>
    </div>
  );
}
