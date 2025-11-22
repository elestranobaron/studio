
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
  Trophy,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTranslations } from "next-intl";

export function MainNav() {
  const t = useTranslations('MainNav');
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const links = [
    { href: "/dashboard", label: t('dashboard'), icon: LayoutGrid },
    { href: "/scan", label: t('scanWod'), icon: ScanLine },
    { href: "/generate", label: t('generateWod'), icon: Dice5 },
    { href: "/hero-wods", label: t('heroWods'), icon: Medal },
    { href: "/timers", label: t('timers'), icon: Timer },
  ];

  const secondaryLinks = [
      { href: "/premium", label: t('goPremium'), icon: Gem, className: "text-primary hover:text-primary" },
      { href: "/hall-of-fame", label: t('hallOfFame'), icon: Trophy, className: "text-yellow-400 hover:text-yellow-400" },
  ]


  return (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.endsWith(link.href)}
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
            isActive={pathname.endsWith(link.href)}
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
