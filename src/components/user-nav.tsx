import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { LogOut, Settings } from "lucide-react";

export function UserNav() {
  const userAvatar = PlaceHolderImages.find(
    (img) => img.id === "user-avatar-1"
  );
  
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
                <SidebarMenuButton asChild tooltip={{children: "Log out"}}>
                    <a href="#">
                        <LogOut />
                        <span>Log out</span>
                    </a>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-3 p-2">
            <Avatar className="h-10 w-10">
                {userAvatar && (
                    <AvatarImage src={userAvatar.imageUrl} alt="User avatar" />
                )}
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
                <span className="font-semibold text-sm text-sidebar-foreground">
                    Jane Doe
                </span>
                <span className="text-xs text-sidebar-foreground/70">
                    jane.doe@example.com
                </span>
            </div>
        </div>
    </div>
  );
}
