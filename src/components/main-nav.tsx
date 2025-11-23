
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ScanLine,
  Timer,
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

  const handleLinkClick = (href: string, isAlreadyActive: boolean) => {
    if (isAlreadyActive) {
      // Find the main content area and scroll to top
      const mainContent = document.querySelector('#dashboard-main-content') || window;
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setOpenMobile(false);
  };
  
  return (
    <SidebarMenu>
      {links.map((link) => {
        const isCurrentPage = pathname.endsWith(link.href);
        const Comp = isCurrentPage ? 'button' : Link;
        
        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={isCurrentPage}
              tooltip={{ children: link.label }}
              onClick={() => !isCurrentPage && setOpenMobile(false)}
            >
              <Comp 
                href={link.href} 
                onClick={isCurrentPage ? () => handleLinkClick(link.href, true) : undefined}
              >
                <link.icon />
                <span>{link.label}</span>
              </Comp>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
       {secondaryLinks.map((link) => {
         const isCurrentPage = pathname.endsWith(link.href);
         const Comp = isCurrentPage ? 'button' : Link;

         return (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={isCurrentPage}
                tooltip={{ children: link.label }}
                className={link.className}
                onClick={() => !isCurrentPage && setOpenMobile(false)}
              >
                <Comp 
                  href={link.href}
                  onClick={isCurrentPage ? () => handleLinkClick(link.href, true) : undefined}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </Comp>
              </SidebarMenuButton>
            </SidebarMenuItem>
         )
      })}
    </SidebarMenu>
  );
}
