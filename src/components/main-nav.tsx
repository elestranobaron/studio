
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ScanLine,
  Timer,
  Settings,
  Gem,
  Medal,
  Dice5,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/scan", label: "Scan WOD", icon: ScanLine },
  { href: "/generate", label: "Generate WOD", icon: Dice5 },
  { href: "/hero-wods", label: "Hero WODs", icon: Medal },
  { href: "/timers", label: "Timers", icon: Timer },
];

const secondaryLinks = [
    { href: "/premium", label: "Go Premium", icon: Gem, className: "text-primary hover:text-primary" },
]

export function MainNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(link.href)}
            tooltip={{ children: link.label }}
            onClick={() => setOpenMobile(false)}
          >
            <Link href={link.href}>
              <link.icon />
              <span>{link.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
       {secondaryLinks.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(link.href)}
            tooltip={{ children: link.label }}
            onClick={() => setOpenMobile(false)}
            className={link.className}
          >
            <Link href={link.href}>
              <link.icon />
              <span>{link.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
